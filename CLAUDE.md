# Loyia — Claude Code Context

## Product
SaaS de programas de fidelización white-label para negocios locales chilenos.
- **Dominio:** loyia.cl
- **Primer cliente beta:** Castella (pastelería)
- **Moneda:** CLP (siempre formatear con `$` y separador de miles punto, ej. $1.500)
- **Notificaciones:** WhatsApp (no email/push)

## Dos interfaces
1. **Dashboard del Negocio** — autenticado, gestión de recompensas, clientes, transacciones
2. **Mini-webapp del Cliente** — pública, acceso por QR o link directo, registro solo con número de teléfono chileno

## Stack
- React 19 + Vite 8 + React Router DOM 7 + TanStack Query 5
- Supabase (auth + DB + realtime) — `@supabase/supabase-js` v2
- Tailwind CSS 4 — tokens en `src/index.css` vía `@theme {}` (NO en tailwind.config.js); postcss usa `@tailwindcss/postcss`
- lucide-react (iconos), recharts (gráficos), qrcode.react (QR), react-hot-toast (toasts), date-fns (fechas) — para escaneo QR se usa la API nativa BarcodeDetector (html5-qrcode fue removido del proyecto)

## Colores de marca (definidos en src/index.css vía @theme — Tailwind v4)
- Negro: `#0f0f0f` → `bg-dark` / `text-dark`
- Dorado: `#c9a84c` → `text-primary` / `bg-primary`
- Crema: `#f4f1ea` → `bg-cream` / `text-cream`

## Base de datos Supabase
Tablas principales: `businesses`, `loyalty_customers`, `rewards`, `transactions`
- Supabase: usar async/await directo (no React Query) — TanStack Query instalado pero aún no integrado
- Supabase count sin data: `.select('*', { count: 'exact', head: true })` → devuelve `{ count, data: null }`; para sumas, seleccionar la columna y reducir en JS
- Filtros de fecha: `.gte('created_at', isoString)` / `.lte(...)` — siempre pasar `.toISOString()`
- Row Level Security (RLS) habilitado — cada `business` solo ve sus propios datos

## Schema Supabase
- `businesses`: owner_id, name, slug, category, description, program_name, points_per_clp, welcome_points, primary_color (hex), logo_url (text, nullable), plan (text), last_activity_at (timestamp)
- `loyalty_customers`: business_id, phone, name, points_balance, visits_count, last_visit_at, joined_at (timestamp — fecha de registro del cliente; usar este campo para filtros de fecha, NO created_at)
- `transactions`: business_id, customer_id, type (welcome|earn|redeem), points_delta, amount_clp, created_at, reward_id (uuid nullable FK→rewards), cashier_id (uuid nullable FK→team_members), note (text nullable)
- `rewards`: business_id, name, description (nullable), points_required, type (product|discount|experience), is_active (boolean, default true), deleted_at (timestamptz nullable) — Soft-delete: `.update({ deleted_at: new Date().toISOString() })`; filtrar activas: `.eq('is_active', true).is('deleted_at', null)`
- `team_members`: business_id, name, pin_hash (bcrypt), is_active (boolean) — tabla del sistema de cajeros Pro

## Migraciones pendientes / ya aplicadas
```sql
ALTER TABLE transactions ADD COLUMN reward_id uuid REFERENCES rewards(id);
ALTER TABLE businesses ADD COLUMN logo_url text;
-- Storage: bucket 'logos' público; policy INSERT auth.uid() IS NOT NULL

-- Sistema de cajeros (plan Pro):
CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id),
  name text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transactions ADD COLUMN cashier_id uuid REFERENCES team_members(id);
ALTER TABLE transactions ADD COLUMN note text;
-- RLS team_members: anon puede SELECT (para login cajero con PIN); pin_hash bcrypt es seguro exponer
```

## Comandos útiles
- `npm run dev` — servidor local Vite
- `npm run build` — build de producción
- `npm run lint` — ESLint

