# Plan Lima

Guía pública de eventos gratuitos en Lima. El frontend está construido con React, TypeScript y Vite; los eventos publicados se leen desde Supabase.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin `.env.local`, el entorno de desarrollo usa datos locales de demostración. El build de producción no lo hace: exige Supabase para evitar publicar datos ficticios accidentalmente.

`.env.local` nunca debe añadirse al repositorio. Si alguna clave sensible se versionó por accidente, revocarla o rotarla en el proveedor antes de continuar. La clave `anon`/publishable de Supabase está diseñada para el navegador, pero sigue siendo recomendable mantenerla solo en las variables de entorno del entorno correspondiente.

## Configurar Supabase

1. Crear un proyecto gratuito en [supabase.com](https://supabase.com).
2. Abrir `SQL Editor` en el proyecto.
3. Ejecutar todo el contenido de `supabase/schema.sql`.
4. En `Project Settings > API`, copiar `Project URL` y la clave pública `anon`.
5. Crear `.env.local` con:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
VITE_SITE_URL=https://tu-dominio.com
```

La clave `anon` puede estar en el frontend porque las políticas RLS solo permiten leer eventos publicados, gratuitos, vigentes y de Lima. Nunca usar la `service_role` en este proyecto frontend.

La aplicación interpreta las fechas de eventos como fechas de calendario en la zona horaria de Lima. Un evento se mantiene visible durante todo su `end_date`; si no tiene fecha final, se considera vigente durante todo su `start_date`.

## Cargar eventos reales

Desde `Supabase > Table Editor > events`, crear registros con estos valores mínimos:

- `status`: `published`
- `price_type`: `free`
- `department`: `Lima`
- `title`, `description`, `category`, `modality`
- `start_date` y opcionalmente `end_date`
- `time`, `place`, `organizer`
- `source`, `source_url`

Para eventos virtuales, usar `place` como `Sesión virtual` y colocar el enlace de participación en `registration_url` cuando corresponda. Para eventos presenciales, completar también `district`.

Antes de publicar cada registro, verificar manualmente que:

- el costo sea S/0 para cualquier persona;
- la fuente sea oficial y el enlace funcione;
- la fecha no haya terminado;
- la inscripción sea gratuita si se requiere registro;
- la imagen pueda utilizarse públicamente.

Los enlaces `source_url` y `registration_url` deben usar `https://`. Si `requires_registration` es `true`, `registration_url` es obligatorio.

La gestión mínima del contenido se realiza en el dashboard de Supabase. No existe un panel administrativo público y no debe exponerse uno sin autenticación.

## Ingesta automática de eventos

El directorio `pipeline/` contiene una herramienta que recolecta eventos gratuitos de Lima desde fuentes públicas y los escribe en `events`. Se ejecuta automáticamente con GitHub Actions (`.github/workflows/ingest-events.yml`) una vez al día a las 06:00 America/Lima y también puede correrse a mano desde la pestaña *Actions* con *Run workflow*. Cada ejecución consulta todas las fuentes: inserta únicamente eventos nuevos y omite duplicados; si no hay novedades, no cambia nada.

Fuentes actuales:

- **Agenda Cultural del Ministerio de Cultura** (`gob.pe`): se descarga el PDF semanal más reciente y se extraen únicamente actividades explícitamente gratuitas, con dirección en Lima o modalidad virtual. Se descartan actividades con costo, con boleto pago, de Callao y de otras regiones.
- **Eventbrite Lima** (`free--events`): datos estructurados JSON-LD; se acepta solo lo que la fuente marca con precio 0. Es una fuente de mejor esfuerzo: AWS WAF puede bloquear las IPs de GitHub Actions. El pipeline reintenta con Chromium/Playwright y, si no logra pasar el desafío, registra el error sin detener las demás fuentes.
- **Academia IPD**: descubre la temporada vigente y consulta los horarios oficiales por disciplina y complejo. Genera una tarjeta semanal por disciplina/sede con edades y horarios exactos; descarta horarios inválidos y regiones fuera de Lima. Requiere preinscripción en línea.
- **Municipalidad de San Isidro**: campañas con fecha, lugar, horario, gratuidad explícita e imagen oficial. Se descartan avisos administrativos, actividades con costo y eventos finalizados.
- **Municipalidad de Barranco**: actividades recurrentes publicadas recientemente, con gratuidad, horario y lugar verificables. Solo se proyectan dentro de la semana actual y se revalidan en cada corrida.
- **Municipalidad Metropolitana de Lima**: noticias oficiales con fecha, hora, lugar y gratuidad explícita.
- **Santiago de Surco**: eventos oficiales con gratuidad verificable. Si la fuente no publica fecha de inicio u horario, el registro queda como `draft` para revisión en lugar de inventar datos.
- **San Miguel y Pueblo Libre**: se consultan campañas y noticias oficiales; solo se incorporan cuando contienen datos completos y vigentes. Actualmente no hay eventos futuros que cumplan ese requisito.
- **Miraflores**: la agenda oficial `eventos-municipales` se procesa con los eventos disponibles, incluidos los antiguos, para validar la estructura de parsing (JSON-LD de cada página de evento). Los eventos pasados se descartan por fecha y no se publican; cuando la municipalidad publique eventos nuevos con la misma estructura, entrarán automáticamente. Si la estructura cambiara, la corrida fallaría como error de estructura en lugar de ignorarlo en silencio.
- **Lugar de la Memoria (LUM)**: agenda mensual de actividades con ingreso libre y gratuito.
- **Gran Teatro Nacional** (`gran-teatro-nacional`): `https://granteatronacional.pe/eventos`, San Borja. Usa fecha y horario del texto de la función, no el enlace de calendario cuando es inconsistente. Si exige inscripción y todavía dice `[pronto]`, se omite hasta que publique un enlace real. No se extraen sus imágenes `/sites/*`, restringidas en robots.txt.
- **Mall del Sur** (`mall-del-sur`): `https://malldelsur.pe/eventos/`, San Juan de Miraflores. Recorre la paginación y descarta promociones que exigen compras o consumo mínimo, aunque digan «gratis». Las recurrencias explícitas generan fechas solo para los días indicados.
- **Plaza Norte** (`plaza-norte`): `https://plazanorte.pe/eventos/`, Independencia. Procesa las fichas oficiales etiquetadas como gratuitas, con fecha, horario y recinto; comparte el parser de Events Manager con Mall del Sur.
- **EntradaLibre** (`entrada-libre`): `https://entradalibre.me/eventos/`. Recorre el listado nacional paginado, selecciona distritos de Lima y extrae el `Event` JSON-LD de cada ficha. Sus candidatos entran como `draft` para verificar la publicación original del organizador.
- **Running4Peru** (`running4peru`): `https://www.running4peru.com/eventos`. Solo fichas gratuitas de Lima, dentro de un horizonte de 90 días, con pausa de 10 segundos entre consultas y navegador de respaldo si encuentra una pantalla de verificación. Los datos agregados quedan en revisión.
- **Vamos Eventos** (`vamos-eventos`): `https://www.vamoseventos.com/lima/gratis`. Excluye las recomendaciones de pago del listado y extrae la descripción principal de cada evento, no sus anuncios. Guarda la publicación original cuando aparece en `raw.originalUrl`; los candidatos quedan en revisión. El proveedor publica restricciones de extracción automatizada en sus términos: esta integración técnica no otorga derechos de reutilización.

Hay 17 adaptadores registrados. Todos intentan primero la lectura HTTP; Eventbrite, Running4Peru, Vamos y los dos malls pueden usar Chromium si encuentran un bloqueo. El resto de fuentes oficiales no depende del navegador. Para desarrollo local se puede usar Chrome ya instalado con `PLAYWRIGHT_CHANNEL=chrome`; en CI se utiliza Chromium por defecto. Un desafío no resuelto se reporta como error, nunca como una agenda vacía. Que una fuente funcione desde una conexión local no garantiza que admita las IP de GitHub Actions.

Las nuevas fuentes tienen límites de 20 páginas y 500 fichas por ejecución, enlaces restringidos al mismo dominio y fallos de estructura visibles. Las fichas sin fecha verificable o con inscripción obligatoria sin enlace se omiten: el esquema exige esos datos y no se inventan. Los horarios ambiguos o recurrencias no interpretadas quedan como `draft`. EntradaLibre, Running4Peru y Vamos conservan `needsReview = true` incluso en modo `auto`: antes de aprobar, verificar gratuidad, organizador, distrito y publicación original, y actualizar `source_url` a la fuente oficial confirmada.

Cuando un evento no tiene `image_url`, la interfaz busca una imagen relacionada con el título dentro de su categoría y, si no encuentra coincidencia, usa la imagen general de la categoría. Tarjetas y modal comparten el fallback de imagen propia a imagen por título y finalmente por categoría, sin reintentos en bucle. Las imágenes manuales en Supabase no se modifican con las corridas del pipeline.

Cada candidato debe pasar los filtros de `pipeline/src/core/gates.ts`: gratuidad verificada, ubicación en Lima, fechas vigentes, URLs `https://` y campos mínimos. Los duplicados se detectan por `fingerprint` (título + fecha + lugar). Los registros automáticos llevan `origin = 'auto'` y `source_key`; RLS muestra solo eventos publicados, gratuitos y de Lima, y la interfaz organiza las fechas actuales, futuras y de archivo.

### Modo de publicación

La fila `publish_mode` de la tabla `automation_settings` controla el flujo:

- `auto`: los candidatos que pasan todos los filtros se publican directamente (`status = 'published'`); los que fallan un filtro suave quedan como `draft` para inspección.
- `review`: todo entra como `draft` y se aprueba manualmente desde `Supabase > Table Editor > events` (cambiar `status` a `published`).

Se cambia editando esa fila en Supabase; el pipeline la lee en cada corrida. La variable `PUBLISH_MODE` (`auto` o `review`) en el workflow la sobreescribe temporalmente.

### Configurar la automatización

1. Ejecutar `supabase/schema.sql` (añade columnas de automatización, `automation_settings` y `sync_runs`).
2. En GitHub del repositorio: *Settings > Secrets and variables > Actions*.
3. Crear los secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la clave `service_role` solo vive aquí; nunca en Vercel, el repositorio ni `.env.local`).
4. Opcional: crear la variable `PUBLISH_MODE` para forzar un modo sin tocar la base de datos.

