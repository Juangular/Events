# Rendimiento y adaptación de eventos — 6 de noviembre de 2026

## Evidencia

Build de producción servido con `npm run preview` en `http://127.0.0.1:4173/`, datos públicos reales de Supabase, sin sesión de usuario. Lighthouse 13.6.0 / Chrome 156, perfil móvil predeterminado (Moto G Power, red y CPU simuladas), caché fría, sin desplazar la página. Una medición inicial y tres mediciones finales; los tiempos no constituyen una comparación estadística ni datos de usuarios reales.

| Señal | Antes | Después | Interpretación |
| --- | ---: | ---: | --- |
| Transferencia durante la carga inicial | 3.598.467 B | 376.986 B de mediana (376.557–376.996 B) | Reducción aproximada del 89,5 %; las imágenes pendientes se descargan al acercarse a la pantalla. |
| LCP | 1,65 s | 1,65 s de mediana (1,65–1,72 s) | Prácticamente igual; el contenido principal ya era rápido en esta prueba. |
| TBT | 35 ms | 31 ms de mediana (10,5–133 ms) | Variación alta; no se atribuye una mejora de CPU. |
| CLS | 0 | 0,0000034 | El espacio de las tarjetas se mantiene reservado. |
| JavaScript gzip del build | 141,62 KB | 142,12 KB | Aumento de unos 0,5 KB por validación, paginación y control de carga. |

El navegador recibió originalmente 266 eventos / 352.969 B JSON sin comprimir. Con la consulta mensual, noviembre devolvió 253 / 334.992 B y diciembre 16 / 25.860 B. El ahorro depende del mes y de cuánto crezca el archivo. Las consultas conservan eventos que comenzaron antes del mes y todavía continúan.

## Experimentos y decisiones

| Cambio | Resultado | Decisión |
| --- | --- | --- |
| Usar únicamente `loading="lazy"` en todas las tarjetas | 3.598.467 → 3.561.610 B; el navegador seguía anticipando muchas imágenes. | Insuficiente; sustituido por observación de proximidad. |
| `CardImage`, con margen de 300 px y carga nativa como respaldo | Aproximadamente 377 KB en tres cargas móviles. En navegador, 0 de 18 imágenes de tarjetas solicitadas desde la portada; la primera se cargó al desplazarla hacia la pantalla. | Conservado. El detalle sigue mostrando el original completo. |
| Limitar la consulta al mes y paginar con orden estable | Menos datos ajenos al mes; prueba de 1.201 registros completada en offsets 0, 500 y 1.000. | Conservado. También se pagina la detección de duplicados de la ingesta. |
| Añadir índices o modificar infraestructura | Sin un plan `EXPLAIN ANALYZE` ni evidencia de un cuello de botella SQL. | No se añadieron índices nuevos. Se conserva el índice público existente. |

Se mantiene Vercel Speed Insights para observar las métricas reales después del despliegue. Estas mediciones locales no prueban una mejora del p75 de producción. Los archivos originales grandes todavía tienen ese peso cuando el usuario se acerca a ellos; este cambio reduce el trabajo inicial, no comprime los archivos de terceros.

## Verificación funcional

- Pipeline: regresiones para los siete distritos del Callao, departamento al insertar, imágenes JSON-LD URL/lista/objeto, fechas contradictorias, rangos entre meses y duplicados por encima de 1.000 filas.
- EntradaLibre real, sin escritura: 10 páginas, 217 fichas, 204 candidatos; 203 válidos y uno descartado por fechas contradictorias (Gian Marco). Los 203 son candidatos publicables, no 203 inserciones nuevas.
- Navegador Chromium: afiches verticales y horizontales a 1440×900, 390×844, 844×390 y 320×640; sin desbordamiento horizontal, cierre con Escape y restauración del foco.
- Respuesta de API simulada: una fila con fecha inválida se omite sin romper las demás; una URL de imagen inválida conserva el evento y usa fallback.
- `npm run build`, pruebas de imágenes/orden/vistas/paginación, pruebas y typecheck de `pipeline/`.

## Activación pendiente

Los cambios están en el código local. Para habilitarlos públicamente hay que aplicar **todo `supabase/schema.sql`** en la base existente, desplegar el frontend y ejecutar la ingesta actualizada. La política nueva permite leer Callao manteniendo las restricciones de publicación y gratuidad. No se aplicó SQL remoto ni se escribieron eventos durante esta revisión.

El concierto de Gian Marco se descubre e interpreta, pero la ficha contiene `startDate = 2026-11-07` y una descripción estructurada que dice «Fecha: miércoles 25 de noviembre». Se descarta con `schedule:conflicting_dates` hasta contar con información consistente. El sistema admite las fuentes y estructuras configuradas; formatos desconocidos siguen requiriendo adaptar su parser.
