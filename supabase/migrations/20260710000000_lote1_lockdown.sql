-- ============================================================================
-- Lote 1 — Fase D: Lockdown de policies (revocar acceso anon directo)
-- Auditoría #2. Cierra C3, C5, I7.
--
-- Precondición: Fases A/B/C ya aplicadas y verificadas. Todo el acceso anon
-- pasa ahora exclusivamente por las RPCs SECURITY DEFINER de
-- _lote1_rpcs.sql. La única lectura directa que se mantiene para anon es
-- rewards (is_active = true), por no ser PII.
--
-- YA APLICADA en producción — este archivo la versiona para trazabilidad.
-- Aplicar en el SQL Editor de Supabase.
-- ============================================================================

-- ── C5 — Volcado masivo de PII: anon ya no lee filas de estas tablas ─────────
-- Los clientes se leen puntualmente vía get_customer_by_phone / get_customer_by_id
-- / get_customer_history (scoped por parámetro).
drop policy if exists "anon reads customers"        on public.loyalty_customers;
drop policy if exists "anon_select_transactions"    on public.transactions;

-- ── C3 — INSERT anon sin restricción: registro y transacciones pasan por RPC ─
-- register_customer (límite + welcome_points server-side) y process_transaction
-- (atómico + doble auth) son ahora la única vía de escritura anon.
drop policy if exists "anon inserts customers"      on public.loyalty_customers;
drop policy if exists "anon inserts transactions"   on public.transactions;

-- ── I7 — pin_hash expuesto a anon: login de cajero pasa por RPC ──────────────
-- verify_cashier_pin compara server-side con pgcrypto y nunca devuelve pin_hash.
drop policy if exists "anon_select"                 on public.team_members;

-- ── C5 (businesses) — datos del negocio solo por campos públicos vía RPC ─────
-- get_business_public(p_slug) devuelve únicamente campos no sensibles.
drop policy if exists "anon reads businesses by slug" on public.businesses;
drop policy if exists "anon_read_businesses"          on public.businesses;
drop policy if exists "public reads active business"  on public.businesses;

-- ── Se mantienen intactas ────────────────────────────────────────────────────
--   • businesses / loyalty_customers / transactions / team_members / rewards:
--     owner policies (owner_id = auth.uid()) y admin (auth.email() = ...).
--   • rewards: "anon reads active rewards" (is_active = true) — no es PII,
--     la usan mini-webapp y modo cajero.
-- ============================================================================
