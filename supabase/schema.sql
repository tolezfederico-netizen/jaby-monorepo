--
-- PostgreSQL database dump
--

\restrict CTQJoN1Oc3RzGSvjQ4YfNAsgmPKfIfLNr6GhzwzcNJr9bUsPtpn7qw8tXNimZlq

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: next_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_order_number() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select nextval('public.order_number_seq')::integer;
$$;


--
-- Name: set_products_out_of_stock_since(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_products_out_of_stock_since() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if old.is_out_of_stock is distinct from new.is_out_of_stock then
    if new.is_out_of_stock then
      new.out_of_stock_since := now();
    else
      new.out_of_stock_since := null;
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    text text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    name text NOT NULL,
    last_address text,
    address_history text[] DEFAULT '{}'::text[] NOT NULL,
    total_orders integer DEFAULT 1 NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_modality text,
    marketing_consent boolean DEFAULT false NOT NULL,
    marketing_consent_at timestamp with time zone
);


--
-- Name: media_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    url text NOT NULL,
    "order" integer NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    thumbnail_url text,
    thumbnail_source text DEFAULT 'auto'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT media_content_provider_check CHECK ((provider = ANY (ARRAY['tiktok'::text, 'instagram'::text]))),
    CONSTRAINT media_content_thumbnail_source_check CHECK ((thumbnail_source = ANY (ARRAY['auto'::text, 'manual'::text])))
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    modality text NOT NULL,
    customer_name text NOT NULL,
    customer_address text,
    notes text,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_cost numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    completed_at timestamp with time zone,
    customer_phone text,
    is_archived boolean DEFAULT false NOT NULL,
    CONSTRAINT orders_modality_check CHECK ((modality = ANY (ARRAY['pickup'::text, 'delivery'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2),
    category_id uuid NOT NULL,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_out_of_stock boolean DEFAULT false NOT NULL,
    out_of_stock_since timestamp with time zone
);


--
-- Name: store_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_name text NOT NULL,
    address text NOT NULL,
    whatsapp_number text NOT NULL,
    business_hours_open time without time zone DEFAULT '10:00:00'::time without time zone NOT NULL,
    business_hours_close time without time zone DEFAULT '23:00:00'::time without time zone NOT NULL,
    delivery_enabled boolean DEFAULT false NOT NULL,
    delivery_hours_open time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    delivery_hours_close time without time zone DEFAULT '23:00:00'::time without time zone NOT NULL,
    delivery_cost numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_minimum_order numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_coverage_zones text[] DEFAULT '{}'::text[] NOT NULL,
    show_prices boolean DEFAULT true NOT NULL,
    is_app_active boolean DEFAULT true NOT NULL,
    instagram_url text,
    logo_url text,
    neighborhood text,
    municipality text,
    tiktok_username text
);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: customers customers_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_key UNIQUE (phone);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: media_content media_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_content
    ADD CONSTRAINT media_content_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: store_config store_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_config
    ADD CONSTRAINT store_config_pkey PRIMARY KEY (id);


--
-- Name: banners_single_row; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX banners_single_row ON public.banners USING btree ((true));


--
-- Name: idx_orders_is_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_is_archived ON public.orders USING btree (is_archived);


--
-- Name: store_config_single_row; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX store_config_single_row ON public.store_config USING btree ((true));


--
-- Name: banners banners_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER banners_set_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products products_set_out_of_stock_since; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER products_set_out_of_stock_since BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_products_out_of_stock_since();


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: customers Admin puede leer clientes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin puede leer clientes" ON public.customers FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: media_content Authenticated users can delete media content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete media content" ON public.media_content FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: media_content Authenticated users can insert media content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert media content" ON public.media_content FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: media_content Authenticated users can update media content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update media content" ON public.media_content FOR UPDATE USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: media_content Public can read media content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read media content" ON public.media_content FOR SELECT USING (true);


--
-- Name: banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

--
-- Name: banners banners_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY banners_admin_write ON public.banners USING ((auth.role() = 'authenticated'::text));


--
-- Name: banners banners_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY banners_public_read ON public.banners FOR SELECT USING (true);


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_admin_write ON public.categories USING ((auth.role() = 'authenticated'::text));


--
-- Name: categories categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (true);


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: customers customers_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customers_admin_delete ON public.customers FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: media_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_content ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_admin_all ON public.order_items USING ((auth.role() = 'authenticated'::text));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_admin_all ON public.orders USING ((auth.role() = 'authenticated'::text));


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_admin_write ON public.products USING ((auth.role() = 'authenticated'::text));


--
-- Name: products products_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_public_read ON public.products FOR SELECT USING (true);


--
-- Name: store_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

--
-- Name: store_config store_config_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_config_admin_write ON public.store_config USING ((auth.role() = 'authenticated'::text));


--
-- Name: store_config store_config_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_config_public_read ON public.store_config FOR SELECT USING (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION next_order_number(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.next_order_number() FROM PUBLIC;
GRANT ALL ON FUNCTION public.next_order_number() TO service_role;


--
-- Name: FUNCTION set_products_out_of_stock_since(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_products_out_of_stock_since() TO anon;
GRANT ALL ON FUNCTION public.set_products_out_of_stock_since() TO authenticated;
GRANT ALL ON FUNCTION public.set_products_out_of_stock_since() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: TABLE banners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.banners TO anon;
GRANT ALL ON TABLE public.banners TO authenticated;
GRANT ALL ON TABLE public.banners TO service_role;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categories TO anon;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;


--
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.customers TO anon;
GRANT ALL ON TABLE public.customers TO authenticated;
GRANT ALL ON TABLE public.customers TO service_role;


--
-- Name: TABLE media_content; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.media_content TO anon;
GRANT ALL ON TABLE public.media_content TO authenticated;
GRANT ALL ON TABLE public.media_content TO service_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;


--
-- Name: SEQUENCE order_number_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.order_number_seq TO anon;
GRANT ALL ON SEQUENCE public.order_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.order_number_seq TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.products TO anon;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;


--
-- Name: TABLE store_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.store_config TO anon;
GRANT ALL ON TABLE public.store_config TO authenticated;
GRANT ALL ON TABLE public.store_config TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict CTQJoN1Oc3RzGSvjQ4YfNAsgmPKfIfLNr6GhzwzcNJr9bUsPtpn7qw8tXNimZlq

