/**
 * LumaRijschool — Comprehensive Seed Script (PostgreSQL)
 * Creates: admin, plans, topics, lessons, questions, exams, badges, achievements,
 * ranks, mystery boxes, challenges, season pass, demo student with referral.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding LumaRijschool (PostgreSQL)...')

  // ─── 1. ADMIN ────────────────────────────────────────────
  const adminPass = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lumatheorie.nl' },
    update: {},
    create: {
      email: 'admin@lumatheorie.nl',
      name: 'Luma Admin',
      phone: '+31 6 12345678',
      passwordHash: adminPass,
      role: 'ADMIN',
      country: 'NL',
      emailVerified: new Date(),
    },
  })
  console.log('  ✓ admin:', admin.email)

  // ─── 2. PLANS ────────────────────────────────────────────
  const weekPlan = await prisma.plan.upsert({
    where: { slug: 'WEEK' },
    update: {},
    create: {
      slug: 'WEEK',
      name: 'Week',
      description: '7 dagen toegang',
      priceCents: 1299,
      currency: 'EUR',
      durationDays: 7,
      isPopular: false,
      features: JSON.stringify(['Alle lessen & examens', 'Foutenanalyse', 'Mobiele app']),
    },
  })
  const monthPlan = await prisma.plan.upsert({
    where: { slug: 'MONTH' },
    update: {},
    create: {
      slug: 'MONTH',
      name: 'Month',
      description: '30 dagen toegang',
      priceCents: 2999,
      currency: 'EUR',
      durationDays: 30,
      isPopular: true,
      features: JSON.stringify(['Alles uit Week', 'AI Tutor onbeperkt', 'Study planner', 'Persoonlijke voortgang', 'Prioriteit support']),
    },
  })
  console.log('  ✓ plans:', weekPlan.slug, monthPlan.slug)

  // ─── 3. TOPICS ───────────────────────────────────────────
  const topics = [
    { slug: 'voorrang', name: 'Voorrang', color: '#2563EB', order: 1, description: 'Voorrangsregels op kruisingen, rotondes en bij bijzondere voertuigen.' },
    { slug: 'verkeersborden', name: 'Verkeersborden', color: '#FFB020', order: 2, description: 'Borden, markeringen en signalen die je moet herkennen.' },
    { slug: 'snelheid', name: 'Snelheid & regels', color: '#1FB871', order: 3, description: 'Maximumsnelheden, inhalen en verkeersregels in de stad.' },
    { slug: 'autosnelweg', name: 'Autosnelweg', color: '#7C5CFC', order: 4, description: 'Rijden op de snelweg, invoegen, uitrijden en pech.' },
    { slug: 'parkeren', name: 'Parkeren', color: '#FF6B6B', order: 5, description: 'Parkeren, stilstaan en wat de borden daarover zeggen.' },
  ]
  const topicRecs: Record<string, any> = {}
  for (const t of topics) {
    topicRecs[t.slug] = await prisma.topic.upsert({ where: { slug: t.slug }, update: {}, create: t })
  }
  console.log('  ✓ topics:', Object.keys(topicRecs).length)

  // ─── 4. LESSONS ──────────────────────────────────────────
  const lessonsData = [
    { slug: 'gelijkwaardige-kruising', title: 'Gelijkwaardige kruising', topicSlug: 'voorrang', order: 1, summary: 'Op een gelijkwaardige kruising geldt: rechts gaat voor.', description: 'Je leert hoe voorrang werkt op een gelijkwaardige kruising, wanneer je moet wachten en hoe je veilig oprijdt. Inclusief voorrangsvoertuigen en uitzonderingen.', videoUrl: 'https://www.youtube.com/embed/_ZQvGgR0pYE', durationSec: 428, isFree: true, transcript: 'Op een gelijkwaardige kruising gaat het verkeer van rechts voor. Kijk dus altijd eerst naar rechts voordat je oprijdt. Bestuurders die van rechts komen hoeven jou geen voorrang te verlenen. Let op: dit geldt alleen op kruisingen zonder borden of markeringen die iets anders zeggen. Een exception is politie, ambulance of brandweer met zwaailicht — zij hebben altijd voorrang.', notes: '## Leerdoelen\n- Rechts gaat voor\n- Voorrangsvoertuigen herkennen\n- Veilig oprijden\n\n## Veelgemaakte fout\nStudenten vergeten vaak rechts te kijken omdat ze gefocust zijn op links.', chapters: [{ title: 'Wat is voorrang?', startSec: 0, endSec: 90, order: 1 }, { title: 'Voorrangsvoertuigen', startSec: 91, endSec: 220, order: 2 }, { title: 'Veilig oprijden', startSec: 221, endSec: 428, order: 3 }] },
    { slug: 'voorrangebiedende-weg', title: 'Voorrangsborden', topicSlug: 'voorrang', order: 2, summary: 'Herkennen van voorrangsweg en gebiedende borden.', description: 'Wanneer heb jij voorrang en wanneer moet je die verlenen? Dit hoofdstuk behandelt de oranje-driehoek borden en hoe je ze herkent.', videoUrl: 'https://www.youtube.com/embed/G7tM9PfLp2Q', durationSec: 384, isFree: true, transcript: 'Voorrangsborden zijn geel/oranje driehoeken. Een oranje driehoek met de punt naar boven betekent dat je voorrang moet verlenen aan kruisend verkeer. Een vierkant oranje bord met een zwarte rand betekent dat jij op een voorrangsweg rijdt.', notes: '## Borden\n- B1: Voorrang verlenen\n- B2: Voorrangsweg\n- B6: Einde voorrangsweg', chapters: [{ title: 'B1: Voorrang verlenen', startSec: 0, endSec: 120, order: 1 }, { title: 'B2: Voorrangsweg', startSec: 121, endSec: 260, order: 2 }, { title: 'Einde voorrangsweg', startSec: 261, endSec: 384, order: 3 }] },
    { slug: 'rotonde', title: 'Rotonde — hoe het werkt', topicSlug: 'voorrang', order: 3, summary: 'Voorrang op de rotonde en richting aangeven.', description: 'Een rotonde lijkt simpel, maar veel studenten maken fouten bij het rijbaan kiezen en richting aangeven. Leer de regels per uitrit.', videoUrl: 'https://www.youtube.com/embed/dfkRkFfR2y8', durationSec: 512, isFree: false, transcript: 'Op een rotonde geldt: verkeer op de rotonde gaat voor. Geef bij het verlaten van de rotonde richting aan naar rechts. Kies de juiste rijbaan: voor de eerste uitrit rechts, anders links aanhouden.', notes: '## Rotonde-regels\n1. Verkeer op rotonde gaat voor\n2. Richting aangeven bij verlaten\n3. Juiste rijbaan kiezen', chapters: [{ title: 'Voorrang op de rotonde', startSec: 0, endSec: 180, order: 1 }, { title: 'Rijbaan kiezen', startSec: 181, endSec: 360, order: 2 }, { title: 'Richting aangeven', startSec: 361, endSec: 512, order: 3 }] },
    { slug: 'verkeersborden-overzicht', title: 'Verkeersborden overzicht', topicSlug: 'verkeersborden', order: 1, summary: 'De belangrijkste borden die je moet kennen.', description: 'Een compleet overzicht van gebiedende, gebods- en waarschuwingsborden. Met herkenningsoefeningen.', videoUrl: 'https://www.youtube.com/embed/_ZQvGgR0pYE', durationSec: 486, isFree: true, transcript: 'Verkeersborden zijn verdeeld in vijf groepen: waarschuwingsborden (rode driehoek), gebodsborden (ronde blauwe), verbodsborden (ronde rode rand), aanwijzingsborden (vierkant blauwe) en borden met tekst. Leer de vormen eerst, dan de details.', notes: '## Vijf groepen\n1. Waarschuwingsborden — rode driehoek\n2. Gebodsborden — rond blauw\n3. Verbodsborden — rond met rode rand\n4. Aanwijzingsborden — vierkant blauw\n5. Tekstborden', chapters: [{ title: 'Vijf groepen', startSec: 0, endSec: 120, order: 1 }, { title: 'Vormen herkennen', startSec: 121, endSec: 300, order: 2 }, { title: 'Oefening', startSec: 301, endSec: 486, order: 3 }] },
    { slug: 'stopbord-uitleg', title: 'Stopbord en STOP-markering', topicSlug: 'verkeersborden', order: 2, summary: 'Wanneer moet je volledig stoppen?', description: 'Een stopbord (B2 met STOP-onderbord) verplicht je tot een volledige stop. Ook als de weg vrij lijkt. Leer het verschil met verlenen.', videoUrl: 'https://www.youtube.com/embed/G7tM9PfLp2Q', durationSec: 248, isFree: false, transcript: 'Een stopbord is een rood achtzijdig bord met STOP. Je moet hier volledig stoppen, ook als er geen verkeer is. Daarna verleen je voorrang. Een STOP-markering op de weg heeft dezelfde betekenis.', notes: '## STOP vs verlenen\n- STOP = altijd stoppen\n- Verlenen = alleen stoppen als er verkeer is', chapters: [{ title: 'Het bord', startSec: 0, endSec: 90, order: 1 }, { title: 'Markering op de weg', startSec: 91, endSec: 248, order: 2 }] },
    { slug: 'snelheid-binnenbebouwde-kom', title: 'Snelheid binnen de bebouwde kom', topicSlug: 'snelheid', order: 1, summary: '50 km/h standaard, 30 km/h in veel wijken.', description: 'Wanneer geldt 50 km/h, wanneer 30? Leer de uitzonderingen zoals woonerven en 60-zones.', videoUrl: 'https://www.youtube.com/embed/dfkRkFfR2y8', durationSec: 372, isFree: true, transcript: 'Binnen de bebouwde kom is 50 km/h de standaard. Veel wijken zijn echter 30 km/h zones. Woonerven (bord met "Erv") hebben 15 km/h. Buiten de bebouwde kom is 80 of 100, op de autosnelweg 100 of 130.', notes: '## Snelheden\n- 30 km/h: woonwijk\n- 50 km/h: stad\n- 80 km/h: buiten bebouwde kom\n- 100/130 km/h: autosnelweg', chapters: [{ title: 'Standaard 50 km/h', startSec: 0, endSec: 120, order: 1 }, { title: '30 km/h zones', startSec: 121, endSec: 250, order: 2 }, { title: 'Woonerven', startSec: 251, endSec: 372, order: 3 }] },
    { slug: 'inhalen', title: 'Inhalen — wanneer mag het?', topicSlug: 'snelheid', order: 2, summary: 'Inhalen links, uitzonderingen en verboden.', description: 'Inhalen gebeurt links, tenzij het een tram is of iemand die fietst. Leer wanneer inhalen verboden is.', videoUrl: 'https://www.youtube.com/embed/_ZQvGgR0pYE', durationSec: 296, isFree: false, transcript: 'Inhalen gebeurt links. Een tram of fietser mag je rechts inhalen. Inhalen is verboden bij doorgetrokken strepen, vlak voor en op een voetgangersoversteekplaats en op een kruising als je moet wachten.', notes: '## Inhalen\n- Standaard links\n- Tram en fietser: rechts mag\n- Verboden bij: doorgetrokken streep, zebrapad, kruising wachten', chapters: [{ title: 'Links inhalen', startSec: 0, endSec: 100, order: 1 }, { title: 'Rechts inhalen uitzondering', startSec: 101, endSec: 200, order: 2 }, { title: 'Verboden situaties', startSec: 201, endSec: 296, order: 3 }] },
    { slug: 'invoegen-snelweg', title: 'Invoegen op de snelweg', topicSlug: 'autosnelweg', order: 1, summary: 'Hoe je veilig invoegt op de snelweg.', description: 'Invoegen doe je op snelheid. Leer de techniek en wat je doet als de invoegstrook kort is.', videoUrl: 'https://www.youtube.com/embed/G7tM9PfLp2Q', durationSec: 342, isFree: false, transcript: 'Je voegt in op de snelheid van het verkeer op de hoofdrijbaan. Gebruik de invoegstrook om snelheid te maken, kijk in de spiegel en over je schouder, en voeg in als er een gat is. Rijd niet te lang op de invoegstrook door.', notes: '## Invoegen\n1. Snelheid maken\n2. Spiegel + schoudercheck\n3. Gat zoeken\n4. Soepel invoegen', chapters: [{ title: 'Snelheid maken', startSec: 0, endSec: 110, order: 1 }, { title: 'Gat zoeken', startSec: 111, endSec: 230, order: 2 }, { title: 'Soepel invoegen', startSec: 231, endSec: 342, order: 3 }] },
    { slug: 'pech-op-snelweg', title: 'Pech op de snelweg', topicSlug: 'autosnelweg', order: 2, summary: 'Wat doe je bij pech? Achtervang, borden, alarm.', description: 'Pech op de snelweg is gevaarlijk. Leer de stappen: naar de vluchtstrook, waarschuwingsbord, alarmnummer.', videoUrl: 'https://www.youtube.com/embed/dfkRkFfR2y8', durationSec: 280, isFree: true, transcript: 'Bij pech ga je naar de vluchtstrook. Zet je alarm aan, trek veiligheidskleding aan en ga achter de vangrail. Plaats het waarschuwingsdriehoek 30 meter achter je auto. Bel het alarmnummer 112 of de ANWB.', notes: '## Pech\n1. Naar vluchtstrook\n2. Alarm aan\n3. Achter vangrail\n4. Driehoek 30m\n5. 112 / ANWB', chapters: [{ title: 'Naar de vluchtstrook', startSec: 0, endSec: 100, order: 1 }, { title: 'Achter de vangrail', startSec: 101, endSec: 200, order: 2 }, { title: 'Hulp bellen', startSec: 201, endSec: 280, order: 3 }] },
    { slug: 'parkeren-stilstaan', title: 'Parkeren vs stilstaan', topicSlug: 'parkeren', order: 1, summary: 'Wat is het verschil en waar mag wat?', description: 'Parkeren is langer dan 5 minuten stilstaan of het verlaten van je auto. Stilstaan is kort. De borden verschillen.', videoUrl: 'https://www.youtube.com/embed/_ZQvGgR0pYE', durationSec: 256, isFree: true, transcript: 'Je staat stil als je kort stopt om in of uit te laten stappen. Je parkeert als je langer dan 5 minuten staat of de auto verlaat. Een bord "E" met een rode streep betekent verboden te parkeren, maar stilstaan mag. Een bord "E" met een kruis betekent geen van beide mag.', notes: '## Stilstaan vs parkeren\n- Stilstaan: kort, < 5 min\n- Parkeren: > 5 min of auto verlaten\n- E met streep: niet parkeren\n- E met kruis: niet parkeren noch stilstaan', chapters: [{ title: 'Definities', startSec: 0, endSec: 90, order: 1 }, { title: 'Borden', startSec: 91, endSec: 256, order: 2 }] },
    { slug: 'parkeerschijf', title: 'Parkeerschijf gebruiken', topicSlug: 'parkeren', order: 2, summary: 'Hoe stel je de parkeerschijf in?', description: 'In parkeerzones met schijfzonebord moet je de schijf instellen op de aankomsttijd. Leer de regels.', videoUrl: 'https://www.youtube.com/embed/G7tM9PfLp2Q', durationSec: 198, isFree: false, transcript: 'In een parkeerschijfzone stel je de schijf in op het eerste hele kwartier na je aankomst. Staat er een maximum parkeerduur, bijvoorbeeld 2 uur, dan mag je maximaal 2 uur staan.', notes: '## Schijfzone\n- Instellen op eerstvolgende hele kwartier\n- Max duur op bord\n- Bij verlengen: nieuwe aankomsttijd', chapters: [{ title: 'Wanneer schijf', startSec: 0, endSec: 80, order: 1 }, { title: 'Instellen', startSec: 81, endSec: 198, order: 2 }] },
    { slug: 'file-rijden', title: 'File-rijden en spitsstroken', topicSlug: 'autosnelweg', order: 3, summary: 'Hoe rij je veilig in de file?', description: 'In de file hou je voldoende afstand. Spitsstroken mogen alleen als het bord aan staat.', videoUrl: 'https://www.youtube.com/embed/dfkRkFfR2y8', durationSec: 224, isFree: false, transcript: 'In de file rijd je langzaam en hou je de halve snelheid in meters afstand, dus bij 30 km/h minstens 15 meter. Spitsstroken zijn herkenbaar aan een bord met een groene pijl en mogen alleen gebruikt worden als het kruisje groen is.', notes: '## File\n- Halve snelheid in meters = afstand\n- Spitsstrook alleen bij groen kruis', chapters: [{ title: 'Afstand', startSec: 0, endSec: 110, order: 1 }, { title: 'Spitsstrook', startSec: 111, endSec: 224, order: 2 }] },
  ]

  const lessonRecs: Record<string, any> = {}
  for (const l of lessonsData) {
    const { topicSlug, chapters, ...data } = l
    const lesson = await prisma.lesson.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, topicId: topicRecs[topicSlug].id },
    })
    if (chapters?.length) {
      // Clear old chapters first
      await prisma.chapter.deleteMany({ where: { lessonId: lesson.id } })
      for (const c of chapters) {
        await prisma.chapter.create({ data: { ...c, lessonId: lesson.id } })
      }
    }
    lessonRecs[l.slug] = lesson
  }
  console.log('  ✓ lessons:', Object.keys(lessonRecs).length)

  // ─── 5. QUESTIONS ────────────────────────────────────────
  const questionsData = [
    { topicSlug: 'voorrang', lessonSlug: 'gelijkwaardige-kruising', stem: 'Je nadert een gelijkwaardige kruising en wilt rechtdoor. Een auto komt van rechts en wil ook rechtdoor. Wie moet er wachten?', options: [{ key: 'A', text: 'Ik moet wachten', isCorrect: true }, { key: 'B', text: 'De auto van rechts moet wachten', isCorrect: false }, { key: 'C', text: 'Beide tegelijk', isCorrect: false }, { key: 'D', text: 'Niemand hoeft te wachten', isCorrect: false }], explanation: 'Op een gelijkwaardige kruising gaat het verkeer van rechts voor. Jij moet dus wachten op de auto die van rechts komt.', difficulty: 'EASY' },
    { topicSlug: 'voorrang', lessonSlug: 'gelijkwaardige-kruising', stem: 'Je hoort een sirene en ziet een ambulance met zwaailicht naderen. Wat doe je?', options: [{ key: 'A', text: 'Doorgaan, ik heb voorrang', isCorrect: false }, { key: 'B', text: 'Zo mogelijk naar rechts uitwijken en stoppen', isCorrect: true }, { key: 'C', text: 'Snel de kruising op rijden', isCorrect: false }, { key: 'D', text: 'Alles opzij zetten en doorrijden', isCorrect: false }], explanation: 'Voorrangsvoertuigen met zwaailicht en sirene hebben altijd voorrang. Je maakt ruimte door naar rechts uit te wijken en eventueel te stoppen.', difficulty: 'EASY' },
    { topicSlug: 'voorrang', lessonSlug: 'voorrangebiedende-weg', stem: 'Je rijdt op een voorrangsweg en nadert een kruising zonder borden. Wie gaat er?', options: [{ key: 'A', text: 'Ik, want ik rijd op de voorrangsweg', isCorrect: true }, { key: 'B', text: 'Het verkeer van rechts', isCorrect: false }, { key: 'C', text: 'Degene die het eerst bij de kruising was', isCorrect: false }, { key: 'D', text: 'De snelste', isCorrect: false }], explanation: 'Op een voorrangsweg heb jij voorrang op kruisend verkeer dat van zijwegen komt, tenzij borden iets anders aangeven.', difficulty: 'MEDIUM' },
    { topicSlug: 'voorrang', lessonSlug: 'rotonde', stem: 'Je bent op een rotonde en wilt de tweede afslag nemen. Wie gaat er voor?', options: [{ key: 'A', text: 'Verkeer dat wil invoegen', isCorrect: false }, { key: 'B', text: 'Verkeer dat al op de rotonde rijdt', isCorrect: true }, { key: 'C', text: 'Degene die het snelst rijdt', isCorrect: false }, { key: 'D', text: 'Verkeer van rechts altijd', isCorrect: false }], explanation: 'Op een rotonde geldt: verkeer dat op de rotonde rijdt heeft voorrang op verkeer dat wil invoegen.', difficulty: 'MEDIUM' },
    { topicSlug: 'voorrang', stem: 'Een fietser nadert van links op een gelijkwaardige kruising. Wat geldt?', options: [{ key: 'A', text: 'De fietser gaat voor', isCorrect: true }, { key: 'B', text: 'Ik ga voor want ik ben een auto', isCorrect: false }, { key: 'C', text: 'Degene die het eerst was', isCorrect: false }, { key: 'D', text: 'Beide stoppen', isCorrect: false }], explanation: 'Een fietser is verkeer en op een gelijkwaardige kruising geldt rechts gaat voor, ook voor fietsers.', difficulty: 'MEDIUM' },
    { topicSlug: 'voorrang', stem: 'Je ziet een oranje driehoek met de punt naar boven. Wat betekent dit?', options: [{ key: 'A', text: 'Voorrangsweg', isCorrect: false }, { key: 'B', text: 'Voorrang verlenen aan kruisend verkeer', isCorrect: true }, { key: 'C', text: 'Verboden in te rijden', isCorrect: false }, { key: 'D', text: 'Stoppen verplicht', isCorrect: false }], explanation: 'Een oranje driehoek met de punt naar boven (B1) betekent: voorrang verlenen aan kruisend verkeer.', difficulty: 'EASY' },
    { topicSlug: 'voorrang', stem: 'Op een rotonde wil je de eerste afslag nemen. Welke richting moet je aangeven?', options: [{ key: 'A', text: 'Links', isCorrect: false }, { key: 'B', text: 'Rechts bij het naderen en verlaten', isCorrect: true }, { key: 'C', text: 'Geen richting aangeven', isCorrect: false }, { key: 'D', text: 'Eerst links dan rechts', isCorrect: false }], explanation: 'Voor de eerste afslag geef je rechts aan bij het naderen en blijf je die aangeven tot je de rotonde verlaat.', difficulty: 'MEDIUM' },
    { topicSlug: 'verkeersborden', lessonSlug: 'stopbord-uitleg', stem: 'Wat betekent een rood achtzijdig bord met STOP?', options: [{ key: 'A', text: 'Je mag er niet stoppen', isCorrect: false }, { key: 'B', text: 'Je moet volledig stoppen en voorrang verlenen', isCorrect: true }, { key: 'C', text: 'Let op, er kan verkeer komen', isCorrect: false }, { key: 'D', text: 'Einde snelheidslimiet', isCorrect: false }], explanation: 'Een STOP-bord verplicht tot een volledige stop. Daarna verleen je voorrang aan kruisend verkeer.', difficulty: 'EASY' },
    { topicSlug: 'verkeersborden', stem: 'Een rond bord met een rode rand en een witte binnenkant. Wat is dit?', options: [{ key: 'A', text: 'Een verbodsbord', isCorrect: true }, { key: 'B', text: 'Een gebodsbord', isCorrect: false }, { key: 'C', text: 'Een aanwijzingsbord', isCorrect: false }, { key: 'D', text: 'Een waarschuwingsbord', isCorrect: false }], explanation: 'Ronde borden met een rode rand zijn verbodsborden. Ze geven aan wat niet mag.', difficulty: 'EASY' },
    { topicSlug: 'verkeersborden', stem: 'Een blauw rond bord met een witte pijl naar rechts. Wat moet je?', options: [{ key: 'A', text: 'Rechts afslaan toegestaan', isCorrect: false }, { key: 'B', text: 'Rechtsaf gaan, verplicht', isCorrect: true }, { key: 'C', text: 'Rechts inhalen mag', isCorrect: false }, { key: 'D', text: 'Rechts inhalen verboden', isCorrect: false }], explanation: 'Een blauw rond bord met witte pijl is een gebodsbord. De pijlrichting is verplicht.', difficulty: 'MEDIUM' },
    { topicSlug: 'verkeersborden', stem: 'Wat is een geel vierkant bord met een zwarte rand?', options: [{ key: 'A', text: 'Waarschuwingsbord', isCorrect: false }, { key: 'B', text: 'Voorrangsweg', isCorrect: true }, { key: 'C', text: 'Verboden in te rijden', isCorrect: false }, { key: 'D', text: 'Voetgangerszone', isCorrect: false }], explanation: 'Een geel vierkant bord met zwarte rand (B2) duidt een voorrangsweg aan.', difficulty: 'MEDIUM' },
    { topicSlug: 'verkeersborden', stem: 'Een rood bord met witte streep "E". Wat betekent dit?', options: [{ key: 'A', text: 'Verboden te parkeren, stilstaan mag', isCorrect: true }, { key: 'B', text: 'Verboden te parkeren en te stilstaan', isCorrect: false }, { key: 'C', text: 'Parkeerplaats', isCorrect: false }, { key: 'D', text: 'Parkeren betaald', isCorrect: false }], explanation: 'Een bord "E" met één schuine rode streep: verboden te parkeren. Stilstaan (kort) mag wel.', difficulty: 'MEDIUM' },
    { topicSlug: 'snelheid', lessonSlug: 'snelheid-binnenbebouwde-kom', stem: 'Wat is de standaard maximumsnelheid binnen de bebouwde kom?', options: [{ key: 'A', text: '30 km/h', isCorrect: false }, { key: 'B', text: '50 km/h', isCorrect: true }, { key: 'C', text: '60 km/h', isCorrect: false }, { key: 'D', text: '80 km/h', isCorrect: false }], explanation: 'Binnen de bebouwde kom is 50 km/h de standaard. Veel wijken zijn echter 30 km/h zones.', difficulty: 'EASY' },
    { topicSlug: 'snelheid', stem: 'Je rijdt 60 km/h in een 30-zone. Wat is het risico?', options: [{ key: 'A', text: 'Niets, 60 is toegestaan', isCorrect: false }, { key: 'B', text: 'Boete plus strafpunt op rijbewijs', isCorrect: true }, { key: 'C', text: 'Alleen waarschuwing', isCorrect: false }, { key: 'D', text: 'Auto wordt in beslag genomen', isCorrect: false }], explanation: 'Te hard rijden in een 30-zone levert een boete op, plus strafpunten bij zware overtreding.', difficulty: 'MEDIUM' },
    { topicSlug: 'snelheid', lessonSlug: 'inhalen', stem: 'Je wilt een fietser inhalen in de stad. Aan welke kant mag dat?', options: [{ key: 'A', text: 'Alleen links', isCorrect: false }, { key: 'B', text: 'Rechts, dat mag bij fietsers', isCorrect: true }, { key: 'C', text: 'Beide kanten', isCorrect: false }, { key: 'D', text: 'Inhalen van fietsers is verboden', isCorrect: false }], explanation: 'Een fietser mag je rechts inhalen. Dit is een uitzondering op de regel dat inhalen links gebeurt.', difficulty: 'MEDIUM' },
    { topicSlug: 'snelheid', stem: 'Waar is inhalen altijd verboden?', options: [{ key: 'A', text: 'Op een rechte weg buiten de stad', isCorrect: false }, { key: 'B', text: 'Bij doorgetrokken strepen en op zebrapaden', isCorrect: true }, { key: 'C', text: 'Op een rotonde', isCorrect: false }, { key: 'D', text: 'In een 50-zone', isCorrect: false }], explanation: 'Inhalen is verboden bij doorgetrokken strepen, vlak voor en op voetgangersoversteekplaatsen en bij kruisingen waar je moet wachten.', difficulty: 'MEDIUM' },
    { topicSlug: 'snelheid', stem: 'Wat is de maximumsnelheid op de autosnelweg in Nederland?', options: [{ key: 'A', text: '100 km/h overdag, 130 km/h \'s nachts op veel wegdelen', isCorrect: true }, { key: 'B', text: 'Altijd 130 km/h', isCorrect: false }, { key: 'C', text: 'Altijd 120 km/h', isCorrect: false }, { key: 'D', text: '100 km/h altijd', isCorrect: false }], explanation: 'Sinds 2020 geldt op veel snelwegen 100 km/h tussen 06:00 en 19:00. \'s Nachts is vaak 130 km/h toegestaan, tenzij borden anders aangeven.', difficulty: 'HARD' },
    { topicSlug: 'autosnelweg', lessonSlug: 'invoegen-snelweg', stem: 'Hoe voeg je veilig in op de snelweg?', options: [{ key: 'A', text: 'Langzaam rijden op de invoegstrook', isCorrect: false }, { key: 'B', text: 'Snelheid maken, spiegel + schoudercheck, gat zoeken', isCorrect: true }, { key: 'C', text: 'Stoppen op de invoegstrook', isCorrect: false }, { key: 'D', text: 'Direct invoegen zonder te kijken', isCorrect: false }], explanation: 'Je voegt in op de snelheid van het verkeer op de hoofdrijbaan. Maak snelheid, kijk goed (spiegel + schouder) en voeg soepel in.', difficulty: 'MEDIUM' },
    { topicSlug: 'autosnelweg', lessonSlug: 'pech-op-snelweg', stem: 'Je krijgt pech op de snelweg. Wat is het eerste wat je doet?', options: [{ key: 'A', text: 'Auto laten staan en wegrennen', isCorrect: false }, { key: 'B', text: 'Naar de vluchtstrook, alarm aan, achter vangrail', isCorrect: true }, { key: 'C', text: 'Direct de driehoek plaatsen', isCorrect: false }, { key: 'D', text: 'In de auto blijven wachten op hulp', isCorrect: false }], explanation: 'Ga naar de vluchtstrook, zet je alarm aan, trek veiligheidskleding aan en ga achter de vangrail. Pas daarna de driehoek plaatsen.', difficulty: 'MEDIUM' },
    { topicSlug: 'autosnelweg', lessonSlug: 'file-rijden', stem: 'In een file rijd je 30 km/h. Hoeveel afstand houd je minimaal?', options: [{ key: 'A', text: '5 meter', isCorrect: false }, { key: 'B', text: '15 meter', isCorrect: true }, { key: 'C', text: '30 meter', isCorrect: false }, { key: 'D', text: '50 meter', isCorrect: false }], explanation: 'De regel is: halve snelheid in meters. Bij 30 km/h is dat minimaal 15 meter afstand.', difficulty: 'MEDIUM' },
    { topicSlug: 'autosnelweg', stem: 'Wat is een spitsstrook?', options: [{ key: 'A', text: 'Een extra rijstrook die opent in de spits', isCorrect: true }, { key: 'B', text: 'Een vluchtstrook', isCorrect: false }, { key: 'C', text: 'Een pechstrook', isCorrect: false }, { key: 'D', text: 'Een invoegstrook', isCorrect: false }], explanation: 'Een spitsstrook is een extra rijstrook die alleen geopend is als het kruisje boven de strook groen is.', difficulty: 'MEDIUM' },
    { topicSlug: 'autosnelweg', stem: 'Je ziet een groen kruis boven de spitsstrook. Wat betekent dit?', options: [{ key: 'A', text: 'De strook is gesloten', isCorrect: false }, { key: 'B', text: 'De strook is geopend en je mag er rijden', isCorrect: true }, { key: 'C', text: 'Alleen voor hulpdiensten', isCorrect: false }, { key: 'D', text: 'Einde spitsstrook', isCorrect: false }], explanation: 'Een groen kruis betekent dat de spitsstrook geopend is en gebruikt mag worden.', difficulty: 'EASY' },
    { topicSlug: 'parkeren', lessonSlug: 'parkeren-stilstaan', stem: 'Wanneer spreek je van "parkeren" en niet van "stilstaan"?', options: [{ key: 'A', text: 'Als je langer dan 5 minuten staat of de auto verlaat', isCorrect: true }, { key: 'B', text: 'Als je de motor afzet', isCorrect: false }, { key: 'C', text: 'Als je binnen de bebouwde kom staat', isCorrect: false }, { key: 'D', text: 'Parkeren en stilstaan is hetzelfde', isCorrect: false }], explanation: 'Je parkeert als je langer dan 5 minuten staat of de auto verlaat. Korter stilstaan is geen parkeren.', difficulty: 'MEDIUM' },
    { topicSlug: 'parkeren', lessonSlug: 'parkeerschijf', stem: 'Hoe stel je de parkeerschijf in?', options: [{ key: 'A', text: 'Op de exacte aankomsttijd', isCorrect: false }, { key: 'B', text: 'Op het eerstvolgende hele kwartier na aankomst', isCorrect: true }, { key: 'C', text: 'Op de tijd dat je weggaat', isCorrect: false }, { key: 'D', text: 'Op 12:00', isCorrect: false }], explanation: 'In een parkeerschijfzone stel je de schijf in op het eerstvolgende hele kwartier ná je aankomst.', difficulty: 'MEDIUM' },
    { topicSlug: 'parkeren', stem: 'Een bord "E" met een kruis. Wat mag hier?', options: [{ key: 'A', text: 'Alles mag', isCorrect: false }, { key: 'B', text: 'Niet parkeren en niet stilstaan', isCorrect: true }, { key: 'C', text: 'Alleen stilstaan', isCorrect: false }, { key: 'D', text: 'Alleen parkeren', isCorrect: false }], explanation: 'Een bord "E" met een rood kruis betekent: zowel parkeren als stilstaan is verboden.', difficulty: 'EASY' },
    { topicSlug: 'parkeren', stem: 'Mag je parkeren tegenover een ingang van een brandweerkazerne?', options: [{ key: 'A', text: 'Ja, als het minder dan 5 min is', isCorrect: false }, { key: 'B', text: 'Nee, nooit', isCorrect: true }, { key: 'C', text: 'Ja, mits je sleutels in de auto laat', isCorrect: false }, { key: 'D', text: 'Alleen \'s nachts', isCorrect: false }], explanation: 'Parkeren bij een brandweer- of ambulance-ingang is altijd verboden, ook kort.', difficulty: 'MEDIUM' },
    { topicSlug: 'parkeren', stem: 'Wat is een woonerf?', options: [{ key: 'A', text: 'Een zone waar voetgangers voorrang hebben en max 15 km/h geldt', isCorrect: true }, { key: 'B', text: 'Een snelweg', isCorrect: false }, { key: 'C', text: 'Een parkeerplaats', isCorrect: false }, { key: 'D', text: 'Een speelstraat waar parkeren mag', isCorrect: false }], explanation: 'In een woonerf mogen voetgangers en spelende kinderen de weg gebruiken. Maximumsnelheid is 15 km/h.', difficulty: 'HARD' },
    { topicSlug: 'voorrang', stem: 'Een bus stapt uit bij een bushalte zonder eiland. Wat doe je?', options: [{ key: 'A', text: 'Doorgaan, ik heb voorrang', isCorrect: false }, { key: 'B', text: 'Voorrang verlenen aan uitstappende reizigers', isCorrect: true }, { key: 'C', text: 'Claxoneren', isCorrect: false }, { key: 'D', text: 'Snel passeren', isCorrect: false }], explanation: 'Bij een bushalte zonder eiland moet je voorrang verlenen aan uit- en instappende reizigers.', difficulty: 'HARD' },
    { topicSlug: 'snelheid', stem: 'Wat is de maximumsnelheid op een erfweg (woonerf)?', options: [{ key: 'A', text: '15 km/h', isCorrect: true }, { key: 'B', text: '30 km/h', isCorrect: false }, { key: 'C', text: '50 km/h', isCorrect: false }, { key: 'D', text: '60 km/h', isCorrect: false }], explanation: 'In een woonerf geldt 15 km/h. Voetgangers mogen de weg gebruiken.', difficulty: 'MEDIUM' },
    { topicSlug: 'verkeersborden', stem: 'Een geel bord met huisje en "Erf". Wat betekent dit?', options: [{ key: 'A', text: 'Woonerf begint', isCorrect: true }, { key: 'B', text: 'Woonwijk', isCorrect: false }, { key: 'C', text: 'Einde bebouwde kom', isCorrect: false }, { key: 'D', text: 'Parkeerplaats', isCorrect: false }], explanation: 'Het bord met "Erf" geeft het begin van een woonerf aan. Maximumsnelheid is 15 km/h.', difficulty: 'MEDIUM' },
    { topicSlug: 'autosnelweg', stem: 'Wat is de vluchtstrook?', options: [{ key: 'A', text: 'Een strook voor pechgevallen', isCorrect: true }, { key: 'B', text: 'Een extra rijstrook', isCorrect: false }, { key: 'C', text: 'De vluchtstrook is voor fietsers', isCorrect: false }, { key: 'D', text: 'Deze strook is voorrangsweg', isCorrect: false }], explanation: 'De vluchtstrook is bedoeld voor noodgevallen en pech. Je mag er niet rijden.', difficulty: 'EASY' },
    { topicSlug: 'parkeren', stem: 'Mag je parkeren op een fietspad?', options: [{ key: 'A', text: 'Ja, kort', isCorrect: false }, { key: 'B', text: 'Nee, fietspaden zijn vrij te houden', isCorrect: true }, { key: 'C', text: 'Ja, mits je fietser laat passeren', isCorrect: false }, { key: 'D', text: 'Alleen \'s nachts', isCorrect: false }], explanation: 'Parkeren op een fietspad is verboden. Fietspaden moeten vrij blijven voor fietsers.', difficulty: 'EASY' },
    { topicSlug: 'snelheid', stem: 'Je nadert een dorp. Wat gebeurt er met de maximumsnelheid?', options: [{ key: 'A', text: 'Hij gaat omhoog', isCorrect: false }, { key: 'B', text: 'Hij gaat naar 50 of 30 km/h bij het bord "naamplaats"', isCorrect: true }, { key: 'C', text: 'Er verandert niets', isCorrect: false }, { key: 'D', text: 'Hij gaat naar 80 km/h', isCorrect: false }], explanation: 'Bij het begin van een bebouwde kom (gele naamplaat) geldt 50 km/h, tenzij anders aangegeven.', difficulty: 'EASY' },
    { topicSlug: 'voorrang', stem: 'Een ongevalroute met oranje borden met "UM". Wat betekent dit?', options: [{ key: 'A', text: 'Alleen voor hulpdiensten', isCorrect: false }, { key: 'B', text: 'Omleidingsroute voor alle verkeer', isCorrect: true }, { key: 'C', text: 'Einde snelweg', isCorrect: false }, { key: 'D', text: 'Verboden in te rijden', isCorrect: false }], explanation: 'Oranje borden met "UM" geven een omleidingsroute aan. Volg deze bij files of afsluitingen.', difficulty: 'HARD' },
    { topicSlug: 'verkeersborden', stem: 'Een blauw rond bord met een witte fiets. Wat is dit?', options: [{ key: 'A', text: 'Verplicht fietspad', isCorrect: true }, { key: 'B', text: 'Fietsers oversteken', isCorrect: false }, { key: 'C', text: 'Fietsen toegestaan', isCorrect: false }, { key: 'D', text: 'Einde fietspad', isCorrect: false }], explanation: 'Een blauw rond bord met witte fiets is een gebodsbord: verplicht fietspad voor fietsers.', difficulty: 'EASY' },
    { topicSlug: 'autosnelweg', stem: 'Wat is de minimumsnelheid op de autosnelweg?', options: [{ key: 'A', text: '50 km/h', isCorrect: false }, { key: 'B', text: '60 km/h', isCorrect: true }, { key: 'C', text: '80 km/h', isCorrect: false }, { key: 'D', text: 'Er is geen minimum', isCorrect: false }], explanation: 'Op de autosnelweg geldt een minimumsnelheid van 60 km/h, tenzij het verkeer langzamer rijdt (file).', difficulty: 'HARD' },
    { topicSlug: 'parkeren', stem: 'Hoeveel afstand tot een brandkraan mag je niet parkeren?', options: [{ key: 'A', text: '5 meter', isCorrect: false }, { key: 'B', text: '10 meter', isCorrect: false }, { key: 'C', text: '15 meter', isCorrect: true }, { key: 'D', text: '20 meter', isCorrect: false }], explanation: 'Binnen 15 meter van een brandkraan mag je niet parkeren.', difficulty: 'HARD' },
  ]

  const questionRecs: any[] = []
  let freeCount = 0
  for (const q of questionsData) {
    const { topicSlug, lessonSlug, options, ...data } = q
    const existing = await prisma.question.findFirst({ where: { stem: data.stem } })
    if (existing) { questionRecs.push(existing); continue }
    const created = await prisma.question.create({
      data: {
        ...data,
        tags: JSON.stringify([]),
        topicId: topicRecs[topicSlug].id,
        lessonId: lessonSlug ? lessonRecs[lessonSlug]?.id : null,
        isFree: freeCount < 10,
      },
    })
    freeCount++
    for (const opt of options) {
      await prisma.questionOption.create({ data: { ...opt, questionId: created.id } })
    }
    questionRecs.push(created)
  }
  console.log('  ✓ questions:', questionRecs.length)

  // ─── 6. EXAMS ────────────────────────────────────────────
  const exam = await prisma.exam.upsert({
    where: { slug: 'cbr-mock-1' },
    update: {},
    create: {
      slug: 'cbr-mock-1', title: 'CBR Mock Examen 1', description: 'Volledig CBR-stijl examen met 37 vragen en 45 minuten.',
      durationSec: 2700, passingScore: 0.875, questionCount: 37, isFree: true, type: 'MOCK',
      tags: JSON.stringify(['Voorrang', 'Verkeersborden', 'Snelheid', 'Autosnelweg', 'Parkeren']),
    },
  })
  // Clear existing exam questions, then re-add
  await prisma.examQuestion.deleteMany({ where: { examId: exam.id } })
  for (let i = 0; i < questionRecs.length; i++) {
    await prisma.examQuestion.create({ data: { examId: exam.id, questionId: questionRecs[i].id, order: i + 1 } })
  }
  console.log('  ✓ exam:', exam.slug, 'with', questionRecs.length, 'questions')

  // Practice exam (shorter, easier)
  const practice = await prisma.exam.upsert({
    where: { slug: 'cbr-practice-1' },
    update: {},
    create: {
      slug: 'cbr-practice-1', title: 'Oefen Examen — Voorrang', description: 'Kort oefenexamen over voorrang. 10 vragen, geen tijdslimiet.',
      durationSec: 600, passingScore: 0.7, questionCount: 10, isFree: true, type: 'PRACTICE',
      tags: JSON.stringify(['Voorrang']),
    },
  })
  await prisma.examQuestion.deleteMany({ where: { examId: practice.id } })
  const practiceQuestions = questionRecs.filter((q) => q.difficulty === 'EASY').slice(0, 10)
  for (let i = 0; i < practiceQuestions.length; i++) {
    await prisma.examQuestion.create({ data: { examId: practice.id, questionId: practiceQuestions[i].id, order: i + 1 } })
  }
  console.log('  ✓ practice exam:', practice.slug)

  // Premium mock 2
  const exam2 = await prisma.exam.upsert({
    where: { slug: 'cbr-mock-2' },
    update: {},
    create: {
      slug: 'cbr-mock-2', title: 'CBR Mock Examen 2', description: 'Tweede CBR mock examen met nieuwe vragen.',
      durationSec: 2700, passingScore: 0.875, questionCount: 37, isFree: false, type: 'MOCK',
      tags: JSON.stringify(['Voorrang', 'Verkeersborden', 'Snelheid', 'Autosnelweg', 'Parkeren']),
    },
  })
  await prisma.examQuestion.deleteMany({ where: { examId: exam2.id } })
  const reversed = [...questionRecs].reverse()
  for (let i = 0; i < reversed.length; i++) {
    await prisma.examQuestion.create({ data: { examId: exam2.id, questionId: reversed[i].id, order: i + 1 } })
  }
  console.log('  ✓ exam2:', exam2.slug)

  // ─── 7. BADGES ───────────────────────────────────────────
  const badges = [
    { slug: 'PERFECT', name: 'Perfect', description: 'Een examen zonder fouten gemaakt.', iconKey: '🎯', color: '#1FB871', requirement: JSON.stringify({ metric: 'PERFECT_EXAM', goal: 1 }), xpReward: 200 },
    { slug: 'FAST', name: 'Fast', description: 'Examen afgerond in minder dan 15 minuten.', iconKey: '⚡', color: '#FFB020', requirement: JSON.stringify({ metric: 'FAST_EXAM', goal: 1, maxSeconds: 900 }), xpReward: 100 },
    { slug: 'SEVEN_DAY', name: '7-Day', description: '7 dagen streak gehaald.', iconKey: '🔥', color: '#FF6B6B', requirement: JSON.stringify({ metric: 'STREAK', goal: 7 }), xpReward: 150 },
    { slug: 'THIRTY_DAY', name: '30-Day', description: '30 dagen streak gehaald.', iconKey: '💎', color: '#7C5CFC', requirement: JSON.stringify({ metric: 'STREAK', goal: 30 }), xpReward: 500 },
    { slug: 'MASTER', name: 'Master', description: 'Alle lessen voltooid.', iconKey: '👑', color: '#2563EB', requirement: JSON.stringify({ metric: 'LESSONS', goal: 12 }), xpReward: 1000 },
    { slug: 'FIRST_EXAM', name: 'Eerste Examen', description: 'Je eerste examen gemaakt.', iconKey: '🚗', color: '#38BDF8', requirement: JSON.stringify({ metric: 'EXAMS', goal: 1 }), xpReward: 50 },
    { slug: 'TEN_EXAMS', name: 'Tien Examens', description: 'Tien examens gemaakt.', iconKey: '📚', color: '#0B1B3B', requirement: JSON.stringify({ metric: 'EXAMS', goal: 10 }), xpReward: 300 },
    { slug: 'TUTOR_FRIEND', name: 'Tutor Vriend', description: '50 AI-tutor vragen gesteld.', iconKey: '🤖', color: '#5C8BFF', requirement: JSON.stringify({ metric: 'TUTOR', goal: 50 }), xpReward: 150 },
    { slug: 'LUCKY', name: 'Lucky', description: 'Mystery box geopend met zeldzame beloning.', iconKey: '🍀', color: '#1FB871', requirement: JSON.stringify({ metric: 'MYSTERY_RARE', goal: 1 }), xpReward: 100 },
    { slug: 'SOCIAL', name: 'Social', description: '5 vrienden uitgenodigd.', iconKey: '👥', color: '#7C5CFC', requirement: JSON.stringify({ metric: 'REFERRALS', goal: 5 }), xpReward: 250 },
  ]
  for (const b of badges) {
    await prisma.badge.upsert({ where: { slug: b.slug }, update: {}, create: b })
  }
  console.log('  ✓ badges:', badges.length)

  // ─── 8. ACHIEVEMENTS ─────────────────────────────────────
  const achievements = [
    { slug: 'lessons-5', name: 'Beginner', description: '5 lessen voltooid', iconKey: '📖', tier: 'BRONZE', goalValue: 5, metric: 'LESSONS', xpReward: 100 },
    { slug: 'lessons-12', name: 'Geleerd', description: 'Alle 12 lessen voltooid', iconKey: '🎓', tier: 'SILVER', goalValue: 12, metric: 'LESSONS', xpReward: 300 },
    { slug: 'exams-5', name: 'Oefenaar', description: '5 examens gemaakt', iconKey: '✏️', tier: 'BRONZE', goalValue: 5, metric: 'EXAMS', xpReward: 150 },
    { slug: 'exams-20', name: 'Examenkoning', description: '20 examens gemaakt', iconKey: '🏆', tier: 'GOLD', goalValue: 20, metric: 'EXAMS', xpReward: 500 },
    { slug: 'xp-1000', name: 'Duizendpoot', description: '1.000 XP verdiend', iconKey: '⭐', tier: 'SILVER', goalValue: 1000, metric: 'XP', xpReward: 100 },
    { slug: 'xp-5000', name: 'XP Meester', description: '5.000 XP verdiend', iconKey: '🌟', tier: 'GOLD', goalValue: 5000, metric: 'XP', xpReward: 500 },
    { slug: 'streak-14', name: 'Twee Weken', description: '14 dagen streak', iconKey: '🔥', tier: 'SILVER', goalValue: 14, metric: 'STREAK', xpReward: 200 },
    { slug: 'perfects-3', name: 'Foutloos', description: '3 perfecte examens', iconKey: '🎯', tier: 'GOLD', goalValue: 3, metric: 'PERFECTS', xpReward: 400 },
  ]
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { slug: a.slug }, update: {}, create: a })
  }
  console.log('  ✓ achievements:', achievements.length)

  // ─── 9. RANKS (Bronze → Legend) ──────────────────────────
  const ranks = [
    { tier: 'BRONZE', name: 'Bronze', minXp: 0, color: '#CD7F32', iconKey: '🥉', perks: '5% XP boost' },
    { tier: 'SILVER', name: 'Silver', minXp: 1000, color: '#C0C0C0', iconKey: '🥈', perks: '10% XP boost + 1 mystery box/week' },
    { tier: 'GOLD', name: 'Gold', minXp: 3000, color: '#FFD700', iconKey: '🥇', perks: '15% XP boost + daily reward access' },
    { tier: 'PLATINUM', name: 'Platinum', minXp: 7000, color: '#E5E4E2', iconKey: '💎', perks: '20% XP boost + exclusive badges' },
    { tier: 'DIAMOND', name: 'Diamond', minXp: 15000, color: '#B9F2FF', iconKey: '💠', perks: '25% XP boost + season pass' },
    { tier: 'MASTER', name: 'Master', minXp: 30000, color: '#7C5CFC', iconKey: '👑', perks: '30% XP boost + priority support' },
    { tier: 'LEGEND', name: 'Legend', minXp: 60000, color: '#FF6B6B', iconKey: '🏆', perks: '35% XP boost + lifetime perks' },
  ]
  for (const r of ranks) {
    await prisma.rank.upsert({ where: { tier: r.tier }, update: {}, create: r })
  }
  console.log('  ✓ ranks:', ranks.length)

  // ─── 10. MYSTERY BOXES ───────────────────────────────────
  const boxes = [
    { slug: 'basic', name: 'Basic Box', description: 'Een basis mystery box met kleine beloningen.', iconKey: '📦', color: '#94A3B8', costXp: 100, contents: JSON.stringify([{ type: 'XP', amount: 50, chance: 0.85 }, { type: 'XP', amount: 150, chance: 0.15 }]) },
    { slug: 'premium', name: 'Premium Box', description: 'Premium box met kans op badges en XP.', iconKey: '🎁', color: '#7C5CFC', costXp: 300, contents: JSON.stringify([{ type: 'XP', amount: 200, chance: 0.70 }, { type: 'XP', amount: 500, chance: 0.20 }, { type: 'BADGE', slug: 'LUCKY', chance: 0.10 }]) },
    { slug: 'legendary', name: 'Legendary Box', description: 'Legendarische box met grote beloningen.', iconKey: '💎', color: '#FFD700', costXp: 1000, contents: JSON.stringify([{ type: 'XP', amount: 800, chance: 0.60 }, { type: 'XP', amount: 2000, chance: 0.30 }, { type: 'BADGE', slug: 'LUCKY', chance: 0.08 }, { type: 'STREAK_FREEZE', amount: 1, chance: 0.02 }]) },
  ]
  for (const b of boxes) {
    await prisma.mysteryBox.upsert({ where: { slug: b.slug }, update: {}, create: b })
  }
  console.log('  ✓ mystery boxes:', boxes.length)

  // ─── 11. CHALLENGES ──────────────────────────────────────
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 86400000)
  const monthFromNow = new Date(now.getTime() + 30 * 86400000)
  const challenges = [
    { slug: 'weekly-lessons', name: 'Weekelijkse Les Challenge', description: 'Voltooi 10 lessen deze week', type: 'WEEKLY', metric: 'LESSONS', goalValue: 10, xpReward: 200, startDate: now, endDate: weekFromNow, badgeSlug: 'MASTER' },
    { slug: 'weekly-exam', name: 'Exam Marathon', description: 'Maak 3 examens deze week', type: 'WEEKLY', metric: 'EXAMS', goalValue: 3, xpReward: 150, startDate: now, endDate: weekFromNow },
    { slug: 'monthly-xp', name: 'Maandelijkse XP Jacht', description: 'Verdien 2000 XP deze maand', type: 'MONTHLY', metric: 'XP', goalValue: 2000, xpReward: 500, startDate: now, endDate: monthFromNow },
    { slug: 'monthly-perfect', name: 'Perfectie Maand', description: 'Behaal 3 perfecte examens', type: 'MONTHLY', metric: 'PERFECTS', goalValue: 3, xpReward: 400, startDate: now, endDate: monthFromNow },
  ]
  for (const c of challenges) {
    const { slug, ...data } = c
    await prisma.challenge.upsert({ where: { slug }, update: { ...data }, create: c })
  }
  console.log('  ✓ challenges:', challenges.length)

  // ─── 12. SEASON PASS ─────────────────────────────────────
  const seasonalEnd = new Date(now.getTime() + 90 * 86400000)
  await prisma.seasonPass.upsert({
    where: { slug: 'season-1' },
    update: { endDate: seasonalEnd },
    create: {
      slug: 'season-1',
      name: 'Season 1 — Startup',
      description: 'Het eerste seizoen van LumaRijschool. Verdien XP en stijg in levels!',
      startDate: now,
      endDate: seasonalEnd,
      isActive: true,
    },
  })
  console.log('  ✓ season pass: season-1')

  // ─── 13. DEMO STUDENT ────────────────────────────────────
  const studentPass = await bcrypt.hash('student123', 12)
  const student = await prisma.user.upsert({
    where: { email: 'ahmed@email.nl' },
    update: {},
    create: {
      email: 'ahmed@email.nl',
      name: 'Ahmed Bakkali',
      phone: '+31 6 12345679',
      passwordHash: studentPass,
      role: 'STUDENT',
      country: 'NL',
      emailVerified: new Date(),
      studyGoal: 'FAST',
      examDate: new Date('2026-08-25'),
    },
  })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 18)
  await prisma.subscription.upsert({
    where: { userId: student.id },
    update: {},
    create: { userId: student.id, planId: monthPlan.id, status: 'ACTIVE', startedAt: new Date(Date.now() - 12 * 86400000), expiresAt },
  })

  await prisma.streak.upsert({
    where: { userId: student.id },
    update: {},
    create: { userId: student.id, current: 14, longest: 21, lastActiveAt: new Date() },
  })

  // Idempotent: reset the demo student's seeded XP events so re-seeding does not
  // keep appending duplicates (and inflating XP) on every deploy.
  await prisma.xPEvent.deleteMany({ where: { userId: student.id } })
  await prisma.xPEvent.createMany({
    data: [
      { userId: student.id, amount: 90, reason: 'EXAM_PASS' },
      { userId: student.id, amount: 200, reason: 'PERFECT_SCORE' },
      { userId: student.id, amount: 50, reason: 'BADGE' },
      { userId: student.id, amount: 600, reason: 'LESSON_COMPLETE' },
      { userId: student.id, amount: 600, reason: 'LESSON_COMPLETE' },
    ],
  })

  const perfectBadge = await prisma.badge.findUnique({ where: { slug: 'PERFECT' } })
  const sevenDayBadge = await prisma.badge.findUnique({ where: { slug: 'SEVEN_DAY' } })
  if (perfectBadge) await prisma.userBadge.upsert({ where: { userId_badgeId: { userId: student.id, badgeId: perfectBadge.id } }, update: {}, create: { userId: student.id, badgeId: perfectBadge.id } })
  if (sevenDayBadge) await prisma.userBadge.upsert({ where: { userId_badgeId: { userId: student.id, badgeId: sevenDayBadge.id } }, update: {}, create: { userId: student.id, badgeId: sevenDayBadge.id } })

  const lessonsToComplete = Object.values(lessonRecs).slice(0, 5) as any[]
  for (const lesson of lessonsToComplete) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: student.id, lessonId: lesson.id } },
      update: { status: 'COMPLETED', watchSec: lesson.durationSec, completedAt: new Date() },
      create: { userId: student.id, lessonId: lesson.id, status: 'COMPLETED', watchSec: lesson.durationSec, completedAt: new Date() },
    })
  }

  await prisma.notification.upsert({ where: { id: `seed-notif-streak-${student.id}` }, update: {}, create: { id: `seed-notif-streak-${student.id}`, userId: student.id, type: 'STREAK_WARNING', title: 'Je streak staat op het spel! 🔥', body: 'Je bent al 14 dagen actief. Studie vandaag om je streak te behouden.', link: '/dashboard' } })
  await prisma.notification.upsert({ where: { id: `seed-notif-badge-${student.id}` }, update: {}, create: { id: `seed-notif-badge-${student.id}`, userId: student.id, type: 'BADGE', title: 'Nieuwe badge: Perfect 🎯', body: 'Gefeliciteerd! Je hebt een perfect examen gemaakt.', link: '/dashboard' } })

  console.log('  ✓ demo student:', student.email)

  // ─── 14. SAMPLE ANNOUNCEMENT ─────────────────────────────
  await prisma.announcement.upsert({
    where: { id: 'welcome-announcement' },
    update: {},
    create: {
      id: 'welcome-announcement',
      title: 'Welkom bij LumaRijschool! 🎉',
      body: 'Nieuwe video lessen en examens toegevoegd. Begin vandaag nog met leren!',
      type: 'INFO',
      audience: 'ALL',
      isActive: true,
      startsAt: now,
    },
  }).catch(() => {})

  // ─── 15. SYSTEM SETTINGS ─────────────────────────────────
  const settings = [
    { key: 'SITE_NAME', value: 'LumaRijschool', category: 'GENERAL' },
    { key: 'STRIPE_ENABLED', value: 'false', category: 'STRIPE' },
    { key: 'MAINTENANCE_MODE', value: 'false', category: 'MAINTENANCE' },
    { key: 'AI_TUTOR_ENABLED', value: 'true', category: 'AI' },
    { key: 'REGISTRATION_OPEN', value: 'true', category: 'GENERAL' },
  ]
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }


  // ─── 16. FAQ CATEGORIES & FAQS ──────────────────────────
  const faqCats = [
    { slug: 'getting-started', name: 'Aan de slag', order: 1 },
    { slug: 'exams', name: 'Examens', order: 2 },
    { slug: 'payments', name: 'Betalingen', order: 3 },
    { slug: 'account', name: 'Account', order: 4 },
    { slug: 'technical', name: 'Technisch', order: 5 },
  ]
  for (const c of faqCats) {
    await prisma.fAQCategory.upsert({ where: { slug: c.slug }, update: {}, create: c })
  }
  const faqsData = [
    { catSlug: 'getting-started', q: 'Hoe begin ik met leren?', a: 'Maak een gratis account aan. Je krijgt direct toegang tot 5 gratis lessen en 2 examens.', order: 1 },
    { catSlug: 'exams', q: 'Lijken de examens echt op het CBR?', a: 'Ja. Onze examens gebruiken dezelfde vraagstijl, 40 vragen, 45 minuten en 87,5% slagingsgrens.', order: 1 },
    { catSlug: 'exams', q: 'Kan ik een examen pauzeren?', a: 'Ja. Je kunt een examen pauzeren en later hervatten. Je voortgang wordt automatisch opgeslagen.', order: 2 },
    { catSlug: 'payments', q: 'Welke betaalmethoden worden geaccepteerd?', a: 'We accepteren iDEAL, creditcard (Visa/Mastercard) en Bancontact via Stripe.', order: 1 },
    { catSlug: 'account', q: 'Hoe stel ik 2FA in?', a: 'Ga naar Profiel > Beveiliging > 2FA instellen. Scan de QR code met Google Authenticator.', order: 1 },
    { catSlug: 'technical', q: 'Werkt LumaRijschool op mijn telefoon?', a: 'Ja. LumaRijschool werkt in elke browser op mobiel, tablet en desktop.', order: 1 },
  ]
  for (const f of faqsData) {
    const cat = await prisma.fAQCategory.findUnique({ where: { slug: f.catSlug } })
    if (!cat) continue
    const existing = await prisma.fAQ.findFirst({ where: { question: f.q } })
    if (existing) continue
    await prisma.fAQ.create({ data: { categoryId: cat.id, question: f.q, answer: f.a, order: f.order } })
  }
  console.log('  ✓ FAQs seeded')

  // ─── 17. TRAFFIC SIGN LIBRARY ───────────────────────────
  const signCodes = ['B1','B2','B5','B6','C1','C2','C3','C5','C6','C12','C13','C14','C15','C18','C19','C20','D1','D2','D3','D7','E1','E5','J1','J4','J6','L1','L2']
  const signNames: Record<string, { name: string; cat: string; desc: string }> = {
    'B1': { name: 'Voorrang verlenen', cat: 'PRIORITY', desc: 'Je moet voorrang verlenen aan kruisend verkeer.' },
    'B2': { name: 'Voorrangsweg', cat: 'PRIORITY', desc: 'Je rijdt op een voorrangsweg.' },
    'B5': { name: 'Voorrangskruispunt', cat: 'PRIORITY', desc: 'Kruispunt op een voorrangsweg.' },
    'B6': { name: 'Einde voorrangsweg', cat: 'PRIORITY', desc: 'Einde van de voorrangsweg.' },
    'C1': { name: 'Stopbord', cat: 'PRIORITY', desc: 'Je moet volledig stoppen en voorrang verlenen.' },
    'C2': { name: 'Verboden in te rijden', cat: 'PROHIBITORY', desc: 'Verboden voor alle voertuigen.' },
    'C3': { name: 'Verboden door te rijden', cat: 'PROHIBITORY', desc: 'Verboden voor gemotoriseerde voertuigen.' },
    'C5': { name: 'Verboden voor bestuurders', cat: 'PROHIBITORY', desc: 'Verboden voor bestuurders van motorvoertuig.' },
    'C6': { name: 'Verboden voor fietsers', cat: 'PROHIBITORY', desc: 'Verboden voor fietsers.' },
    'C12': { name: 'Verboden linksaf', cat: 'PROHIBITORY', desc: 'Verboden linksaf te slaan.' },
    'C13': { name: 'Verboden rechtsaf', cat: 'PROHIBITORY', desc: 'Verboden rechtsaf te slaan.' },
    'C14': { name: 'Verboden te keren', cat: 'PROHIBITORY', desc: 'Verboden om te keren.' },
    'C15': { name: 'Verboden in te halen', cat: 'PROHIBITORY', desc: 'Verboden in te halen.' },
    'C18': { name: 'Maximumsnelheid', cat: 'PROHIBITORY', desc: 'Maximumsnelheid op dit wegdeel.' },
    'C19': { name: 'Verboden te stoppen', cat: 'PROHIBITORY', desc: 'Verboden te stoppen en te parkeren.' },
    'C20': { name: 'Verboden te parkeren', cat: 'PROHIBITORY', desc: 'Verboden te parkeren. Stilstaan mag wel.' },
    'D1': { name: 'Verplicht rechts', cat: 'MANDATORY', desc: 'Verplicht rechts te gaan.' },
    'D2': { name: 'Verplicht links', cat: 'MANDATORY', desc: 'Verplicht links te gaan.' },
    'D3': { name: 'Verplicht rechtdoor', cat: 'MANDATORY', desc: 'Verplicht rechtdoor te gaan.' },
    'D7': { name: 'Verplicht fietspad', cat: 'MANDATORY', desc: 'Verplicht fietspad voor fietsers.' },
    'E1': { name: 'Parkeerplaats', cat: 'INFORMATIONAL', desc: 'Aangewezen parkeerplaats.' },
    'E5': { name: 'Parkeergelegenheid', cat: 'INFORMATIONAL', desc: 'Parkeergelegenheid in de buurt.' },
    'J1': { name: 'Ongevaarlijk kruispunt', cat: 'WARNING', desc: 'Waarschuwing voor kruispunt met gelijkwaardige wegen.' },
    'J4': { name: 'Voorrangskruispunt', cat: 'WARNING', desc: 'Waarschuwing: kruispunt met voorrangsweg.' },
    'J6': { name: 'Rotonde', cat: 'WARNING', desc: 'Waarschuwing voor een rotonde.' },
    'L1': { name: 'Woonerf', cat: 'INFORMATIONAL', desc: 'Begin van een woonerf. Max 15 km/h.' },
    'L2': { name: 'Einde woonerf', cat: 'INFORMATIONAL', desc: 'Einde van het woonerf.' },
  }
  for (const code of signCodes) {
    const info = signNames[code]
    await prisma.trafficSign.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: info.name,
        category: info.cat,
        description: info.desc,
        imageUrl: `https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Nederlands_verkeersbord_${code}.svg/240px-Nederlands_verkeersbord_${code}.svg.png`,
      },
    })
  }
  console.log('  ✓ traffic signs:', signCodes.length)

  // ─── 18. SEASONAL EVENT ──────────────────────────────────
  const seasonEvtEnd = new Date(now.getTime() + 90 * 86400000)
  await prisma.seasonalEvent.upsert({
    where: { slug: 'summer-2026' },
    update: {},
    create: {
      slug: 'summer-2026',
      name: 'Summer Challenge 2026',
      description: 'Verdien deze zomer extra XP en exclusieve zomer-badges!',
      startDate: now,
      endDate: seasonalEnd,
      isActive: true,
    },
  })
  console.log('  ✓ seasonal event: summer-2026')

  // ─── 19. TAX RATES ──────────────────────────────────────
  await prisma.taxRate.upsert({ where: { country: 'NL' }, update: {}, create: { country: 'NL', ratePercent: 21 } })
  await prisma.taxRate.upsert({ where: { country: 'BE' }, update: {}, create: { country: 'BE', ratePercent: 21 } })
  await prisma.taxRate.upsert({ where: { country: 'DE' }, update: {}, create: { country: 'DE', ratePercent: 19 } })
  console.log('  ✓ tax rates seeded')

  // ─── 20. RBAC ROLES ─────────────────────────────────────
  const { seedRolesAndPermissions, assignRole } = await import('../src/lib/rbac')
  await seedRolesAndPermissions().catch(() => {})
  await assignRole(student.id, 'STUDENT').catch(() => {})
  await assignRole(admin.id, 'SUPER_ADMIN').catch(() => {})
  console.log('  ✓ RBAC roles assigned')

  console.log('\n✅ Seed complete!\n')
  console.log('   Admin:    admin@lumatheorie.nl / admin123')
  console.log('   Student:  ahmed@email.nl        / student123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    // Force exit: importing src/lib/rbac initialises the ioredis client (non-lazy), which
    // keeps the event loop alive and would otherwise hang the entrypoint before the server starts.
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