## Patrones de página
- Helpers (`formatCLP`, `formatDate`, etc.) se definen inline por archivo — no hay carpeta utils compartida
- Queries independientes: usar `Promise.all([...])` para evitar waterfall
- Drawers: animación CSS pura con `translate-x` Tailwind; panel siempre en DOM mientras `drawerCustomer !== null`; `setTimeout(300)` limpia estado tras slide-out
- Constantes de UI (`TX_TYPE_LABEL`, `INPUT_CLASS`, etc.) a nivel módulo, fuera del componente
- Modal centrado (formularios): backdrop `fixed inset-0 bg-black/40 z-40` + panel `fixed inset-0 flex items-center justify-center z-50`; drawer (historial/readonly): slide-in desde la derecha
- QR codes: `import { QRCodeSVG } from 'qrcode.react'` (named export, NO default) — qrcode.react v4
- Theming dinámico por negocio: inyectar `primary_color` como `--accent` CSS variable en el wrapper; usar `style={{ color: 'var(--accent)' }}` o `background: accent` para aplicarlo
- recharts: `import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'`; siempre envolver en `<ResponsiveContainer width="100%" height={N}>`; color de línea/barra = `#c9a84c`; tooltip dark: `contentStyle: { background: '#1a1a1a', color: '#f4f1ea', border: 'none', borderRadius: 8 }`
- Mini-webapp dark theme input: `bg-white/[0.06] border border-white/[0.08] text-white placeholder-white/30 rounded-xl` (diferente al INPUT_CLASS del dashboard que usa `bg-white`)

## Convenciones
- Componentes en `src/components/`, páginas en `src/pages/`
- Rutas en `src/App.jsx` (React Router v7 con `<BrowserRouter>` + `<Routes>` component API)
- Cliente Supabase instanciado en `src/lib/supabase.js`
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Auth: no llamar `navigate()` tras `signIn()`/`signUp()` — PublicRoute/ProtectedRoute redirigen reactivamente al cambiar `user`
- Nombre del negocio en sidebar: viene de `user.user_metadata.business_name` (guardado con `supabase.auth.updateUser` en onboarding)
- PublicRoute redirige a `/onboarding` si `user_metadata.business_name` está vacío, a `/dashboard` si está presente
- Mini-webapp pública `/c/:slug`: no usa auth, queries anon — RLS debe permitir SELECT anon en `businesses` (by slug), `loyalty_customers` (by business_id), `rewards` (by business_id); e INSERT anon en `loyalty_customers` y `transactions`
- Admin email: `cristobal.broughton@gmail.com` — guard inline en `AdminPage` con `user.email !== ADMIN_EMAIL` → redirect `/dashboard`; link "Admin" en sidebar condicional al mismo email
- AdminPage queries sin filtro `business_id` — requiere RLS policy en Supabase: `auth.email() = 'cristobal.broughton@gmail.com'` puede SELECT all en todas las tablas

## NuevaCompraPage — flujo completo
- Vista `purchase` carga recentVisits + rewards activas en paralelo con `Promise.all` al entrar (tanto por teléfono como por QR)
- Sección "Canjear recompensa" en vista `purchase`: recompensas disponibles con botón "Canjear" (badge dorado), bloqueadas en gris con "Faltan X pts"
- Modal de confirmación de canje: `redeemTarget` state + backdrop `z-40` + panel `z-50`; re-fetch de `points_balance` antes de ejecutar (race condition protection)
- `handleRedeem`: INSERT `type='redeem'`, `points_delta` negativo, `reward_id`; UPDATE `loyalty_customers` solo `points_balance` (no `visits_count`); UPDATE `businesses.last_activity_at`
- `result` tiene campo `type: 'earn' | 'redeem'` — vista success bifurcada por este campo
- `transactions` requiere columna `reward_id uuid REFERENCES rewards(id)` (nullable) — añadir en Supabase con `ALTER TABLE transactions ADD COLUMN reward_id uuid REFERENCES rewards(id)`

