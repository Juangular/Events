import type { Category } from '../types'

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`
// These Commons photographs are CC0; keep the file paths when replacing them.
const commonsImage = (path: string) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/1280px-${path.slice(path.lastIndexOf('/') + 1)}`

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

// Specific phrases precede broader topics (for example, table tennis before tennis).
const titleImages: Record<Category, { keywords: RegExp; image: string }[]> = {
  Deportes: [
    { keywords: /\b(tenis de mesa|ping pong|pingpong|table tennis)\b/, image: image('photo-1534158914592-062992fbe900') },
    { keywords: /\b(rugby|rugby sevens|rugby seven|rugby 7)\b/, image: commonsImage('a/a0/Rugby_Ball_at_Tag_Rugby_event_260905.jpg') },
    { keywords: /\b(tenis|tennis)\b/, image: image('photo-1554068865-24cecd4e34b8') },
    { keywords: /\b(padel|paddle tenis)\b/, image: commonsImage('6/64/Padel_en_el_Cos_Sports_Plaza.jpg') },
    { keywords: /\b(badminton|parabadminton)\b/, image: commonsImage('9/93/Schools_badminton_in_Lugogo384.jpg') },
    { keywords: /\b(basquet|basquetbol|baloncesto|basket|basketball|minibasquet)\b/, image: image('photo-1546519638-68e109498ffc') },
    { keywords: /\b(voley|voleibol|volibol|volley|volleyball|voley playa)\b/, image: image('photo-1592656094267-764a45160876') },
    { keywords: /\b(beisbol|baseball|softbol|softball)\b/, image: image('photo-1471295253337-3ceaaedca402') },
    { keywords: /\b(balonmano|handball)\b/, image: commonsImage('c/c3/Secondary_schools_handball_championships.jpg') },
    { keywords: /\b(golf|minigolf|mini golf)\b/, image: image('photo-1535131749006-b7f58c99034b') },
    { keywords: /\b(boxeo|box|boxing|kickboxing|muay thai)\b/, image: image('photo-1549719386-74dfcbf7dbed') },
    { keywords: /\b(karate|judo|taekwondo|jiu jitsu|jiujitsu|aikido|kung fu|capoeira|artes marciales|lucha libre|lucha olimpica|mma)\b/, image: commonsImage('f/ff/Karate_tournament_combat.jpg') },
    { keywords: /\b(surf|bodyboard|bodyboarding|longboard surf)\b/, image: image('photo-1502680390469-be75c86b636f') },
    { keywords: /\b(skate|skateboard|skateboarding|longboard)\b/, image: image('photo-1520045892732-304bc3ac5d8e') },
    { keywords: /\b(escalada|boulder|bouldering|montanismo|andinismo|alpinismo)\b/, image: image('photo-1522163182402-834f871fd851') },
    { keywords: /\b(senderismo|trekking|hiking|caminata|caminatas)\b/, image: image('photo-1551632811-561732d1e306') },
    { keywords: /\b(ajedrez|chess)\b/, image: image('photo-1586165368502-1bad197a6461') },
    { keywords: /\b(tiro con arco|arqueria|archery)\b/, image: image('photo-1510925758641-869d353cecc7') },
    { keywords: /\b(gimnasio|pesas|halterofilia|powerlifting|crossfit|calistenia|musculacion|entrenamiento funcional|fitness)\b/, image: image('photo-1534438327276-14e5300c3a48') },
    { keywords: /\b(zumba|aerobicos|aerobica|baile deportivo|bailoterapia)\b/, image: image('photo-1517438984742-1262db08379e') },
    { keywords: /\b(running|runner|runners|maraton|maratones|atletismo|trote|trotar|correr|carrera|carreras)\b/, image: image('photo-1552674605-db6ffd4facb5') },
    { keywords: /\b(ciclismo|bicicleta|bicicletas|ciclovia|ciclovias|ciclista|ciclistas)\b/, image: image('photo-1485965120184-e220f721d03e') },
    { keywords: /\b(yoga|pilates)\b/, image: image('photo-1544367567-0f2fcb009e0b') },
    { keywords: /\b(futbol|fulbito|futsal)\b/, image: image('photo-1574629810360-7efbbe195018') },
    { keywords: /\b(natacion|nadar|aguas abiertas|waterpolo|polo acuatico|natacion artistica)\b/, image: image('photo-1530549387789-4c1017266635') },
  ],
  Cultura: [
    { keywords: /\b(teatro|teatral|teatrales|dramaturgia|comedia|improvisacion|impro|titeres|marionetas|stand up)\b/, image: image('photo-1503095396549-807759245b35') },
    { keywords: /\b(danza|danzas|ballet|marinera|folclore|folklore|folclor|baile|bailes)\b/, image: image('photo-1547153760-18fc86324498') },
    { keywords: /\b(pintura|pinturas|acuarela|acuarelas|dibujo|ilustracion|mural|murales|artes plasticas)\b/, image: image('photo-1460661419201-fd4cecdf8a8b') },
    { keywords: /\b(ceramica|alfareria|arcilla|modelado|escultura|esculturas|artesania|artesanias)\b/, image: commonsImage('3/31/Traditional_pottery_wares_from_the_%E1%BA%B8bu_Akandi%E1%BA%B9_pottery_center_in_Ogbomoso_-_01.jpg') },
    { keywords: /\b(arquitectura|patrimonio|historico|historica|historia|arqueologia|arqueologico|arqueologica)\b/, image: image('photo-1511818966892-d7d671e672a2') },
    { keywords: /\b(fotografia|fotografica|fotografico|fotografias)\b/, image: image('photo-1452587925148-ce544e77e70d') },
    { keywords: /\b(cine|pelicula|peliculas|cinematografico|cinematografica)\b/, image: image('photo-1489599849927-2ee91cede3ba') },
    { keywords: /\b(libro|libros|lectura|literatura|literario|literaria|poesia|poetico|poetica|cuentos|narracion|narrativa|comic|comics|historieta)\b/, image: image('photo-1507842217343-583bb7270b66') },
  ],
  Música: [
    { keywords: /\b(violin|viola|violonchelo|chelo|orquesta|sinfonica|sinfonico|clasica|clasico|musica de camara|opera)\b/, image: image('photo-1465847899084-d164df4dedc6') },
    { keywords: /\b(electronica|techno|house|dj|disc jockey)\b/, image: image('photo-1470225620780-dba8ba36b745') },
    { keywords: /\b(coro|coral|canto|vocal|voces|cantantes)\b/, image: image('photo-1516280440614-37939bbacd81') },
    { keywords: /\b(bateria|baterias|percusion|cajon|tambores|batucada)\b/, image: image('photo-1519892300165-cb5542fb47c7') },
    { keywords: /\b(salsa|bachata|merengue|cumbia|tropical)\b/, image: image('photo-1504609813442-a8924e83f76e') },
    { keywords: /\b(criolla|criollo|andina|andino|huayno|folclor|folklore|folclore|charango|quena|zampona)\b/, image: image('photo-1556379118-7034d926d258') },
    { keywords: /\b(jazz|saxofon|saxofones)\b/, image: image('photo-1511192336575-5a79af67a629') },
    { keywords: /\b(piano|pianista|pianistas)\b/, image: image('photo-1520523839897-bd0b52f945a0') },
    { keywords: /\b(rock|guitarra|guitarras)\b/, image: image('photo-1498038432885-c6f3f1b912ee') },
    { keywords: /\b(hip hop|rap|freestyle|reggae|reggaeton|urbano|urbana|pop|indie|punk|metal|blues|concierto|conciertos)\b/, image: image('photo-1492684223066-81342ee5ff30') },
  ],
  Educación: [
    { keywords: /\b(ingles|frances|portugues|italiano|aleman|quechua|aimara|idiomas|lenguas|lenguaje de senas|lengua de senas)\b/, image: image('photo-1456513080510-7bf3a84b82f8') },
    { keywords: /\b(matematica|matematicas|algebra|geometria|calculo|estadistica|aritmetica)\b/, image: image('photo-1509228468518-180dd4864904') },
    { keywords: /\b(ciencia|ciencias|quimica|fisica|biologia|laboratorio|experimentos|investigacion)\b/, image: image('photo-1532094349884-543bc11b234d') },
    { keywords: /\b(finanzas|financiera|financiero|ahorro|economia|contabilidad|emprendimiento|negocios|empleabilidad|curriculum|liderazgo|oratoria)\b/, image: image('photo-1454165804606-c3d57bc86b40') },
    { keywords: /\b(ambiente|ambiental|ecologia|reciclaje|sostenibilidad|biodiversidad)\b/, image: image('photo-1441974231531-c6227db76b6e') },
    { keywords: /\b(primeros auxilios|salud|nutricion|psicologia|bienestar)\b/, image: image('photo-1505751172876-fa1923c5c528') },
    { keywords: /\b(pintura|dibujo|acuarela|arte|manualidades|artesania)\b/, image: image('photo-1460661419201-fd4cecdf8a8b') },
    { keywords: /\b(lectura|libro|libros|literatura|cuentos)\b/, image: image('photo-1507842217343-583bb7270b66') },
    { keywords: /\b(computacion|programacion|informatica)\b/, image: image('photo-1516321318423-f06f85e504b3') },
  ],
  Tecnología: [
    { keywords: /\b(inteligencia artificial|ia|ai|machine learning|aprendizaje automatico|chatgpt|redes neuronales)\b/, image: image('photo-1677442136019-21780ecad995') },
    { keywords: /\b(ciberseguridad|seguridad informatica|hacking|hacker|hackers|privacidad|criptografia)\b/, image: image('photo-1555949963-aa79dcee981c') },
    { keywords: /\b(videojuego|videojuegos|gaming|gamer|gamers|esports|e sports|realidad virtual|realidad aumentada)\b/, image: image('photo-1511512578047-dfb367046420') },
    { keywords: /\b(electronica|hardware|arduino|raspberry pi|iot|internet de las cosas|impresion 3d|impresoras 3d|circuitos)\b/, image: image('photo-1518770660439-4636190af475') },
    { keywords: /\b(datos|data|analitica|analisis de datos|big data|excel|power bi)\b/, image: image('photo-1551288049-bebda4e38f71') },
    { keywords: /\b(celular|celulares|smartphone|smartphones|android|ios|aplicaciones moviles|apps)\b/, image: image('photo-1511707171634-5f897ff02aa9') },
    { keywords: /\b(dron|drones|drone)\b/, image: image('photo-1507582020474-9a35b7d455d9') },
    { keywords: /\b(astronomia|espacial|espacio|satelite|satelites|astronautica)\b/, image: image('photo-1446776811953-b23d57bd21aa') },
    { keywords: /\b(robotica|robot|robots)\b/, image: image('photo-1485827404703-89b55fcc595e') },
    { keywords: /\b(programacion|software|codigo|desarrollo web)\b/, image: image('photo-1461749280684-dccba630e2f6') },
  ],
  Gastronomía: [
    { keywords: /\b(chocolate|chocolates|cacao|bombones|chocolateria)\b/, image: image('photo-1511381939415-e44015466834') },
    { keywords: /\b(helado|helados|gelato|paletas)\b/, image: image('photo-1563805042-7684c019e1cb') },
    { keywords: /\b(vegetariana|vegetariano|vegana|vegano|vegan|ensalada|ensaladas|plant based|alimentacion saludable)\b/, image: image('photo-1512621776951-a57141f2eefd') },
    { keywords: /\b(parrilla|parrillas|parrillada|anticucho|anticuchos|bbq|asado|asados|carnes)\b/, image: image('photo-1544025162-d76694265947') },
    { keywords: /\b(pescado|pescados|mariscos|ceviche|cebiche|tiradito|tiraditos|cocina marina)\b/, image: image('photo-1519708227418-c8fd9a32b7a2') },
    { keywords: /\b(coctel|cocteles|cocteleria|pisco|vino|vinos|cerveza|cervezas|maridaje|bartender)\b/, image: image('photo-1536935338788-846bb9981813') },
    { keywords: /\b(jugo|jugos|zumo|zumos|batido|batidos|smoothie|smoothies)\b/, image: image('photo-1613478223719-2ab802602423') },
    { keywords: /\b(cafe|cafes|barismo)\b/, image: image('photo-1447933601403-0c6688de566e') },
    { keywords: /\b(pan|panes|panaderia|reposteria|pasteleria)\b/, image: image('photo-1509440159596-0249088772ff') },
  ],
  Familiar: [
    { keywords: /\b(titeres|marionetas|teatro|circo|payaso|payasos|magia|mago|magos)\b/, image: image('photo-1503095396549-807759245b35') },
    { keywords: /\b(manualidades|origami|pintura|dibujo|plastilina|arte|artesania)\b/, image: image('photo-1460661419201-fd4cecdf8a8b') },
    { keywords: /\b(mascota|mascotas|perro|perros|gato|gatos|adopcion|animales)\b/, image: image('photo-1450778869180-41d0601e046e') },
    { keywords: /\b(parque|parques|paseo|paseos|picnic|naturaleza|jardin|jardines)\b/, image: image('photo-1519331379826-f10be5486c6f') },
    { keywords: /\b(ciencia|ciencias|experimentos|cientifico|cientifica)\b/, image: image('photo-1532094349884-543bc11b234d') },
    { keywords: /\b(juegos de mesa|ajedrez|ludoteca|rompecabezas)\b/, image: image('photo-1586165368502-1bad197a6461') },
    { keywords: /\b(musica|musical|canto|canciones|concierto)\b/, image: image('photo-1556379118-7034d926d258') },
    { keywords: /\b(lectura|cuentos|libro|libros)\b/, image: image('photo-1507842217343-583bb7270b66') },
    { keywords: /\b(cine|pelicula|peliculas)\b/, image: image('photo-1489599849927-2ee91cede3ba') },
  ],
  Otros: [
    { keywords: /\b(voluntariado|voluntarios|solidaridad|solidaria|solidario|donacion|donaciones|ayuda comunitaria)\b/, image: image('photo-1559027615-cd4628902d4a') },
    { keywords: /\b(reciclaje|reciclar|residuos|limpieza de playas|limpieza de parques)\b/, image: image('photo-1532996122724-e3c354a0b15b') },
    { keywords: /\b(jardineria|huerto|huertos|plantas|siembra|reforestacion|agricultura)\b/, image: image('photo-1416879595882-3373a0480b5b') },
    { keywords: /\b(naturaleza|ecologia|biodiversidad|ambiental|ambiente|aves|avistamiento)\b/, image: image('photo-1441974231531-c6227db76b6e') },
    { keywords: /\b(salud|bienestar|medica|medico|vacunacion|nutricion|prevencion)\b/, image: image('photo-1505751172876-fa1923c5c528') },
    { keywords: /\b(empleo|empleabilidad|emprendimiento|emprendedores|negocios|networking|orientacion laboral)\b/, image: image('photo-1521737711867-e3b97375f902') },
    { keywords: /\b(mascota|mascotas|adopcion|perro|perros|gato|gatos)\b/, image: image('photo-1450778869180-41d0601e046e') },
  ],
}

export function getEventImage(category: Category, imageUrl?: string | null, title = ''): string {
  if (imageUrl?.trim()) return imageUrl.trim()

  const normalizedTitle = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ')
  const match = titleImages[category]?.find(({ keywords }) => keywords.test(normalizedTitle))
  return match?.image || categoryImages[category] || categoryImages.Otros
}
