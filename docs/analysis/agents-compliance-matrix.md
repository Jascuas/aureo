# Matriz de cumplimiento de `AGENTS.md`

> Instantánea de auditoría del checkout `850812c` realizada el 16 de agosto de 2026. Este documento registra evidencias y trabajo pendiente; no sustituye a `AGENTS.md`, `docs/PRODUCT.md`, `docs/DESIGN.md` ni `docs/EXCEPTIONS.md`.

## Cómo leer esta matriz

- **Cumple**: la evidencia inspeccionada satisface el contrato actual.
- **Incumple**: existe una desviación reproducible en el código actual.
- **Parcial**: conviven patrones correctos e incorrectos o falta cerrar una excepción.
- **No verificado**: requiere una comprobación de ejecución, navegador, datos o infraestructura que esta auditoría de código no demuestra.
- **Resuelto**: la desalineación documental quedó corregida en `850812c`.

Las referencias a Plane indican el propietario del cambio, no que el ticket esté activo ni que exista automatización ejecutándolo. AUR-20, AUR-21 y AUR-22 se incorporaron como hijos de AUR-19 durante la normalización del backlog.

## Matriz

| Área | Estado | Hecho verificado | Propietario de cierre | Criterio de cierre |
| --- | --- | --- | --- | --- |
| Fuente normativa | Resuelto | `AGENTS.md`, `docs/PRODUCT.md`, `docs/DESIGN.md` y `docs/EXCEPTIONS.md` son los contratos canónicos; las reglas antiguas de `.opencode` quedaron subordinadas. | `850812c` | Ninguna instrucción local contradice los contratos canónicos. |
| Flujo Plane/Hermes | Resuelto | `AGENTS.md` delega las operaciones mutables al skill instalado `plane-ticket-routing`; no conserva estados ni IDs duplicados. | `850812c` | El skill resuelve estados e identificadores en vivo y requiere `hermes-auto` para despacho automático. |
| Composición de páginas | Cumple | Ningún `page.tsx` inspeccionado importa directamente `db` ni los esquemas de Drizzle. | Revisión continua | Las páginas siguen componiendo features sin acceder a persistencia. |
| Límites de dominio | Incumple | Los seis dominios existen, pero no hay módulos `features/*/server`; once adaptadores Hono contienen consultas y reglas de negocio. | AUR-19 | Las reglas y servicios de dominio viven en su feature; las rutas se limitan a transporte, auth, validación y mapeo. |
| Rutas residuales | Incumple | `(spacing-demo)` sigue exponiendo tres páginas de demostración y `/api/admin/verify-balances` sigue montado en la API. | AUR-22 | Las demos dejan de estar disponibles en producción y el diagnóstico se elimina o se formaliza como herramienta de operador protegida y acotada. |
| Montaje HTTP | Cumple | Hono se monta una sola vez en `app/api/[[...route]]/route.ts`; sus módulos usan rutas relativas al montaje. | Revisión continua | No aparecen montajes paralelos ni rutas que repitan `/api`. |
| Cliente HTTP interno | Parcial | No se encontraron `fetch` internos ad hoc, pero `lib/hono.ts` construye el cliente tipado con `NEXT_PUBLIC_APP_URL!`. | AUR-21 | El cliente funciona con URL relativa o con una resolución explícita y segura por runtime, sin origen de despliegue duplicado ni aserciones inseguras. |
| Propiedad por usuario | Incumple | Varias lecturas y mutaciones no demuestran el filtro compuesto por `userId` exigido por el contrato. | AUR-3 | Toda operación sobre recursos de usuario aplica propiedad en la consulta y cuenta con regresiones negativas. |
| Backstop de autenticación | Incumple | `proxy.ts` declara como ruta protegida únicamente `/`; la API depende de protecciones distribuidas por adaptador. | AUR-4 | Existe una política global coherente y cada endpoint sensible conserva autorización explícita. |
| Validación y paginación API | Parcial | Hay `zValidator` en múltiples rutas, pero los contratos de límites, paginación y respuestas no son uniformes. | AUR-8 | Inputs acotados, paginación estable y respuestas tipadas y consistentes. |
| Errores API | Parcial | Conviven respuestas estructuradas con errores PostgreSQL o fallos parciales expuestos de forma desigual. | AUR-11 y AUR-15 | Los límites traducen errores a un modelo compartido sin filtrar detalles internos. |
| `any` explícito | Incumple | `components/charts/account-chart/account-chart.tsx` tipa `activeShape` como `any`. | AUR-20 | No queda `any` explícito y el callback usa el tipo real de la librería o una proyección local mínima. |
| Propiedad de tipos | Incumple | Formularios y sheets de cuentas, categorías y transacciones importan esquemas de inserción desde `@/db/schema`. | AUR-20 | La UI consume contratos de feature; los tipos de persistencia no atraviesan el límite de presentación. |
| Proyecciones de escritura | Incumple | Diez escrituras usan `.returning()` sin proyección explícita. | AUR-20 | Cada escritura devuelve únicamente los campos requeridos por el contrato de salida. |
| Nombres de archivo | Cumple | El barrido de fuentes no encontró archivos fuera de `kebab-case`. | Revisión continua | Nuevos archivos mantienen la convención. |
| Imports y ciclos | Incumple | Persisten imports relativos profundos en CSV y un ciclo entre `const/import-const.ts` y `types/import-types.ts`. | AUR-20 | Imports internos usan alias estables y cada contrato tiene un único propietario sin ciclos. |
| Query keys | Incumple | Los hooks usan arrays literales; varias mutaciones invalidan `["summary"]` mientras las consultas se registran como `["overview"]`, `["over-time"]` o `["by-*"]`. | AUR-7 | Cada dominio publica una factoría de keys y todas las invalidaciones alcanzan exactamente las consultas afectadas. |
| Transaction types | Cumple | La consulta canónica usa `staleTime: Infinity`; AUR-2 está cerrado. | AUR-2 | Se conserva el catálogo como dato de referencia estable. |
| Estado cliente | Incumple | `features/csv-import/store/import-session.ts` persiste filas CSV y resultados derivados del servidor además de estado de flujo. | AUR-20 | Zustand conserva sólo estado efímero de UI/flujo; TanStack Query o servicios de feature son dueños de datos remotos y derivados. |
| Dinero y signo | Incumple | Los informes de código registran divergencias de precisión, signo y tratamiento de tipos financieros. | AUR-5 y AUR-6 | El catálogo financiero define la semántica y todas las capas aplican una única representación monetaria y de signo. |
| Migraciones | Incumple | `0002_fix_balance_trigger.sql`, `0003_fix_trigger_case_sensitivity.sql` y `0004_enable_pg_trgm.sql` no aparecen en `drizzle/meta/_journal.json`. | AUR-5 | El historial de migración es reproducible, revisado y no depende de SQL huérfano. |
| Índices y consultas | Parcial | Hay consultas funcionales, pero faltan límites e índices demostrados para rutas de alto volumen. | AUR-16 | Planes de consulta y pruebas con volumen justifican los índices y eliminan lecturas no acotadas. |
| Logs sensibles | Incumple | CSV import registra IDs, fechas, importes, payees, notas y fragmentos de respuestas de IA. | AUR-4 | Los logs usan campos permitidos, redacción central y no incluyen PII financiera ni payloads crudos. |
| Formularios y feedback | Incumple | Los hallazgos incluyen contratos de fecha/importe, copys inconsistentes, warnings de control y feedback de CRUD incompleto. | AUR-9 | Formularios tipados y controlados, copy correcto, errores visibles y refresco coherente. |
| Parsing CSV | Incumple | Delimitadores, locale, identidad de fila y normalización no forman aún un contrato único. | AUR-10 | El parser conserva identidad, interpreta formatos soportados de forma determinista y reporta errores por fila. |
| Importación CSV | Incumple | Persisten riesgos de idempotencia, propiedad, resultados parciales y plantillas. | AUR-11 | La importación es segura por usuario, idempotente cuando corresponde y devuelve resultados completos por fila. |
| Rendimiento CSV | Parcial | El flujo concentra transformaciones y estado de sesión en pipelines grandes. | AUR-12 | El rendimiento se mide después de corregir la semántica y los pipelines tienen límites claros. |
| Jerarquía de categorías | Incumple | La jerarquía y sus restricciones no se validan de forma uniforme en todas las operaciones. | AUR-13 | Se impiden ciclos, padres inválidos y eliminaciones que dejan datos incoherentes. |
| Resúmenes | Incumple | Los cálculos derivados dependen de los contratos aún divergentes de dinero, tipo e invalidación. | AUR-14 | Los agregados comparten semántica con persistencia y se verifican con casos límite. |
| Estados de dashboard | Incumple | Se han observado estados duplicados o inconsistentes de carga, vacío, error y datos parciales. | AUR-15 | Cada superficie distingue y prueba esos estados sin duplicar contenido. |
| Tokens de diseño | Incumple | Treinta y siete TSX contienen hex, paletas directas o estilos inline; parte de los inline es dinámica y aún no está registrada como excepción. | AUR-17 y AUR-18 | Colores y superficies usan tokens semánticos; sólo quedan excepciones dinámicas justificadas en `docs/EXCEPTIONS.md`. |
| Auth e import visual | Incumple | Auth y CSV import conservan gradientes/colores legacy y copy inglés fuera de la dirección canónica. | AUR-17 | Ambas superficies aplican `docs/DESIGN.md` y el producto en español. |
| Responsive, light y a11y | Parcial | Hay responsive existente, pero la auditoría visual detectó superficies que requieren verificación móvil, light mode, teclado y contraste. | AUR-18 | La matriz de navegador y viewport queda pasada con evidencia y sin regresiones críticas. |
| Observabilidad de excepciones | Cumple | No se encontraron bloques `catch` vacíos en el barrido de fuentes. | Revisión continua | Toda excepción se maneja, traduce o registra de forma segura. |
| Runner de tests | No verificado | `package.json` no declara un runner formal; el contrato permite checks focalizados y TypeScript/build según riesgo. | Cada ticket | Cada ticket especifica y ejecuta sus checks; un runner se añadirá sólo con alcance y valor definidos. |
| Automatización Hermes | No verificado | La configuración desatendida no forma parte del repositorio ni puede inferirse del estado de los tickets. | Operación humana | Antes de afirmar automatización se verifica en vivo runner, conectividad, estado y etiqueta `hermes-auto`. |

