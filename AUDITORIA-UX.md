# Auditoría UX/UI — Loyia (landing + dashboard + mini-webapp)

**Fecha:** 2026-07-04 · **Método:** revisión con skills *impeccable* + *ui-ux-pro-max* (WCAG 2.1 AA, Apple HIG, Material Design) sobre las 3 superficies.

---

## Resumen ejecutivo

| Superficie | Estado | Riesgo principal |
|---|---|---|
| Landing (`/`) | 🟠 Buena base, 2 problemas graves | Contenido invisible si el observer de animación no dispara; contraste dorado/crema |
| Dashboard (`/dashboard/*`) | 🟢 Sólido en feedback async, 🟠 débil en errores y a11y | Errores de datos = skeleton infinito sin "reintentar"; modales sin accesibilidad |
| Mini-webapp (`/c/:slug`) | 🔴 Es la cara ante el cliente final y tiene los bugs más visibles | Theming dinámico puede dejar texto ilegible; sin safe areas iOS; errores crudos de Supabase |

**Puntos fuertes que conservar:** feedback async muy consistente (disabled + spinner en todos los botones de acción), empty states con CTA bien escritos, skeletons sin layout shift en HomePage, patrón cards-móvil/tabla-desktop limpio en Clientes y Recompensas, gating de plan coherente, rate-limit de cajero con countdown.

**Esfuerzo total estimado:** ~16–20 h de código repartibles en 4 lotes (ver roadmap al final).

---

## 🔴 CRÍTICOS (arreglar primero — afectan visibilidad de contenido, legibilidad o confianza)

### C1. Landing: `useFadeUp` puede dejar secciones enteras invisibles
- **Evidencia:** `src/pages/LandingPage.jsx:12-30`. Todas las secciones bajo el hero arrancan en `opacity-0 translate-y-5` y solo se muestran cuando `IntersectionObserver` dispara con `threshold: 0.12`.
- **Impacto:** en viewports cortos, con JS lento/fallido, crawlers o tabs en background, SocialProof, HowItWorks, Pricing y CTA **no se ven nunca**. Además no respeta `prefers-reduced-motion` (WCAG 2.3.3). Riesgo SEO directo: Google puede ver la página "vacía" bajo el hero.
- **Cómo implementarlo:**
  1. Invertir la lógica: contenido visible por defecto; la clase de animación solo se aplica si JS confirma que puede animar.
  2. Respetar reduced-motion:
  ```js
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // en useFadeUp: if (prefersReduced || !('IntersectionObserver' in window)) { setVisible(true); return }
  ```
  3. Bajar `threshold` a `0.05` o usar `rootMargin: '0px 0px -10% 0px'` para secciones altas (Pricing).
  4. Fallback CSS: `@media (prefers-reduced-motion: reduce) { .fade-up { opacity: 1 !important; transform: none !important; } }`
- **Tiempo:** ~1 h · **Herramientas:** DevTools → Rendering → "Emulate prefers-reduced-motion"; probar con JS deshabilitado.

### C2. Mini-webapp: theming dinámico rompe contraste con colores oscuros
- **Evidencia:** `src/pages/MiniWebAppPage.jsx:173` (`accent = business.primary_color || '#c9a84c'`), usado como texto sobre `#0f0f0f` (`:238, :406`) y como fondo de botón con texto `#0f0f0f` (`:267, :352, :579`).
- **Impacto:** si un negocio elige navy, marrón o negro en el ColorPicker, el nombre del programa y el balance de puntos quedan **ilegibles**, y los botones quedan casi-negro-sobre-oscuro. Es la superficie que ve el cliente final del negocio → daña la percepción de todo el producto.
- **Cómo implementarlo:** helper de luminancia en `src/lib/utils.js`:
  ```js
  export function relativeLuminance(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  export const accentTextColor = (hex) => relativeLuminance(hex) > 0.35 ? '#0f0f0f' : '#ffffff'
  // Para texto accent sobre fondo dark: si luminancia < 0.25, aclarar (mezclar con blanco) antes de usar
  ```
  Aplicar `color: accentTextColor(accent)` en los 3 botones y clamp de luminancia mínima para los textos accent. Opcional: restringir la paleta del ColorPicker en ConfiguracionPage a colores con luminancia ≥ 0.3.
- **Tiempo:** ~1.5 h · **Herramientas:** WebAIM Contrast Checker para validar los umbrales elegidos.

