import assert from 'node:assert/strict'
import test from 'node:test'
import { runGates, findLimaDistrict } from '../core/gates'
import { mallListing, parseMallEvent, weeklyOccurrences } from '../core/mall-events'
import { eventNodes, mainEvent, sameSiteUrl, structuredCandidate } from '../core/source-page'
import { isoDateInLima } from '../core/text'
import { entradaLibreListing, parseEntradaLibreEvent } from './entrada-libre'
import { parseGtnEvent } from './gran-teatro-nacional'
import { parseRunningEvent, runningListing } from './running4peru'
import { parseVamosEvent, vamosListing } from './vamos-eventos'

const url = 'https://entradalibre.me/event/robot/'
const event = {
  '@type': 'Event', url, name: 'Taller de robótica', description: 'Taller gratuito para jóvenes.',
  startDate: '2026-11-14T11:00:00-05:00', endDate: '2026-11-14T12:00:00-05:00', isAccessibleForFree: true,
  offers: { price: '0', priceCurrency: 'PEN' }, organizer: { name: 'Organización cultural' },
  location: { name: 'Centro cultural', address: { addressLocality: 'Miraflores', addressRegion: 'Lima', addressCountry: 'PE' } },
}
const schema = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`

test('JSON-LD accepts graphs and arrays, and selects the principal event rather than recommendations', () => {
  const html = `<link rel="canonical" href="${url}">${schema({ '@graph': [{ ...event, url: 'https://example.com/advert', name: 'Publicidad' }, event] })}`
  assert.equal(eventNodes(html).length, 2)
  assert.equal(mainEvent(html, url).name, event.name)
  assert.throws(() => mainEvent('<h1>Página cambiada</h1>', url), /no reconocida/)
})

test('aggregated candidates stay in review and preserve dates, times and district', () => {
  const candidate = parseEntradaLibreEvent(schema(event), url)[0]!
  assert.equal(candidate.district, 'Miraflores')
  assert.equal(candidate.time, '11:00 a. m. – 12:00 p. m.')
  assert.equal(candidate.endDate, undefined)
  assert.equal(candidate.needsReview, true)
  assert.deepEqual(runGates(candidate, '2026-11-06').reject, [])
})

test('paid offers, mixed tickets and mandatory purchases never pass as free', () => {
  for (const offers of [{ price: '45' }, [{ price: '0' }, { price: '50' }], { lowPrice: 20 }, { lowPrice: 0, highPrice: 45 }, { price: -5 }, { price: false }, { price: 'desconocido' }]) {
    assert.equal(structuredCandidate({ ...event, offers }, { source: 'Prueba', url }), null)
  }
  for (const description of ['Gratis por compras mínimas de cincuenta soles.', 'Entrada libre con consumo mínimo.', 'Gratis por compras de S/50.', 'Ingreso gratuito. Costo S/50.']) {
    assert.equal(structuredCandidate({ ...event, description }, { source: 'Prueba', url }), null)
  }
})

test('outside-Lima locations, cancellations and missing dates are excluded', () => {
  for (const address of [{ addressLocality: 'Callao' }, { addressRegion: 'Arequipa' }, { addressCountry: 'CL' }]) {
    assert.equal(structuredCandidate({ ...event, location: { name: 'Lugar', address } }, { source: 'Prueba', url }), null)
  }
  assert.equal(structuredCandidate({ ...event, eventStatus: 'https://schema.org/EventCancelled' }, { source: 'Prueba', url }), null)
  assert.equal(structuredCandidate({ ...event, startDate: undefined }, { source: 'Prueba', url }), null)
  assert.equal(structuredCandidate({ ...event, location: { name: 'Plaza de Armas de Ica', address: { addressLocality: 'Lima' } } }, { source: 'Prueba', url }), null)
  assert.equal(findLimaDistrict('Av. Principal, San Juan de Miraflores, Lima'), 'San Juan de Miraflores')
  assert.equal(findLimaDistrict('Lima'), undefined)
})

test('unpublished registration links are not invented', () => {
  const required = { ...event, description: 'Ingreso gratuito, previa inscripción: pronto.' }
  assert.equal(structuredCandidate(required, { source: 'Prueba', url }), null)
  assert.equal(structuredCandidate(required, { source: 'Prueba', url, registrationUrl: 'https://forms.gle/registro' })?.requiresRegistration, true)
})

test('discovered URLs cannot leave the configured origin or event paths', () => {
  for (const href of ['https://evil.example/event/robot/', '//evil.example/event/robot/', 'javascript:alert(1)', '/wp-admin/', 'https://user:pass@entradalibre.me/event/robot/']) {
    assert.equal(sameSiteUrl(href, url, /^\/event\/[^/]+\/$/), null)
  }
  assert.equal(sameSiteUrl('/event/robot/?ref=ficha#foo', url, /^\/event\/[^/]+\/$/), url)
})

test('EntradaLibre skips provincial cards and follows the next listing page', () => {
  const html = `<article class="elini-ev"><h3><a href="${url}?ref=eventos">Robot</a></h3><p class="meta">14 nov<br>Miraflores</p></article>
    <article class="elini-ev"><h3><a href="/event/fuera/">Fuera</a></h3><p class="meta">14 nov<br>Arequipa</p></article>
    <a href="/event/?pg=2#r24">Ver más</a>`
  assert.deepEqual(entradaLibreListing(html, 'https://entradalibre.me/eventos/'), { urls: [url], next: 'https://entradalibre.me/event/?pg=2' })
})

test('Vamos ignores paid affiliate cards and uses the event description, not recommendations', () => {
  const base = 'https://www.vamoseventos.com/lima/gratis'
  const detail = 'https://www.vamoseventos.com/event/gratis'
  const html = '<a href="/event/gratis"><h3>Actividad</h3><span>Gratis</span></a><a href="/event/paid"><h3>Concierto</h3>Desde S/45</a>'
  assert.deepEqual(vamosListing(html, base).urls, [detail])
  const node = { ...event, url: detail, offers: undefined, isAccessibleForFree: undefined }
  const candidate = parseVamosEvent(`${schema(node)}<div class="whitespace-pre-wrap">Ingreso libre en mezanine, sujeto a capacidad.</div><aside>Publicidad desde S/45</aside>`, detail)[0]!
  assert.equal(candidate.freeSignal, true)
  assert.equal(candidate.needsReview, true)
  assert.match(candidate.description, /mezanine/)
  assert.deepEqual(parseVamosEvent('<h1>Noticia sin fecha</h1><div class="whitespace-pre-wrap">Actividad sin fecha publicada.</div>', detail), [])
})

test('Running4Peru selects free Lima cards and ignores paid and outside events', () => {
  const card = (place: string, free: boolean, slug: string) => `<article class="tribe-events-calendar-list__event"><h3><a href="/eventos/${slug}">Carrera</a></h3><time datetime="${isoDateInLima()}"></time>${free ? '<span class="free">¡gratis!</span>' : ''}<p>${place}</p></article>`
  const listing = runningListing(card('Pueblo Libre, Lima', true, 'libre') + card('Arequipa', true, 'fuera') + card('Miraflores, Lima', false, 'pago'), 'https://www.running4peru.com/eventos')
  assert.deepEqual(listing.urls, ['https://www.running4peru.com/eventos/libre'])
  const detail = 'https://www.running4peru.com/eventos/libre/'
  const html = `${schema({ ...event, url: detail })}<div class="tribe-events-single-event-description">Participación gratuita. Para inscribirte llena el <a href="https://forms.gle/registro">enlace de registro</a>.</div>`
  assert.equal(parseRunningEvent(html, detail)[0]?.registrationUrl, 'https://forms.gle/registro')
})

const mall = { key: 'mall-del-sur', name: 'Mall del Sur', base: 'https://malldelsur.pe', district: 'San Juan de Miraflores' }
function mallHtml(description: string, date = '7 de noviembre de 2026', time = '18:00 - 19:00') {
  return `<h1>Show infantil</h1><div class="em-event-single"><div class="em-event-date">${date}</div><div class="em-event-time">${time}</div>
    <section class="em-event-where"><a>Salón multieventos</a></section><div class="em-event-tags">EventoGratis</div>
    <div class="em-item-image"><img src="data:image/svg+xml;base64,xx" data-src="https://malldelsur.pe/cartel.jpg"></div><section class="em-event-content"><p>${description}</p></section></div>`
}

test('mall events use activity dates (not post publication) and real lazy image URLs', () => {
  const candidate = parseMallEvent(mallHtml('Función gratuita para toda la familia.'), `${mall.base}/eventos/show/`, mall)[0]!
  assert.equal(candidate.startDate, '2026-11-07')
  assert.equal(candidate.district, 'San Juan de Miraflores')
  assert.equal(candidate.imageUrl, 'https://malldelsur.pe/cartel.jpg')
  assert.equal(candidate.needsReview, false)
  assert.deepEqual(runGates(candidate, '2026-11-06').reject, [])
  assert.equal(parseMallEvent(mallHtml('Caritas gratis por compras mínimas de S/50.'), `${mall.base}/eventos/show/`, mall).length, 0)
})

test('mall pagination stays on the same site and increments one page', () => {
  const html = '<div class="em-event"><h3><a href="/eventos/show/">Show</a></h3></div><a href="/eventos/?pno=2">2</a><a href="https://evil.example/eventos/?pno=3">3</a>'
  assert.deepEqual(mallListing(html, `${mall.base}/eventos/`), { urls: [`${mall.base}/eventos/show/`], next: `${mall.base}/eventos/?pno=2` })
})

test('weekly activities expand only the actual weekdays and their stated hours', () => {
  const occurrences = weeklyOccurrences('2026-11-01', '2026-11-30', 'Todos los martes desde 6:00 p.m. Todos los domingos desde 5:00 p.m.', '5:00 p. m. – 7:00 p. m.')
  assert.equal(occurrences.length, 9)
  assert.deepEqual(occurrences.find((item) => item.date === '2026-11-03'), { date: '2026-11-03', time: '6:00 p. m.' })
  assert.deepEqual(occurrences[0], { date: '2026-11-01', time: '5:00 p. m.' })
  assert.equal(weeklyOccurrences('2026-11-01', '2026-11-30', 'Todos los miércoles y viernes.', '6:00 p. m.').length, 8)
  const ambiguous = parseMallEvent(mallHtml('De jueves a martes, horarios variables.', '1 de noviembre de 2026 - 30 de noviembre de 2026'), `${mall.base}/eventos/show/`, mall)[0]!
  assert.equal(ambiguous.needsReview, true)
})

test('GTN uses the human-readable performance time and excludes pending registrations', () => {
  const gtn = (entry: string, category = '¡Es gratis!') => `<div class="node--type-evento"><h1>Sesiones GTN</h1><div class="subtitulo">Voces de viola</div><div class="infechas">14 NOV 2026</div><div class="categoria">${category}</div><div class="formato"><p><strong>Sábado 14 de noviembre, 11:30 a. m. - 2026</strong></p><p>Concierto de violas.</p><ul><li>${entry}</li></ul><p>Estacionamiento gratuito.</p></div></div>`
  const detail = 'https://granteatronacional.pe/evento/sesiones-gtn-1'
  const candidate = parseGtnEvent(gtn('Ingreso gratuito, previa inscripción: <a href="https://forms.gle/registro">Aquí</a>'), detail)[0]!
  assert.equal(candidate.time, '11:30 a. m.')
  assert.equal(candidate.district, 'San Borja')
  assert.equal(candidate.imageUrl, undefined)
  assert.equal(candidate.requiresRegistration, true)
  assert.equal(parseGtnEvent(gtn('Ingreso gratuito, previa inscripción: [pronto]'), detail).length, 0)
  assert.equal(parseGtnEvent(gtn('Entradas a la venta.', 'Música'), detail).length, 0)
})

test('source layout changes throw instead of silently claiming zero events', () => {
  assert.throws(() => mallListing('<h1>Nuevo diseño</h1>', `${mall.base}/eventos/`), /no reconocido/)
  assert.throws(() => entradaLibreListing('<h1>Nuevo diseño</h1>', url), /no reconocido/)
  assert.throws(() => runningListing('<h1>Nuevo diseño</h1>', 'https://www.running4peru.com/eventos'), /no reconocida/)
  assert.throws(() => vamosListing('<h1>26 eventos gratis</h1>', 'https://www.vamoseventos.com/lima/gratis'), /no reconocido/)
})
