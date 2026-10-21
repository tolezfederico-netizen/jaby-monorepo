# Auditoría — plan de correcciones

Auditoría del 20/10/2026 (código, migraciones, Edge Functions, build, lint, Prettier y `npm audit`).
Cada ítem tiene un ID para elegir qué se hace. Orden sugerido: de arriba hacia abajo.

## Avance (21/10/2026)

Hecho, commiteado y pusheado: **S2, S3, S5, B1, B2, B3 (mínimo), B4, E3, M1, M2, R1, R2, R5 (admin), R7**,
más la validación de altura en la dirección de delivery. Edge Functions desplegadas.

Hecho y commiteado, **sin pushear**: **S4** (no se pisa el nombre de clientes existentes), **E1** (pedidos
de 30 días + abiertos; antiguos y archivados bajo demanda; contadores exactos) y **R3** (Prettier sin punto
y coma). **S4 requiere volver a desplegar `create-order`.**

Decidido sin cambios: **E2** — los pausados siguen visibles como "No disponible".

Pendiente:

- **S1** ✅ Cerrado (21/10/2026): registro de usuarios desactivado (verificado por API), RLS activo en las 8
  tablas, `customers`/`orders`/`order_items` sin acceso público. Migraciones aplicadas: `20261021000000`
  (`next_order_number` solo `service_role`) y `20261021010000` (políticas del bucket `Productos`, que
  impedían subir imágenes, y baja de las políticas viejas de `tiktok-thumbnails`).
  Pendiente menor: 5 productos con la imagen embebida en la base (data URI); volver a subirlas.
- **R4** (`config.toml`/esquema base), **R6** (Node 20 local), **R5 client** (confirmar con Garel la config de Vercel del client).
- **S5** — quedan `vite`/`esbuild` (solo dev server; requiere versión mayor).
- **E1** — falta paginar Clientes (mismo límite de 1000 filas).

**Estado general:** build OK, lint 0 errores, tipos OK. En el historial de git solo aparece la clave
`anon` (pública); no hay claves `service_role` filtradas. Lo que está bien hecho: precios recalculados
en el servidor, validación con Zod, DELETE con confirmación de filas, localStorage con try/catch, sin
HTML crudo, links externos con `noopener`.

Leyenda: 🔴 alta · 🟠 media · 🟡 baja — **Dónde:** código / Supabase Dashboard / git — **Esfuerzo:** S (minutos) · M (horas) · L (más de un día)

---

## Fase 1 — Seguridad (urgente)

### S1 🔴 Verificar registro abierto y políticas RLS — Supabase Dashboard · S

Las políticas versionadas dan escritura a cualquier usuario `authenticated`. Si el registro de Auth está
abierto (viene así por defecto), cualquiera puede crear una cuenta con la clave anon y leer/borrar
clientes, pedidos y productos. El esquema base (products, orders, customers, store_config, banners,
bucket `Productos`) no está en el repo, así que no se pudo auditar.

- [ ] Authentication → Sign In / Providers → desactivar "Allow new users to sign up".
- [ ] Correr en el SQL Editor (solo lectura) y revisar el resultado:

  ```sql
  select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies where schemaname in ('public', 'storage') order by 1;

  select relname, relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r';

  select grantee, privilege_type from information_schema.routine_privileges
  where routine_name = 'next_order_number';
  ```

- [ ] Confirmar: `customers` y `orders` sin lectura pública; RLS activo en todas las tablas.

### S2 🔴 Proteger o dar de baja `fetch-media-thumbnail` — código · S

`supabase/functions/fetch-media-thumbnail/index.ts` no pide autenticación y sube archivos al bucket
público con la service role (`upsert: true`). Cualquiera con la clave anon puede llamarla en loop y
consumir la cuota del plan gratuito. Hoy casi no se usa (TikTok ya no devuelve miniatura).

- [x] Opción A: validar el JWT del usuario (`auth.getUser`) y rechazar si no está logueado.
- [ ] Opción B: darla de baja y quitar el intento automático del admin.

### S3 🔴 Límites y validaciones server-side en `create-order` — código · M

`supabase/functions/create-order/index.ts`

- [x] Máximos: `quantity` por ítem, cantidad de ítems, largo de `customer_phone`; `trim()` del nombre.
- [x] Validar en el servidor `is_app_active`, horario del local, horario de delivery y `delivery_minimum_order`.
- [x] Exigir dirección cuando la modalidad es delivery.
- [x] Revisar el schema duplicado en `shared/schemas/order.ts` (regla de CLAUDE.md).

### S4 🔴 Consentimiento y datos de clientes atados solo al teléfono — código · M

Cualquiera que ponga el teléfono de otra persona le pisa nombre y dirección y le marca
`marketing_consent = true` (consentimiento no dado por el titular; Ley 25.326).

- [ ] Decidir el criterio: p. ej. no pisar datos existentes desde un pedido anónimo, o registrar el
      consentimiento solo como "pendiente de confirmar por WhatsApp".

### S5 🟠 Actualizar dependencias con vulnerabilidades — código · S