## QR Scanner (NuevaCompraPage)
- Usa API nativa `BarcodeDetector` + `getUserMedia` — NO usar librerías de escaneo QR (html5-qrcode se probó y se removió del proyecto: fallaba silenciosamente en móvil)
- Patrón: `if (!('BarcodeDetector' in window))` → fallback a input manual de UUID
- Loop de escaneo con `requestAnimationFrame`; `detectedRef` previene detecciones múltiples
- Cleanup: `cancelAnimationFrame` + `stream.getTracks().forEach(t => t.stop())`
- `facingMode: 'environment'` selecciona cámara trasera en móvil, webcam en desktop
- Al encontrar cliente por QR: buscar en `loyalty_customers` por `id` + `business_id` con `.maybeSingle()` — nunca `.single()` (PGRST116 si no hay resultado)
- Vista `purchase` usa `customer.phone` directamente, NO `normalizePhone(phone)` — el estado `phone` puede estar vacío si se llegó por QR
- `handleCredit` actualiza `businesses.last_activity_at = now()` después de cada compra exitosa

## ConfiguracionPage (`/dashboard/configuracion`)
- Dos secciones independientes con botón "Guardar cambios" propio: "Tu negocio" y "Programa de puntos"
- Layout: `grid grid-cols-1 md:grid-cols-2 gap-6 items-start` — apiladas en móvil, side-by-side en desktop (`max-w-5xl`)
- Logo: upload a Supabase Storage bucket `logos`, path `{business_id}/logo.{ext}`, `upsert: true`; cache-buster: `publicUrl + '?t=' + Date.now()`
- Preview de logo: recuadro `bg-[#0f0f0f]` con logo circular y nombre en `primary_color` — muestra exactamente cómo se ve en la mini-webapp
- Slug: validar con `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`; verificar unicidad con `.neq('id', business.id).maybeSingle()` antes del UPDATE
- Color picker custom (sin librerías): botón swatch → popover con paleta 20 colores + input hex; cierra con click-outside via `useRef` + `document.addEventListener('mousedown')`
- Preview del color: botón simulado "Canjear recompensa" con `style={{ background: primary_color }}`

## DashboardLayout — responsive
- **Mobile (< md):** header superior fijo `h-14` con logo-link + nombre negocio + logout; bottom nav fija con 5 ítems (Inicio/Compra/Clientes/Premios/Config) + íconos + labels cortos; active = `text-primary` + barra `2px` en borde superior
- **Desktop (md+):** sidebar 240px idéntico al original, sin cambios
- Logo Loyia (estrella + texto) es `<Link to="/dashboard">` tanto en header móvil como en sidebar desktop
- Padding en páginas móvil: `pb-24 md:pb-8` en el div contenedor raíz de todas las páginas del dashboard
- Bottom nav soporta safe area iOS: `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}`
- Nav items desktop + bottom nav incluyen Analytics (BarChart2) entre Recompensas y Configuración
- **Layout cajero:** cuando hay sesión de cajero activa, el `<main>` usa `flex justify-center` + `<div className="w-full max-w-xl px-4">` para centrar el contenido de NuevaCompraPage

## Tablas responsivas (móvil)
- Patrón: `<div className="md:hidden">` con cards + `<div className="hidden md:block">` con tabla — ambos en el mismo render
- ClientesPage cards: nombre bold + teléfono gris + badge puntos dorado + última visita pequeña; click → drawer
- RecompensasPage cards: badge tipo (dorado/verde/morado) + puntos con estrella + nombre + descripción + badge activo/inactivo; click → modal edición

