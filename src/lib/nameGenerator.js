// Name Generator: culture lists, gender, count, alliteration, seedable RNG.

export const CULTURES = {
  ro: {
    label: 'Română',
    m: ['Andrei', 'Mihai', 'Alexandru', 'Ion', 'Ștefan', 'Radu', 'Vlad', 'Cristian', 'Bogdan', 'Gheorghe', 'Florin', 'Tudor', 'Matei', 'Sorin', 'Dan', 'Costin', 'Victor', 'Horia', 'Petru', 'Lucian'],
    f: ['Maria', 'Ioana', 'Elena', 'Ana', 'Andreea', 'Cristina', 'Mihaela', 'Ilinca', 'Daria', 'Irina', 'Simona', 'Raluca', 'Oana', 'Teodora', 'Smaranda', 'Corina', 'Bianca', 'Livia', 'Sabina', 'Viorica'],
    last: ['Popescu', 'Ionescu', 'Popa', 'Dumitrescu', 'Stan', 'Stoica', 'Gheorghiu', 'Matei', 'Constantinescu', 'Marin', 'Moldovan', 'Munteanu', 'Lungu', 'Diaconu', 'Rusu', 'Ciobanu', 'Barbu', 'Vasilescu', 'Neagu', 'Tănase', 'Cazacu', 'Avram'],
  },
  en: {
    label: 'Engleză',
    m: ['James', 'Oliver', 'William', 'Henry', 'George', 'Thomas', 'Arthur', 'Edward', 'Samuel', 'Daniel', 'Jack', 'Harry', 'Charles', 'Michael', 'Robert'],
    f: ['Emily', 'Olivia', 'Charlotte', 'Amelia', 'Grace', 'Alice', 'Sophie', 'Eleanor', 'Lucy', 'Hannah', 'Margaret', 'Elizabeth', 'Rose', 'Clara', 'Victoria'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Hughes', 'Green', 'Hall', 'Clarke'],
  },
  fr: {
    label: 'Franceză',
    m: ['Louis', 'Jean', 'Pierre', 'Antoine', 'Hugo', 'Lucas', 'Julien', 'Mathieu', 'Étienne', 'Laurent', 'Gabriel', 'Nicolas'],
    f: ['Camille', 'Chloé', 'Léa', 'Manon', 'Juliette', 'Margaux', 'Amélie', 'Claire', 'Sophie', 'Élise', 'Inès', 'Louise'],
    last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Lefèvre', 'Girard', 'Fontaine', 'Rousseau'],
  },
  it: {
    label: 'Italiană',
    m: ['Marco', 'Luca', 'Giovanni', 'Alessandro', 'Matteo', 'Lorenzo', 'Francesco', 'Davide', 'Paolo', 'Stefano', 'Riccardo'],
    f: ['Giulia', 'Chiara', 'Francesca', 'Sofia', 'Alessia', 'Martina', 'Elena', 'Valentina', 'Beatrice', 'Lucia', 'Paola'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Conti', 'Costa'],
  },
  de: {
    label: 'Germană',
    m: ['Lukas', 'Felix', 'Maximilian', 'Paul', 'Jonas', 'Friedrich', 'Karl', 'Heinrich', 'Moritz', 'Johann', 'Klaus'],
    f: ['Anna', 'Lena', 'Hannah', 'Leonie', 'Greta', 'Clara', 'Johanna', 'Frieda', 'Marlene', 'Ingrid', 'Katharina'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Wolf'],
  },
  es: {
    label: 'Spaniolă',
    m: ['Javier', 'Carlos', 'Diego', 'Alejandro', 'Miguel', 'Pablo', 'Sergio', 'Andrés', 'Manuel', 'Rafael', 'Tomás'],
    f: ['Lucía', 'Carmen', 'Isabel', 'Sofía', 'Elena', 'Marta', 'Paula', 'Inés', 'Rocío', 'Pilar', 'Valeria'],
    last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Ruiz', 'Navarro', 'Torres'],
  },
  hu: {
    label: 'Maghiară',
    m: ['László', 'István', 'Zoltán', 'Péter', 'Gábor', 'Attila', 'Levente', 'Bence', 'Csaba', 'Tamás'],
    f: ['Katalin', 'Erzsébet', 'Ildikó', 'Zsófia', 'Réka', 'Anna', 'Eszter', 'Judit', 'Noémi', 'Enikő'],
    last: ['Nagy', 'Kovács', 'Tóth', 'Szabó', 'Horváth', 'Varga', 'Kiss', 'Molnár', 'Németh', 'Farkas', 'Balogh'],
  },
  ru: {
    label: 'Rusă',
    m: ['Ivan', 'Dmitri', 'Alexei', 'Nikolai', 'Sergei', 'Mikhail', 'Pavel', 'Yuri', 'Boris', 'Andrei'],
    f: ['Anastasia', 'Natalia', 'Olga', 'Tatiana', 'Irina', 'Svetlana', 'Yelena', 'Darya', 'Vera', 'Ksenia'],
    last: ['Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Volkov', 'Sokolov', 'Morozov', 'Petrov', 'Lebedev', 'Novikov'],
    femLast: (s) => (/(ov|ev|in)$/.test(s) ? s + 'a' : s),
  },
  jp: {
    label: 'Japoneză',
    m: ['Haruto', 'Ren', 'Takeshi', 'Kenji', 'Hiroshi', 'Daiki', 'Sora', 'Yuto', 'Kaito', 'Shun'],
    f: ['Yui', 'Hana', 'Sakura', 'Aiko', 'Mei', 'Rin', 'Yuki', 'Haruka', 'Emi', 'Naomi'],
    last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato'],
  },
};

/** mulberry32 seeded RNG; seed may be number or string. */
export function createRng(seed = Date.now()) {
  let h = 1779033703;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 3432918353) | 0, (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const initial = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')[0].toUpperCase();

/**
 * @param {{culture?: string|'mix', gender?: 'm'|'f'|'any', count?: number, alliteration?: boolean,
 *          seed?: number|string, firstOnly?: boolean, lastOnly?: boolean}} opts
 * @returns {{first: string, last: string, full: string, gender: 'm'|'f', culture: string}[]}
 */
export function generateNames(opts = {}) {
  const { culture = 'ro', gender = 'any', count = 10, alliteration = false, seed, firstOnly = false, lastOnly = false } = opts;
  const rng = createRng(seed ?? Date.now());
  const keys = Object.keys(CULTURES);
  const out = [];
  const seen = new Set();
  const n = Math.max(1, Math.min(500, count | 0));
  for (let tries = 0; out.length < n && tries < n * 30; tries++) {
    const cKey = culture === 'mix' || !CULTURES[culture] ? pick(rng, keys) : culture;
    const c = CULTURES[cKey];
    const g = gender === 'm' || gender === 'f' ? gender : rng() < 0.5 ? 'm' : 'f';
    const first = pick(rng, c[g]);
    let lastPool = c.last;
    if (alliteration) {
      const al = c.last.filter((l) => initial(l) === initial(first));
      if (al.length) lastPool = al;
      else continue;
    }
    let last = pick(rng, lastPool);
    if (g === 'f' && c.femLast) last = c.femLast(last);
    const full = firstOnly ? first : lastOnly ? last : `${first} ${last}`;
    if (seen.has(full)) continue;
    seen.add(full);
    out.push({ first, last, full, gender: g, culture: cKey });
  }
  return out;
}
