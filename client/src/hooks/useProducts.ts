import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { z } from "zod";
import { ProductSchema } from '@shared/schemas/product'

interface UseProductsOptions {
  categoryId?: string;
  search?: string;
  featuredOnly?: boolean;
}

async function fetchProducts(options: UseProductsOptions) {
  let query = supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.featuredOnly) {
    query = query.eq("is_featured", true);
  }

  if (options.search && options.search.trim().length > 0) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return z.array(ProductSchema).parse(data);
}

export function useProducts(options: UseProductsOptions = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = `db-products-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["products", options],
    queryFn: () => fetchProducts(options),
    staleTime: 1000 * 60 * 2,
  });
}

export function useFeaturedProducts() {
  return useProducts({ featuredOnly: true });
}
