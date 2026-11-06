import type { Category } from '../types'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`

const categoryImages: Record<Category, string> = {
  Cultura: image('photo-1544213456-bc37cb97df74'),
  Música: image('photo-1556379118-7034d926d258'),
  Deportes: image('photo-1612872087720-bb876e2e67d1'),
  Educación: image('photo-1503676260728-1c00da094a0b'),
  Tecnología: image('photo-1437419764061-2473afe69fc2'),
  Gastronomía: image('photo-1613626630502-182579c0432c'),
  Familiar: image('photo-1609260840244-22b52bfc6664'),
  Otros: image('photo-1533174072545-7a4b6ad7a6c3'),
}

const titleImages: Partial<Record<Category, { keywords: RegExp; image: string }[]>> = {
  Deportes: [
    { keywords: /\b(running|runner|runners|maraton|maratones|atletismo|trote|trotar|correr|carrera|carreras)\b/, image: image('photo-1552674605-db6ffd4facb5') },
    { keywords: /\b(ciclismo|bicicleta|bicicletas|ciclovia|ciclovias|ciclista|ciclistas)\b/, image: image('photo-1485965120184-e220f721d03e') },
    { keywords: /\b(yoga|pilates)\b/, image: image('photo-1544367567-0f2fcb009e0b') },
    { keywords: /\b(futbol|fulbito|futsal)\b/, image: image('photo-1574629810360-7efbbe195018') },
    { keywords: /\b(natacion|nadar)\b/, image: image('photo-1530549387789-4c1017266635') },
  ],
  Cultura: [
    { keywords: /\b(fotografia|fotografica|fotografico|fotografias)\b/, image: image('photo-1452587925148-ce544e77e70d') },
    { keywords: /\b(cine|pelicula|peliculas|cinematografico|cinematografica)\b/, image: image('photo-1489599849927-2ee91cede3ba') },
    { keywords: /\b(libro|libros|lectura|literatura|poesia|cuentos)\b/, image: image('photo-1507842217343-583bb7270b66') },
  ],
  Música: [
    { keywords: /\b(jazz|saxofon|saxofones)\b/, image: image('photo-1511192336575-5a79af67a629') },
    { keywords: /\b(piano|pianista|pianistas)\b/, image: image('photo-1520523839897-bd0b52f945a0') },
    { keywords: /\b(rock|guitarra|guitarras)\b/, image: image('photo-1498038432885-c6f3f1b912ee') },
  ],
  Educación: [
    { keywords: /\b(lectura|libro|libros|literatura|cuentos)\b/, image: image('photo-1507842217343-583bb7270b66') },
    { keywords: /\b(computacion|programacion|informatica)\b/, image: image('photo-1516321318423-f06f85e504b3') },
  ],
  Tecnología: [
    { keywords: /\b(robotica|robot|robots)\b/, image: image('photo-1485827404703-89b55fcc595e') },
    { keywords: /\b(programacion|software|codigo|desarrollo web)\b/, image: image('photo-1461749280684-dccba630e2f6') },
  ],
  Gastronomía: [
    { keywords: /\b(cafe|cafes|barismo)\b/, image: image('photo-1447933601403-0c6688de566e') },
    { keywords: /\b(pan|panes|panaderia|reposteria|pasteleria)\b/, image: image('photo-1509440159596-0249088772ff') },
  ],
  Familiar: [
    { keywords: /\b(lectura|cuentos|libro|libros)\b/, image: image('photo-1507842217343-583bb7270b66') },
    { keywords: /\b(cine|pelicula|peliculas)\b/, image: image('photo-1489599849927-2ee91cede3ba') },
  ],
}

export function getEventImage(category: Category, imageUrl?: string | null, title = ''): string {
  if (imageUrl?.trim()) return imageUrl.trim()

  const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const match = titleImages[category]?.find(({ keywords }) => keywords.test(normalizedTitle))
  return match?.image || categoryImages[category] || categoryImages.Otros
}
