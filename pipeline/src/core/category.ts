import type { Category } from '../types'

const KEYWORDS: Array<[RegExp, Category]> = [
  [/taller|workshop|curso|tutor[ií]a/i, 'Educación'],
  [/conferencia|charla|conversatorio|seminario|webinar|di[aá]logo|ponencia/i, 'Educación'],
  [/concierto|m[uú]sica|banda|recital|festival musical|jazz|sinf[oó]nica/i, 'Música'],
  [/cine|pel[ií]cula|proyecci[oó]n|documental|festival de cine/i, 'Cultura'],
  [/teatro|danza|ballet|[óo]pera|esc[eé]nic|performance/i, 'Cultura'],
  [/exposici[oó]n|muestra|galer[ií]a|pintura|fotograf[ií]a|\barte\b|artesano/i, 'Cultura'],
  [/feria|gastronom[ií]a|comida|cocina|sabores|food|restaurante/i, 'Gastronomía'],
  [/deporte|f[uú]tbol|yoga|carrera|running|ciclismo|ajedrez|entrenamiento/i, 'Deportes'],
  [/tecnolog[ií]a|tech|hackat[oó]n|devfest|meetup|inteligencia artificial|programaci[oó]n|software|IA\b/i, 'Tecnología'],
  [/[ñn]i[nñ]os|familiar|infantil|familia|escolar/i, 'Familiar'],
]

export function classifyCategory(text: string, fallback: Category = 'Otros'): Category {
  for (const [pattern, category] of KEYWORDS) {
    if (pattern.test(text)) return category
  }
  return fallback
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
