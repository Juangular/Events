# Acceso automático a Mall del Sur y Plaza Norte

## Estado verificado el 7 de noviembre de 2026

Inicialmente Juan eligió una solución sin equipo propio. Después autorizó probar un runner temporal en su Mac, publicar eventos y configurar la actualización diaria a las **22:00 de Perú**. Ya se publicaron 44 eventos y el runner permanente quedó instalado y conectado. La tarea de GitHub usa `0 3 * * *` (03:00 UTC); los runners cloud probados siguen bloqueados.

| Prueba | Mall del Sur | Plaza Norte |
| --- | --- | --- |
| Ingesta local sin escritura | Extracción completada | Extracción completada |
| GitHub Actions Ubuntu, ingesta actualizada | HTTP 403 / Cloudflare | HTTP 403 / Cloudflare |
| Diagnóstico GitHub Actions Ubuntu | HTTP 403 / Cloudflare | HTTP 403 / Cloudflare |
| Diagnóstico GitHub Actions macOS | HTTP 403 / Cloudflare | HTTP 403 / Cloudflare |
| GitHub Actions ejecutado en el Mac local, 7 de noviembre (Lima) | 37 candidatos, 31 válidos, 6 descartados, sin errores | 14 candidatos, 13 válidos, 1 descartado, sin errores |
| API `/wp-json/events-manager/v1/events`, sin autenticación, desde conexión local | HTTP 401 `rest_forbidden` | HTTP 401 `rest_forbidden` |
| RSS `/eventos/feed/`, desde conexión local | 50 entradas antiguas de 2023–2024 | 50 entradas antiguas de 2024 |

El RSS también devolvió entradas antiguas al probar `scope=future` y orden descendente. No sirve como reemplazo de la agenda vigente tal como responde actualmente. La existencia del índice público `/wp-json/` no concede permisos sobre su API de eventos. No se probaron escrituras ni endpoints administrativos.

Corridas:

