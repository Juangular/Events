import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin, Menu, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { categories } from './data'
import { getPublicEvents } from './lib/events'
import { getPublicPlaces } from './lib/places'
import { useDialogLifecycle } from './hooks/useDialogLifecycle'
import type { EventItem, PlaceItem } from './types'

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const currentDate = new Date()
const currentYear = currentDate.getFullYear()
const fallbackImage = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85'

const LIMA_TIME_ZONE = 'America/Lima'

function getLimaDateParts(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LIMA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
}

function getLocalDateKey() {
  const parts = getLimaDateParts(new Date())
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`
}

function formatUpdatedAt(value?: string) {
  if (!value) return 'localmente'
  return new Intl.DateTimeFormat('es-PE', { timeZone: LIMA_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

function formatDate(value: string, endDate?: string) {
  const format = (dateValue: string) => {
    const [year, month, day] = dateValue.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    return new Intl.DateTimeFormat('es-PE', { timeZone: LIMA_TIME_ZONE, day: 'numeric', month: 'short' }).format(date)
  }
  const startLabel = format(value)
  return endDate ? `${startLabel} – ${format(endDate)}` : startLabel
}

function overlapsMonth(event: EventItem, month: number, year: number) {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return event.startDate <= last && (event.endDate ?? event.startDate) >= first
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
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selected, setSelected] = useState<EventItem | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const menuNav = useRef<HTMLElement>(null)

  const closeSelected = useCallback(() => setSelected(null), [])
  const closeSelectedPlace = useCallback(() => setSelectedPlace(null), [])

  useEffect(() => {
    getPublicEvents().then(setEvents).catch(() => setLoadError('No pudimos cargar los eventos.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getPublicPlaces().then(setPlaces).catch(() => setPlacesError('No pudimos cargar los lugares.')).finally(() => setPlacesLoading(false))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 200)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
        return
      }
      if (keyboardEvent.key !== 'Tab' || !menuNav.current) return
      const focusable = Array.from(menuNav.current.querySelectorAll<HTMLElement>('a[href], button'))
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
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const filtered = useMemo(() => events.filter((event) => {
    const matchesMonth = overlapsMonth(event, month, year)
    const matchesCurrent = (event.endDate ?? event.startDate) >= getLocalDateKey()
    const matchesCategory = category === 'Todas' || event.category === category
    const matchesModality = modality === 'Todas' || event.modality === modality
    const search = debouncedQuery.toLowerCase()
    const matchesQuery = !search || `${event.title} ${event.description} ${event.place} ${event.category}`.toLowerCase().includes(search)
    return matchesMonth && matchesCurrent && matchesCategory && matchesModality && matchesQuery
  }).sort((a, b) => a.startDate.localeCompare(b.startDate)), [events, month, year, category, modality, debouncedQuery])

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
        <nav ref={menuNav} id="main-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación principal"><a href="#eventos" onClick={() => setMenuOpen(false)}>Eventos</a><a href="#lugares" onClick={() => setMenuOpen(false)}>Lugares</a></nav>
        <button ref={menuButton} className="menu-button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}</button>
      </header>

      <main id="top" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> Eventos y lugares de Lima</div>
            <h1>Planes gratis<br /><em>en Lima.</em></h1>
            <p className="hero-intro">Busca conciertos, talleres y actividades por fecha o categoría. Descubre también lugares gratuitos para recorrer la ciudad.</p>
            <a className="hero-cta" href="#eventos">Ver eventos gratis <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          <div className="hero-note"><Sparkles size={17} /><span>Actualizado<br /><strong>{formatUpdatedAt(latestUpdatedAt)}</strong></span></div>
          <div className="hero-stamp">LIM<br /><span>{String(currentYear).slice(-2)}</span></div>
        </section>

        <section className="explorer" id="eventos">
          <div className="section-heading"><div><span className="section-kicker">Agenda gratuita</span><h2>Encuentra tu próximo plan</h2></div><span className="location-label"><MapPin size={15} /> Lima, Perú</span></div>
           <div className="search-row"><div className="search-box"><Search size={19} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca por nombre, lugar o tema..." aria-label="Buscar eventos" />{query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><X size={16} aria-hidden="true" /></button>}</div><button className="filter-toggle" aria-expanded={mobileFilters} aria-controls="filtros-eventos" onClick={() => setMobileFilters(!mobileFilters)}>{mobileFilters ? <X size={17} aria-hidden="true" /> : <SlidersHorizontal size={17} aria-hidden="true" />} {mobileFilters ? 'Ocultar filtros' : 'Filtros'}</button></div>
           <div className={`filter-bar ${mobileFilters ? 'is-open' : ''}`} id="filtros-eventos">
             <div className="month-filter"><button aria-label="Mes anterior" onClick={() => shiftMonth(-1)}><ChevronLeft size={17} /></button><div><span>Viendo eventos de</span><strong>{monthNames[month]} {year}</strong></div><button aria-label="Mes siguiente" onClick={() => shiftMonth(1)}><ChevronRight size={17} /></button></div>
            <label className="select-filter"><span>Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="select-filter"><span>Modalidad</span><select value={modality} onChange={(event) => setModality(event.target.value)}><option>Todas</option><option>Presencial</option><option>Virtual</option></select></label>
            <span className="free-pill">● Todo gratis</span>
          </div>
        </section>

        <section className="results-section"><span className="visually-hidden" aria-live="polite">{filtered.length} eventos encontrados</span><div className="results-header"><div><span className="section-kicker">Selección editorial</span><h2>{filtered.length} <span>eventos encontrados</span></h2></div><div className="results-rule" /></div>{loading ? <div className="empty-state"><CalendarDays size={30} /><h3>Cargando eventos...</h3><p>Buscamos actividades gratuitas para las fechas que elegiste.</p></div> : loadError ? <div className="empty-state"><X size={30} /><h3>{loadError}</h3><button onClick={() => window.location.reload()}>Volver a cargar</button></div> : filtered.length > 0 ? <div className="event-grid">{filtered.map((event, index) => <EventCard key={event.id} event={event} index={index} onOpen={setSelected} />)}</div> : <div className="empty-state"><CalendarDays size={30} /><h3>No hay eventos para esta búsqueda.</h3><p>Prueba con otro mes, categoría, modalidad o palabra clave.</p><button onClick={() => { setCategory('Todas'); setModality('Todas'); setQuery('') }}>Ver todos los eventos del mes</button></div>}</section>

        <section className="places-section" id="lugares">
          <div className="places-heading"><div><span className="section-kicker">Guía local</span><h2>Lugares que visitar en Lima</h2></div><span className="location-label"><MapPin size={15} /> Lima, Perú</span></div>
          <p className="places-intro">Parques, paseos y espacios culturales gratuitos para descubrir Lima a tu ritmo.</p>
          {placesLoading ? <div className="empty-state"><MapPin size={30} /><h3>Cargando lugares...</h3><p>Preparamos ideas para tu próxima salida.</p></div> : placesError ? <div className="empty-state"><X size={30} /><h3>{placesError}</h3><p>Mientras tanto, puedes explorar los eventos gratuitos.</p></div> : places.length > 0 ? <div className="places-grid">{places.map((place, index) => <PlaceCard key={place.id} place={place} index={index} onOpen={setSelectedPlace} />)}</div> : <div className="empty-state"><MapPin size={30} /><h3>Aún no hay lugares en la guía.</h3><p>Vuelve pronto para descubrir nuevos espacios de Lima.</p></div>}
        </section>
      </main>
      <footer id="fuentes"><div className="footer-brand"><span className="brand-mark">P</span><strong>plan.lima</strong></div><p>Agenda de eventos gratuitos y guía de lugares para disfrutar Lima.</p><span>Hecho con curiosidad · {currentYear}</span></footer>

      {selected && <EventModal event={selected} onClose={closeSelected} />}
      {selectedPlace && <PlaceModal place={selectedPlace} onClose={closeSelectedPlace} />}
    </div>
  )
}

function EventCard({ event, index, onOpen }: { event: EventItem; index: number; onOpen: (event: EventItem) => void }) {
  return <article className="event-card" role="button" tabIndex={0} aria-label={`Ver detalles de ${event.title}`} style={{ '--delay': `${index * 70}ms` } as React.CSSProperties} onClick={() => onOpen(event)} onKeyDown={(keyboardEvent) => { if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') { keyboardEvent.preventDefault(); onOpen(event) } }}><div className="card-image-wrap"><img src={event.image} alt={event.title} loading={index > 2 ? 'lazy' : 'eager'} decoding="async" onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><span className="free-badge">GRATIS</span><span className="card-arrow"><ArrowUpRight size={18} /></span></div><div className="card-content"><div className="card-meta"><span>{event.category}</span><span>{event.modality}</span></div><h3>{event.title}</h3><div className="card-date"><CalendarDays size={14} /> {formatDate(event.startDate, event.endDate)}</div><div className="card-place"><MapPin size={14} /> {event.district ?? event.place}</div>{event.requiresRegistration && <span className="registration-note">Requiere inscripción</span>}</div></article>
}

function PlaceCard({ place, index, onOpen }: { place: PlaceItem; index: number; onOpen: (place: PlaceItem) => void }) {
  return <article className="place-card" style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}>
    <button className="place-card-trigger" aria-label={`Ver detalles de ${place.name}`} onClick={() => onOpen(place)}>
      <div className="place-image-wrap"><img src={place.image} alt={place.name} loading={index > 2 ? 'lazy' : 'eager'} decoding="async" onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><span className="free-badge">{place.priceType === 'free' ? 'GRATIS' : 'DE PAGO'}</span><span className="card-arrow"><ArrowUpRight size={18} /></span></div>
      <div className="place-content"><h3>{place.name}</h3><div className="card-place"><MapPin size={14} /> {place.district}</div></div>
    </button>
    <a className="maps-button" href={place.sourceUrl} target="_blank" rel="noopener noreferrer"><MapPin size={14} aria-hidden="true" /> Ver en Google Maps</a>
  </article>
}

function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const { closeButtonRef, dialogRef } = useDialogLifecycle(onClose)

  return <div className="modal-backdrop" onClick={onClose}><div ref={dialogRef} className="event-modal" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title" aria-describedby="event-dialog-description" onClick={(modalEvent) => modalEvent.stopPropagation()}><button ref={closeButtonRef} className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button><img className="modal-image" src={event.image} alt={event.title} onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><div className="modal-body"><div className="card-meta"><span>{event.category}</span><span>{event.modality}</span></div><h2 id="event-dialog-title">{event.title}</h2><p id="event-dialog-description" className="modal-description">{event.description}</p><div className="detail-grid"><div><span>Cuándo</span><strong>{formatDate(event.startDate, event.endDate)}<br />{event.time}</strong></div><div><span>Dónde</span><strong>{event.place}{event.district && <><br />{event.district}, Lima</>}</strong></div><div><span>Organiza</span><strong>{event.organizer}</strong></div><div><span>Entrada</span><strong className="green-text">Gratis{event.requiresRegistration && ' · requiere inscripción'}</strong></div></div><div className="modal-actions"><a className="primary-button" href={event.requiresRegistration && event.registrationUrl ? event.registrationUrl : event.sourceUrl} target="_blank" rel="noopener noreferrer">{event.requiresRegistration && event.registrationUrl ? 'Inscribirme' : 'Ver detalles en el sitio oficial'} <ExternalLink size={16} aria-hidden="true" /></a><span className="source-copy">Fuente: <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"><strong>{event.source}</strong></a></span></div></div></div></div>
}

function PlaceModal({ place, onClose }: { place: PlaceItem; onClose: () => void }) {
  const { closeButtonRef, dialogRef } = useDialogLifecycle(onClose)

  return <div className="modal-backdrop" onClick={onClose}><div ref={dialogRef} className="event-modal place-modal" role="dialog" aria-modal="true" aria-labelledby="place-dialog-title" aria-describedby="place-dialog-description" onClick={(modalEvent) => modalEvent.stopPropagation()}><button ref={closeButtonRef} className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button><img className="modal-image" src={place.image} alt={place.name} onError={(imageEvent) => { imageEvent.currentTarget.src = fallbackImage; imageEvent.currentTarget.onerror = null }} /><div className="modal-body"><h2 id="place-dialog-title">{place.name}</h2><div className="place-location"><span>¿Dónde queda?</span><strong>{place.district}, Lima</strong><strong>{place.address}</strong></div><div className="place-entry"><span>Entrada</span><strong className="green-text">{place.priceType === 'free' ? 'Gratis' : 'De pago'}</strong></div><div className="place-description"><span>¿Por qué visitarlo?</span><p id="place-dialog-description">{place.description}</p></div>{place.hours.trim() && <div className="place-description"><span>Horario</span><p>{place.hours}</p></div>}<div className="modal-actions"><a className="primary-button" href={place.sourceUrl} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true" /> Ver en Google Maps</a>{place.source.trim() && <span className="source-copy">Fuente de referencia: <strong>{place.source}</strong></span>}</div></div></div></div>
}

export default App