- [x] `npm audit fix` (resuelve `react-router` alta y transitivas). No usar `--force`.
- [ ] `vite`/`esbuild`: afectan solo al servidor de desarrollo; el arreglo requiere versión mayor → dejar para después.
- [x] Build + lint + prueba manual después.

---

## Fase 2 — Bugs del flujo de pedido

### B1 🟠 Normalizar números de WhatsApp — código · S

El checkout arma `wa.me/54${whatsapp_number}` sin limpiar (`CheckoutPage.tsx:291`), y Configuración guarda
el número tal cual. Si se carga "+54 9 11…" se rompe el flujo principal. Lo mismo en `PrivacyPage`,
`CatalogPage`, y con los teléfonos de clientes en Pedidos y Clientes del admin.

- [x] Una función compartida en `shared/` (sacar no dígitos, no duplicar el `54`) y usarla en todos lados.
- [x] Normalizar al guardar en Configuración.

### B2 🟠 Precios viejos en el carrito y en el mensaje de WhatsApp — código · M

El carrito guarda el producto entero (con precio) en localStorage. El servidor cobra el precio actual,
pero el resumen y el mensaje de WhatsApp muestran el guardado.

- [x] `create-order` devuelve total e ítems verificados; el mensaje usa esos valores.
- [x] Refrescar precios del carrito con el catálogo actual al cargar.

### B3 🟠 Pedido sin transacción — código / Supabase · M

Pedido e ítems se insertan por separado: si fallan los ítems queda un pedido huérfano.

- [x] Mínimo: borrar el pedido si falla el insert de ítems. Ideal: una función SQL (migración nueva) que haga todo junto.

### B4 🟡 Horarios con la hora del dispositivo — código · S

`useAppStatus.ts` usa la hora local del celular, no la de Argentina.

- [x] Calcular con `America/Argentina/Buenos_Aires` (y lo mismo del lado del servidor en S3).

---

## Fase 3 — Escalabilidad del admin

### E1 🟠 Paginar pedidos y clientes — código · M

El admin trae todos los pedidos (con ítems) y clientes. PostgREST corta en 1000 filas: el panel y los
contadores van a quedar incompletos sin aviso.

- [ ] Filtrar/paginar en la consulta (activos vs. archivados, rango de fechas) y contadores con `count`.

### E2 🟡 Catálogo público trae productos pausados — código / Supabase · S

- [ ] Filtrar `is_active = true` en la consulta de la tienda (o por RLS para `anon`).

### E3 🟡 Code-splitting del admin (1,3 MB) — código · S

- [x] `lazy()` por ruta en `admin/src/router.tsx` (ya está en TODO.md).

---

## Fase 4 — Contenido multimedia

### M1 🟡 Borrado de contenido — código · S

`shared/lib/media-content.ts`

- [x] Borrar la fila primero (confirmando filas afectadas) y después la miniatura.
- [x] Nombre de archivo inconsistente: la función guarda `{id}.jpg`, el borrado busca `tiktok-{id}.jpg` → huérfanos.

### M2 🟡 Miniaturas cacheadas — código · S

- [x] Al resubir, usar un nombre nuevo (o `?v=timestamp`) para que el CDN no muestre la vieja.

---

## Fase 5 — Orden del repo y despliegue

### R1 🟠 Pushear los 20 commits pendientes — git · S

Producción no tiene lo último y hay riesgo de perder trabajo. (Solo cuando lo pidas.)

### R2 🟡 Sacar `supabase/.temp/` del repo — git · S ✅

Está commiteado aunque figura en `.gitignore` (no tiene claves). `git rm -r --cached supabase/.temp`.

### R3 🟡 Definir y aplicar el estilo de Prettier — código · S

100 archivos no cumplen. El código no usa punto y coma pero CLAUDE.md dice que sí.

- [ ] Decidir la regla, ajustar `.prettierrc`/CLAUDE.md y correr `npm run format` en un commit aparte.

### R4 🟡 Versionar config de Supabase — código · M

- [ ] Agregar `supabase/config.toml` (`verify_jwt` de cada función).
- [ ] Versionar el esquema base y las políticas RLS (ya en TODO.md; ver S1).

### R5 🟡 Headers y rutas en Vercel — código / Vercel · S

- [x] Admin: `X-Frame-Options: DENY` y `Referrer-Policy` en `admin/vercel.json`.
- [ ] Client: confirmar que recargar `/checkout` y `/privacidad` no da 404 (no tiene `vercel.json`).

### R6 🟡 Entorno — local · S

- [ ] Node local es 24; el proyecto pide 20 (`.nvmrc`). Usar `nvm use`.
- [ ] El `tsc` de la raíz es TS 6 (avisa `baseUrl` deprecado); las apps usan 5.9 y pasan.

### R7 🟡 Limpieza menor — código · S

- [x] Código muerto `{false && <svg>}` en `client/src/components/WhatsAppFloatButton.tsx`.
- [x] `compressImage` duplicado en `admin/src/hooks/useProducts.ts` y `useMediaContent.ts`.
- [x] Placeholder del login: "antojosexpres".
- [x] Imagen de producto: la extensión sale del archivo original pero el contenido siempre es JPEG.