- [Mall del Sur en el workflow de ingesta](https://github.com/Juangular/Events/actions/runs/42328714746): cero eventos obtenidos y publicados; error de acceso.
- [Plaza Norte en el workflow de ingesta](https://github.com/Juangular/Events/actions/runs/42328714744): cero eventos obtenidos y publicados; error de acceso.
- [Matriz Linux/macOS sin escritura](https://github.com/Juangular/Events/actions/runs/42350701720): los cuatro trabajos fallaron al acceder al listado; instalación, typecheck y pruebas pasaron. Incluye logs descargables durante siete días.
- [Prueba manual desde el Mac local](https://github.com/Juangular/Events/actions/runs/42434044036): extracción, typecheck y pruebas completados en 1 min 13 s. Fue `dry-run`: los contadores «publicados» representan candidatos válidos, no inserciones. Se descartaron eventos pasados y una programación ambigua. El runner efímero se dio de baja al terminar y GitHub confirmó cero runners registrados.

## Prueba inicial con equipo propio

La prueba inicial utilizó la etiqueta `plan-lima-malls-test` y un runner efímero de un solo trabajo. Fue reemplazado por el servicio permanente descrito abajo. El checkout usa el commit de la ejecución y no conserva credenciales de Git. Los secretos de Supabase solo se entregan a los pasos que necesitan publicar o reparar datos, después de instalar dependencias y pasar las pruebas.

Se usó el runner oficial `actions/runner` 2.338.2 para macOS ARM64, verificando SHA-256 contra el digest publicado en su release. Se utilizó Chrome instalado y Node 22. La descarga y el checkout de prueba están en el directorio temporal de OpenCode, fuera del repositorio. No se instaló un servicio de inicio ni se modificó la suspensión del Mac.

El runner de esas primeras pruebas dejó de existir al completar su trabajo. Ya no es necesario registrarlo otra vez para la operación normal: existe un servicio permanente independiente.

## Primera publicación real

[Ejecución 42434991285](https://github.com/Juangular/Events/actions/runs/42434991285), autorizada por Juan, completada en 1 min 13 s:

| Fuente | Obtenidos | Insertados publicados | Duplicados previos | Descartados | Errores |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mall del Sur | 37 | 31 | 0 | 6 | 0 |
| Plaza Norte | 14 | 13 | 0 | 1 | 0 |

La lectura con la clave pública de Supabase devolvió los 44 registros: todos publicados, gratuitos y de Lima, con 44 fingerprints distintos. Se verificaron en una sesión aislada del frontend local conectado a la base real los detalles y enlaces oficiales de Eddy Borshes (Mall del Sur) y Tony Cam (Plaza Norte). La URL única del despliegue obtenida de GitHub estaba protegida por Vercel; no se verificó esa URL como visitante. No se modificaron las políticas de Supabase en esta operación.

El runner se dio de baja al completar la tarea. Los secretos se suministraron al paso de ingesta, no al frontend ni al repositorio. La ejecución no actualizó ni borró eventos existentes.

## Operación diaria activa

- La extracción, validación, publicación, descarte de duplicados y reporte son automáticos **durante una ejecución**. No hay que cargar a mano cada evento.
- Los eventos ya guardados se sirven desde Supabase y Vercel aunque el Mac esté apagado. No es necesario desplegar otra vez para mostrar nuevas filas.
- **Malls en Mac local** publica automáticamente cada día a las **22:00 America/Lima** (03:00 UTC). GitHub puede retrasar el inicio de los trabajos programados; no es una garantía al minuto exacto.
- Runner: `plan-lima-malls-mac`, etiqueta exclusiva `plan-lima-malls`, sin etiquetas genéricas. Se instaló en `/Users/juan/.local/share/plan-lima-runner`, una ruta sin espacios. El primer intento en `Library/Application Support` falló antes del checkout por cómo GitHub invoca los scripts; aquel servicio se desinstaló y el runner se dio de baja antes de reinstalarlo en la ruta final.
- Inicio de sesión: `~/Library/LaunchAgents/actions.runner.Juangular-Events.plan-lima-malls-mac.plist`, con `RunAtLoad=true`. Servicio arrancado y verificado online después de completar una tarea real. No depende del editor ni de una terminal abierta.
- Para ejecutar a mano: GitHub → Actions → **Malls en Mac local** → Run workflow → rama `main`. Con `publish=true` publica; con `publish=false` solo comprueba. El propietario es el único actor manual admitido. La programación solo ejecuta código de `main`.
- El Mac debe estar encendido, con sesión iniciada, internet y **sin suspensión** alrededor de las 22:00 y hasta que termine la tarea. No se modificaron sus ajustes de energía ni se configuró un despertar automático. Después de reiniciar, hay que iniciar sesión para cargar el LaunchAgent.
- Si el Mac está apagado o suspendido, los eventos guardados siguen visibles; se retrasa la ingesta. GitHub puede mantener trabajos en cola hasta su límite de espera, así que no debe prometerse una hora de actualización cuando el equipo no está disponible.
- El cron del resto de fuentes continúa a las 06:00 America/Lima y ahora excluye los malls mediante `--exclude-source mall-del-sur --exclude-source plaza-norte`, para que no repita desde Ubuntu consultas que deben ejecutarse en el Mac.

La comprobación manual del servicio permanente pasó. La primera ejecución disparada por el horario aún debe confirmarse cuando llegue su turno. Cambios futuros de Cloudflare pueden requerir atención.

## Reparación de actividades continuas repetidas

La auditoría pública encontró copias de una misma ficha de EntradaLibre con inicio distinto pero idéntica fecha final. El `fingerprint` incluía el inicio y permitía reinsertarlas cuando la fuente movía el inicio a «hoy».

`pipeline/src/core/duplicates.ts` conserva el fingerprint para funciones independientes y añade una identidad de actividad continua: título y lugar normalizados, URL de la fuente y fecha final efectiva, con al menos un registro de varios días. Los parámetros de seguimiento se ignoran, pero se conservan parámetros que identifican funciones distintas. No se agrupan registros de un solo día solo por coincidir en nombre. Juan eligió inicialmente una tarjeta por función; al revisar el karaoke cambió esa preferencia por **una tarjeta por actividad recurrente, con las fechas en el detalle**. La agrupación se hace en el frontend (`src/lib/event-groups.ts`); las funciones siguen guardadas por separado y no se confunden con las copias incorrectas reparadas en la base.

[Ejecución de reparación e ingesta](https://github.com/Juangular/Events/actions/runs/42436968126), segundo intento después de corregir la ruta del servicio:

- Vista previa: 43 grupos con 43 copias para archivar.
- Aplicación: 43 filas automáticas, publicadas y gratuitas pasaron a `inactive`. Se conservaron las 43 filas con inicio más temprano, los IDs, fingerprints y el contenido original; no se borraron filas ni se modificaron registros manuales.
- Nueva auditoría: cero grupos pendientes con ese patrón. Lectura pública: 328 eventos frente a los 371 anteriores; los 44 de los malls siguen visibles y las 14 funciones reales de títeres se conservan.
- Ingesta de comprobación: cero inserciones nuevas; 31 duplicados reconocidos de Mall del Sur y 13 de Plaza Norte, sin errores.
- Caso real: una lectura actual de «7 Concurso de Narrativa Gráfica» empieza el 7 de noviembre, mientras la fila conservada empieza el 6. La identidad nueva reconoce que es la misma actividad y evita crear otra copia.

`npx tsx src/repair-duplicates.ts` solo muestra el plan. `--apply` archiva los duplicados. El input manual `repair_duplicates=true` requiere también `publish=true`; no se aplica por defecto ni durante el cron. Las pruebas cubren inicio variable, último día de un rango, conservación de funciones reales y paginación de datos existentes.

## Diagnóstico reproducible

El workflow manual `.github/workflows/diagnose-malls.yml` consulta solo estos dos malls en Linux y macOS administrados por GitHub. No recibe secretos de Supabase y ejecuta `ingest:dry`. No altera el cron de producción. Ejecutarlo de nuevo cuando haya un cambio de acceso confirmado:

```sh
gh workflow run diagnose-malls.yml --ref main
```

## Vía propuesta sin equipo propio

Solicitar al proveedor una API de eventos con acceso de solo lectura para integración externa, o un feed actualizado JSON/RSS/ICS. Si requiere credenciales, guardarlas como secretos de GitHub y usarlas únicamente en la ingesta. El acceso autorizado debe permitir tanto el listado como los datos necesarios de cada ficha desde GitHub Actions. Un cambio a otro proveedor cloud por sí solo no garantiza que desaparezca el bloqueo.

Antes de activar el nuevo transporte:

1. Verificar listado y detalles desde GitHub Actions, no solo localmente.
2. Comprobar que fecha, horario, lugar, imagen y condiciones de gratuidad se conservan.
3. Validar recurrencias explícitas; rechazar promociones condicionadas a compra.
4. Ejecutar sin escritura y después la ingesta normal, conservando fingerprints y resumen por fuente.

## Contactos publicados en las webs oficiales

- Mall del Sur: **malldelsur@wong.net.pe** — (01) 202-1111, anexo 463.
- Plaza Norte: **plazanorte@wong.net.pe** — (01) 410-6000.

Verificados en el pie de sus páginas `/eventos/`. No se enviaron mensajes.

### Borrador de solicitud

**Asunto: Integración de agenda gratuita con Plan Lima**

Hola:

Estamos integrando en Plan Lima los eventos gratuitos de su centro comercial, con enlace a la ficha original y atribución de la fuente.

La extracción funciona desde nuestra conexión de pruebas, pero las consultas desde GitHub Actions reciben HTTP 403 de Cloudflare. También encontramos la API de Events Manager (`/wp-json/events-manager/v1/events`), que responde HTTP 401 sin autorización. El RSS público devuelve eventos antiguos.

¿Podrían facilitarnos acceso de solo lectura a la agenda, un feed actualizado o el contacto del equipo técnico para autorizar la integración?

Necesitamos título, descripción, fecha y horario de la actividad, recinto, imagen, enlace original y condiciones de entrada. La consulta sería diaria, con pausas entre solicitudes. Publicaremos únicamente actividades realmente gratuitas y con información completa.

Gracias.
