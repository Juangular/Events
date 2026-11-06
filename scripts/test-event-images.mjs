import assert from 'node:assert/strict'
import test from 'node:test'
import { getEventImage } from '../src/lib/event-images.ts'

test('preserves an event image ahead of title and category fallbacks', () => {
  assert.equal(getEventImage('Deportes', ' https://example.com/event.jpg ', 'Maratón de Lima'), 'https://example.com/event.jpg')
})

test('recognizes title topics across categories, accents and case', () => {
  const cases = [
    ['Deportes', 'MARATÓN de Lima', 'photo-1552674605-db6ffd4facb5'],
    ['Deportes', 'Club de running', 'photo-1552674605-db6ffd4facb5'],
    ['Deportes', 'Paseo en bicicleta', 'photo-1485965120184-e220f721d03e'],
    ['Deportes', 'Yoga al aire libre', 'photo-1544367567-0f2fcb009e0b'],
    ['Deportes', 'Taller de fútbol', 'photo-1574629810360-7efbbe195018'],
    ['Deportes', 'Natación para todos', 'photo-1530549387789-4c1017266635'],
    ['Cultura', 'Exposición fotográfica', 'photo-1452587925148-ce544e77e70d'],
    ['Cultura', 'Ciclo de cine', 'photo-1489599849927-2ee91cede3ba'],
    ['Cultura', 'Encuentro de poesía', 'photo-1507842217343-583bb7270b66'],
    ['Música', 'Noche de jazz', 'photo-1511192336575-5a79af67a629'],
    ['Música', 'Recital de piano', 'photo-1520523839897-bd0b52f945a0'],
    ['Música', 'Festival de rock', 'photo-1498038432885-c6f3f1b912ee'],
    ['Educación', 'Club de lectura', 'photo-1507842217343-583bb7270b66'],
    ['Educación', 'Taller de computación', 'photo-1516321318423-f06f85e504b3'],
    ['Tecnología', 'Robótica para jóvenes', 'photo-1485827404703-89b55fcc595e'],
    ['Tecnología', 'Introducción a la programación', 'photo-1461749280684-dccba630e2f6'],
    ['Gastronomía', 'Feria del café', 'photo-1447933601403-0c6688de566e'],
    ['Gastronomía', 'Taller de panadería', 'photo-1509440159596-0249088772ff'],
    ['Familiar', 'Tarde de cuentos', 'photo-1507842217343-583bb7270b66'],
    ['Familiar', 'Cine en familia', 'photo-1489599849927-2ee91cede3ba'],
  ]
  for (const [category, title, photo] of cases) {
    assert.ok(getEventImage(category, null, title).includes(photo), `${category}: ${title}`)
  }
})

test('keeps category fallback for missing topics, unrelated categories and partial words', () => {
  for (const title of ['', 'Encuentro deportivo', 'Presentación de corredoresponsales']) {
    assert.equal(getEventImage('Deportes', ' ', title), getEventImage('Deportes'))
  }
  assert.equal(getEventImage('Cultura', null, 'La carrera de una artista'), getEventImage('Cultura'))
  assert.equal(getEventImage('Otros', null, 'Club de running'), getEventImage('Otros'))
})
