import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyCategory, classifySourceTaxonomy } from './category'
import type { Category } from '../types'

test('classifies the event subject rather than treating every fair as food', () => {
  const cases: Array<[string, Category]> = [
    ['IV FERIA DEL LIBRO', 'Cultura'], ['Feria internacional del libro', 'Cultura'],
    ['Feria del libro gastronómico', 'Cultura'], ['Presentación del libro Inteligencia Artificial', 'Cultura'],
    ['Feria de fotografía', 'Cultura'], ['Feria de diseño', 'Cultura'], ['Feria de cerámica', 'Cultura'],
    ['Feria gastronómica', 'Gastronomía'], ['Feria de Mi Pescadería', 'Gastronomía'],
    ['Festival del cacao', 'Gastronomía'], ['Taller de cocina peruana', 'Gastronomía'],
    ['Café literario', 'Cultura'], ['Café filosófico', 'Educación'],
    ['Feria del empleo', 'Educación'], ['Feria de carreras universitarias', 'Educación'],
    ['Feria de ciencias', 'Educación'], ['Feria tecnológica', 'Tecnología'],
    ['Feria barrial', 'Otros'], ['Feria', 'Otros'],
  ]
  for (const [title, expected] of cases) assert.equal(classifyCategory(title), expected, title)
})

test('specialized topics outrank generic workshop and audience words', () => {
  const cases: Array<[string, Category]> = [
    ['Taller de robótica para niños', 'Tecnología'], ['Creemos un robot', 'Tecnología'],
    ['Taller abierto: IA para todos', 'Tecnología'], ['Domo de realidad virtual', 'Tecnología'],
    ['Curso de programación', 'Tecnología'], ['Encuentro de ciberseguridad', 'Tecnología'],
    ['Clases de yoga en familia', 'Deportes'], ['Natación para niños', 'Deportes'],
    ['Torneo de rugby', 'Deportes'], ['Taller de pádel', 'Deportes'], ['Campeonato de ajedrez', 'Deportes'],
    ['Academia IPD — Basquetbol', 'Deportes'], ['Carrera virtual Invicta Run', 'Deportes'], ['Lima Corre 5K', 'Deportes'],
    ['Taller de guitarra', 'Música'], ['Recital de eufonio', 'Música'], ['Sesiones GTN: Voces de viola', 'Música'],
    ['Coro Nacional de Niños', 'Música'], ['Taller de percusión', 'Música'], ['El alma del koto', 'Música'],
    ['Taller de acuarela', 'Cultura'], ['Historia de Lima', 'Cultura'], ['Recorrido por el museo Caral virtual', 'Cultura'],
    ['Festival de cine gastronómico', 'Cultura'], ['Curso de inglés', 'Educación'],
    ['Conferencia de matemáticas', 'Educación'], ['Taller de habilidades', 'Educación'],
    ['SHOW INFANTIL DE CANDY COLORÍN', 'Familiar'], ['Función de títeres', 'Familiar'],
    ['Día de la familia', 'Familiar'], ['Jornada de reciclaje', 'Otros'],
  ]
  for (const [title, expected] of cases) assert.equal(classifyCategory(title), expected, title)
})

test('does not match IA inside words and keeps source fallback when title is inconclusive', () => {
  assert.equal(classifyCategory('FAMILIA'), 'Familiar')
  assert.equal(classifyCategory('Conferencia sobre la carrera artística de Carmen'), 'Cultura')
  assert.equal(classifyCategory('Dante Pineda', 'Cultura'), 'Cultura')
  assert.equal(classifyCategory('THEODORA', 'Música'), 'Música')
  assert.equal(classifyCategory('IV Feria del Libro', 'Gastronomía'), 'Cultura')
  assert.equal(classifyCategory('ANDA, CORRE, VUELA', 'Cultura'), 'Cultura')
  assert.equal(classifyCategory('Demostración y torneo de shogi'), 'Deportes')
  assert.equal(classifyCategory('Exposición + DJ Goro'), 'Cultura')
  assert.equal(classifySourceTaxonomy(['Kids', 'Recital']), 'Familiar')
  assert.equal(classifySourceTaxonomy(['Exposición', 'Tecnología']), 'Tecnología')
  assert.equal(classifySourceTaxonomy(['Cultura']), 'Cultura')
})
