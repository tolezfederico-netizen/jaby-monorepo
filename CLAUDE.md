# Antojos Ya (repo "Jaby" / "Antojos Express")

Tienda online de bebidas y antojos (negocio local argentino). El cliente arma el pedido, se registra en Supabase y se redirige a WhatsApp con un mensaje pre-armado. No hay pasarela de pago. Incluye panel admin.
Nombre comercial actual: **Antojos Ya**. El repo, los paquetes npm y las claves de localStorage conservan los nombres viejos (`jaby`, `antojos-express-*`): no renombrar sin pedirlo.

## Estructura (monorepo, npm workspaces)

- `client/` tienda pública (React 18 + Vite 5 + TS). Tema **oscuro**. Puerto dev por defecto de Vite.
- `admin/` panel de administración (mismo stack). Tema **claro**. Dev en puerto 5174. Deploy en Vercel (`admin/vercel.json`, rewrite SPA).
- `shared/` paquete `@jaby/shared`: schemas Zod, tipos, utils, `lib/media-*`, `supabase.ts`. Se consume como TypeScript fuente (sin build); los subpaths expuestos están en `shared/package.json` (`exports`): si agregás un archivo importable por ruta, agregalo ahí.
- `supabase/` migraciones SQL y Edge Functions (`create-order`, `fetch-media-thumbnail`, Deno). `supabase/config.toml`: `verify_jwt` de las funciones (afecta al deploy); el resto es solo local. **Nunca `supabase config push`.**

Rutas: client `/`, `/checkout`. Admin: Dashboard, Pedidos, Productos, Categorías, Contenido Multimedia (`/contenido-multimedia`), Clientes, Configuración, Login.

## Comandos (desde la raíz)

- `npm install` (Node 20: ver `.nvmrc`; engines `>=18 <21`)
- `npm run dev` levanta client + admin. `npm run build:client` / `build:admin` / `build`.
- El build de admin corre `tsc && vite build` (falla ante errores de tipos); el de client es solo `vite build`.
- `npm run lint`, `npm run format:check`, `npm run format`. Prettier: sin punto y coma, comillas simples, 2 espacios, 100 columnas.
- **No hay tests automatizados.** Validar con build + lint + probar a mano en el navegador.
- Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `admin/.env.local` y `client/.env.local` (ignorados por git; ver `.env.example`). Nunca leer, imprimir ni commitear `.env*`.

## Backend (Supabase, plan gratuito, sa-east-1)

Postgres, Auth (email/clave para admin), Storage (buckets `Productos` y `media-thumbnails`), Realtime, Edge Functions. El plan gratuito pausa el proyecto por inactividad.

- Las migraciones versionadas en `supabase/migrations/` arrancan en septiembre 2026; el esquema base (products, categories, orders, etc.) no está en el repo.
- **Cambios de DB siempre como migración nueva + `supabase db push`. Nunca SQL directo contra producción** (ya causó una desincronización de historial).
- `products.out_of_stock_since` lo mantiene un trigger BEFORE UPDATE: **nunca setearlo desde el frontend**.
- El pedido se crea solo vía Edge Function `create-order`, que recalcula precios y valida stock server-side. El frontend nunca es fuente de verdad de precios.
- DELETEs: confirmar filas afectadas (patrón existente). Respetar RLS: lectura pública donde corresponde, escritura solo autenticados.
- Los schemas de pedido están duplicados a mano: `shared/schemas/order.ts` (npm/Zod) y `supabase/functions/create-order/index.ts` (Deno/esm.sh). **Si cambia uno, revisar el otro.**

## Patrones de código

- Datos: React Query. Client: `staleTime: Infinity` + invalidación por Realtime (`postgres_changes`) para productos y config. Admin: pedidos con polling de 60 s + invalidación manual tras cada acción.
- Respuestas de Supabase se validan con Zod (`Schema.parse`) en los hooks.
- Cada app tiene sus hooks en `src/hooks/` y su `lib/supabase.ts`/`queryClient.ts`; la lógica compartida va en `shared/`.
- Estilos: **CSS Modules** (`*.module.css` junto a cada componente) + variables globales en `src/index.css` (`--color-primary: #E91E8C`, superficie `#1A1A2E`, fondo client `#0D0D1A`). Reutilizar variables, no hardcodear colores nuevos. Marca: rosa `#E91E8C` + azul oscuro `#1A1A2E`; el header usa degradé de ambos.
- Carrito: Context API + reducer (`client/src/context/CartContext.tsx`). localStorage: `antojos-express-cart`, `antojos-express-last-order` (ítems con `product_id`; snapshots viejos resuelven por nombre normalizado), `antojos-express-favorites`. Envolver siempre lecturas/escrituras en try/catch.
- Flujo de pedido: pending → confirmed → in_progress → completed; **pickup salta de confirmed a completed**. Pedidos con `is_archived` se excluyen de contadores y filtros activos.
- Contenido multimedia (`media_content`): TikTok e Instagram Reels. El oEmbed de TikTok ya no devuelve miniatura: el thumbnail se sube a mano en ambos (`thumbnail_source: 'manual'`); la Edge Function `fetch-media-thumbnail` queda como intento que nunca pisa una miniatura existente. Máx. 10 por plataforma. Destacados: máx. 6 (`MAX_FEATURED_PRODUCTS` en admin; si falla el 5.º/6.º, revisar trigger/constraint en la DB).
- Banner promocional: editable desde Configuración; el admin usa su propio `hooks/useBanner.ts` (el de la tienda filtra `is_active`).
- Privacidad (Ley 25.326): checkout informa el uso de datos y tiene checkbox opcional `marketing_consent` (guardado en `customers` con fecha; solo se pone en true, nunca se revoca solo). Política en `/privacidad` (`PrivacyPage.tsx`). Si se agregan datos nuevos o usos nuevos (ej. envío de promociones), actualizar esa página.
- No agregar librerías de gráficos: el gráfico del Dashboard es CSS/SVG propio.
- Textos de UI en español rioplatense.

## Reglas de trabajo

- Cambios chicos y enfocados; no refactorizar de paso. Antes de dar algo por hecho: `npm run build` (y lint si se tocó lógica).
- Cambios visuales: revisar mobile y desktop (la tienda se usa sobre todo desde el celular).
- Admin (patrón común a todas las pantallas): barra superior rosa pálida (`#fdf2f8`), chips blancos con activo rosa, cards, diálogos centrados con `createPortal` (bottom sheet en móvil), `ConfirmModal` para acciones destructivas/pausa, switches, toasts, íconos en `components/icons.tsx`. Móvil: `.mobileBar` fijo bajo la hamburguesa, barras no sticky, botones de guardar no flotantes. En CSS Modules, a igual especificidad gana la regla posterior: poner overrides al final o subir especificidad.
- No commitear ni pushear sin que se pida. Repo: `tolezfederico-netizen/jaby-monorepo` (rama `master`); ambas apps se despliegan en Vercel (el client no tiene `vercel.json`: su config está en el panel de Vercel).

## Pendientes

Ver `TODO.md`.
