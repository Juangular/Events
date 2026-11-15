# Auditoría de vulnerabilidades críticas

## Alcance y resultado

Revisión del código en `41388f2`, sus dependencias bloqueadas, configuración de despliegue, workflows de GitHub y fronteras de acceso a Supabase. Alcance solicitado: identificar y corregir únicamente vulnerabilidades críticas.

**Resultado: no se confirmaron vulnerabilidades críticas en las comprobaciones realizadas.** No se modificó código de aplicación, dependencias ni políticas SQL por motivos preventivos sin un hallazgo crítico demostrado. Este resultado no certifica la ausencia de vulnerabilidades.

## Evidencias

| Superficie | Comprobación | Resultado |
| --- | --- | --- |
| Dependencias del frontend | `npm audit --audit-level=critical --json` en la raíz | 0 críticas; el informe también contiene 1 dependencia con severidad alta, fuera del alcance solicitado. |
| Dependencias del pipeline | Mismo comando en `pipeline/` | 0 críticas; el informe también contiene 1 dependencia con severidad baja, fuera del alcance solicitado. |
| Alertas de GitHub | Consulta paginada de alertas Dependabot abiertas, filtradas por severidad crítica | 0 alertas críticas abiertas. |
| Credenciales en Git | Escaneo por patrones del historial de todas las referencias descargadas | 0 coincidencias de claves privadas, tokens GitHub, claves secretas Supabase, identificadores AWS y JWT con rol `service_role`. |
| Configuración local del frontend | Clasificación de la clave sin imprimir su valor | Clave pública `sb_publishable_`; sin `SUPABASE_SERVICE_ROLE_KEY` en el entorno de la comprobación. `.env.local` no está versionado. |
| Variables Vercel | Inspección de nombres y metadatos sin descifrar valores | Configuradas `VITE_SITE_URL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; sin variable `service_role`. |
| Acceso anónimo real | Peticiones GET limitadas a un registro, usando la clave pública local | Eventos publicados: 1 fila. Eventos y lugares no publicados: 0 filas. `automation_settings` y `sync_runs`: 0 filas. |
| Esquema versionado | Revisión de `supabase/schema.sql` | RLS habilitada en las cuatro tablas; políticas públicas de lectura de contenido publicado y gratuito; sin políticas públicas de escritura ni funciones `SECURITY DEFINER` en este archivo. |
| Renderizado y enlaces | Revisión de `src/App.tsx`, validación y carga de datos | Texto mediante JSX, enlaces de datos validados como HTTPS y enlaces externos con `noopener noreferrer`; sin un punto de ejecución de HTML arbitrario identificado. |
| Ingesta privilegiada | Revisión de `pipeline/src/db.ts`, `index.ts`, HTTP, navegador y descubrimiento de páginas | Cliente privilegiado aislado del frontend; URLs descubiertas restringidas al origen configurado; no se identificó ejecución de comandos construidos con contenido de las fuentes. |
| CI/CD | Revisión de los tres workflows | Permiso GitHub `contents: read`; entrada manual de fuente mediante variable de entorno entrecomillada; runner local limitado a `main` y ejecuciones programadas o manuales del propietario. |
| Producción | Estado del commit base en GitHub y proyecto Vercel | Integración GitHub/Vercel existente; despliegue del commit base exitoso. La publicación posterior del informe se verifica por separado. |

## Verificación local

- `npm run build`: correcto. La generación local de sitemap avisa de la ausencia de `VITE_SITE_URL`; la variable sí figura configurada en producción.
- En `pipeline/`, `npm test`: 28 pruebas aprobadas.
- En `pipeline/`, `npm run typecheck`: correcto.

## Límites

- El MCP de Supabase denegó la consulta de los catálogos de la base activa. Se verificaron el esquema versionado y las lecturas anónimas, pero no se pudieron enumerar las políticas, funciones, permisos ni avisos de seguridad de producción. Un resultado vacío por REST no demuestra por sí solo la existencia de RLS.
- No se intentaron escrituras ni explotación en producción. La ausencia de acceso público de escritura se revisó en el esquema versionado, sin probarla mediante mutaciones remotas.
- Los valores sensibles de Vercel no se descifraron; los metadatos no permiten comprobar el contenido de la clave de producción.
- El escaneo de secretos fue por patrones conocidos y no sustituye una detección exhaustiva ni permite descartar formatos no contemplados.
- Los avisos de dependencias y las alertas de GitHub corresponden al momento de la consulta y pueden cambiar.

## Guías aplicadas

- `security-auditor` local: seguimiento de datos, credenciales, permisos y vías de explotación; clasificación basada en evidencias.
- `ponytail` local: correcciones mínimas condicionadas a hallazgos confirmados.
- `supabase-postgres-best-practices` local, referencia `security-rls-basics`: comprobación del aislamiento en la base y distinción frente a filtros del frontend.
- `deploy-to-vercel` global: uso de la integración Git existente y verificación del estado del despliegue de producción solicitado.
