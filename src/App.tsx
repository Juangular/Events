import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin, Menu, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { categories } from './data'
import { getPublicEvents } from './lib/events'
import { getPublicPlaces } from './lib/places'
import type { EventItem, PlaceItem } from './types'

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const currentDate = new Date()
const currentYear = currentDate.getFullYear()
const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85'

function parseDate(value: string) { return new Date(`${value}T12:00:00`) }
function getLocalDateKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function formatUpdatedAt(value?: string) {
  if (!value) return 'localmente'
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}
function formatDate(value: string, endDate?: string) {
  const start = parseDate(value)
  const end = endDate ? parseDate(endDate) : undefined
  const startLabel = `${start.getDate()} ${monthNames[start.getMonth()].slice(0, 3).toLowerCase()}`
  return end ? `${startLabel} – ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3).toLowerCase()}` : startLabel
}
function overlapsMonth(event: EventItem, month: number, year: number) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0, 23, 59, 59)
  return parseDate(event.startDate) <= last && parseDate(event.endDate ?? event.startDate) >= first
}

function App() {
  const [month, setMonth] = useState(currentDate.getMonth())
  const [year, setYear] = useState(currentYear)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [places, setPlaces] = useState<PlaceItem[]>([])
  const [placesLoading, setPlacesLoading] = useState(true)
  const [placesError, setPlacesError] = useState<string | null>(null)
  const [category, setCategory] = useState<(typeof categories)[number]>('Todas')
  const [modality, setModality] = useState('Todas')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  const closeSelected = useCallback(() => setSelected(null), [])
  const closeSelectedPlace = useCallback(() => setSelectedPlace(null), [])

  useEffect(() => {
    getPublicEvents().then(setEvents).catch(() => setLoadError('No pudimos cargar la agenda. Intenta nuevamente en unos minutos.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getPublicPlaces().then(setPlaces).catch(() => setPlacesError('No pudimos cargar los lugares recomendados.')).finally(() => setPlacesLoading(false))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const filtered = useMemo(() => events.filter((event) => {
    const matchesMonth = overlapsMonth(event, month, year)
    const matchesCurrent = (event.endDate ?? event.startDate) >= getLocalDateKey()
    const matchesCategory = category === 'Todas' || event.category === category
    const matchesModality = modality === 'Todas' || event.modality === modality
    const search = query.toLowerCase().trim()
    const matchesQuery = !search || `${event.title} ${event.description} ${event.place} ${event.category}`.toLowerCase().includes(search)
    return matchesMonth && matchesCurrent && matchesCategory && matchesModality && matchesQuery
  }).sort((a, b) => a.startDate.localeCompare(b.startDate)), [events, month, year, category, modality, query])

  const shiftMonth = (direction: number) => {
    const next = new Date(year, month + direction, 1)
    setMonth(next.getMonth())
    setYear(next.getFullYear())
  }

  const latestUpdatedAt = [...events, ...places].reduce<string | undefined>((latest, item) => {
    if (!item.updatedAt) return latest
    return !latest || item.updatedAt > latest ? item.updatedAt : latest
  }, undefined)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#top">Saltar al contenido principal</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Plan Lima, inicio"><span className="brand-mark">P</span><span>plan<span className="brand-dot">.</span>lima</span></a>
        <nav id="main-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación principal"><a href="#eventos" onClick={() => setMenuOpen(false)}>Explorar</a><a href="#eventos" onClick={() => setMenuOpen(false)}>Eventos</a><a href="#lugares" onClick={() => setMenuOpen(false)}>Lugares</a></nav>
        <button ref={menuButton} className="menu-button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}><Menu size={22} aria-hidden="true" /></button>
      </header>

      <main id="top" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> Eventos gratuitos en Lima</div>
            <h1>Haz espacio<br /><em>para algo nuevo.</em></h1>
            <p className="hero-intro">Una selección de eventos gratuitos para vivir Lima de otra manera.</p>
          </div>
          <div className="hero-note"><Sparkles size={17} /><span>Actualizado<br /><strong>{formatUpdatedAt(latestUpdatedAt)}</strong></span></div>
          <div className="hero-stamp">LIM<br /><span>{String(currentYear).slice(-2)}</span></div>
        </section>

        <section className="explorer" id="eventos">
          <div className="section-heading"><div><span className="section-kicker">Agenda pública</span><h2>Encuentra tu próximo plan</h2></div><span className="location-label"><MapPin size={15} /> Lima, Perú</span></div>
           <div className="search-row"><div className="search-box"><Search size={19} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca por nombre, lugar o tema..." aria-label="Buscar eventos" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={16} aria-hidden="true" /></button>}</div><button className="filter-toggle" aria-expanded={mobileFilters} aria-controls="filtros-eventos" onClick={() => setMobileFilters(!mobileFilters)}><SlidersHorizontal size={17} aria-hidden="true" /> Filtros</button></div>
           <div className={`filter-bar ${mobileFilters ? 'is-open' : ''}`} id="filtros-eventos">
             <div className="month-filter"><button aria-label="Mes anterior" onClick={() => shiftMonth(-1)}><ChevronLeft size={17} /></button><div><span>Viendo eventos de</span><strong>{monthNames[month]} {year}</strong></div><button aria-label="Mes siguiente" onClick={() => shiftMonth(1)}><ChevronRight size={17} /></button></div>
            <label className="select-filter"><span>Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="select-filter"><span>Modalidad</span><select value={modality} onChange={(event) => setModality(event.target.value)}><option>Todas</option><option>Presencial</option><option>Virtual</option></select></label>
            <span className="free-pill">● Todo gratis</span>
          </div>
        </section>

        <section className="results-section"><span className="visually-hidden" aria-live="polite">{filtered.length} eventos encontrados</span><div className="results-header"><div><span className="section-kicker">Selección editorial</span><h2>{filtered.length} <span>eventos encontrados</span></h2></div><div className="results-rule" /></div>{loading ? <div className="empty-state"><CalendarDays size={30} /><h3>Cargando la agenda...</h3><p>Estamos buscando los próximos eventos gratuitos.</p></div> : loadError ? <div className="empty-state"><X size={30} /><h3>{loadError}</h3><button onClick={() => window.location.reload()}>Reintentar</button></div> : filtered.length > 0 ? <div className="event-grid">{filtered.map((event, index) => <EventCard key={event.id} event={event} index={index} onOpen={setSelected} />)}</div> : <div className="empty-state"><CalendarDays size={30} /><h3>No encontramos planes para estos filtros.</h3><p>Prueba con otro mes, categoría o término de búsqueda.</p><button onClick={() => { setCategory('Todas'); setModality('Todas'); setQuery('') }}>Limpiar filtros</button></div>}</section>

        <section className="places-section" id="lugares">
          <div className="places-heading"><div><span className="section-kicker">Guía local</span><h2>Lugares que visitar en Lima</h2></div><span className="location-label"><MapPin size={15} /> Lima, Perú</span></div>
          <p className="places-intro">Espacios gratuitos para descubrir la ciudad, caminar sin prisa y mirar Lima con otros ojos.</p>
          {placesLoading ? <div className="empty-state"><MapPin size={30} /><h3>Cargando lugares...</h3><p>Estamos preparando algunas recomendaciones para tu próxima salida.</p></div> : placesError ? <div className="empty-state"><X size={30} /><h3>{placesError}</h3><p>La agenda de eventos sigue disponible.</p></div> : places.length > 0 ? <div className="places-grid">{places.map((place, index) => <PlaceCard key={place.id} place={place} index={index} onOpen={setSelectedPlace} />)}</div> : <div className="empty-state"><MapPin size={30} /><h3>Aún no hay lugares publicados.</h3><p>Pronto tendremos recomendaciones para explorar Lima.</p></div>}
        </section>
      </main>
      <footer id="fuentes"><div className="footer-brand"><span className="brand-mark">P</span><strong>plan.lima</strong></div><p>Una guía independiente para encontrar lo que pasa en Lima.</p><span>Hecho con curiosidad · {currentYear}</span></footer>

      {selected && <EventModal event={selected} onClose={closeSelected} />}
      {selectedPlace && <PlaceModal place={selectedPlace} onClose={closeSelectedPlace} />}
    </div>
  )
}

