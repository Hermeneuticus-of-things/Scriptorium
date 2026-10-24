// Hand-tagged gold set for the Linguistic Focus tagger (src/lib/pos.js).
// Format: "word/T" with T = N noun, V verb (incl. auxiliaries), A adjective,
// R adverb, O other (pronouns, articles, prepositions, conjunctions, numerals,
// particles such as RO "să"/infinitive "a" and EN "to"). Bare tokens are punctuation.

export const GOLD_RO = `
Seara/N coborâse/V încet/R peste/O dealurile/N pustii/A , și/O satul/N părea/V adormit/A .
Bătrâna/N stătea/V pe/O prispa/N casei/N și/O privea/V drumul/N care/O se/O pierdea/V în/O ceață/N .
Nu/R mai/R așteptase/V pe/O nimeni/O de/O multă/A vreme/N , dar/O în/O seara/N aceea/O inima/N îi/O bătea/V repede/R .
Fiul/N ei/O plecase/V la/O oraș/N acum/R zece/O ani/N și/O nu/R se/O mai/R întorsese/V niciodată/R .
A/V primit/V doar/R câteva/O scrisori/N scurte/A , scrise/V grăbit/R , pe/O hârtie/N ieftină/A .
Le/O citea/V în/O fiecare/O duminică/N , la/O lumina/N lămpii/N , și/O le/O învăța/V pe/O de/O rost/N .
Vecinii/N spuneau/V că/O femeia/N a/V înnebunit/V de/O singurătate/N .
Ea/O știa/V însă/O că/O băiatul/N va/V veni/V , pentru/O că/O visase/V un/O cal/N alb/A care/O trecea/V podul/N .
Să/O fi/V fost/V doar/R o/O închipuire/N ?
Câinele/N lătră/V scurt/R , apoi/R tăcu/V .
Pe/O drum/N se/O ivi/V o/O umbră/N înaltă/A , care/O mergea/V obosită/A , cu/O o/O valiză/N grea/A în/O mână/N .
Bătrâna/N se/O ridică/V și/O vru/V să/O strige/V , dar/O glasul/N nu/R o/O ascultă/V .
Ai/V venit/V , șopti/V ea/O , și/O lacrimile/N îi/O curgeau/V liniștit/R pe/O obrazul/N zbârcit/A .
Băiatul/N o/O îmbrățișă/V stângaci/R , apoi/R intrară/V amândoi/O în/O casa/N întunecoasă/A .
Focul/N ardea/V mocnit/R în/O sobă/N , iar/O pe/O masă/N aștepta/V o/O pâine/N caldă/A .
Nimeni/O nu/R vorbi/V mult/R , fiindcă/O tăcerea/N spunea/V totul/O .
Afară/R , vântul/N începuse/V să/O bată/V ușor/R printre/O frunzele/N uscate/A ale/O nucului/N bătrân/A .
`;

export const GOLD_EN = `
The/O old/A house/N stood/V at/O the/O edge/N of/O the/O village/N , where/O the/O road/N turned/V sharply/R toward/O the/O river/N .
Nobody/O had/V lived/V there/R for/O years/N , but/O every/O evening/N a/O light/N appeared/V in/O the/O upper/A window/N .
Margaret/N watched/V it/O from/O her/O kitchen/N while/O she/O washed/V the/O dishes/N .
She/O was/V not/R a/O superstitious/A woman/N , yet/O the/O light/N troubled/V her/O deeply/R .
One/O night/N she/O decided/V to/O walk/V up/O the/O hill/N and/O see/V for/O herself/O .
The/O air/N was/V cold/A and/O the/O grass/N felt/V wet/A under/O her/O boots/N .
When/O she/O reached/V the/O gate/N , she/O could/V hear/V a/O soft/A voice/N singing/V inside/R .
The/O door/N was/V open/A .
She/O stepped/V carefully/R into/O the/O hall/N , holding/V her/O breath/N .
Dust/N covered/V the/O furniture/N , and/O the/O portraits/N on/O the/O walls/N seemed/V to/O follow/V her/O .
At/O the/O top/N of/O the/O stairs/N , an/O elderly/A man/N sat/V beside/O a/O candle/N , reading/V a/O letter/N .
He/O looked/V up/O slowly/R and/O smiled/V .
I/O have/V been/V waiting/V for/O you/O , he/O said/V quietly/R .
His/O eyes/N were/V kind/A , but/O his/O hands/N trembled/V .
Margaret/N could/V not/R remember/V his/O face/N , although/O something/O about/O it/O seemed/V familiar/A .
He/O gave/V her/O the/O letter/N , which/O was/V written/V in/O her/O mother's/N careful/A handwriting/N .
Outside/R , the/O wind/N began/V to/O rise/V , and/O the/O candle/N flickered/V gently/R .
`;

