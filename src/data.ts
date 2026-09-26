import type { EventItem, PlaceItem } from './types'

export const categories = ['Todas', 'Cultura', 'Música', 'Deportes', 'Educación', 'Tecnología', 'Gastronomía', 'Familiar', 'Otros'] as const

export const events: EventItem[] = [
  {
    id: 'miraflores-fotografia', title: 'Miradas de Lima: fotografía urbana',
    description: 'Una exposición colectiva que reúne nuevas miradas sobre la ciudad, sus ritmos y sus habitantes. Entrada libre durante todo el mes.',
    category: 'Cultura', modality: 'Presencial', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85',
    startDate: '2026-09-04', endDate: '2026-09-30', time: '10:00 a. m. – 8:00 p. m.', place: 'Centro Cultural Ricardo Palma', district: 'Miraflores', organizer: 'Municipalidad de Miraflores', source: 'Municipalidad de Miraflores', sourceUrl: 'https://www.miraflores.gob.pe', tags: ['exposición', 'arte'],
  },
  {
    id: 'musica-parque', title: 'Música en el parque',
    description: 'Tarde de música en vivo al aire libre con bandas locales, food trucks y actividades para toda la familia.',
    category: 'Música', modality: 'Presencial', image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
    startDate: '2026-09-12', time: '4:00 p. m. – 8:30 p. m.', place: 'Parque de la Exposición', district: 'Cercado de Lima', organizer: 'Municipalidad Metropolitana de Lima', source: 'Cultura Lima', sourceUrl: 'https://www.descubrelima.pe', tags: ['música en vivo', 'aire libre'],
  },
  {
    id: 'taller-ia', title: 'Taller abierto: IA para todos',
    description: 'Aprende los conceptos básicos de inteligencia artificial y descubre herramientas para estudiar, crear y trabajar mejor.',
    category: 'Tecnología', modality: 'Virtual', image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=85',
    startDate: '2026-09-18', time: '7:00 p. m. – 8:30 p. m.', place: 'Sesión virtual', organizer: 'Laboratoria', source: 'Laboratoria', sourceUrl: 'https://www.laboratoria.la', registrationUrl: 'https://www.laboratoria.la', requiresRegistration: true, tags: ['tecnología', 'taller'],
  },
  {
    id: 'ciclo-cine', title: 'Ciclo de cine peruano',
    description: 'Cuatro jueves para volver a encontrarnos con historias del cine peruano. Conversatorio al final de cada función.',
    category: 'Cultura', modality: 'Presencial', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=85',
    startDate: '2026-09-03', endDate: '2026-09-24', time: '7:30 p. m.', place: 'Gran Biblioteca Pública de Lima', district: 'Cercado de Lima', organizer: 'Biblioteca Nacional del Perú', source: 'Biblioteca Nacional del Perú', sourceUrl: 'https://www.bnp.gob.pe', tags: ['cine', 'conversatorio'],
  },
  {
    id: 'yoga-domingo', title: 'Yoga frente al mar',
    description: 'Sesiones para todos los niveles guiadas por instructoras certificadas. Solo necesitas ropa cómoda y una mat.',
    category: 'Deportes', modality: 'Presencial', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85',
    startDate: '2026-09-06', endDate: '2026-09-27', time: '8:00 a. m. – 9:00 a. m.', place: 'Malecón de la Reserva', district: 'Miraflores', organizer: 'Miraflores Deportes', source: 'Municipalidad de Miraflores', sourceUrl: 'https://www.miraflores.gob.pe', tags: ['bienestar', 'aire libre'],
  },
  {
    id: 'feria-sabores', title: 'Feria de sabores del Perú',
    description: 'Productores y cocineras de distintas regiones comparten sus historias, recetas y sabores en una feria abierta.',
    category: 'Gastronomía', modality: 'Presencial', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=85',
    startDate: '2026-10-02', endDate: '2026-10-04', time: '11:00 a. m. – 7:00 p. m.', place: 'Parque Kennedy', district: 'Miraflores', organizer: 'Sumaq Perú', source: 'Sumaq Perú', sourceUrl: 'https://www.facebook.com', tags: ['comida', 'feria'],
  },
]

const placeImage = 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=85'