## LandingPage (`/`)
- `src/pages/LandingPage.jsx` — página pública de marketing; ruta `/` usa `<PublicRoute><LandingPage /></PublicRoute>` (redirige a /dashboard si hay sesión)
- Secciones: Navbar fija → Hero (dark) → Social Proof → Cómo funciona (`id="como-funciona"`) → Para quién es → Pricing → CTA final → Footer
- Scroll animations: hook `useFadeUp()` inline con `IntersectionObserver` (`threshold: 0.12`); toggle clases `opacity-0 translate-y-5` ↔ `opacity-100 translate-y-0` + `transition-all duration-700 ease-out` — sin librerías externas
- `PublicRoute` es reutilizable para cualquier página pública que deba redirigir usuarios autenticados (no solo login/register)

## MiniWebAppPage — logo del negocio
- `business.logo_url` incluido en el SELECT inicial
- Vista `phone`: logo circular 64px sobre el nombre, con borde `${accent}40`
- Vista `panel` header: logo circular 40px junto al programa y saludo del cliente
- Si `logo_url` es null/undefined: se omite la imagen sin romper el layout

## Sistema de Cajeros (plan Pro)
- Sesión cajero: objeto `{ type, business_id, business_name, cashier_id, cashier_name, slug }` en `localStorage` clave `loyia_cashier` — gestionado por `src/lib/cashierSession.js` (`setCashierSession`, `getCashierSession`, `clearCashierSession`, `isCashierSession`)
- Login cajero: tab "Cajero" en LoginPage — busca negocio por slug, carga TODOS los `team_members` (activos e inactivos), compara PIN con bcrypt; si match pero `is_active=false` → error específico "Este cajero está deshabilitado"; si no match → "PIN incorrecto"
- `ProtectedRoute`: acepta sesión de cajero además de sesión Supabase — redirige a `/login` solo si no hay ninguna de las dos
- `NuevaCompraPage`: detecta `isCashierSession()` para (1) ocultar empty state educativo, (2) adjuntar `cashier_id` y `note` al INSERT de transacción
- Toggle activo/inactivo en ConfiguracionPage: implementado con posicionamiento absoluto (`left-0.5` / `left-[18px]`) en vez de `translate-x` para evitar desalineación visual

## AnalyticsPage (`/dashboard/analytics`)
- Solo accesible para plan Pro — `getEffectivePlan(biz).plan !== 'pro'` redirige a `/dashboard`
- **Dos useEffects separados:**
  - `[business?.id]` — queries estáticas (Q5–Q11): mensuales, top clientes, reward perf, at-risk; se ejecutan una sola vez
  - `[business?.id, period]` — queries de período (Q0–Q4): KPIs, hora pico, día activo; se re-ejecutan al cambiar período
- **Campos de fecha en `loyalty_customers`:** usar `joined_at` (NO `created_at`) para todos los filtros y agrupamientos de fecha de registro
- **Q5 (gráfico mensual):** fetch sin filtro de fecha en server; agrupar en JS con `joined_at`; generar array de 12 meses hacia atrás desde hoy; meses sin clientes = 0
- **Q2/Q3 (clientes nuevos):** count con `joined_at >= periodStart` / `joined_at < periodStart` — NO `created_at`
- **KPICard** acepta `type: 'clp' | 'pp' | 'count'` para formatear diff:
  - `clp`: `↑ $X (Y%) vs periodo anterior` / `↓ -$X (-Y%) vs periodo anterior`
  - `pp`: `↑ Xpp vs periodo anterior`; enteros sin decimal (`100pp` no `100.0pp`)
  - `count`: `↑ N (Y%) vs periodo anterior`; si `prev === 0`, omitir porcentaje
- **rewards (Q9):** filtrar activas con `.eq('is_active', true).is('deleted_at', null)` — la columna `deleted_at` existe (soft-delete)
- Selector de período: PillToggle con opciones 30/60/90 días — solo afecta bloques KPI, hora pico, día activo
- Bloques estáticos (top clientes, reward perf, at-risk, gráfico mensual) NO cambian con el período
