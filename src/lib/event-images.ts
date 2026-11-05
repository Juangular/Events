import type { Category } from '../types'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`

const categoryImages: Record<Category, string> = {
  Cultura: image('photo-1544213456-bc37cb97df74'),
  Música: image('photo-1556379118-7034d926d258'),
  Deportes: image('photo-1646504458774-dbad0e941c14'),
  Educación: image('photo-1503676260728-1c00da094a0b'),
  Tecnología: image('photo-1498049794561-7780e7231661'),
  Gastronomía: image('photo-1613626630502-182579c0432c'),
  Familiar: image('photo-1609260840244-22b52bfc6664'),
  Otros: image('photo-1533174072545-7a4b6ad7a6c3'),
}

export function getEventImage(category: Category, imageUrl?: string | null): string {
  return imageUrl?.trim() || categoryImages[category] || categoryImages.Otros
}
