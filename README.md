# Plan Lima

Guía pública de eventos gratuitos en Lima y Callao. El frontend está construido con React, TypeScript y Vite; los eventos publicados se leen desde Supabase.

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

La clave `anon` puede estar en el frontend porque las políticas RLS solo permiten leer eventos publicados y gratuitos de Lima o Callao. Las fechas pasadas siguen disponibles para el archivo. Nunca usar la `service_role` en este proyecto frontend. En una base existente, ejecutar el esquema completo actualizado para habilitar también las lecturas de Callao.

La aplicación interpreta las fechas de eventos como fechas de calendario en la zona horaria de Lima. Un evento se mantiene visible durante todo su `end_date`; si no tiene fecha final, se considera vigente durante todo su `start_date`.

## Cargar eventos reales

Desde `Supabase > Table Editor > events`, crear registros con estos valores mínimos:

- `status`: `published`
- `price_type`: `free`
- `department`: `Lima` o `Callao`
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

El directorio `pipeline/` contiene una herramienta que recolecta eventos gratuitos de Lima y Callao desde fuentes públicas y los escribe en `events`. Las fuentes cloud se ejecutan con GitHub Actions (`.github/workflows/ingest-events.yml`) a las 06:00 America/Lima, excluyendo los malls. Mall del Sur y Plaza Norte usan `.github/workflows/test-local-malls.yml` a las **22:00 America/Lima**, mediante el runner permanente del Mac. También se pueden ejecutar a mano desde *Actions*. Cada corrida inserta únicamente eventos nuevos y omite duplicados.

Fuentes actuales:

- **Agenda Cultural del Ministerio de Cultura** (`gob.pe`): se descarga el PDF semanal más reciente y se extraen únicamente actividades explícitamente gratuitas, con dirección en Lima/Callao o modalidad virtual. Se descartan actividades con costo, con boleto pago y de otras regiones.
- **Eventbrite Lima** (`free--events`): datos estructurados JSON-LD; se acepta solo lo que la fuente marca con precio 0. Es una fuente de mejor esfuerzo: AWS WAF puede bloquear las IPs de GitHub Actions. El pipeline reintenta con Chromium/Playwright y, si no logra pasar el desafío, registra el error sin detener las demás fuentes.
- **Academia IPD**: descubre la temporada vigente y consulta los horarios oficiales por disciplina y complejo. Genera una tarjeta semanal por disciplina/sede con edades y horarios exactos; descarta horarios inválidos y regiones fuera de Lima. Requiere preinscripción en línea.
- **Municipalidad de San Isidro**: campañas con fecha, lugar, horario, gratuidad explícita e imagen oficial. Se descartan avisos administrativos, actividades con costo y eventos finalizados.
- **Municipalidad de Barranco**: actividades recurrentes publicadas recientemente, con gratuidad, horario y lugar verificables. Solo se proyectan dentro de la semana actual y se revalidan en cada corrida.
- **Municipalidad Metropolitana de Lima**: noticias oficiales con fecha, hora, lugar y gratuidad explícita.
- **Santiago de Surco**: eventos oficiales con gratuidad verificable. Si la fuente no publica fecha de inicio u horario, se omiten en lugar de inventar datos.
- **San Miguel y Pueblo Libre**: se consultan campañas y noticias oficiales; solo se incorporan cuando contienen datos completos y vigentes. Actualmente no hay eventos futuros que cumplan ese requisito.
- **Miraflores**: la agenda oficial `eventos-municipales` se procesa con los eventos disponibles, incluidos los antiguos, para validar la estructura de parsing (JSON-LD de cada página de evento). Los eventos pasados se descartan por fecha y no se publican; cuando la municipalidad publique eventos nuevos con la misma estructura, entrarán automáticamente. Si la estructura cambiara, la corrida fallaría como error de estructura en lugar de ignorarlo en silencio.
- **Lugar de la Memoria (LUM)**: agenda mensual de actividades con ingreso libre y gratuito.
- **Gran Teatro Nacional** (`gran-teatro-nacional`): `https://granteatronacional.pe/eventos`, San Borja. Usa fecha y horario del texto de la función, no el enlace de calendario cuando es inconsistente. Si exige inscripción y todavía dice `[pronto]`, se omite hasta que publique un enlace real. No se extraen sus imágenes `/sites/*`, restringidas en robots.txt.
- **Mall del Sur** (`mall-del-sur`): `https://malldelsur.pe/eventos/`, San Juan de Miraflores. Recorre la paginación y descarta promociones que exigen compras o consumo mínimo, aunque digan «gratis». Las recurrencias explícitas generan fechas solo para los días indicados.
- **Plaza Norte** (`plaza-norte`): `https://plazanorte.pe/eventos/`, Independencia. Procesa las fichas oficiales etiquetadas como gratuitas, con fecha, horario y recinto; comparte el parser de Events Manager con Mall del Sur.
- **EntradaLibre** (`entrada-libre`): `https://entradalibre.me/eventos/`. Recorre el listado nacional paginado, selecciona distritos de Lima y Callao y extrae el `Event` JSON-LD de cada ficha. Publica directamente los candidatos válidos y reconoce la etiqueta de inscripción y su enlace real. Las fechas explícitas de actividad que contradicen los datos estructurados se descartan con `schedule:conflicting_dates`; el motivo se imprime también en la ingesta real.
- **Running4Peru** (`running4peru`): `https://www.running4peru.com/eventos`. Solo fichas gratuitas de Lima, dentro de un horizonte de 90 días, con pausa de 10 segundos entre consultas y navegador de respaldo si encuentra una pantalla de verificación. Publica automáticamente los candidatos válidos.
- **Vamos Eventos** (`vamos-eventos`): `https://www.vamoseventos.com/lima/gratis`. Excluye las recomendaciones de pago del listado y extrae la descripción principal de cada evento, no sus anuncios. Guarda la publicación original cuando aparece en `raw.originalUrl` y publica los candidatos válidos. El proveedor publica restricciones de extracción automatizada en sus términos: esta integración técnica no otorga derechos de reutilización.

