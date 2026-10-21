import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Límites del pedido: mantener sincronizados con shared/schemas/order.ts
const MAX_ITEM_QUANTITY = 99
const MAX_ORDER_ITEMS = 50

const OrderItemPayloadSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1).max(200),
  quantity: z.number().int().positive().max(MAX_ITEM_QUANTITY),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
})

const OrderPayloadSchema = z
  .object({
    modality: z.enum(['pickup', 'delivery']),
    customer_name: z.string().trim().min(1).max(100, 'El nombre es demasiado largo'),
    customer_phone: z
      .string()
      .regex(/^\d{10,15}$/, 'El número de WhatsApp no es válido')
      .nullable()
      .optional(),
    customer_address: z.string().trim().max(200, 'La dirección es demasiado larga').optional(),
    notes: z.string().trim().max(300, 'Las notas son demasiado largas').optional(),
    items: z.array(OrderItemPayloadSchema).min(1).max(MAX_ORDER_ITEMS),
    total: z.number().nonnegative(),
    delivery_cost: z.number().nonnegative().optional(),
    marketing_consent: z.boolean().optional(),
  })
  .refine((order) => order.modality !== 'delivery' || !!order.customer_address, {
    message: 'La dirección es obligatoria para el delivery',
    path: ['customer_address'],
  })
  .refine((order) => order.modality !== 'delivery' || /\d/.test(order.customer_address ?? ''), {
    message: 'Ingresá la dirección con la altura (ej: Av. Corrientes 1234)',
    path: ['customer_address'],
  })

// Los horarios del local están en hora argentina, sin importar dónde corra la función
function getArgentinaMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

// Misma lógica que client/src/hooks/useAppStatus.ts (soporta horarios que cruzan la medianoche)
function isWithinHours(open: string, close: string): boolean {
  const current = getArgentinaMinutes()
  const [openH, openM] = open.split(':').map(Number)
  const [closeH, closeM] = close.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  if (closeMinutes <= openMinutes) {
    return current >= openMinutes || current < closeMinutes
  }
  return current >= openMinutes && current < closeMinutes
}

function badRequest(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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
        JSON.stringify({
          error: parsed.error.issues[0]?.message ?? 'Payload inválido',
          details: parsed.error.flatten(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = parsed.data

    // --- VALIDACIÓN SERVER-SIDE: estado del local, horarios y precios, nunca confiar en el payload ---

    // 0. El local tiene que estar activo y abierto (lo mismo que exige el checkout)
    const { data: storeConfig, error: storeConfigError } = await supabase
      .from('store_config')
      .select(
        'is_app_active, business_hours_open, business_hours_close, delivery_enabled, delivery_hours_open, delivery_hours_close, delivery_cost, delivery_minimum_order'
      )
      .single()

    if (storeConfigError || !storeConfig) {
      throw new Error('No se pudo verificar la configuración del local')
    }

    if (
      !storeConfig.is_app_active ||
      !isWithinHours(storeConfig.business_hours_open, storeConfig.business_hours_close)
    ) {
      return badRequest('El local no está recibiendo pedidos en este momento')
    }

    // 1. Traer los productos reales involucrados en el pedido
    const productIds = [...new Set(payload.items.map((item) => item.product_id))]

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, is_active, is_out_of_stock')
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

      if (product.is_out_of_stock) {
        return new Response(
          JSON.stringify({ error: `El producto "${product.name}" está agotado` }),
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
    const itemsTotal = verifiedItems.reduce((sum, item) => sum + item.subtotal, 0)
    let verifiedDeliveryCost = 0

    if (payload.modality === 'delivery') {
      if (
        !storeConfig.delivery_enabled ||
        !isWithinHours(storeConfig.delivery_hours_open, storeConfig.delivery_hours_close)
      ) {
        return badRequest('El delivery no está disponible en este momento')
      }

      const minimum = storeConfig.delivery_minimum_order ?? 0
      if (minimum > 0 && itemsTotal < minimum) {
        return badRequest(
          `El pedido mínimo para delivery es de $${minimum.toLocaleString('es-AR')}`
        )
      }

      verifiedDeliveryCost = storeConfig.delivery_cost ?? 0
    }

    // 5. Recalcular el total real a partir de los subtotales verificados + delivery verificado
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
      // Sin transacción: deshacer el pedido para no dejarlo huérfano, sin ítems
      const { error: rollbackError } = await supabase.from('orders').delete().eq('id', order.id)
      if (rollbackError) {
        console.error('Error al deshacer el pedido sin ítems:', order.id, rollbackError.message)
      }
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

        // No se pisa el nombre: el teléfono no prueba que quien pide sea el titular.
        // La dirección nueva se suma al historial y queda como última usada.
        const updatePayload: Record<string, unknown> = {
          last_seen_at: now,
          last_modality: modality,
          total_orders: existing.total_orders + 1,
          address_history: newHistory,
        }
        if (address) {
          updatePayload.last_address = address
        }
        // Solo se registra el consentimiento cuando se otorga; nunca se revoca automáticamente
        if (payload.marketing_consent) {
          updatePayload.marketing_consent = true
          updatePayload.marketing_consent_at = now
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
            marketing_consent: payload.marketing_consent === true,
            marketing_consent_at: payload.marketing_consent === true ? now : null,
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
        // Valores verificados, para que el mensaje de WhatsApp no use precios viejos del carrito
        total: verifiedTotal,
        delivery_cost: verifiedDeliveryCost,
        items: verifiedItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
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
