# Guía de skills de Plan Lima

## Preferencia de Juan

En cada cambio se deben analizar y aplicar **todas las skills que realmente correspondan al trabajo**, combinando sus especialidades. Esta guía organiza el inventario local; las instrucciones completas de cada `SKILL.md` son la referencia operativa.

No basta con mencionar una skill: debe aportar una decisión, una implementación o una verificación concreta. Revisar el inventario no significa ejecutar todos los workflows ni ampliar el alcance del pedido.

## Procedimiento antes de implementar

1. Leer el pedido, sus restricciones, `AGENTS.md` y los archivos afectados. Identificar si cambia interacción, diseño, textos, datos, seguridad, rendimiento o infraestructura.
2. Revisar las descripciones, los criterios de activación y las exclusiones del inventario. Seleccionar todas las especialidades pertinentes por su contenido, no solo por su nombre.
3. Leer las instrucciones completas de las skills seleccionadas y las referencias específicas que requiera el cambio. Reutilizar el contexto ya cargado durante la conversación.
4. Aplicar las guías en conjunto y resolver conflictos según el pedido explícito y las reglas del proyecto. No introducir dependencias, arquitecturas o funcionalidades ajenas al objetivo.
5. Verificar el resultado con los controles pertinentes y explicar brevemente qué aportaron las skills utilizadas. Distinguir verificaciones realizadas de comprobaciones pendientes.

## Inventario local por funcionalidad

Inventario revisado: **19 skills** en `.agents/skills/`. Las rutas siguientes son relativas a ese directorio. Algunas carpetas y nombres de invocación difieren; ambos se indican.

### 1. Planificación y alcance

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `brainstorming` · `brainstorming/SKILL.md` | Comprender el objetivo, explorar alternativas y acordar comportamiento antes de crear o modificar funciones. | Funciones nuevas y cambios de comportamiento o diseño. Respetar su flujo y las decisiones ya delegadas por el usuario; no repetir preguntas resueltas. |
| `ponytail` · `ponytail/SKILL.md` | Resolver el objetivo completo con el cambio más pequeño, siguiendo patrones existentes y verificando riesgos reales. | Trabajo de código, revisión y refactorización. No usar la simplicidad como excusa para omitir accesibilidad, validación o requisitos. |

### 2. Diseño visual, interacción y accesibilidad

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `frontend-design` · `frontend-design/SKILL.md` | Dirección visual deliberada: composición, tipografía, color y coherencia con el producto. | Construir o mejorar UI. Preservar las partes y la identidad que el usuario pida conservar. |
| `impeccable` · `impeccable/SKILL.md` | Refinamiento visual y UX, jerarquía, estados, adaptabilidad y revisión del resultado renderizado. | Mejoras, auditorías y diseño de interfaces. Elegir el playbook específico; no convertir un ajuste en un rediseño general. La copia local consultada declara versión 4.8.0. |
| `ui-ux-pro-max` · `ui-ux-pro-max/SKILL.md` | Guías consultables de patrones UX, interacción, diseño adaptable, accesibilidad y detalles de implementación por stack. | Cambios que alteran cómo se ve o usa la interfaz. Buscar por el problema concreto y comprobar la pertinencia del resultado; no usar sugerencias de otro stack sin verificarlas. |
| `accessibility` · `accessibility/SKILL.md` | Criterios WCAG 2.2: semántica, nombres accesibles, contraste, foco, teclado, movimiento y controles táctiles. | Toda UI modificada y auditorías de accesibilidad. Los escáneres automáticos no equivalen a una certificación ni sustituyen pruebas reales con lector de pantalla. |

### 3. Textos y comunicación

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `copywriting` · `copywriting/SKILL.md` | Claridad de mensajes, beneficios concretos, llamadas a la acción y lenguaje del usuario. | Crear o mejorar textos de la web. No inventar estadísticas, testimonios, garantías ni afirmaciones de actualización. Conservar literalmente el contenido que el usuario proteja. |

### 4. React, TypeScript y compilación

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `vercel-react-best-practices` · `react-best-practices/SKILL.md` | Gestión eficiente de estado, renderizado, dependencias, carga de datos y tamaño del bundle. | Componentes y lógica React. Aplicar reglas de React/Vite pertinentes; las reglas de Next.js o Server Components no son aplicables automáticamente. |
| `vercel-composition-patterns` · `composition-patterns/SKILL.md` | APIs de componentes, composición y separación de estado para evitar proliferación de props booleanas. | Refactorizar composición o diseñar componentes reutilizables. No introducir providers ni componentes compuestos para un control simple que no lo necesita. |
| `typescript-advanced-types` · `typescript-advanced-types/SKILL.md` | Genéricos, inferencia y tipos condicionales, mapeados o utilitarios. | Problemas reales de tipado complejo o APIs genéricas. Un cambio de CSS o un tipo sencillo no justifica añadir complejidad de tipos. |
| `vite` · `vite/SKILL.md` | Configuración, módulos ESM, variables de entorno, plugins, HMR y build. | Cambios en Vite o su proceso de compilación. Ejecutar `npm run build` según `AGENTS.md`; no modificar la configuración sin necesidad. |

