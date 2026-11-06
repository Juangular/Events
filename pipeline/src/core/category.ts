import type { Category } from '../types'
import { normalizeText } from './text'

const KEYWORDS: Array<[RegExp, Category]> = [
  // An event about books remains cultural even when its books discuss food or technology.
  [/\b(libros?|lectura|literatura|literari[oa]s?|poesia|poetic[oa]s?|narrativa|cuentos?|historietas?|comics?|fanzines?|dojinshi|cine|peliculas?|documental)\b/, 'Cultura'],
  [/\b(orientacion vocacional|carreras? (?:universitarias?|profesionales?)|empleo|empleabilidad|emprendimiento|finanzas|contabilidad|economia|liderazgo|oratoria|cafe filosofico|cafe cientifico)\b/, 'Educación'],
  [/\bcarrera artistica\b/, 'Cultura'],
  [/\bcorre \d+\s*k(?:m)?\b/, 'Deportes'],
  [/\b(tecnologia|tecnologico|tecnologica|tech|hackaton|devfest|robotica|robots?|inteligencia artificial|ia|ai|programacion|software|informatica|computacion|electronica|arduino|ciberseguridad|videojuegos?|gaming|realidad virtual|impresion 3d|analisis de datos)\b/, 'Tecnología'],
  [/\b(deportes?|futbol|futsal|fulbito|yoga|pilates|carreras?|running|runners?|corre \d|ciclismo|bicicletas?|bicipolo|ajedrez|shogi|entrenamiento|atletismo|natacion|basquetbol|basquet|baloncesto|voley|voleibol|rugby|tenis|padel|badminton|gimnasia|boxeo|karate|judo|taekwondo|surf|skate|calistenia|triatlon|senderismo|trekking|social run|zumba|bailoterapia|escalada|maraton|media maraton|beisbol|softbol|balonmano|hockey|waterpolo|squash|golf|esgrima|equitacion|remo|kayak|arqueria|tiro con arco|crossfit|fitness|patinaje)\b/, 'Deportes'],
  // "Feria" alone says nothing about the subject; require actual culinary evidence.
  [/\b(gastronomia|gastronomic[oa]s?|comida|cocina|cocinando|sabores|food|restaurantes?|pescaderia|ceviche|cebiche|anticuchos?|parrilla|reposteria|pasteleria|panaderia|chocolate|cacao|cocteleria|barismo|cafe|helados?)\b/, 'Gastronomía'],
  [/^(exposicion|muestra de arte|muestra artistica)\b/, 'Cultura'],
  [/\b(conciertos?|musica|musical|bandas?|recital|jazz|sinfonica|sinfonico|sinfonia|orquesta|filarmonica|coros?|coral|canto|guitarra|piano|violin|viola|violonchelo|saxofon|saxofonista|violinista|percusion|cajon|koto|karaoke|cumbia|rock|salsa|bachata|reggae|rap|dj)\b/, 'Música'],
  [/\b(cultura|cine|peliculas?|proyecciones?|proyeccion|documental|teatro|puesta en escena|danza|ballet|opera|lirica|escenic[oa]|performance|exposicion|muestra|galeria|pintura|acuarela|dibujo|fotografia|arte|artes|artistico|artistica|artesan[oa]s?|museos?|arqueologia|patrimonio|historia|historico|historica|escultura|ceramica|ilustracion|grabado|textil|diseno)\b/, 'Cultura'],
  [/\b(ciencias?|matematicas?|algebra|geometria|fisica|quimica|biologia|astronomia|idiomas?|ingles|frances|portugues|quechua|aleman|educacion|academico|academica)\b/, 'Educación'],
  [/\b(ninos?|ninas?|kids|familiar|familia|infantil|escolar|titeres|marionetas|cuentacuentos|circo|payasos?|magia|mascotas?)\b/, 'Familiar'],
  [/\b(taller|workshop|curso|tutoria|conferencia|charla|conversatorio|seminario|webinar|dialogo|ponencia|clase maestra)\b/, 'Educación'],
  [/\b(voluntariado|reciclaje|jardineria|huertos?|reforestacion|medio ambiente|biodiversidad|campana de salud)\b/, 'Otros'],
]

export function classifyCategory(text: string, fallback: Category = 'Otros'): Category {
  const normalized = normalizeText(text)
  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(normalized)) return category
  }
  return fallback
}

export function classifySourceTaxonomy(labels: string[], fallback: Category = 'Otros'): Category {
  const normalized = labels.map(normalizeText)
  // Source audience labels disambiguate opaque names such as children's story recitals.
  if (normalized.some((label) => /^(kids|infantil|familiar|en familia)$/.test(label))) return 'Familiar'
  return classifyCategory(labels.join(' '), fallback)
}

export const EVENTBRITE_CATEGORY_MAP: Record<string, Category> = {
  music: 'Música',
  'performing-visual-arts': 'Cultura',
  arts: 'Cultura',
  'film-and-media': 'Cultura',
  fashion: 'Cultura',
  'science-and-tech': 'Tecnología',
  technology: 'Tecnología',
  education: 'Educación',
  'sports-fitness': 'Deportes',
  health: 'Deportes',
  'health-wellness': 'Deportes',
  'food-drink': 'Gastronomía',
  'family-education-kids': 'Familiar',
}