## Propiedad y orden de cierre

La matriz separa deliberadamente contratos que antes se solapaban:

1. **Seguridad y propiedad:** AUR-3 es dueño de propiedad por usuario; AUR-4 de auth global y logs seguros.
2. **Semántica financiera:** AUR-6 define tipos financieros; AUR-5 consume esa semántica para dinero, signo, balances y migraciones.
3. **Datos derivados:** AUR-7 define cache e invalidación; AUR-14 consume AUR-5, AUR-6 y AUR-7 para resúmenes; AUR-15 consume AUR-14 para estados del dashboard.
4. **CSV:** AUR-10 define parsing e identidad; AUR-11 consume AUR-3, AUR-5, AUR-6 y AUR-10 para corrección; AUR-12 optimiza sólo después.
5. **Experiencia:** AUR-8 estabiliza la API antes de AUR-9; AUR-17 alinea auth/import y AUR-18 extiende el sistema a responsive, light mode y accesibilidad.
6. **Arquitectura:** AUR-20 cierra propiedad de tipos/imports/estado, AUR-21 el contrato de URL del cliente y AUR-22 las rutas residuales. AUR-19 coordina la comprobación final y no duplica su implementación.

Plane no ofrece relaciones de dependencia utilizables en la instalación verificada: sus endpoints de definiciones y relaciones devolvieron `404`. Hasta que esa capacidad exista, el orden y los límites se mantienen en las descripciones de los tickets y en la jerarquía AUR-1 → AUR-19 → AUR-20/AUR-21/AUR-22.

## Alcance de la auditoría

### Hechos

- Se inspeccionaron estructura, imports, rutas, schemas, stores, query keys, migraciones, estilos y logs del checkout indicado.
- Los 55 bugs inventariados en `docs/analysis/bugs.md` quedan asignados a AUR-3–AUR-18; las tres brechas arquitectónicas sin propietario claro se asignan a AUR-20–AUR-22.
- `docs/analysis/ideas.md` contiene propuestas, no compromisos de producto.

### Inferencias

- El orden anterior reduce retrabajo porque hace explícitas las dependencias entre semántica, persistencia, datos derivados y UI.
- Los estilos inline calculados pueden ser legítimos; hasta verificarlos deben tratarse como desviación o excepción no registrada, no como eliminación automática.

### Verificación pendiente

- Navegador autenticado con datos ficticios para rutas protegidas y estados visuales.
- Comportamiento con datos de volumen, planes de consulta y migraciones sobre una base controlada.
- Estado operativo en vivo de Plane/Hermes en el momento de ejecutar cada ticket.