Cada corrida deja un registro en `sync_runs` (obtenidos, publicados, borradores, duplicados, descartados y errores) para verificar la salud del pipeline. El workflow también escribe un resumen por fuente en la página de la corrida (pestaña *Summary*). **Solo se notifica cuando hay errores** (el workflow queda en rojo y GitHub envía la alerta de workflow fallido); cuando simplemente no hay eventos nuevos, la corrida queda en verde y no avisa. Las caídas permanentes conocidas —actualmente Eventbrite, bloqueado por su WAF— se listan como "degradadas" sin provocar alertas; la lista `KNOWN_OUTAGE_SOURCES` en `pipeline/src/index.ts` controla esa excepción. Para probar sin escribir nada:

```bash
cd pipeline
npm install
npm test
npm run typecheck
npm run ingest:dry
```

Para validar una sola fuente sin escribir: `npm run ingest:dry -- --source plaza-norte` (sustituir por cualquiera de las claves anteriores). Las pruebas cubren paginación y dominios permitidos, precios positivos o mixtos, compras obligatorias, distritos, horarios recurrentes, selección del evento principal frente a recomendaciones y enlaces de inscripción pendientes. El cron continúa diario a las 06:00 de Lima; un push publica el código en Vercel, pero la ingesta necesita el cron o una ejecución manual de Actions para añadir los registros a Supabase.

