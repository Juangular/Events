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

test('recognizes the expanded catalogue in all eight categories', () => {
  const cases = [
    ['Deportes', 'Escuela de RUGBY', 'Rugby_Ball_at_Tag_Rugby_event_260905.jpg'],
    ['Deportes', 'Torneo de tenis', 'photo-1554068865-24cecd4e34b8'],
    ['Deportes', 'Clases de pádel', 'Padel_en_el_Cos_Sports_Plaza.jpg'],
    ['Deportes', 'Iniciación al bádminton', 'Schools_badminton_in_Lugogo384.jpg'],
    ['Deportes', 'Taller de básquetbol', 'photo-1546519638-68e109498ffc'],
    ['Deportes', 'Vóley playa', 'photo-1592656094267-764a45160876'],
    ['Deportes', 'Campeonato de béisbol', 'photo-1471295253337-3ceaaedca402'],
    ['Deportes', 'Escuela de balonmano', 'Secondary_schools_handball_championships.jpg'],
    ['Deportes', 'Golf para principiantes', 'photo-1535131749006-b7f58c99034b'],
    ['Deportes', 'Entrenamiento de boxeo', 'photo-1549719386-74dfcbf7dbed'],
    ['Deportes', 'Taller de jiu-jitsu', 'Karate_tournament_combat.jpg'],
    ['Deportes', 'Clases de surf', 'photo-1502680390469-be75c86b636f'],
    ['Deportes', 'Skateboarding en el parque', 'photo-1520045892732-304bc3ac5d8e'],
    ['Deportes', 'Encuentro de escalada', 'photo-1522163182402-834f871fd851'],
    ['Deportes', 'Caminata familiar', 'photo-1551632811-561732d1e306'],
    ['Deportes', 'Torneo de ajedrez', 'photo-1586165368502-1bad197a6461'],
    ['Deportes', 'Tiro con arco', 'photo-1510925758641-869d353cecc7'],
    ['Deportes', 'Entrenamiento funcional', 'photo-1534438327276-14e5300c3a48'],
    ['Deportes', 'Zumba en el parque', 'photo-1517438984742-1262db08379e'],
    ['Cultura', 'Festival de teatro', 'photo-1503095396549-807759245b35'],
    ['Cultura', 'Presentación de ballet', 'photo-1547153760-18fc86324498'],
    ['Cultura', 'Taller de acuarelas', 'photo-1460661419201-fd4cecdf8a8b'],
    ['Cultura', 'Exposición de cerámica', 'Traditional_pottery_wares'],
    ['Cultura', 'Recorrido por el patrimonio', 'photo-1511818966892-d7d671e672a2'],
    ['Música', 'Concierto de orquesta sinfónica', 'photo-1465847899084-d164df4dedc6'],
    ['Música', 'Festival de música electrónica', 'photo-1470225620780-dba8ba36b745'],
    ['Música', 'Encuentro coral', 'photo-1516280440614-37939bbacd81'],
    ['Música', 'Taller de cajón', 'photo-1519892300165-cb5542fb47c7'],
    ['Música', 'Noche de salsa', 'photo-1504609813442-a8924e83f76e'],
    ['Música', 'Concierto de música criolla', 'photo-1556379118-7034d926d258'],
    ['Música', 'Festival de hip-hop', 'photo-1492684223066-81342ee5ff30'],
    ['Educación', 'Clases de inglés', 'photo-1456513080510-7bf3a84b82f8'],
    ['Educación', 'Taller de matemáticas', 'photo-1509228468518-180dd4864904'],
    ['Educación', 'Experimentos de química', 'photo-1532094349884-543bc11b234d'],
    ['Educación', 'Finanzas para emprendedores', 'photo-1454165804606-c3d57bc86b40'],
    ['Educación', 'Educación ambiental', 'photo-1441974231531-c6227db76b6e'],
    ['Educación', 'Taller de primeros auxilios', 'photo-1505751172876-fa1923c5c528'],
    ['Educación', 'Dibujo para principiantes', 'photo-1460661419201-fd4cecdf8a8b'],
    ['Tecnología', 'Introducción a la inteligencia artificial', 'photo-1677442136019-21780ecad995'],
    ['Tecnología', 'Jornada de ciberseguridad', 'photo-1555949963-aa79dcee981c'],
    ['Tecnología', 'Festival de videojuegos', 'photo-1511512578047-dfb367046420'],
    ['Tecnología', 'Taller de Arduino', 'photo-1518770660439-4636190af475'],
    ['Tecnología', 'Análisis de datos', 'photo-1551288049-bebda4e38f71'],
    ['Tecnología', 'Aplicaciones móviles para Android', 'photo-1511707171634-5f897ff02aa9'],
    ['Tecnología', 'Demostración de drones', 'photo-1507582020474-9a35b7d455d9'],
    ['Tecnología', 'Introducción a la astronomía', 'photo-1446776811953-b23d57bd21aa'],
    ['Gastronomía', 'Feria del cacao', 'photo-1511381939415-e44015466834'],
    ['Gastronomía', 'Taller de helados', 'photo-1563805042-7684c019e1cb'],
    ['Gastronomía', 'Cocina vegana', 'photo-1512621776951-a57141f2eefd'],
    ['Gastronomía', 'Festival de anticuchos', 'photo-1544025162-d76694265947'],
    ['Gastronomía', 'Preparación de ceviche', 'photo-1519708227418-c8fd9a32b7a2'],
    ['Gastronomía', 'Taller de coctelería', 'photo-1536935338788-846bb9981813'],
    ['Gastronomía', 'Jugos naturales', 'photo-1613478223719-2ab802602423'],
    ['Familiar', 'Función de títeres', 'photo-1503095396549-807759245b35'],
    ['Familiar', 'Origami para niños', 'photo-1460661419201-fd4cecdf8a8b'],
    ['Familiar', 'Encuentro de mascotas', 'photo-1450778869180-41d0601e046e'],
    ['Familiar', 'Picnic en familia', 'photo-1519331379826-f10be5486c6f'],
    ['Familiar', 'Experimentos en familia', 'photo-1532094349884-543bc11b234d'],
    ['Familiar', 'Juegos de mesa', 'photo-1586165368502-1bad197a6461'],
    ['Familiar', 'Canciones para niños', 'photo-1556379118-7034d926d258'],
    ['Otros', 'Voluntariado comunitario', 'photo-1559027615-cd4628902d4a'],
    ['Otros', 'Jornada de reciclaje', 'photo-1532996122724-e3c354a0b15b'],
    ['Otros', 'Taller de huertos', 'photo-1416879595882-3373a0480b5b'],
    ['Otros', 'Avistamiento de aves', 'photo-1441974231531-c6227db76b6e'],
    ['Otros', 'Campaña de salud', 'photo-1505751172876-fa1923c5c528'],
    ['Otros', 'Feria de empleo', 'photo-1521737711867-e3b97375f902'],
    ['Otros', 'Adopción de mascotas', 'photo-1450778869180-41d0601e046e'],
  ]
  for (const [category, title, expected] of cases) {
    assert.ok(getEventImage(category, null, title).includes(expected), `${category}: ${title}`)
  }
})

test('prioritizes specific phrases and keeps matching bounded to words and categories', () => {
  assert.ok(getEventImage('Deportes', null, 'Torneo de TENIS DE MESA').includes('photo-1534158914592-062992fbe900'))
  assert.ok(getEventImage('Deportes', null, 'Campeonato de ping-pong').includes('photo-1534158914592-062992fbe900'))
  assert.ok(getEventImage('Música', null, 'Concierto de jazz').includes('photo-1511192336575-5a79af67a629'))
  assert.ok(getEventImage('Tecnología', null, 'Taller de inteligencia   artificial').includes('photo-1677442136019-21780ecad995'))
  assert.equal(getEventImage('Tecnología', null, 'Festival de fantasía'), getEventImage('Tecnología'))
  assert.equal(getEventImage('Cultura', null, 'La carrera de una artista'), getEventImage('Cultura'))
  for (const category of ['Cultura', 'Música', 'Deportes', 'Educación', 'Tecnología', 'Gastronomía', 'Familiar', 'Otros']) {
    assert.equal(getEventImage(category, null, 'Encuentro general'), getEventImage(category))
    assert.equal(getEventImage(category, 'https://example.com/original.jpg', 'Torneo de tenis'), 'https://example.com/original.jpg')
  }
})