const COARSE = { noun: 'N', verb: 'V', adj: 'A', adv: 'R' };

/** Parse a gold string into { text, tags } (tags = gold letters in word order). */
export function parseGold(gold) {
  const tokens = gold.trim().split(/\s+/);
  const text = tokens.map((t) => t.replace(/\/[NVARO]$/, '')).join(' ');
  const tags = tokens.filter((t) => /\/[NVARO]$/.test(t)).map((t) => t.slice(-1));
  return { text, tags };
}

/** Accuracy of tagText(text, lang) against a gold string, coarse tag set. */
export function goldAccuracy(gold, lang, tagText) {
  const { text, tags } = parseGold(gold);
  const got = tagText(text, lang).map((w) => COARSE[w.tag] || 'O');
  if (got.length !== tags.length) throw new Error(`token mismatch ${got.length} vs ${tags.length}`);
  const misses = [];
  got.forEach((g, i) => { if (g !== tags[i]) misses.push(`${tagText(text, lang)[i].word}:${g}≠${tags[i]}`); });
  return { total: tags.length, correct: tags.length - misses.length, acc: 1 - misses.length / tags.length, misses };
}

// Held-out passages: written after the rules were tuned and NOT used for tuning,
// so their score is the honest estimate of accuracy on unseen prose.
export const HELDOUT_RO = `
Dimineața/N a/V început/V cu/O o/O ploaie/N măruntă/A care/O bătea/V în/O geamuri/N .
Ana/N s-a/V trezit/V devreme/R și/O a/V făcut/V cafea/N pentru/O toată/O familia/N .
Tatăl/N ei/O citea/V ziarul/N în/O tăcere/N , iar/O mama/N pregătea/V micul/A dejun/N .
Nimeni/O nu/R vorbea/V despre/O scrisoarea/N sosită/A ieri/R de/O la/O spital/N .
Copiii/N alergau/V prin/O curte/N , fericiți/A că/O nu/R trebuie/V să/O meargă/V la/O școală/N .
Bunicul/N ieși/V pe/O verandă/N și/O privi/V lung/R cerul/N cenușiu/A .
Ar/V fi/V vrut/V să/O spună/V ceva/O important/A , dar/O cuvintele/N i/O se/O opreau/V în/O gât/N .
`;

export const HELDOUT_EN = `
The/O morning/N began/V with/O a/O thin/A rain/N that/O tapped/V against/O the/O windows/N .
Anna/N woke/V early/R and/O made/V coffee/N for/O the/O whole/A family/N .
Her/O father/N read/V the/O newspaper/N in/O silence/N , while/O her/O mother/N prepared/V breakfast/N .
Nobody/O mentioned/V the/O letter/N that/O had/V arrived/V yesterday/R from/O the/O hospital/N .
The/O children/N ran/V through/O the/O yard/N , happy/A that/O they/O did/V not/R have/V to/O go/V to/O school/N .
Grandfather/N stepped/V onto/O the/O porch/N and/O stared/V at/O the/O grey/A sky/N for/O a/O long/A time/N .
He/O wanted/V to/O say/V something/O important/A , but/O the/O words/N stuck/V in/O his/O throat/N .
`;