En *Run workflow*, el campo opcional `source` permite ejecutar una sola fuente con los secretos de GitHub (por ejemplo, `plaza-norte`). Dejarlo vacío ejecuta todas. El cron siempre consulta todas las fuentes; este filtro manual sirve para diagnosticar bloqueos o validar un adaptador sin repetir toda la corrida.

Agregar una fuente nueva consiste en crear un adaptador en `pipeline/src/sources/` con la interfaz `SourceAdapter` y registrarlo en `pipeline/src/index.ts`. Si un sitio cambia de diseño, el adaptador falla de forma aislada: el error queda en `sync_runs` y las demás fuentes siguen funcionando.

La interfaz permite alternar entre **Disponibles** y **Pasados** junto al selector de mes: en *Disponibles* se ven los eventos vigentes del mes elegido; en *Pasados*, los eventos ya finalizados de ese mes (por ejemplo, seleccionar octubre y ver la agenda pasada de octubre). Para ello, la lectura pública de `events` incluye eventos de cualquier fecha: aplica este cambio una sola vez en `Supabase > SQL Editor` (el resto de `supabase/schema.sql` es idempotente):

```sql
drop policy if exists "Public can read current free events" on public.events;
drop policy if exists "Public can read free Lima events" on public.events;

create policy "Public can read free Lima events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and price_type = 'free'
  and department = 'Lima'
);
```