### 5. Arquitectura

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `improve-codebase-architecture` · `improve-codebase-architecture/SKILL.md` | Diagnóstico de fricción arquitectónica y propuestas de módulos con mayor profundidad y mejor testabilidad. | Pedidos explícitos de arquitectura o refactorización estructural. Su workflow incluye un informe HTML y exploración con el usuario; no ejecutarlo como efecto secundario de un ajuste visual. La cabecera marca `disable-model-invocation: true`. |

### 6. Node y procesos de servidor

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `nodejs-best-practices` · `nodejs-best-practices/SKILL.md` | Decisiones de runtime, asincronía, módulos, errores y seguridad en Node. | Cambios en `pipeline/` o scripts Node. El frontend no necesita un nuevo backend para adoptar estas recomendaciones. |
| `nodejs-backend-patterns` · `nodejs-backend-patterns/SKILL.md` | Patrones de APIs, middleware, autenticación y servicios con Express/Fastify. | Trabajo real de backend o procesamiento servidor cuando el patrón encaja. Plan Lima no tiene una aplicación backend; no crear una por la existencia de esta skill. |

### 7. Base de datos y seguridad

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `supabase-postgres-best-practices` · `supabase-postgres-best-practices/SKILL.md` | SQL, índices, acceso a datos, concurrencia, pooling y RLS. | Cambios en consultas, esquema, políticas o rendimiento Postgres. No es necesaria para ordenar o filtrar en memoria datos que ya carga React. |
| `security-auditor` · `security-auditor/SKILL.md` | Revisión de flujos de datos, permisos, secretos, vulnerabilidades y controles de CI/CD. | Cambios que afectan fronteras de confianza o auditorías de seguridad. Mantener el alcance autorizado y no ejecutar pruebas intrusivas en producción. |

### 8. SEO

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `seo-audit` · `seo-audit/SKILL.md` | Diagnóstico de rastreo, indexación, estructura, contenido y señales técnicas. | Investigar visibilidad o fallos SEO antes de aplicar soluciones. Verificar el DOM real para JSON-LD inyectado mediante JavaScript. |
| `seo` · `seo/SKILL.md` | Implementación de metadatos, robots, sitemap, canonicals y datos estructurados. | Correcciones concretas de posicionamiento técnico o contenido indexable. No cambiar SEO en un ajuste de filtros que no altera esa superficie. |

### 9. Descubrimiento y mantenimiento de skills

| Skill y archivo | Qué aporta | Cuándo usarla / límites |
| --- | --- | --- |
| `find-skills` · `find-skills/SKILL.md` | Buscar capacidades faltantes y evaluar calidad, origen y pertinencia antes de instalarlas. | Cuando el usuario solicita buscar o instalar skills, o existe una carencia real. No instalar herramientas adicionales en cada pedido ni confundir skills globales con locales. |

## Combinaciones habituales

- **Filtros, paginación o controles de la interfaz:** `brainstorming`, `ponytail`, `frontend-design`, `impeccable`, `ui-ux-pro-max`, `accessibility` y `vercel-react-best-practices`. Añadir `copywriting` al cambiar mensajes o explicaciones; `vite` si se modifica la compilación.
- **Solo textos de la portada:** `copywriting`; sumar diseño y accesibilidad cuando también cambia presentación o jerarquía. Respetar los textos que deban permanecer intactos.
- **Arquitectura React:** composición y buenas prácticas React, con `ponytail`; usar el workflow de arquitectura solo cuando corresponda al pedido.
- **Ingesta y adaptadores:** buenas prácticas Node, `ponytail` y seguridad cuando cambien permisos o fuentes no confiables; Postgres si cambia la escritura o el esquema.
- **SQL/RLS:** Supabase/Postgres y seguridad, con verificación del acceso público y privado.
- **Problemas SEO:** comenzar con `seo-audit`; aplicar `seo` para las correcciones verificadas.

Estas combinaciones son puntos de partida. La selección final depende del cambio real, no de una lista fija.

## Skills disponibles fuera del proyecto

El entorno puede ofrecer otras guías, como `web-design-guidelines`, diagnóstico de errores o despliegue a Vercel. Consultar su disponibilidad y sus instrucciones antes de usarlas. No forman parte de este inventario local de 19 skills y no se asumen disponibles en otros equipos.

## Ejemplo aplicado: filtros por mes y portada

Para adaptar Disponibles/Pasados al mes seleccionado, reordenar controles y reemplazar la fecha de actualización se aplican planificación y alcance, diseño visual, refinamiento UX, accesibilidad, React y copywriting. Las decisiones verificables son: evitar estados imposibles, derivar el modo a partir del mes en lugar de sincronizarlo con efectos, conservar el bloque principal de la portada, explicar el archivo del mes y comprobar teclado, contraste y tamaños móviles. No requiere modificar Node, RLS, SQL ni SEO.