Hay 17 adaptadores registrados. Todos intentan primero la lectura HTTP; Eventbrite, Running4Peru, Vamos y los dos malls pueden usar Chromium si encuentran un bloqueo. El resto de fuentes oficiales no depende del navegador. Para desarrollo local se puede usar Chrome ya instalado con `PLAYWRIGHT_CHANNEL=chrome`; en CI se utiliza Chromium por defecto. Un desafío no resuelto se reporta como error, nunca como una agenda vacía. Que una fuente funcione desde una conexión local no garantiza que admita las IP de GitHub Actions.

Las nuevas fuentes tienen límites de 20 páginas y 500 fichas por ejecución, enlaces restringidos al mismo dominio y fallos de estructura visibles. Las fichas sin fecha verificable o con inscripción obligatoria sin enlace se omiten: el esquema exige esos datos y no se inventan. Las incertidumbres reales de datos se señalan con `qualityIssues`: horarios ausentes, fechas inferidas o recurrencias no interpretadas impiden publicar ese candidato. No se crean nuevos borradores para resolver esos casos.

Cuando un evento no tiene `image_url`, la interfaz busca una imagen relacionada con el título dentro de su categoría y, si no encuentra coincidencia, usa la imagen general de la categoría. Tarjetas y modal comparten el fallback de imagen propia a imagen por título y finalmente por categoría, sin reintentos en bucle. Las imágenes manuales en Supabase no se modifican con las corridas del pipeline.

Cada candidato debe pasar los filtros de `pipeline/src/core/gates.ts`: gratuidad verificada, ubicación en Lima o Callao, fechas vigentes, URLs `https://` y campos mínimos. Los duplicados se detectan por `fingerprint` (título + fecha + lugar), leyendo todas las páginas. Las actividades continuas también se comparan por título, lugar, URL y fecha final: que la fuente desplace su inicio a «hoy» no genera otra copia. Las funciones reales se conservan como registros separados, pero la interfaz agrupa las de una misma ficha, nombre y lugar en una tarjeta con sus fechas y horarios. Los registros automáticos llevan `origin = 'auto'` y `source_key`; `department` conserva Callao cuando corresponde. RLS muestra solo eventos publicados, gratuitos y de Lima/Callao, y la interfaz organiza las fechas actuales, futuras y de archivo.

### Publicación directa

Por petición de Juan, **todos los candidatos válidos de todas las fuentes se publican directamente** (`status = 'published'`), incluidos EntradaLibre, Running4Peru y Vamos. No hay modo de revisión ni excepciones por ser un agregador.

