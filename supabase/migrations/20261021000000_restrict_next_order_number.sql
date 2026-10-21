-- next_order_number solo lo usa la Edge Function create-order, con la service role.
-- Cualquiera con la clave anon podía llamarlo y consumir números de pedido (saltos en la numeración).
REVOKE EXECUTE ON FUNCTION public.next_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_order_number() TO service_role;