### C3. Mini-webapp: errores crudos de Supabase + límite de plan fail-open
- **Evidencia:** `MiniWebAppPage.jsx:134` → `toast.error(err.message ?? 'Error al registrar')` muestra mensajes de Postgres/RLS al cliente final (ej. "duplicate key value violates unique constraint..."). Y `:102` → `if (count >= limits.maxCustomers)`: si la query de count falla, `count` es `null` y `null >= 50` es `false` → **el registro pasa aunque el conteo haya fallado**.
- **Cómo implementarlo:**
  ```js
  catch (err) {
    if (err.code === '23505') { /* teléfono ya existe → buscar y llevar al panel */ }
    else toast.error('No pudimos completar tu registro. Intenta de nuevo.')
  }
  // Fail-closed: if (count === null || count >= limits.maxCustomers) { ... }
  ```
  El caso `23505` conviene resolverlo recuperando al cliente existente con `.maybeSingle()` (mismo patrón de `handleSearch`).
- **Tiempo:** ~30 min.

### C4. Dashboard: error de datos = skeleton infinito, sin "reintentar"
- **Evidencia:** `src/pages/dashboard/HomePage.jsx:127-128` (toast + `metrics` queda `null` → tarjetas en `animate-pulse` para siempre); `AnalyticsPage.jsx:242, :444` (secciones simplemente no se renderizan). **No existe ningún estado de error visible con acción de reintento en toda la app.**
- **Cómo implementarlo:** componente reutilizable en `src/components/ErrorState.jsx`:
  ```jsx
  export default function ErrorState({ onRetry, message = 'No pudimos cargar los datos' }) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="w-8 h-8 text-dark/30 mx-auto mb-3" aria-hidden />
        <p className="text-sm text-dark/60 mb-4">{message}</p>
        <button onClick={onRetry} className="text-sm font-semibold text-primary underline underline-offset-4">Reintentar</button>
      </div>
    )
  }
  ```
  En cada página: estado `error` + extraer la carga a una función `load()` reusable para el retry. Aplicar en HomePage, AnalyticsPage, ClientesPage, RecompensasPage.
- **Tiempo:** ~1.5 h.

---

## 🟠 ALTOS (accesibilidad y conversión)

### A1. Contraste WCAG en textos y stats
- **Evidencia:** dorado `#c9a84c` sobre cream `#f4f1ea` en números de stats (~2:1, necesita 3:1 por ser texto grande) — `LandingPage.jsx:192-194, 364-366`. Texto `text-white/20`–`/35` sobre dark (copyright `:622`, metadatos `:358`), `text-dark/25`–`/45` masivo en dashboard, placeholders al 20% (`LoginPage.jsx:132`, `utils.js:25` `placeholder-dark/25`).
- **Cómo implementarlo:** definir un piso de opacidades y aplicarlo global: texto informativo mínimo `white/60` · `dark/60`; texto deshabilitado/decorativo mínimo `/45`; placeholders mínimo `/40`. Para los stats dorados sobre cream, oscurecer el dorado en contexto claro (ej. `#8a7332`, que sí pasa 3:1) o ponerlos sobre fondo dark.
- **Tiempo:** ~1.5 h (búsqueda global de `/(text|placeholder)-(white|dark)\/([0-3][0-9]?)\b` y ajuste) · **Herramientas:** WebAIM Contrast Checker, axe DevTools para verificación final.

### A2. Modales y drawers sin accesibilidad (universal)
- **Evidencia:** ningún modal/drawer cierra con **Escape**, ninguno tiene **focus trap**, `role="dialog"`, `aria-modal`, ni retorno de foco. Afecta: modal canje + QR scanner (`NuevaCompraPage.jsx:769, :929`), modal recompensa (`RecompensasPage.jsx:396` — además el backdrop cierra incluso durante `saving`), modal cajero + ColorPicker (`ConfiguracionPage.jsx:662, :762`), drawer clientes (`ClientesPage.jsx:429`). Botones X sin `aria-label`.
- **Cómo implementarlo:** hook compartido `src/lib/useModalA11y.js`:
  ```js
  export function useModalA11y(open, onClose) {
    useEffect(() => {
      if (!open) return
      const prev = document.activeElement
      const onKey = (e) => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', onKey)
      return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
    }, [open, onClose])
  }
  ```
  Más `role="dialog" aria-modal="true" aria-label="..."` en cada panel y `aria-label="Cerrar"` en cada X. (Focus trap completo es opcional en fase 1; Escape + roles + retorno de foco cubre el 80%.) Alternativa robusta sin librerías: migrar a `<dialog>` nativo con `showModal()`, que trae Escape y focus trap gratis.
