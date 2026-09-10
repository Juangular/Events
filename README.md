# Plan Lima

Guía pública de eventos gratuitos en Lima. El frontend está construido con React, TypeScript y Vite; los eventos publicados se leen desde Supabase.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin `.env.local`, el entorno de desarrollo usa datos locales de demostración. El build de producción no lo hace: exige Supabase para evitar publicar datos ficticios accidentalmente.

## Configurar Supabase

1. Crear un proyecto gratuito en [supabase.com](https://supabase.com).
2. Abrir `SQL Editor` en el proyecto.
3. Ejecutar todo el contenido de `supabase/schema.sql`.
4. En `Project Settings > API`, copiar `Project URL` y la clave pública `anon`.
5. Crear `.env.local` con:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
```

La clave `anon` puede estar en el frontend porque las políticas RLS solo permiten leer eventos publicados, gratuitos, vigentes y de Lima. Nunca usar la `service_role` en este proyecto frontend.

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

La gestión mínima del contenido se realiza en el dashboard de Supabase. No existe un panel administrativo público y no debe exponerse uno sin autenticación.

## Despliegue en Vercel

1. Crear un repositorio Git y subir el proyecto sin `.env.local`.
2. Importar el repositorio en [Vercel](https://vercel.com).
3. Usar estos valores:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en las variables de entorno de Vercel para `Production` y `Preview`.
5. Desplegar.
6. Abrir la URL pública y confirmar que los eventos vienen de Supabase.

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
- vista móvil;
- mensaje de error cuando Supabase no esté disponible.

## Pendientes operativos antes de hacerlo público

- Crear el proyecto Supabase de producción.
- Ejecutar `supabase/schema.sql`.
- Cargar y verificar eventos reales.
- Configurar las variables en el hosting.
- Revisar permisos RLS desde una ventana incógnito.
- Sustituir cualquier imagen de prueba por imágenes autorizadas.
- Añadir un canal de contacto visible y un aviso breve de verificación en la fuente oficial.
- Opcionalmente conectar un dominio propio; la URL gratuita de Vercel/Netlify permite validar el MVP inicialmente.
