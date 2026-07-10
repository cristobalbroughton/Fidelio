-- ============================================================================
-- SNAPSHOT de policies RLS — reconstruido desde pg_policies (2026-07-03)
-- Auditoría #2, hallazgo I10.
--
-- NO es un dump oficial de `supabase db pull` (Docker no disponible en la
-- máquina al momento del snapshot). Refleja fielmente el resultado de:
--   select * from pg_policies where schemaname = 'public';
-- Cuando Docker esté disponible, ejecutar `npx supabase db pull` y reemplazar
-- este archivo por el dump oficial (schema completo + policies).
--
-- NO ejecutar contra la base productiva: las policies YA existen allá.
-- Este archivo documenta el estado actual para trazabilidad y revisión.
--
-- ⚠️ AUDITORÍA: las policies marcadas [C3][C5][I7][C6] son los hallazgos
-- críticos confirmados de la auditoría #2 — ver plan de fixes por lotes.
-- ============================================================================

-- RLS habilitado en las 5 tablas:
-- businesses, loyalty_customers, rewards, team_members, transactions

-- ── businesses ──────────────────────────────────────────────────────────────

alter table public.businesses enable row level security;

create policy "owner manages business" on public.businesses
  for all to public
  using (owner_id = auth.uid());

create policy "admin full access businesses" on public.businesses
  for select to public
  using (auth.email() = 'cristobal.broughton@gmail.com'::text);

create policy "anon reads businesses by slug" on public.businesses
  for select to anon
  using (is_active = true);

-- [C5] SELECT sin restricción: expone TODAS las filas (owner_id incluido) a anon.
-- Redundante con las policies por slug/is_active — candidata a eliminación.
create policy "anon_read_businesses" on public.businesses
  for select to anon
  using (true);

create policy "public reads active business" on public.businesses
  for select to public
  using (is_active = true);

-- ── loyalty_customers ───────────────────────────────────────────────────────

alter table public.loyalty_customers enable row level security;

create policy "owner manages customers" on public.loyalty_customers
  for all to public
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- [C3] INSERT anon sin WITH CHECK real: permite payload arbitrario
-- (points_balance inflado, business_id de otro tenant, sin límite de plan).
create policy "anon inserts customers" on public.loyalty_customers
  for insert to anon
  with check (true);

create policy "admin full access customers" on public.loyalty_customers
  for select to public
  using (auth.email() = 'cristobal.broughton@gmail.com'::text);

-- [C5] CONFIRMADO CRÍTICO: anon puede leer TODOS los clientes de TODOS los
-- negocios (nombres, teléfonos, balances, total gastado) vía API directa.
create policy "anon reads customers" on public.loyalty_customers
  for select to anon
  using (true);

create policy "owner reads customers by id" on public.loyalty_customers
  for select to public
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- ── rewards ─────────────────────────────────────────────────────────────────

alter table public.rewards enable row level security;

create policy "owner manages rewards" on public.rewards
  for all to public
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "anon reads active rewards" on public.rewards
  for select to anon
  using (is_active = true);

create policy "public reads active rewards" on public.rewards
  for select to public
  using (is_active = true);

-- ── team_members ────────────────────────────────────────────────────────────

alter table public.team_members enable row level security;

create policy "owner_all" on public.team_members
  for all to public
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- [I7] CONFIRMADO: anon lee pin_hash de todos los cajeros de todos los
-- tenants → brute-force offline de PINs numéricos.
create policy "anon_select" on public.team_members
  for select to anon
  using (true);

-- ── transactions ────────────────────────────────────────────────────────────

alter table public.transactions enable row level security;

create policy "owner manages transactions" on public.transactions
  for all to public
  using (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- [C3] INSERT anon sin restricción: points_delta arbitrario, cualquier tenant.
create policy "anon inserts transactions" on public.transactions
  for insert to anon
  with check (true);

create policy "admin full access transactions" on public.transactions
  for select to public
  using (auth.email() = 'cristobal.broughton@gmail.com'::text);

-- [C5] Ledger completo de todos los negocios legible por anon.
create policy "anon_select_transactions" on public.transactions
  for select to anon
  using (true);

-- ============================================================================
-- [C6 — HALLAZGO NUEVO derivado de este snapshot]
-- NO existe policy UPDATE para anon en loyalty_customers ni en businesses.
-- El flujo de cajero (sesión localStorage, requests con rol anon) inserta la
-- transacción (permitido) pero su UPDATE de points_balance/visits_count y de
-- businesses.last_activity_at afecta 0 filas SIN ERROR → los créditos y canjes
-- hechos por cajeros registran el ledger pero NUNCA actualizan el saldo.
-- ============================================================================