`pipeline/src/core/publication.ts` unifica la decisión: publicar o descartar. Se mantienen los controles de gratuidad, Lima/Callao, vigencia, URLs, datos imprescindibles e inscripción. Los candidatos inválidos no se convierten en borradores ni se publican con datos inventados. Los duplicados siguen omitiéndose y no se sobrescriben registros existentes.

El pipeline ya no lee `PUBLISH_MODE` ni `automation_settings.publish_mode`. La tabla histórica se conserva para compatibilidad, pero cambiar esa fila no reactiva un modo de revisión. Los borradores antiguos no se promocionan por este cambio; la aprobación puntual de 205 registros fue una operación separada.

### Categorías y orden del listado

La clasificación usa primero señales específicas del título y después la taxonomía de la fuente. «IV Feria del Libro» pertenece a Cultura; la palabra «feria» por sí sola no significa Gastronomía. Los talleres de robótica pertenecen a Tecnología y las clases de yoga a Deportes, antes de considerar el formato genérico «taller». No se usan textos incidentales de la descripción o del recinto para sobreescribir el tema principal.

El listado de eventos se ordena por defecto por **Nombre: A–Z**, con comparación española que contempla mayúsculas y tildes. El selector **Ordenar por** sustituye a Modalidad y ofrece nombre A–Z/Z–A, fecha ascendente/descendente, categoría A–Z y distrito A–Z. El orden se aplica al conjunto filtrado antes de paginar; cambiarlo vuelve a la primera página. La modalidad sigue visible en las tarjetas y el detalle. Pruebas: `node --test scripts/test-event-sort.mjs` y `npm test` dentro de `pipeline/`.

### Configurar la automatización

1. Ejecutar `supabase/schema.sql` (añade columnas de automatización, `automation_settings` y `sync_runs`).
2. En GitHub del repositorio: *Settings > Secrets and variables > Actions*.
3. Crear los secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la clave `service_role` solo vive aquí; nunca en Vercel, el repositorio ni `.env.local`).
4. No es necesario configurar una variable de modo de publicación: la publicación es directa para todos los candidatos válidos.

Cada corrida deja un registro en `sync_runs` (obtenidos, publicados, borradores, duplicados, descartados y errores) para verificar la salud del pipeline. El workflow también escribe un resumen por fuente en la página de la corrida (pestaña *Summary*). **Solo se notifica cuando hay errores** (el workflow queda en rojo y GitHub envía la alerta de workflow fallido); cuando simplemente no hay eventos nuevos, la corrida queda en verde y no avisa. Las caídas permanentes conocidas —actualmente Eventbrite, bloqueado por su WAF— se listan como "degradadas" sin provocar alertas; la lista `KNOWN_OUTAGE_SOURCES` en `pipeline/src/index.ts` controla esa excepción. Para probar sin escribir nada:

```bash
cd pipeline
npm install
npm test
npm run typecheck
npm run ingest:dry
```

Para validar una sola fuente sin escribir: `npm run ingest:dry -- --source plaza-norte` (sustituir por cualquiera de las claves anteriores). Las pruebas cubren paginación y dominios permitidos, precios positivos o mixtos, compras obligatorias, distritos, horarios recurrentes, selección del evento principal frente a recomendaciones y enlaces de inscripción pendientes. Un push publica el código en Vercel, pero la ingesta necesita su cron o una ejecución manual de Actions para añadir registros a Supabase.

En el workflow cloud, `source` permite consultar una fuente específica; vacío consulta todas excepto los malls. Para los malls, usar **Malls en Mac local**, rama `main`, con `publish=true` (publicación) o `false` (solo prueba). La programación diaria publica automáticamente. El runner del Mac arranca al iniciar sesión y debe tener internet y estar despierto alrededor de las 22:00 hasta terminar; no hace falta abrir el editor ni el navegador. No se configuró un despertar automático. Si el equipo está apagado, la web conserva sus eventos y la actualización queda esperando. Detalles: [operación de los malls](docs/mall-access.md).

Para auditar duplicados continuos con acceso servidor: `npx tsx src/repair-duplicates.ts` dentro de `pipeline/`. Solo muestra el plan; `--apply` cambia copias automáticas publicadas a `inactive`, conservando sus datos. La reparación nunca agrupa funciones de un solo día únicamente por tener el mismo título.

### Validación inicial desde GitHub Actions — 6 de noviembre de 2026