function EventCard({ event, index, onOpen }: { event: EventItem; index: number; onOpen: (event: EventItem) => void }) {
  return <article className="event-card" role="button" tabIndex={0} aria-label={`Ver detalles de ${event.title}`} style={{ '--delay': `${index * 70}ms` } as React.CSSProperties} onClick={() => onOpen(event)} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); onOpen(event) } }}><div className="card-image-wrap"><img src={event.image} alt={event.title} loading={index > 2 ? 'lazy' : 'eager'} decoding="async" onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><span className="free-badge">GRATIS</span><span className="card-arrow"><ArrowUpRight size={18} /></span></div><div className="card-content"><div className="card-meta"><span>{event.category}</span><span>{event.modality}</span></div><h3>{event.title}</h3><div className="card-date"><CalendarDays size={14} /> {formatDate(event.startDate, event.endDate)}</div><div className="card-place"><MapPin size={14} /> {event.district ?? event.place}</div>{event.requiresRegistration && <span className="registration-note">Requiere inscripción</span>}</div></article>
}

function PlaceCard({ place, index, onOpen }: { place: PlaceItem; index: number; onOpen: (place: PlaceItem) => void }) {
  return <article className="place-card" role="button" tabIndex={0} aria-label={`Ver detalles de ${place.name}`} style={{ '--delay': `${index * 50}ms` } as React.CSSProperties} onClick={() => onOpen(place)} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); onOpen(place) } }}><div className="place-image-wrap"><img src={place.image} alt={place.name} loading={index > 2 ? 'lazy' : 'eager'} decoding="async" onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><span className="free-badge">{place.priceType === 'free' ? 'GRATIS' : 'DE PAGO'}</span><span className="card-arrow"><ArrowUpRight size={18} /></span></div><div className="place-content"><h3>{place.name}</h3><div className="card-place"><MapPin size={14} /> {place.district}</div><a className="maps-button" href={place.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><MapPin size={14} aria-hidden="true" /> Ver en Google Maps</a></div></article>
}

