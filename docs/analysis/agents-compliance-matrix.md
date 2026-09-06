# Matriz de cumplimiento de `AGENTS.md`

> Auditoría refrescada del checkout de AUR-19 el 6 de septiembre de 2026. La
> matriz registra hechos verificables del árbol resultante y no sustituye a
> `AGENTS.md`, `docs/PRODUCT.md`, `docs/DESIGN.md` ni `docs/EXCEPTIONS.md`.

## Cómo leer esta matriz

- **Cumple**: la evidencia inspeccionada satisface el contrato actual.
- **Parcial**: existe una brecha acotada que tiene propietario y criterio de
  salida explícitos en `docs/CURRENT_REFACTORS.md`.
- **No verificado**: requiere navegador, datos, infraestructura o un entorno
  externo que esta auditoría local no demuestra.
- Una brecha **no** se marca como excepción: `docs/EXCEPTIONS.md` sigue sin
  excepciones aprobadas. La única desviación confirmada de arquitectura es el
  puente temporal AUR-REF-020, con propietario y fecha de revisión.

## Matriz

| Área | Estado | Hecho verificado en este checkout | Propietario / salida |
| --- | --- | --- | --- |
| Fuente normativa | Cumple | `AGENTS.md`, `docs/PRODUCT.md`, `docs/DESIGN.md` y `docs/EXCEPTIONS.md` son las fuentes canónicas. | Revisión continua. |
| Composición de páginas | Cumple | Las páginas inspeccionadas componen vistas y no importan `db` ni esquemas de Drizzle. | Revisión continua. |
| Adaptadores Hono | Cumple | `accounts.ts` y `summary/by-account.ts` ya no importan Drizzle ni ejecutan consultas; todos los adaptadores inspeccionados limitan su trabajo a auth, validación HTTP, traducción de resultados y serialización. | AUR-19; mantener en nuevas rutas. |
| Propiedad de persistencia | Cumple en rutas revisadas | Las lecturas de cuentas y resúmenes aplican `userId`; las operaciones existentes de categorías, transacciones y CSV delegan en módulos server que mantienen sus comprobaciones de propiedad. | AUR-3 y propietarios de dominio; regresiones específicas siguen siendo necesarias para cada nueva operación. |
| Módulos server/domain | Cumple | Cuentas ahora vive en `features/accounts/server/account-operations.ts`; el resumen por cuenta vive en `features/summary/server/summary-operations.ts`; categorías, transacciones y CSV ya tenían operaciones server. | AUR-19; mantener operaciones fuera de adapters. |
| Proyecciones de persistencia | Cumple | Las consultas nuevas usan `select({ ... })` explícito y los `returning({ ... })` sólo exponen campos de operación. Los rows con `balance` se convierten a `value` dentro del módulo summary antes del límite HTTP. | Propietarios de dominio. |
| Resultados de dominio | Cumple | `AccountWriteResult`, `AccountDeleteResult` y `SummaryAccountBreakdown` son contratos de operación estrechos; los adapters traducen `not_found` a `API_ERRORS.NOT_FOUND`. | AUR-19; mantener contratos junto a la operación. |
| Dependencia `features → app` | Parcial, puente rastreado | Persisten cinco imports desde `features/*/components/columns.tsx` hacia `app/(dashboard)/*`. El puente y su criterio de eliminación están en AUR-REF-020; no se declara cumplimiento falso ni se crea una excepción. | AUR-20, coordinado por AUR-19; salida: ningún `@/app/` bajo `features/`. |
| Cliente HTTP interno | Cumple | `lib/hono.ts` construye el cliente tipado con base relativa `/`; no depende de `NEXT_PUBLIC_APP_URL!` ni de un origen hardcodeado. | AUR-21, cerrado. |
| Errores API | Cumple | `lib/api-errors.ts` es el único propietario tipado de respuestas API compartidas; auth, validación y rutas afectadas lo reutilizan. Los hooks consumen las respuestas tipadas del cliente Hono y traducen estados mediante `lib/api-client-error.ts`. | AUR-19 / revisión continua. |
| Validación y serialización | Cumple | Los esquemas Zod permanecen en el límite HTTP o en el feature que posee su significado; los adapters no contienen reglas de negocio ni SQL. | AUR-8 y propietarios de dominio. |
| Tipos de TypeScript | Cumple en el barrido local | No se encontraron `any` explícitos en fuentes; los tipos de UI no usan rows completos para evitar una proyección de runtime. | AUR-20, cerrado; revisión continua. |
| Imports e interface ownership | Parcial, puente rastreado | Las formas usan contratos de feature y el cliente tipado mantiene su seam; queda únicamente el puente feature-to-app de AUR-REF-020. | AUR-20 / AUR-19; salida definida en el refactor activo. |
| Query keys | Cumple en el barrido local | Las consultas e invalidaciones usan factorías por dominio, incluida la factoría de summary. | AUR-7, cerrado; revisión continua. |
| Estado cliente | Cumple en el alcance revisado | El store de sesión persistente que retenía resultados server fue retirado por AUR-20; el store restante sólo conserva estado efímero de resolución de UI. | AUR-20, cerrado; revisar nuevas superficies. |
| Rutas residuales | Cumple | AUR-22 retiró `(spacing-demo)` y el diagnóstico admin de la API de producto. | AUR-22, cerrado; build de producción. |
| Montaje HTTP | Cumple | Existe un único montaje en `app/api/[[...route]]/route.ts`; los módulos de dominio usan rutas relativas. | Revisión continua. |
| Dinero en los seams revisados | Cumple | `accounts.balance` se lee como milliunits y se convierte con `convertAmountFromMilliunits` sólo al formar el resultado summary. No se modifican triggers ni balances. | AUR-5 / AGENTS.md. |
| Migraciones y schema | No verificado por este ticket | No se modificó schema, SQL ni journal; no se ejecutaron comandos mutantes de base de datos. | AUR-5; requiere su propia evidencia. |
| Auth y secretos | Cumple en el alcance revisado | Las rutas cambiadas conservan `requireAuth`; no se leyeron secretos ni se agregaron valores de entorno. | AUR-4 / revisión continua. |
| Logs sensibles | No verificado por este ticket | La extracción de cuentas y summary no cambia logging; la auditoría integral de logs pertenece a sus propietarios. | AUR-4; requiere evidencia específica. |
| UI, responsive y a11y | No verificado por este ticket | No se cambió markup ni comportamiento visual; no se reclama evidencia de navegador. | AUR-17/AUR-18 y QA. |
| Excepciones | Cumple | `docs/EXCEPTIONS.md` no contiene excepciones aprobadas; AUR-REF-020 es un puente temporal con salida, no una excepción. | Revisión humana cuando se cierre el puente. |
| Runner formal de tests | No verificado | `package.json` contiene scripts diagnósticos y tests focalizados, pero no un runner único de suite. | Cada ticket especifica sus checks. |