## Cargar lugares recomendados

La tabla `places` también se crea al ejecutar todo `supabase/schema.sql`. Para publicar un lugar desde `Supabase > Table Editor > places`, usar como mínimo:

- `status`: `published`
- `price_type`: `free`
- `area`: `Lima`
- `name`, `description`, `category`
- `district`, `address`
- `hours`: opcional; se muestra cuando está disponible
- `source`: opcional; entidad responsable o fuente oficial del lugar
- `source_url`: enlace de ubicación de Google Maps
- `sort_order`: posición editorial de la tarjeta

Antes de publicar cada lugar, verificar manualmente que el acceso sea gratuito, la dirección esté vigente, el enlace de Google Maps corresponda al lugar y la imagen pueda utilizarse públicamente. Si se informa `hours` o `source`, verificar que sus datos estén actualizados. En desarrollo, cuando no hay variables de Supabase, la interfaz usa 15 lugares locales de demostración; producción siempre requiere registros publicados en Supabase. `price_type` conserva el valor `paid` para una futura ampliación, pero la consulta pública actual solo muestra `free`.

Cada tarjeta y cada detalle de lugar incluye un botón `Ver en Google Maps` que utiliza directamente `places.source_url`. Los registros publicados deben usar una URL HTTPS de Google Maps. Los campos `hours` y `source` pueden quedar vacíos; la interfaz oculta esas secciones cuando no tienen contenido.

La etiqueta `Actualizado` del encabezado muestra la fecha `updated_at` más reciente entre los eventos y lugares públicos cargados desde Supabase. En desarrollo sin Supabase muestra `localmente`.

## Despliegue en Vercel

1. Crear un repositorio Git y subir el proyecto sin `.env.local`.
2. Importar el repositorio en [Vercel](https://vercel.com).
3. Usar estos valores:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Añadir `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_SITE_URL` en las variables de entorno de Vercel para `Production` y `Preview`.
5. Desplegar.
6. Abrir la URL pública y confirmar que los eventos vienen de Supabase.

`VITE_SITE_URL` permite generar automáticamente `sitemap.xml` y completar el enlace del sitemap en `robots.txt` durante el build de producción.

Netlify puede usarse de forma equivalente con el mismo comando de build y directorio de salida.

## Verificación antes del lanzamiento

```bash
npm run build
```

En la URL desplegada comprobar:

- carga de eventos reales;
- filtro por mes;
- eventos que cruzan meses;
- filtros de categoría y modalidad;
- búsqueda;
- exclusión de eventos terminados;
- detalle de cada tarjeta;
- enlaces oficiales e inscripción;
- botón de ubicación de cada lugar en Google Maps;
- vista móvil;
- mensaje de error cuando Supabase no esté disponible.
- navegación entre meses que cruce de año;
- horario y fuente oficial en el detalle de cada lugar;
- enlaces `https://` y datos de registro válidos.

## Pendientes operativos antes de hacerlo público

- Crear el proyecto Supabase de producción.
- Ejecutar `supabase/schema.sql`.
- Cargar y verificar eventos reales.
- Configurar las variables en el hosting.
- Revisar permisos RLS desde una ventana incógnito.
- Sustituir cualquier imagen de prueba por imágenes autorizadas.
- Añadir un canal de contacto visible y un aviso breve de verificación en la fuente oficial.
- Opcionalmente conectar un dominio propio; la URL gratuita de Vercel/Netlify permite validar el MVP inicialmente.

## Mantenimiento recomendado

- Revisar semanalmente que las fechas, horarios, imágenes y enlaces publicados sigan vigentes.
- Ejecutar `npm run build` antes de cada despliegue.
- Configurar `VITE_SITE_URL` solo en los entornos que deban aparecer en buscadores; las previews pueden mantenerse fuera del índice.
- Después de cambios de esquema, ejecutar nuevamente todo `supabase/schema.sql` y revisar los datos existentes si se añaden restricciones nuevas.
