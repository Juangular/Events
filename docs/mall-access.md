# Acceso automático a Mall del Sur y Plaza Norte

## Estado verificado el 7 de noviembre de 2026

Inicialmente Juan eligió una solución sin equipo propio. Después autorizó probar un runner temporal en su Mac. La primera ejecución manual de GitHub Actions usando ese equipo terminó correctamente; los runners cloud probados siguen bloqueados. Todavía no se instaló un servicio permanente ni se activó un cron local.

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

## Prueba con equipo propio

`.github/workflows/test-local-malls.yml` se activa únicamente a mano, por el propietario del repositorio y desde `main`. Usa la etiqueta dedicada `plan-lima-malls-test`; el runner temporal se registró sin etiquetas genéricas para no recibir trabajos dirigidos a `self-hosted`. El checkout usa el commit de la ejecución y no conserva credenciales de Git. La prueba ejecuta los dos adaptadores sin secretos de Supabase ni escritura en la base.

Se usó el runner oficial `actions/runner` 2.338.2 para macOS ARM64, verificando SHA-256 contra el digest publicado en su release. Se utilizó Chrome instalado y Node 22. La descarga y el checkout de prueba están en el directorio temporal de OpenCode, fuera del repositorio. No se instaló un servicio de inicio ni se modificó la suspensión del Mac.

Este workflow necesita registrar y arrancar de nuevo un runner temporal antes de otra prueba; el registro anterior dejó de existir al completar su único trabajo. No es todavía una automatización diaria.

Para pasar a producción se requiere autorizar la escritura con los secretos de GitHub y acordar el funcionamiento permanente del equipo. Después habrá que comprobar los registros insertados y su lectura pública, y decidir cómo se coordina la ejecución local de los malls con el cron existente del resto de fuentes. No basta con dejar un workflow en cola sin un runner disponible.

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
