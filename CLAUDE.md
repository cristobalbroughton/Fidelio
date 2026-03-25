# Fidelio — Claude Code Context

## Product
SaaS de programas de fidelización white-label para negocios locales chilenos.
- **Dominio:** fidelio.cl
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
- lucide-react (iconos), recharts (gráficos), qrcode.react (QR), react-hot-toast (toasts), date-fns (fechas)

## Colores de marca (definidos en src/index.css vía @theme — Tailwind v4)
- Negro: `#0f0f0f` → `bg-dark` / `text-dark`
- Dorado: `#c9a84c` → `text-primary` / `bg-primary`
- Crema: `#f4f1ea` → `bg-cream` / `text-cream`

## Base de datos Supabase
Tablas principales: `businesses`, `loyalty_customers`, `rewards`, `transactions`
- Supabase: usar async/await directo (no React Query) — TanStack Query instalado pero aún no integrado
- Row Level Security (RLS) habilitado — cada `business` solo ve sus propios datos

## Schema Supabase
- `businesses`: owner_id, name, slug, category, description, program_name, points_per_clp, welcome_points, primary_color (hex)
- `loyalty_customers`: business_id, phone, name, points_balance, visits_count, last_visit_at
- `transactions`: business_id, customer_id, type (welcome|earn|redeem), points_delta, amount_clp, created_at
- `rewards`: business_id, name, description (nullable), points_required, type (product|discount|experience), is_active (boolean, default true)

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
