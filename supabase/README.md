# Supabase — esquema y policies versionadas

Este directorio contiene el esquema de la base de datos y **todas las policies RLS** como migraciones versionadas (`migrations/*.sql`).

## Regla del proyecto

**Todo cambio de schema o policy RLS debe quedar registrado como migración en este directorio. Nunca solo en el dashboard.**

- Si haces un cambio en el dashboard de Supabase (policy, tabla, columna, función), inmediatamente después ejecuta:
  ```
  npx supabase db pull
  ```
  y commitea la migración generada.
- Para cambios nuevos, preferir escribir la migración primero:
  ```
  npx supabase migration new <nombre-descriptivo>
  npx supabase db push
  ```

## Por qué

La auditoría #2 (2026-05-15, hallazgo I10) encontró que toda la seguridad real de Loyia depende de RLS, pero las policies solo existían en el dashboard — sin trazabilidad, sin revisión en PRs, e imposibles de auditar desde el repo. Este directorio es la fuente de verdad versionada.

## Setup (una vez por máquina)

```
npx supabase login
npx supabase link --project-ref <project-ref>
```

El `<project-ref>` es el subdominio del proyecto (en `VITE_SUPABASE_URL`).