- **Tiempo:** ~2 h para las 6 instancias.

### A3. Mini-webapp: sin safe areas iOS
- **Evidencia:** `index.html:5` sin `viewport-fit=cover`; ningún uso de `env(safe-area-inset-*)`. El footer (`MiniWebAppPage.jsx:586`) puede quedar bajo el home indicator del iPhone.
- **Cómo implementarlo:**
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  ```
  ```jsx
  <div style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
  ```
  (El bottom nav del dashboard ya lo hace — reutilizar ese patrón.)
- **Tiempo:** ~30 min · **Herramientas:** simulador iOS en Safari responsive mode o dispositivo real.

### A4. Mini-webapp: sin validación de teléfono chileno
- **Evidencia:** `src/lib/utils.js:1-6` — `normalizePhone` acepta cualquier cosa ("123" → "+123" y consulta la BD); `MiniWebAppPage.jsx:67-68` solo valida no-vacío. Un número mal tipeado crea un cliente fantasma con teléfono inválido.
- **Cómo implementarlo:**
  ```js
  export function isValidChileanMobile(raw) {
    const digits = raw.replace(/\D/g, '')
    return /^(56)?9\d{8}$/.test(digits)
  }
  ```
  Error inline bajo el input (mismo patrón que `nameError` en `:344`): "Ingresa un celular chileno válido (9 dígitos)". Aplicar también en `NuevaCompraPage` búsqueda por teléfono.
- **Tiempo:** ~45 min.

### A5. Focus visible eliminado en formularios de auth
- **Evidencia:** `focus:outline-none` con reemplazo débil (`focus:border-primary/50`) en `LoginPage.jsx:132`, `RegisterPage.jsx:130,143,157` y en el `INPUT_CLASS` global (`utils.js:25`). CTAs de la landing sin estilo `focus-visible`.
- **Cómo implementarlo:** en `INPUT_CLASS` e `INPUT_CLS`: `focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary`. Para botones/links, regla global en `index.css`:
  ```css
  :focus-visible { outline: 2px solid #c9a84c; outline-offset: 2px; }
  ```
- **Tiempo:** ~45 min · **Herramientas:** navegar toda la app solo con Tab.

### A6. Compartir `/c/:slug` por WhatsApp muestra preview genérico de Loyia
- **Evidencia:** `index.html:14-27` — OG estático; el link que el negocio comparte con sus clientes muestra "Loyia" en vez de su marca.
- **Cómo implementarlo (2 niveles):**
  - **Corto (~15 min):** `document.title = \`${business.name} — ${business.program_name}\`` al cargar el negocio en MiniWebAppPage (mejora tabs/historial, no el preview de WhatsApp).
  - **Completo (~3 h):** los crawlers de WhatsApp no ejecutan JS → se necesita OG server-side. Opciones: (a) Supabase Edge Function + rewrite de `/c/*` en el hosting (Vercel/Netlify) que inyecte meta tags del negocio, o (b) prerender de rutas `/c/:slug` conocidas. Documentado como decisión de infra pendiente.
- **Herramientas:** opengraph.xyz para validar previews; Supabase Edge Functions.

---

## 🟡 MEDIOS (fricción y consistencia)

### M1. Bottom nav móvil: 7 ítems y touch targets < 44px
- **Evidencia:** `DashboardLayout.jsx:73-81` (7 ítems, recomendado ≤5) y `:356-360` (~40px de alto). Labels inconsistentes con el sidebar ("Dashboard/Inicio", "Recompensas/Premios").
- **Fix:** dejar 5 ítems (Inicio, Compra, Clientes, Premios, Config) — Analytics y Ayuda pasan a un ítem "Más" o solo quedan en desktop. Subir el alto a ≥48px (`py-3`). Unificar labels con el sidebar.
- **Tiempo:** ~1 h.

### M2. Validación por toast en vez de inline
- **Evidencia:** `RecompensasPage.jsx:96-97`, `NuevaCompraPage.jsx:233`, `ConfiguracionPage.jsx:102-107`, OnboardingPage (botón deshabilitado sin explicar por qué). El único patrón correcto ya existe: PIN de cajero (`ConfiguracionPage.jsx:720-722`).
- **Fix:** replicar el patrón `pinError` (estado de error + `<p>` rojo bajo el campo + `aria-invalid`/`aria-describedby`) en los 4 formularios. Toast queda solo para errores de red.
- **Tiempo:** ~2 h.

### M3. Mini-webapp: sin empty state de recompensas ni celebración al registrarse
- **Evidencia:** `MiniWebAppPage.jsx:445` (sección se oculta si no hay recompensas — el cliente nuevo no ve qué puede ganar) y `:131-132` (transición muda a panel tras registrarse, sin reconocer los puntos de bienvenida).
- **Fix:** empty state "El negocio está preparando sus premios ✨" (texto, no emoji-icono); al registrarse, toast de éxito o banner en panel "¡Bienvenido! Ganaste X puntos" (estado `justRegistered` que se limpia a los 5s).
- **Tiempo:** ~1 h. Es la mejora de *engagement* más rentable de la lista.

### M4. Fonts bloqueantes e imágenes sin dimensiones (CLS)
- **Evidencia:** `src/index.css:1` — Google Fonts vía `@import` (bloquea render). `index.html` sin preconnect. Logo del testimonio (`LandingPage.jsx:300`) y logo del negocio (`MiniWebAppPage.jsx:229`) sin `width/height/loading`.
- **Fix:** mover fonts a `index.html` con `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` + `<link rel="stylesheet" ...>`; recortar pesos no usados (itálicas DM Sans). Añadir `width height loading="lazy"` a las `<img>`.
- **Tiempo:** ~45 min · **Herramientas:** Lighthouse (LCP/CLS antes-después).

### M5. Tres patrones de loading distintos
- **Evidencia:** skeletons `animate-pulse` (HomePage, Clientes, Recompensas) vs spinner en caja (`AnalyticsPage.jsx:81-87`) vs `Loader2` centrado (guards de página).
- **Fix:** estandarizar: skeleton para contenido con forma conocida, spinner solo para transiciones de página. Reemplazar `SkeletonCard` de Analytics por skeletons reales.
- **Tiempo:** ~1 h.

### M6. Controles sin semántica accesible
- **Evidencia:** toggles sin `role="switch"`/`aria-checked` (`RecompensasPage.jsx:482`, `ConfiguracionPage.jsx:636`); filas de tabla clickables sin teclado (`ClientesPage.jsx:381`, `RecompensasPage.jsx:362`); emojis como iconos (🔀 `DashboardLayout.jsx:99`, 🟡🔴 `AnalyticsPage.jsx:568-592`, 👋 `MiniWebAppPage.jsx:383`); tabs de login sin `role="tab"` (`LoginPage.jsx:154-166`).
- **Fix:** `role="switch" aria-checked={isActive}` en toggles; en filas `<tr tabIndex={0} role="button" onKeyDown={Enter}>`; reemplazar emojis por iconos Lucide (`Shuffle`, `AlertCircle` amarillo/rojo) con `aria-hidden` + texto; roles de tab.
- **Tiempo:** ~1.5 h · **Herramientas:** axe DevTools, lector VoiceOver/NVDA para spot-check.

### M7. Landing: grid fijo, copy redundante y CTAs inconsistentes
- **Evidencia:** `LiveSocialProof` con `grid-cols-3` fijo que aprieta números de 52px en móvil (`LandingPage.jsx:361` — comparar con SocialProof `:189` que sí colapsa); "Empieza gratis — es gratis" (`:156`); 4 textos distintos de CTA hacia `/register`.
- **Fix:** `grid-cols-1 sm:grid-cols-3`; copy → "Empieza gratis — sin tarjeta"; unificar CTA primario en "Empieza gratis" (navbar, hero, planes) dejando "Crear mi programa" solo en el CTA final.
- **Tiempo:** ~30 min.

### M8. Charts sin empty state + inputs numéricos inconsistentes
- **Evidencia:** BarCharts de Analytics (`:406, :427, :449`) y HomePage renderizan ejes vacíos sin mensaje; `type="number"` en Onboarding (`:247, :261, :308`) vs `inputMode="numeric"` en Config.
- **Fix:** si el dataset suma 0 → mensaje "Aún no hay transacciones en este período" en vez del chart; unificar a `type="text" inputMode="numeric"` + filtro regex (patrón de Config). Añadir `autoComplete="tel|name"` e `inputMode` en inputs de la mini-webapp (`MiniWebAppPage.jsx:254, :336`).
- **Tiempo:** ~1.5 h.

---

## 🟢 BAJOS (pulido y deuda menor)

| # | Ítem | Evidencia | Fix | Tiempo |
|---|---|---|---|---|
| B1 | Anti-patrones de plantilla: eyebrow uppercase ×6, card grids clonados (HowItWorks/ForWhom/Pricing mismo molde), numeral difuminado | `LandingPage.jsx:235,358,378,420,491,517` | Rediseño de cadencia: variar la intro de cada sección (una con eyebrow, otra solo heading grande, otra con lead paragraph); diferenciar layout de ForWhom (lista de dos columnas en vez de cards) | 3–4 h (opcional, estético) |
| B2 | JSON-LD structured data (Organization + Offer de planes), `theme-color`, manifest PWA para mini-webapp | `index.html` | `<script type="application/ld+json">` + `<meta name="theme-color" content="#0f0f0f">` + manifest mínimo | 1 h |
| B3 | Clase Tailwind inválida `w-4.5 h-4.5` | `NuevaCompraPage.jsx:468` | `w-[18px] h-[18px]` o `w-5 h-5` | 5 min |
| B4 | `Promise.all` de una sola promesa | `MiniWebAppPage.jsx:51` | await directo | 5 min |
| B5 | `URL.createObjectURL` sin `revokeObjectURL` (leak menor) | `ConfiguracionPage.jsx:350` | revoke en cleanup del efecto | 10 min |
| B6 | Touch targets pequeños: links de footer, "Cancelar" `text-dark/35 py-1`, "Cambiar número" | `LandingPage.jsx:608-617`, `NuevaCompraPage.jsx:657`, `MiniWebAppPage.jsx:292` | `py-2.5 min-h-[44px]` + subir contraste a `/60` | 30 min |
| B7 | Empty states duplicados móvil/desktop | `ClientesPage.jsx:253-283 vs 344-376`, RecompensasPage ídem | Extraer componente `EmptyState` compartido | 45 min |
| B8 | Logout sin confirmación ni loading; nombre del negocio pegado al botón logout en header móvil | `DashboardLayout.jsx:104-111,135-141` | confirm inline o spinner + separar targets | 30 min |
| B9 | Enter en input teléfono puede duplicar llamadas durante loading | `MiniWebAppPage.jsx:258` | `if (e.key === 'Enter' && !loading)` | 5 min |
| B10 | Logo upload: "Máx 2 MB" no se valida realmente | `ConfiguracionPage.jsx:346-354` | `if (file.size > 2*1024*1024) return toast.error(...)` + validar `file.type.startsWith('image/')` | 15 min |

---

## Inconsistencias transversales del dashboard (tabla de referencia)

| Patrón | Estado actual | Estándar propuesto |
|---|---|---|
| Loading | 3 estilos (skeleton / spinner-en-caja / Loader2 centrado) | Skeleton para contenido, Loader2 solo en guards |
| Validación de formulario | Toast (mayoría) vs inline (solo PIN cajero) | Inline junto al campo, toast solo red |
| Botón primario | `BTN_PRIMARY` duplicado en 3 archivos con `text-dark` vs `text-[#0f0f0f]` | Un solo export en `utils.js` (o componente `<Button>`) |
| Modales | Sin Escape/roles/focus, protección de backdrop dispareja | `useModalA11y` + backdrop protegido durante saving |
| Inputs numéricos | `type="number"` vs `inputMode="numeric"` | `inputMode="numeric"` + regex |
| Errores de datos | Toast + UI colgada | `ErrorState` con reintentar |
| Empty states | Duplicados por viewport | Componente compartido |

---

## Roadmap sugerido

**Lote 1 — Quick wins (~2.5 h):** C3, A3, M7, B3, B4, B5, B9, B10, título dinámico de A6. Bajo riesgo, alto retorno.

**Lote 2 — Críticos de visibilidad (~4 h):** C1 (fade-up), C2 (luminancia accent), C4 (ErrorState), A1 (contraste).

**Lote 3 — Accesibilidad (~5 h):** A2 (modales), A4 (teléfono), A5 (focus), M2 (validación inline), M6 (semántica).

**Lote 4 — Consistencia y pulido (~5 h):** M1, M3, M4, M5, M8, B6, B7, B8, B2.

**Fuera de alcance de código (decisiones):** A6 completo (OG dinámico requiere infra de hosting/edge functions), B1 (rediseño estético de la landing).

## Verificación por lote
1. `npm run lint` + `npm run build` en verde.
2. Lighthouse (móvil) en `/`, `/dashboard` y `/c/:slug` — comparar Performance/Accessibility antes-después (objetivo: a11y ≥ 90).
3. axe DevTools sin issues críticos en las 3 superficies.
4. Prueba manual: navegación completa solo con teclado (Tab/Escape) + DevTools "Emulate prefers-reduced-motion" + viewport 360px y iPhone con notch.
