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
