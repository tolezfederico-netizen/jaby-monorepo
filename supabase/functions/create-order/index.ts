import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OrderItemPayloadSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
})

const OrderPayloadSchema = z.object({
  modality: z.enum(['pickup', 'delivery']),
  customer_name: z.string().min(1).max(100, 'El nombre es demasiado largo'),
  customer_phone: z.string().min(7).nullable().optional(),
  customer_address: z.string().max(200, 'La dirección es demasiado larga').optional(),
  notes: z.string().max(300, 'Las notas son demasiado largas').optional(),
  items: z.array(OrderItemPayloadSchema).min(1),
  total: z.number().nonnegative(),
  delivery_cost: z.number().nonnegative().optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const parsed = OrderPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Payload inválido', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = parsed.data

    // --- VALIDACIÓN SERVER-SIDE: recalcular precios contra la base, nunca confiar en el payload ---

    // 1. Traer los productos reales involucrados en el pedido
    const productIds = [...new Set(payload.items.map((item) => item.product_id))]

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .in('id', productIds)

    if (productsError) {
      throw new Error('No se pudieron verificar los productos')
    }

    const productsById = new Map((products ?? []).map((p) => [p.id, p]))

    // 2. Verificar que todos los productos existan, estén activos y tengan precio válido
    for (const item of payload.items) {
      const product = productsById.get(item.product_id)

      if (!product) {
        return new Response(
          JSON.stringify({ error: `El producto "${item.product_name}" ya no existe` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!product.is_active) {
        return new Response(
          JSON.stringify({ error: `El producto "${product.name}" ya no está disponible` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (product.price === null || product.price === undefined) {
        return new Response(
          JSON.stringify({ error: `El producto "${product.name}" no tiene precio configurado` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 3. Recalcular unit_price y subtotal de cada item a partir del precio real en la base
    //    (se ignora por completo el unit_price/subtotal que vino del cliente)
    const verifiedItems = payload.items.map((item) => {
      const product = productsById.get(item.product_id)!
      const unitPrice = product.price as number
      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100

      return {
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal,
      }
    })

    // 4. Recalcular delivery_cost desde store_config si la modalidad es delivery
    //    (se ignora el delivery_cost que vino del cliente)
    let verifiedDeliveryCost = 0

    if (payload.modality === 'delivery') {
      const { data: storeConfig, error: storeConfigError } = await supabase
        .from('store_config')
        .select('delivery_enabled, delivery_cost')
        .single()

      if (storeConfigError || !storeConfig) {
        throw new Error('No se pudo verificar la configuración de delivery')
      }

      if (!storeConfig.delivery_enabled) {
        return new Response(
          JSON.stringify({ error: 'El delivery no está disponible en este momento' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      verifiedDeliveryCost = storeConfig.delivery_cost ?? 0
    }

    // 5. Recalcular el total real a partir de los subtotales verificados + delivery verificado
    const itemsTotal = verifiedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const verifiedTotal = Math.round((itemsTotal + verifiedDeliveryCost) * 100) / 100

    // --- FIN VALIDACIÓN SERVER-SIDE ---

    // Obtener el siguiente número de pedido de forma atómica
    const { data: seqData, error: seqError } = await supabase
      .rpc('next_order_number')

    if (seqError || seqData === null) {
      throw new Error('No se pudo obtener el número de pedido')
    }

    const orderNumber: number = seqData

    // Insertar el pedido (usando los valores verificados, no los del payload)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        status: 'pending',
        modality: payload.modality,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone ?? null,
        customer_address: payload.customer_address ?? null,
        notes: payload.notes ?? null,
        total: verifiedTotal,
        delivery_cost: payload.modality === 'delivery' ? verifiedDeliveryCost : null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      throw new Error('No se pudo crear el pedido')
    }

    // Insertar los items del pedido (usando los valores verificados, no los del payload)
    const items = verifiedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items)

    if (itemsError) {
      throw new Error('No se pudieron guardar los items del pedido')
    }

    // Upsert de cliente — solo si se recibió un número de teléfono
    if (payload.customer_phone) {
      const phone = payload.customer_phone
      const name = payload.customer_name
      const address = payload.customer_address ?? null
      const modality = payload.modality
      const now = new Date().toISOString()

      const { data: existing, error: fetchError } = await supabase
        .from('customers')
        .select('id, address_history, total_orders')
        .eq('phone', phone)
        .maybeSingle()

      if (fetchError) {
        // No lanzar error — el pedido ya se creó exitosamente, el cliente es secundario
        console.error('Error al buscar cliente:', fetchError.message)
      } else if (existing) {
        // Cliente existente — actualizar
        const newHistory: string[] =
          address && !existing.address_history.includes(address)
            ? [...existing.address_history, address]
            : existing.address_history

        const updatePayload: Record<string, unknown> = {
          name,
          last_seen_at: now,
          last_modality: modality,
          total_orders: existing.total_orders + 1,
          address_history: newHistory,
        }
        if (address) {
          updatePayload.last_address = address
        }

        const { error: updateError } = await supabase
          .from('customers')
          .update(updatePayload)
          .eq('phone', phone)

        if (updateError) {
          console.error('Error al actualizar cliente:', updateError.message)
        }
      } else {
        // Cliente nuevo — insertar
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            phone,
            name,
            last_address: address,
            address_history: address ? [address] : [],
            last_modality: modality,
          })

        if (insertError) {
          console.error('Error al insertar cliente:', insertError.message)
        }
      }
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
