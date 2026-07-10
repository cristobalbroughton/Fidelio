-- ============================================================================
-- Lote 1 — Fase A: RPCs SECURITY DEFINER + tabla de rate-limit
-- Auditoría #2. Junto con Fases B/C/D resuelve C3, C4, C5, C6, I7, I9, M6.
--
-- Esta migración NO revoca ningún acceso: las RPCs conviven con las policies
-- actuales sin romper nada. El lockdown (revocar SELECT/INSERT anon directo)
-- va en la migración de Fase D, SOLO tras verificar A/B/C.
--
-- Aplicar en el SQL Editor de Supabase (Docker no disponible localmente).
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Tabla de rate-limit para verify_cashier_pin ─────────────────────────────
create table if not exists public.cashier_pin_attempts (
  business_id  uuid primary key references public.businesses(id) on delete cascade,
  fail_count   int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.cashier_pin_attempts enable row level security;
-- Sin policies: solo las funciones SECURITY DEFINER la tocan; anon no accede directo.


-- ── 1. register_customer ─────────────────────────────────────────────────────
-- C3 (límite + payload server-side) + I9 (cliente + welcome tx atómicos) + M6.
create or replace function public.register_customer(
  p_business_id uuid,
  p_phone       text,
  p_name        text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_biz            record;
  v_effective_plan text;
  v_is_grace       boolean := false;
  v_max            int;
  v_count          int;
  v_customer       record;
begin
  select welcome_points, plan, pro_expires_at, owner_id
    into v_biz
    from businesses
   where id = p_business_id;

  if v_biz is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Replica getEffectivePlan (planLimits.js): grace 5 días tras el vencimiento.
  v_effective_plan := coalesce(v_biz.plan, 'free');
  if v_effective_plan <> 'free' and v_biz.pro_expires_at is not null then
    if v_biz.pro_expires_at < now() then
      if v_biz.pro_expires_at >= now() - interval '5 days' then
        v_is_grace := true;
      else
        v_effective_plan := 'free';
      end if;
    end if;
  end if;

  -- maxCustomers por plan (PLAN_LIMITS): free 50 / starter 300 / pro ∞.
  v_max := case v_effective_plan
             when 'free'    then 50
             when 'starter' then 300
             else null              -- pro / desconocido → sin límite
           end;

  if not v_is_grace and v_max is not null then
    select count(*) into v_count from loyalty_customers where business_id = p_business_id;
    if v_count >= v_max then
      update businesses
         set failed_registrations = coalesce(failed_registrations, 0) + 1
       where id = p_business_id;
      return jsonb_build_object('status', 'limit_reached');
    end if;
  end if;

  -- Pre-check de duplicado (defensa además del unique constraint).
  if exists (select 1 from loyalty_customers
              where business_id = p_business_id and phone = p_phone) then
    return jsonb_build_object('status', 'duplicate_phone');
  end if;

  begin
    insert into loyalty_customers
      (business_id, phone, name, points_balance, visits_count, last_visit_at)
    values
      (p_business_id, p_phone, nullif(btrim(p_name), ''),
       coalesce(v_biz.welcome_points, 0), 1, now())
    returning * into v_customer;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate_phone');
  end;

  insert into transactions (business_id, customer_id, type, points_delta, amount_clp)
  values (p_business_id, v_customer.id, 'welcome', coalesce(v_biz.welcome_points, 0), 0);

  update businesses set last_activity_at = now() where id = p_business_id;

  return jsonb_build_object(
    'status', 'ok',
    'customer', jsonb_build_object(
      'id', v_customer.id, 'name', v_customer.name, 'phone', v_customer.phone,
      'points_balance', v_customer.points_balance, 'visits_count', v_customer.visits_count
    )
  );
end;
$$;


-- ── 2. process_transaction ───────────────────────────────────────────────────
-- C4 (UPDATE atómico + guard >= 0 + FOR UPDATE) + C6 (el UPDATE del cajero
-- persiste porque la función corre con permisos elevados).
create or replace function public.process_transaction(
  p_customer_id  uuid,
  p_type         text,
  p_amount_clp   int,
  p_points_delta int,
  p_cashier_id   uuid,
  p_note         text,
  p_reward_id    uuid default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
  v_owner_id    uuid;
  v_new_balance int;
begin
  -- Bloquea la fila del cliente → serializa créditos/canjes concurrentes.
  select c.business_id, b.owner_id
    into v_business_id, v_owner_id
    from loyalty_customers c
    join businesses b on b.id = c.business_id
   where c.id = p_customer_id
   for update of c;

  if v_business_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Doble auth: dueño autenticado por ownership; cajero anon por cashier_id activo.
  if auth.uid() is not null then
    if v_owner_id <> auth.uid() then
      return jsonb_build_object('status', 'forbidden');
    end if;
  else
    if p_cashier_id is null
       or not exists (
         select 1 from team_members
          where id = p_cashier_id and business_id = v_business_id and is_active = true
       ) then
      return jsonb_build_object('status', 'invalid_cashier');
    end if;
  end if;

  update loyalty_customers
     set points_balance  = points_balance + p_points_delta,
         visits_count    = visits_count + (case when p_type = 'earn' then 1 else 0 end),
         total_spent_clp = coalesce(total_spent_clp, 0) + coalesce(p_amount_clp, 0),
         last_visit_at   = case when p_type = 'earn' then now() else last_visit_at end
   where id = p_customer_id
     and points_balance + p_points_delta >= 0
  returning points_balance into v_new_balance;

  if not found then
    return jsonb_build_object('status', 'insufficient_points');
  end if;

  insert into transactions
    (business_id, customer_id, type, points_delta, amount_clp, cashier_id, note, reward_id)
  values
    (v_business_id, p_customer_id, p_type, p_points_delta, p_amount_clp,
     p_cashier_id, nullif(btrim(p_note), ''), p_reward_id);

  update businesses set last_activity_at = now() where id = v_business_id;

  return jsonb_build_object('status', 'ok', 'points_balance', v_new_balance);
end;
$$;


-- ── 3. verify_cashier_pin ────────────────────────────────────────────────────
-- I7: comparación server-side; nunca expone pin_hash. Rate-limit persistido
-- por negocio (5 fallos / 30s), no reseteable con F5.
create or replace function public.verify_cashier_pin(
  p_business_id uuid,
  p_pin         text
) returns jsonb
-- pgcrypto (crypt) vive en el schema `extensions` en Supabase, no en `public`.
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_att    record;
  v_member record;
  v_now    timestamptz := now();
begin
  select * into v_att from cashier_pin_attempts
   where business_id = p_business_id for update;

  if found
     and v_att.window_start > v_now - interval '30 seconds'
     and v_att.fail_count >= 5 then
    return jsonb_build_object(
      'status', 'rate_limited',
      'retry_after', ceil(extract(epoch from (v_att.window_start + interval '30 seconds' - v_now)))
    );
  end if;

  -- El PIN identifica al cajero. Normaliza el prefijo bcrypt $2b$/$2y$ → $2a$
  -- porque pgcrypto crypt() solo verifica de forma fiable el esquema $2a$
  -- (equivalente para PINs cortos).
  select id, name, is_active into v_member
    from team_members
   where business_id = p_business_id
     and crypt(p_pin, regexp_replace(pin_hash, '^\$2[aby]\$', '$2a$'))
           = regexp_replace(pin_hash, '^\$2[aby]\$', '$2a$')
   limit 1;

  if v_member.id is not null and v_member.is_active then
    delete from cashier_pin_attempts where business_id = p_business_id;
    return jsonb_build_object(
      'status', 'ok',
      'cashier', jsonb_build_object(
        'id', v_member.id, 'name', v_member.name, 'business_id', p_business_id
      )
    );
  elsif v_member.id is not null then
    return jsonb_build_object('status', 'disabled');
  end if;

  -- Fallo: registra el intento (reinicia la ventana si ya expiró).
  insert into cashier_pin_attempts (business_id, fail_count, window_start)
  values (p_business_id, 1, v_now)
  on conflict (business_id) do update
    set fail_count = case when cashier_pin_attempts.window_start > v_now - interval '30 seconds'
                          then cashier_pin_attempts.fail_count + 1 else 1 end,
        window_start = case when cashier_pin_attempts.window_start > v_now - interval '30 seconds'
                          then cashier_pin_attempts.window_start else v_now end;

  return jsonb_build_object('status', 'invalid_pin');
end;
$$;


-- ── 4. get_platform_stats ────────────────────────────────────────────────────
-- C5: expone solo 3 enteros; permite quitar el SELECT anon de las tablas.
create or replace function public.get_platform_stats()
returns jsonb
language sql security definer set search_path = public
stable
as $$
  select jsonb_build_object(
    'businesses',   (select count(*) from businesses),
    'customers',    (select count(*) from loyalty_customers),
    'transactions', (select count(*) from transactions)
  );
$$;


-- ── 5. get_business_public ───────────────────────────────────────────────────
-- Soporte para el lockdown de businesses: solo campos públicos, por slug.
create or replace function public.get_business_public(p_slug text)
returns jsonb
language sql security definer set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', id, 'name', name, 'slug', slug, 'program_name', program_name,
    'points_per_clp', points_per_clp, 'welcome_points', welcome_points,
    'primary_color', primary_color, 'logo_url', logo_url, 'plan', plan
  )
  from businesses
  where slug = p_slug and is_active = true;
$$;


-- ── 6. get_customer_by_phone ─────────────────────────────────────────────────
create or replace function public.get_customer_by_phone(p_business_id uuid, p_phone text)
returns jsonb
language sql security definer set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', id, 'name', name, 'phone', phone,
    'points_balance', points_balance, 'visits_count', visits_count
  )
  from loyalty_customers
  where business_id = p_business_id and phone = p_phone;
$$;


-- ── 7. get_customer_by_id ────────────────────────────────────────────────────
-- Lookup por QR: exige que el cliente pertenezca al negocio esperado.
create or replace function public.get_customer_by_id(p_customer_id uuid, p_business_id uuid)
returns jsonb
language sql security definer set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', id, 'name', name, 'phone', phone,
    'points_balance', points_balance, 'visits_count', visits_count
  )
  from loyalty_customers
  where id = p_customer_id and business_id = p_business_id;