## Resultado de la revisión de ownership

La revisión distingue tres seams para evitar confundir tipos estáticos con
proyección runtime:

1. `db/schema.ts` y los módulos `features/*/server/` son dueños de rows de
   persistencia y consultas explícitamente proyectadas.
2. Las operaciones server son dueñas de inputs/resultados de dominio; por
   ejemplo, cuentas expone `AccountResponse` y summary expone
   `SummaryAccountBreakdown`, no rows completos de Drizzle.
3. Los hooks y componentes consumen contratos inferidos del endpoint o props
   locales estrechas. Ningún cambio de este ticket acopla un Client Component
   a un row más amplio ni usa `Pick`/`Omit` como proyección runtime.

## Evidencia de hijos y límites

- `AUR-20`, `AUR-21` y `AUR-22` aparecen en Plane como `Done` y con
  `readiness-clear`; sus responsabilidades fueron revisadas contra el
  checkout, sin duplicar su implementación en AUR-19.
- AUR-19 sólo cerró aquí los seams server restantes de cuentas y summary,
  centralizó la coordinación documental y dejó el único gap confirmado con
  propietario en AUR-REF-020.
- No se modificaron Plane, despliegues, bases remotas, migraciones ni secretos.

## Verificación pendiente

- Navegador autenticado con datos ficticios para rutas protegidas y estados
  visuales.
- Planes de consulta, volumen real y migraciones en una base controlada.
- Eliminación del puente AUR-REF-020 por el propietario correspondiente.