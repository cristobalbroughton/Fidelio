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
- Tailwind CSS 4 (config en `tailwind.config.js`)
- lucide-react (iconos), recharts (gráficos), qrcode.react (QR), react-hot-toast (toasts), date-fns (fechas)

## Colores de marca (definidos en src/index.css vía @theme — Tailwind v4)
- Negro: `#0f0f0f` → `bg-dark` / `text-dark`
- Dorado: `#c9a84c` → `text-primary` / `bg-primary`
- Crema: `#f4f1ea` → `bg-cream` / `text-cream`

## Base de datos Supabase
Tablas principales: `businesses`, `loyalty_customers`, `rewards`, `transactions`
- Toda query a Supabase va en hooks de React Query (`useQuery` / `useMutation`)
- Row Level Security (RLS) habilitado — cada `business` solo ve sus propios datos

## Comandos útiles
- `npm run dev` — servidor local Vite
- `npm run build` — build de producción
- `npm run lint` — ESLint

## Convenciones
- Componentes en `src/components/`, páginas en `src/pages/`
- Rutas en `src/App.jsx` (React Router v7 con `createBrowserRouter`)
- Cliente Supabase instanciado en `src/lib/supabase.js`
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
