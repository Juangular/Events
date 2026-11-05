import type { Category } from '../types'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`

const categoryImages: Record<Category, string> = {
  Cultura: image('photo-1507924538820-ede94a04019d'),
  Música: image('photo-1493225457124-a3eb161ffa5f'),
  Deportes: image('photo-1461896836934-ffe607ba8211'),
  Educación: image('photo-1524178232363-1fb2b075b655'),
  Tecnología: image('photo-1518770660439-4636190af475'),
  Gastronomía: image('photo-1504674900247-0877df9cc836'),
  Familiar: image('photo-1511895426328-dc8714191300'),
  Otros: image('photo-1501281668745-f7f57925c3b4'),
}

export function getEventImage(category: Category, imageUrl?: string | null): string {
  return imageUrl?.trim() || categoryImages[category] || categoryImages.Otros
}