function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const modal = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        onClose()
        return
      }
      if (keyboardEvent.key !== 'Tab' || !modal.current) return
      const focusable = Array.from(modal.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault()
        last.focus()
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; previousFocus?.focus() }
  }, [onClose])

  return <div className="modal-backdrop" onClick={onClose}><div ref={modal} className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title" aria-describedby="event-dialog-description" onClick={(modalEvent) => modalEvent.stopPropagation()}><button ref={closeButton} className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button><img className="modal-image" src={event.image} alt={event.title} onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><div className="modal-body"><div className="card-meta"><span>{event.category}</span><span>{event.modality}</span></div><h2 id="event-dialog-title">{event.title}</h2><p id="event-dialog-description" className="modal-description">{event.description}</p><div className="detail-grid"><div><span>Cuándo</span><strong>{formatDate(event.startDate, event.endDate)}<br />{event.time}</strong></div><div><span>Dónde</span><strong>{event.place}{event.district && <><br />{event.district}, Lima</>}</strong></div><div><span>Organiza</span><strong>{event.organizer}</strong></div><div><span>Entrada</span><strong className="green-text">Gratis{event.requiresRegistration && ' · requiere inscripción'}</strong></div></div><div className="modal-actions"><a className="primary-button" href={event.requiresRegistration && event.registrationUrl ? event.registrationUrl : event.sourceUrl} target="_blank" rel="noopener noreferrer">{event.requiresRegistration && event.registrationUrl ? 'Inscribirme' : 'Ver información'} <ExternalLink size={16} aria-hidden="true" /></a><span className="source-copy">Fuente: <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"><strong>{event.source}</strong></a></span></div></div></div></div>
}

function PlaceModal({ place, onClose }: { place: PlaceItem; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const modal = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        onClose()
        return
      }
      if (keyboardEvent.key !== 'Tab' || !modal.current) return
      const focusable = Array.from(modal.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault()
        last.focus()
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; previousFocus?.focus() }
  }, [onClose])

  return <div className="modal-backdrop" onClick={onClose}><div ref={modal} className="event-modal place-modal" role="dialog" aria-modal="true" aria-labelledby="place-dialog-title" aria-describedby="place-dialog-description" onClick={(modalEvent) => modalEvent.stopPropagation()}><button ref={closeButton} className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button><img className="modal-image" src={place.image} alt={place.name} onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><div className="modal-body"><h2 id="place-dialog-title">{place.name}</h2><div className="place-location"><span>¿Dónde queda?</span><strong>{place.district}, Lima</strong><strong>{place.address}</strong></div><div className="place-entry"><span>Entrada</span><strong className="green-text">{place.priceType === 'free' ? 'Gratis' : 'De pago'}</strong></div><div className="place-description"><span>¿Por qué visitarlo?</span><p id="place-dialog-description">{place.description}</p></div><div className="place-description"><span>Horario</span><p>{place.hours}</p></div><div className="modal-actions"><a className="primary-button" href={place.sourceUrl} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true" /> Ver en Google Maps</a><span className="source-copy">Fuente de referencia: <strong>{place.source}</strong></span></div></div></div></div>
}

export default App
