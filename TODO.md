# Pendientes

## Funcionalidad
- [ ] Página de detalle de producto (también resuelve variantes con nombre base idéntico, ej. sabores de Doritos).
- [ ] Recordar la última modalidad (pickup/delivery) y pre-seleccionarla en checkout (`last_modality` ya existe en `customers`).
- [ ] Aviso en el carrito: "te faltan $X para el mínimo de delivery" (`delivery_minimum_order`).
- [ ] Badge "Nuevo" para productos recientes (vigencia temporal desde `created_at`).
- [ ] Revisar que el buscador del header distinga productos con el mismo nombre y distinta variante en la descripción.

## Técnico
- [ ] Code-splitting del bundle de admin (~1,3 MB): `import()` dinámico o `manualChunks`.
- [ ] Mover `OrderWithItemsSchema` a `shared`.
- [ ] Unificar (o al menos mantener sincronizados) los schemas de pedido de `shared` y de la Edge Function; sumar `is_archived` si llegara a hacer falta.
- [ ] Versionar el esquema base de la DB en `supabase/migrations/` (hoy solo hay migraciones desde sept 2026).

## Operativo
- [ ] Subir a mano las miniaturas de TikTok que falten.
- [ ] Verificar en producción que se pueden marcar 5 y 6 destacados.
- [ ] Decidir si se permite borrar categorías con productos (hoy bloqueado).
- [ ] Probar un pedido real de punta a punta tras el deploy.