$$;


-- ── 8. get_customer_history ──────────────────────────────────────────────────
create or replace function public.get_customer_history(p_customer_id uuid, p_limit int default 5)
returns jsonb
language sql security definer set search_path = public
stable
as $$
  select coalesce(jsonb_agg(h order by h_created_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'type', t.type, 'points_delta', t.points_delta,
             'created_at', t.created_at, 'reward_name', r.name
           ) as h,
           t.created_at as h_created_at
    from transactions t
    left join rewards r on r.id = t.reward_id
    where t.customer_id = p_customer_id
    order by t.created_at desc
    limit p_limit
  ) sub;
$$;


-- ── Permisos ─────────────────────────────────────────────────────────────────
grant execute on function public.register_customer(uuid, text, text)                       to anon, authenticated;
grant execute on function public.process_transaction(uuid, text, int, int, uuid, text, uuid) to anon, authenticated;
grant execute on function public.verify_cashier_pin(uuid, text)                            to anon, authenticated;
grant execute on function public.get_platform_stats()                                      to anon, authenticated;
grant execute on function public.get_business_public(text)                                 to anon, authenticated;
grant execute on function public.get_customer_by_phone(uuid, text)                         to anon, authenticated;
grant execute on function public.get_customer_by_id(uuid, uuid)                            to anon, authenticated;
grant execute on function public.get_customer_history(uuid, int)                           to anon, authenticated;


-- ============================================================================
-- VERIFICACIÓN (Fase A) — correr manualmente en el SQL Editor, sustituyendo
-- los valores reales. NO avanzar a Fase B hasta que el test del PIN pase.
-- ----------------------------------------------------------------------------
-- select public.get_platform_stats();
--   → {"businesses":N,"customers":N,"transactions":N}
--
-- select public.verify_cashier_pin('<business_id real>', '<PIN de 6 dígitos conocido>');
--   → debe devolver {"status":"ok", "cashier":{...}}.
--   ⚠️ Si devuelve {"status":"invalid_pin"} con un PIN CORRECTO, la
--      normalización de prefijo bcrypt no coincide con el esquema real de los
--      hashes → PARAR y reportar para ajustar antes de tocar el frontend.
--
-- select public.get_business_public('<slug real>');
--   → objeto con los campos públicos, o null si el slug no existe/está inactivo.
--
-- -- Registro en un negocio de PRUEBA (crea cliente + welcome tx atómicos):
-- select public.register_customer('<business_id prueba>', '+56900000001', 'Test QA');
--   → {"status":"ok","customer":{...}}; repetir el mismo teléfono → "duplicate_phone".
-- ============================================================================
