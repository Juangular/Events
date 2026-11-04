import type { Category } from '../types'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`

const categoryImages: Record<Category, string> = {
  Cultura: image('photo-1489599849927-2ee91cede3ba'),
  Música: image('photo-1501386761578-eac5c94b800a'),
  Deportes: image('photo-1544367567-0f2fcb009e0b'),
  Educación: image('photo-1503676260728-1c00da094a0b'),
  Tecnología: image('photo-1677442136019-21780ecad995'),
  Gastronomía: image('photo-1559339352-11d035aa65de'),
  Familiar: image('photo-1472162072942-cd5147eb3902'),
  Otros: image('photo-1492684223066-81342ee5ff30'),
}

export function getEventImage(category: Category, imageUrl?: string | null): string {
  return imageUrl?.trim() || categoryImages[category] || categoryImages.Otros
}