const fallbackPlaces: PlaceItem[] = [
  { id: 'centro-historico-lima', name: 'Centro Histórico de Lima', description: 'Plazas, balcones y edificios que cuentan la historia de la ciudad desde su fundación.', category: 'Historia y patrimonio', image: placeImage, area: 'Lima', district: 'Cercado de Lima', address: 'Plaza Mayor de Lima', hours: 'Espacio público; consultar horarios de cada recinto', source: 'Municipalidad de Lima', sourceUrl: 'https://www.munlima.gob.pe', priceType: 'free' },
  { id: 'parque-reserva', name: 'Parque de la Reserva', description: 'Un parque urbano para caminar y conocer uno de los espacios públicos más emblemáticos de Lima.', category: 'Parques y naturaleza', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Cercado de Lima', address: 'Jr. Madre de Dios s/n', hours: 'Consultar horarios vigentes', source: 'SERPAR', sourceUrl: 'https://www.serpar.gob.pe', priceType: 'free' },
  { id: 'malecon-miraflores', name: 'Malecón de Miraflores', description: 'Paseo frente al Pacífico con parques, arte urbano y vistas abiertas de la costa limeña.', category: 'Miradores y paseos', image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Miraflores', address: 'Malecón de Miraflores', hours: 'Espacio público de acceso libre', source: 'Municipalidad de Miraflores', sourceUrl: 'https://www.miraflores.gob.pe', priceType: 'free' },
  { id: 'parque-amor', name: 'Parque del Amor', description: 'Un mirador icónico del malecón, conocido por su escultura y sus vistas del océano.', category: 'Miradores y paseos', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Miraflores', address: 'Malecón Cisneros', hours: 'Espacio público de acceso libre', source: 'Municipalidad de Miraflores', sourceUrl: 'https://www.miraflores.gob.pe', priceType: 'free' },
  { id: 'huaca-pucllana', name: 'Huaca Pucllana', description: 'Sitio arqueológico en el corazón de Miraflores que conserva una pirámide prehispánica.', category: 'Historia y patrimonio', image: 'https://images.unsplash.com/photo-1531685250784-7569952593d2?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Miraflores', address: 'General Borgoño cuadra 8', hours: 'Consultar condiciones de ingreso', source: 'Museo de Sitio Huaca Pucllana', sourceUrl: 'https://huacapucllanamiraflores.pe', priceType: 'free' },
  { id: 'parque-kennedy', name: 'Parque Kennedy', description: 'Punto de encuentro en Miraflores con áreas verdes, arte y movimiento durante todo el día.', category: 'Parques y naturaleza', image: 'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Miraflores', address: 'Av. Diagonal y calles Lima', hours: 'Espacio público de acceso libre', source: 'Municipalidad de Miraflores', sourceUrl: 'https://www.miraflores.gob.pe', priceType: 'free' },
  { id: 'barranco', name: 'Barranco', description: 'Calles, galerías, murales y arquitectura republicana en uno de los barrios más visitados de Lima.', category: 'Barrios y arquitectura', image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Barranco', address: 'Puente de los Suspiros y alrededores', hours: 'Espacio público de acceso libre', source: 'Municipalidad de Barranco', sourceUrl: 'https://munibarranco.gob.pe', priceType: 'free' },
  { id: 'bosque-olivar', name: 'Bosque El Olivar', description: 'Un bosque histórico de olivos, caminos tranquilos y espacios para desconectarse dentro de la ciudad.', category: 'Parques y naturaleza', image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'San Isidro', address: 'Av. Paz Soldán cuadra 1', hours: 'Consultar horarios de apertura', source: 'Municipalidad de San Isidro', sourceUrl: 'https://www.msi.gob.pe', priceType: 'free' },
  { id: 'huaca-huallamarca', name: 'Huaca Huallamarca', description: 'Centro ceremonial prehispánico rodeado por la ciudad moderna de San Isidro.', category: 'Historia y patrimonio', image: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'San Isidro', address: 'Av. Nicolás de Rivera 201', hours: 'Consultar condiciones de ingreso', source: 'Ministerio de Cultura', sourceUrl: 'https://museos.cultura.pe', priceType: 'free' },
  { id: 'pantanos-villa', name: 'Pantanos de Villa', description: 'Refugio de vida silvestre para observar naturaleza y aves en el extremo sur de Lima.', category: 'Parques y naturaleza', image: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Chorrillos', address: 'Av. Hernando Lavalle s/n', hours: 'Consultar horarios y recorridos', source: 'PROHVILLA', sourceUrl: 'https://www.prohvilla.munlima.gob.pe', priceType: 'free' },
  { id: 'parque-amistad', name: 'Parque de la Amistad', description: 'Espacio familiar con áreas verdes y arquitectura inspirada en la conexión entre Perú y Japón.', category: 'Parques y naturaleza', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Santiago de Surco', address: 'Av. Caminos del Inca cuadra 21', hours: 'Consultar horarios de apertura', source: 'Municipalidad de Santiago de Surco', sourceUrl: 'https://www.munisurco.gob.pe', priceType: 'free' },
  { id: 'costa-verde', name: 'Costa Verde', description: 'Circuito costero para caminar, contemplar el mar y recorrer distintos distritos de Lima.', category: 'Playas', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Costa Verde', address: 'Circuito de Playas', hours: 'Espacio público de acceso libre', source: 'Municipalidad Metropolitana de Lima', sourceUrl: 'https://www.munlima.gob.pe', priceType: 'free' },
  { id: 'playa-agua-dulce', name: 'Playa Agua Dulce', description: 'Una de las playas urbanas más conocidas de Lima para disfrutar la costa durante el verano.', category: 'Playas', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Chorrillos', address: 'Playa Agua Dulce', hours: 'Espacio público; consultar condiciones del día', source: 'Municipalidad de Chorrillos', sourceUrl: 'https://www.munichorrillos.gob.pe', priceType: 'free' },
  { id: 'parque-exposicion', name: 'Parque de la Exposición', description: 'Un parque céntrico con jardines, esculturas y arquitectura histórica para recorrer con calma.', category: 'Parques y naturaleza', image: 'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Cercado de Lima', address: 'Av. 28 de Julio s/n', hours: 'Consultar horarios de apertura', source: 'Municipalidad Metropolitana de Lima', sourceUrl: 'https://www.munlima.gob.pe', priceType: 'free' },
  { id: 'plaza-san-martin', name: 'Plaza San Martín', description: 'Una plaza histórica del Centro de Lima rodeada de arquitectura republicana y vida urbana.', category: 'Historia y patrimonio', image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=85', area: 'Lima', district: 'Cercado de Lima', address: 'Plaza San Martín', hours: 'Espacio público de acceso libre', source: 'Municipalidad Metropolitana de Lima', sourceUrl: 'https://www.munlima.gob.pe', priceType: 'free' },
]

export const places: PlaceItem[] = fallbackPlaces.map((place) => ({
  ...place,
  sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}, Lima`)}`,
}))