Los seis adaptadores completaron una extracción local en modo sin escritura. La primera [corrida completa en producción](https://github.com/Juangular/Events/actions/runs/42220872182) mostró diferencias por origen de red:

| Fuente nueva | Resultado observado en CI |
| --- | --- |
| Gran Teatro Nacional | 1 borrador; otras funciones todavía no publicaban su enlace de inscripción. |
| EntradaLibre | 203 borradores para revisión de fuente original. |
| Running4Peru | 2 borradores; el navegador de respaldo permitió leer la agenda. |
| Mall del Sur | HTTP 403 / Cloudflare. La [comprobación posterior con Chromium](https://github.com/Juangular/Events/actions/runs/42223260049) también fue bloqueada. |
| Plaza Norte | HTTP 403 / Cloudflare. La [comprobación posterior con Chromium](https://github.com/Juangular/Events/actions/runs/42223258237) también fue bloqueada. |
| Vamos Eventos | HTTP 429 / Vercel Security Checkpoint persistente incluso con navegador. |

La corrida guardó 206 borradores y no publicó nuevos eventos. Los tres bloqueos no se silencian ni se presentan como agendas vacías: quedan en `sync_runs`, en el resumen y como fallo del workflow. El cron vuelve a intentar las consultas. La operación completa de esas fuentes desde CI requiere que sus proveedores permitan el acceso desde ese origen; el despliegue correcto de Vercel no resuelve ese bloqueo. Estos resultados son una observación fechada, no una garantía del estado futuro de los sitios.

Agregar una fuente nueva consiste en crear un adaptador en `pipeline/src/sources/` con la interfaz `SourceAdapter` y registrarlo en `pipeline/src/index.ts`. Si un sitio cambia de diseño, el adaptador falla de forma aislada: el error queda en `sync_runs` y las demás fuentes siguen funcionando.

La interfaz permite alternar entre **Disponibles** y **Pasados** junto al selector de mes: en *Disponibles* se ven los eventos vigentes del mes elegido; en *Pasados*, los eventos ya finalizados de ese mes (por ejemplo, seleccionar octubre y ver la agenda pasada de octubre). Para ello, la lectura pública de `events` incluye eventos de cualquier fecha: aplica este cambio una sola vez en `Supabase > SQL Editor` (el resto de `supabase/schema.sql` es idempotente):

```sql
drop policy if exists "Public can read current free events" on public.events;
drop policy if exists "Public can read free Lima events" on public.events;
drop policy if exists "Public can read free Lima and Callao events" on public.events;

create policy "Public can read free Lima and Callao events"
on public.events for select
to anon, authenticated
using (
  status = 'published'
  and price_type = 'free'
  and department in ('Lima', 'Callao')
);
```

### Adaptación de datos y carga de imágenes

Las actividades recurrentes se agrupan con `src/lib/event-groups.ts` después de filtrar por mes, estado, categoría, distrito y búsqueda, y antes de ordenar y paginar. Así, «KARAOKE CON JORGE COLLAO» aparece una sola vez y su detalle enumera cada función real, sin convertir los días intermedios en un rango continuo. El contador corresponde a tarjetas de actividades. No se mezclan fichas, lugares o destinos de inscripción diferentes ni se eliminan las funciones de Supabase. Pruebas: `node --test scripts/test-event-groups.mjs`.

La consulta pública trae solo eventos que se superponen con el mes seleccionado, incluidos los que comenzaron antes y aún continúan. Pagina de 500 en 500 con orden estable para superar el límite predeterminado de la API. Al cambiar de mes cancela la petición anterior. Una fila inválida se omite con aviso; una URL de imagen inválida usa el fallback sin descartar el evento.

Los parsers compartidos aceptan imágenes JSON-LD como URL, lista o `ImageObject`. Los afiches del detalle usan `object-fit: contain` y un alto máximo de `65svh`: se conserva la imagen completa tanto en vertical como en horizontal. Las tarjetas reservan su espacio y activan su imagen a 300 px de la pantalla; esto evita que la carga diferida nativa descargue afiches muy alejados. Si `IntersectionObserver` no está disponible, se usa la carga nativa.

La interpretación automática funciona para las fuentes configuradas y los formatos reconocidos. Un cambio de estructura requiere adaptar el parser; una fecha, precio o inscripción ambiguos se descartan y nunca se completan por suposición.

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
