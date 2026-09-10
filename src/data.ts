import type { EventItem } from './types'

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
