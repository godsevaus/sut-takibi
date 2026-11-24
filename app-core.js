
// Green AI çalıştırıcısı: {{ }} boşlukları, <sc-if>, <sc-for>, onClick / onChange.
// Değişen kısımlar yerinde güncellenir (odak ve kaydırma korunur).
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p) { const patch = typeof p === 'function' ? p(this.state, this.props) : p; this.state = Object.assign({}, this.state, patch); __schedule(); }
  forceUpdate() { __schedule(); }
}
const __HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

// ---- Çeviri: tr ve en kodun içinde; diğer diller ekranda İngilizce metinden çevrilir (i18n.js) ----
var __TXL = null, __TXE = [], __TXH = window.__TXH_INIT ? {} : null, __TXLoading = false;
function __txRe() {
  var ents = __TXE.filter(function (x) { return x && x.length > 1; }).sort(function (a, b) { return b.length - a.length; })
    .map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  return new RegExp((ents.length ? ents.join('|') + '|' : '') + '\\d+(?:[.,:]\\d+)*', 'g');
}
function __txKey(str) { var vals = []; var key = str.replace(__txRe(), function (m) { vals.push(m); return '{' + (vals.length - 1) + '}'; }); return [key, vals]; }
function __tx(str) {
  if ((!__TXL && !__TXH) || typeof str !== 'string' || !/[A-Za-z]/.test(str)) { return str; }
  var lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0], core = str.trim();
  if (!core) { return str; }
  var kv = __txKey(core);
  if (__TXH) { __TXH[kv[0]] = 1; }
  var D = __TXL && window.GA_I18N && window.GA_I18N[__TXL];
  if (!D) { return str; }
  if (D[core] !== undefined) { return lead + D[core] + trail; }
  var t = D[kv[0]];
  if (t === undefined) {
    // Sondaki nokta yüzünden bulunamadıysa noktasız dene
    var pm = core.match(/^(.*[^.!?])([.!?])$/);
    if (pm && (D[pm[1]] !== undefined || D[__txKey(pm[1])[0]] !== undefined)) { return lead + __tx(pm[1]) + pm[2] + trail; }
    // Birden çok cümle varsa önce cümle cümle çevir; hepsi çevrildiyse onu kullan
    var sents = core.match(/[^.!?]+[.!?]+(?=\s|$)\s*|[^.!?]+$/g);
    if (sents && sents.length > 1) {
      var tr = sents.map(function (x) { return [x.trim(), __tx(x.trim())]; });
      if (tr.every(function (p) { return p[0] !== p[1] || !/[A-Za-z]{3}/.test(p[0]); })) { return lead + tr.map(function (p) { return p[1]; }).join(' ') + trail; }
    }
    // Parçalara böl (" · ", ": " ve ", ") ve her parçayı ayrı çevir
    var bits = core.split(/( · |: |, )/);
    if (bits.length > 1) { return lead + bits.map(function (b, i) { return i % 2 ? b : __tx(b); }).join('') + trail; }
    var sent = core.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g);
    if (sent && sent.length > 1) { return lead + sent.map(function (x) { return __tx(x.trim()); }).join(' ') + trail; }
    return str;
  }
  return lead + t.replace(/\{(\d+)\}/g, function (m, i) { var v = kv[1][+i]; return v === undefined ? '' : (D[v] !== undefined ? D[v] : v); }) + trail;
}
function __txLang(lang) {
  var other = lang && lang !== 'tr' && lang !== 'en';
  __TXL = other ? lang : null;
  try {
    document.documentElement.lang = lang || 'tr';
    document.documentElement.dir = (lang === 'ar' || lang === 'fa') ? 'rtl' : 'ltr';
  } catch (e) {}
  if (other && !(window.GA_I18N && window.GA_I18N[lang]) && __TXLoading !== lang) {
    __TXLoading = lang;
    var load = function (src, done) {
      var sc = document.createElement('script');
      sc.src = src;
      sc.onload = done;
      sc.onerror = function () { __TXLoading = false; };
      document.head.appendChild(sc);
    };
    var done3 = function () { if (window.GA_SET3) { window.GA_SET3(lang); } __TXLoading = false; __schedule(); };
    var extra3 = function () { if (window.GA_SET3) { done3(); } else { load('lang3.js?v=10', done3); } };
    var extra = function () { load('lang2-' + lang + '.js?v=9', function () { __schedule(); extra3(); }); };
    var langFile = function () { load('lang-' + lang + '.js?v=8', function () { __schedule(); if (window.GA_SET2) { extra(); } else { load('lang2-keys.js?v=9', extra); } }); };
    if (window.GA_SET) { langFile(); } else { load('lang-keys.js?v=8', langFile); }
  }
}
window.__tx = __tx;
function __look(scope, expr) {
  expr = expr.trim();
  if (expr === 'true') return true; if (expr === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
  let v = scope; for (const p of expr.split('.')) { if (v == null) return undefined; v = v[p]; } return v;
}
const __interp = (str, scope) => str.replace(__HOLE, (m, e) => { const v = __look(scope, e); return v == null ? '' : String(v); });
const __interpT = (str, scope) => str.replace(__HOLE, (m, e) => { const v = __look(scope, e); return v == null ? '' : __tx(String(v)); });
const __whole = (str) => { const m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str || ''); return m ? m[1] : null; };
// data-notx: içindeki metin çevrilmez (oyuncu mesajları, takma adlar, klan adı)
function __build(src, scope, parent, notx) {
  for (const n of src.childNodes) {
    if (n.nodeType === 3) { parent.appendChild(document.createTextNode((notx ? __interp : __interpT)(n.nodeValue, scope))); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.localName;
    if (tag === 'sc-if') { const e = __whole(n.getAttribute('value')); if (e && __look(scope, e)) __build(n, scope, parent, notx); continue; }
    if (tag === 'sc-for') {
      const e = __whole(n.getAttribute('list')), list = (e && __look(scope, e)) || [], as = n.getAttribute('as') || 'item';
      list.forEach((it, i) => { const sc = Object.create(scope); sc[as] = it; sc.$index = i; __build(n, sc, parent, notx); });
      continue;
    }
    const el = n.cloneNode(false);
    for (const a of Array.from(n.attributes)) {
      const name = a.name;
      if (name.startsWith('hint-')) { el.removeAttribute(name); continue; }
      if (name.startsWith('on')) {
        el.removeAttribute(name);
        const e = __whole(a.value), fn = e && __look(scope, e);
        let type = name.slice(2).toLowerCase(); if (type === 'change') type = 'input';
        if (typeof fn === 'function') (el.__h || (el.__h = {}))[type] = fn;
        continue;
      }
      if (name === 'value' && (tag === 'input' || tag === 'textarea')) { el.__value = __interp(a.value, scope); el.setAttribute('value', el.__value); continue; }
      if (a.value.indexOf('{{') >= 0) el.setAttribute(name, (name === 'aria-label' || name === 'placeholder' || name === 'title') ? __interpT(a.value, scope) : __interp(a.value, scope));
    }
    __build(n, scope, el, notx || n.hasAttribute('data-notx'));
    parent.appendChild(el);
  }
}
function __morph(o, n) {
  if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || o.namespaceURI !== n.namespaceURI) { o.replaceWith(n); return; }
  if (o.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
  if (o.nodeType !== 1) { o.replaceWith(n); return; }
  for (let i = o.attributes.length - 1; i >= 0; i--) { const nm = o.attributes[i].name; if (!n.hasAttribute(nm)) o.removeAttribute(nm); }
  for (const a of Array.from(n.attributes)) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
  o.__h = n.__h;
  if (n.__value !== undefined && o.value !== n.__value) o.value = n.__value;
  __morphChildren(o, n);
}
function __morphChildren(o, n) {
  const oc = Array.from(o.childNodes), nc = Array.from(n.childNodes);
  for (let i = 0; i < nc.length; i++) { if (i < oc.length) __morph(oc[i], nc[i]); else o.appendChild(nc[i]); }
  for (let i = nc.length; i < oc.length; i++) oc[i].remove();
}
let __comp = null, __queued = false, __mounted = false;
const __root = document.getElementById('app'), __tpl = document.getElementById('tpl').content;
function __schedule() { if (__queued) return; __queued = true; Promise.resolve().then(() => { __queued = false; __render(); }); }
function __render() {
  const box = document.createElement('div');
  __build(__tpl, __comp.renderVals(), box);
  __morphChildren(__root, box);
  if (__mounted && __comp.componentDidUpdate) { try { __comp.componentDidUpdate(); } catch (e) { console.error(e); } }
  __mounted = true;
}
['click', 'input'].forEach((type) => __root.addEventListener(type, (e) => {
  let el = e.target;
  while (el && el !== __root) { if (el.__h && el.__h[type]) { el.__h[type](e); return; } el = el.parentNode; }
}));


var STORE_KEY = 'basketballAi.v2';
var KEEP = ['authed', 'email', 'answers', 'height', 'weight', 'lang', 'onboarded', 'planMode', 'day', 'doneToday', 'challenge', 'added', 'ft', 'streak', 'lastDone', 'week', 'wk', 'totalWorkouts', 'totalChallenges', 'totalPoints', 'reminder', 'partner', 'sessionsSeen', 'shotAtt', 'shotMade', 'verifiedToday', 'q', 'totalQuests', 'totalQM', 'serverNick', 'covered', 'restUsed', 'restDays', 'hist', 'ftHist', 'remHour', 'clanSeen', 'undo', 'woStart', 'woAcc', 'woDay', 'bestStreak'];

function dayStr(d) {
  var m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}
function todayStr() { return dayStr(new Date()); }
function yesterdayStr() { var d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); }
function weekStr() { var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayStr(d); }
var SB_URL = 'https://rrclszekoyuorgnweriy.supabase.co';
var SB_KEY = 'sb_publishable_Ii6hME2sydsTCpAn-sL90Q_fhcVQyXO';
var __sbP = null;
// Supabase istemcisi ilk ihtiyaçta yüklenir; internet yoksa uygulama yine çalışır
function sb() {
  if (!__sbP) {
    __sbP = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(function (m) {
      return m.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'greenai.sb' } });
    });
    __sbP.catch(function () { __sbP = null; });
  }
  return __sbP;
}
function cleanNick(n) {
  n = String(n || '').replace(/\s+/g, '').slice(0, 16);
  if (n.length < 3) { n = (n + 'Oyuncu').slice(0, 10) + Math.floor(100 + Math.random() * 900); }
  return n;
}
function sbLeague(ans) { return (ans && ans.league && ans.league !== 'none') ? String(ans.league) : null; }
function sbGender(ans) { var g = ans && ans.gender; return (g === 'female' || g === 'male' || g === 'unspecified') ? g : null; }
function emptyWeek() { return { workouts: 0, minutes: 0, ptsW: 0, ptsS: 0, ptsC: 0, ptsQ: 0, byDay: [0, 0, 0, 0, 0, 0, 0] }; }

var STYLES = {
  general: { tr: 'Saha generali', en: 'Floor general', dtr: 'Oyunu okur, pası dağıtır, tempoyu sen belirlersin.', den: 'You read the game, move the ball and set the tempo.', icon: 'M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 7.5l-2 5-5 2 2-5z' },
  scorer: { tr: 'Skorer beyin', en: 'Scoring playmaker', dtr: 'Şut atar, sayı bulur, doğru kararı verirsin.', den: 'You shoot, score and make the right read.', icon: 'M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM11 6a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  sniper: { tr: 'Keskin şutör', en: 'Sharpshooter', dtr: 'Uzaktan affetmez, topsuz koşup boş kalırsın.', den: 'Deadly from deep, always moving to get open.', icon: 'M3 17C5 7 13 4 18 9M18 9V5M18 9h-4M14 15h6M15 15l.5 4h3l.5-4' },
  slasher: { tr: 'Patlayıcı penetreci', en: 'Explosive slasher', dtr: 'İlk adımınla geçer, çembere saldırırsın.', den: 'You beat your man off the first step and attack the rim.', icon: 'M12 2 5 12h5l-1 8 8-11h-5z' },
  lock: { tr: 'Savunma kilidi', en: 'Lockdown defender', dtr: 'Rakibin en iyisini sen tutar, top çalarsın.', den: 'You guard their best player and force turnovers.', icon: 'M11 2 4 5v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V5z' },
  threelevel: { tr: 'Üç seviyeli skorer', en: 'Three-level scorer', dtr: 'Pota dibi, orta mesafe ve üçlük: her yerden sayı.', den: 'At the rim, mid-range and from three: you score anywhere.', icon: 'M3 19h5v-5h5V9h5V4' },
  twoWay: { tr: 'İki yönlü oyuncu', en: 'Two-way player', dtr: 'Savunmada kilitler, hücumda işini yaparsın.', den: 'You lock up on defense and deliver on offense.', icon: 'M4 8h13l-3-3M18 14H5l3 3' },
  pointForward: { tr: 'Oyun kuran forvet', en: 'Point forward', dtr: 'Ribaundu alır, topu taşır, takımı oynatırsın.', den: 'You grab the board, push the ball and run the team.', icon: 'M11 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM11 2v6M11 14v6M2 11h6M14 11h6' },
  stretch: { tr: 'Şutör uzun', en: 'Stretch big', dtr: 'Uzun boyla dışarıdan şut atar, sahayı açarsın.', den: 'A big who shoots from outside and spaces the floor.', icon: 'M9 11H2l3-3M2 11l3 3M13 11h7l-3-3M20 11l-3 3' },
  post: { tr: 'Pota altı ustası', en: 'Post technician', dtr: 'Ayak oyunları ve sahtelerle içeride sayı bulursun.', den: 'You score inside with footwork and fakes.', icon: 'M18 11a7 7 0 1 1-2.5-5.4M18 3v4h-4M11 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' },
  hubBig: { tr: 'Oyun kuran uzun', en: 'Playmaking big', dtr: 'Yüksek posttan pas verir, yumuşak dokunuşla bitirirsin.', den: 'You pass from the high post and finish with soft touch.', icon: 'M6 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM16 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM16 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 10l6-4M8 12l6 4' },
  rim: { tr: 'Çember koruyucu', en: 'Rim protector', dtr: 'Boyalı alan senin: blok, ribaund, caydırma.', den: 'The paint is yours: blocks, rebounds, deterrence.', icon: 'M4 20V8M9 20V4M14 20V4M19 20V8M2 20h19' },
  energy: { tr: 'Enerji ve ribaund', en: 'Energy rebounder', dtr: 'Her topa atlar, ikinci şansları sen yaratırsın.', den: 'You chase every ball and create second chances.', icon: 'M5 12l6-6 6 6M5 18l6-6 6 6' }
};
var STYLE_SETS = {
  pg: ['general', 'scorer', 'sniper', 'slasher', 'lock'],
  sg: ['sniper', 'threelevel', 'slasher', 'twoWay', 'scorer'],
  sf: ['threelevel', 'twoWay', 'pointForward', 'slasher', 'sniper'],
  pf: ['stretch', 'pointForward', 'post', 'energy', 'twoWay'],
  c: ['post', 'hubBig', 'rim', 'stretch', 'energy'],
  any: ['scorer', 'sniper', 'slasher', 'general', 'lock']
};
var COMPS = {
  pg: { general: ['Chris Paul', 'Mike Conley'], scorer: ['Shai Gilgeous-Alexander', 'Jalen Brunson'], sniper: ['Stephen Curry'], slasher: ['Ja Morant', 'De\'Aaron Fox'], lock: ['Jrue Holiday'] },
  sg: { sniper: ['Klay Thompson'], threelevel: ['Devin Booker', 'James Harden'], slasher: ['Anthony Edwards'], twoWay: ['Derrick White'], scorer: ['Donovan Mitchell', 'Manu Ginóbili'] },
  sf: { threelevel: ['Kevin Durant'], twoWay: ['Kawhi Leonard'], pointForward: ['LeBron James'], slasher: ['Jaylen Brown'], sniper: ['Michael Porter Jr.'] },
  pf: { stretch: ['Dirk Nowitzki'], pointForward: ['Draymond Green', 'Julius Randle'], post: ['Tim Duncan', 'Zach Randolph'], energy: ['Aaron Gordon'], twoWay: ['Giannis Antetokounmpo'] },
  c: { post: ['Hakeem Olajuwon'], hubBig: ['Nikola Jokić', 'Domantas Sabonis'], rim: ['Rudy Gobert'], stretch: ['Karl-Anthony Towns'], energy: ['Steven Adams'] }
};
COMPS.any = COMPS.pg;
// Kız oyuncular için aynı tarz eşleşmesinin WNBA karşılığı (ikinci isim: solak eşleşme)
var WCOMPS = {
  pg: { general: ['Sue Bird'], scorer: ['Paige Bueckers', 'Kelsey Plum'], sniper: ['Caitlin Clark'], slasher: ['Skylar Diggins-Smith'], lock: ['Briann January'] },
  sg: { sniper: ['Diana Taurasi', 'Kelsey Mitchell'], threelevel: ['Jewell Loyd', 'Kelsey Plum'], slasher: ['Kahleah Copper'], twoWay: ['Ariel Atkins'], scorer: ['Arike Ogunbowale'] },
  sf: { threelevel: ['Maya Moore'], twoWay: ['Napheesa Collier'], pointForward: ['Alyssa Thomas'], slasher: ['Kahleah Copper'], sniper: ['Rhyne Howard'] },
  pf: { stretch: ['Breanna Stewart'], pointForward: ['Candace Parker'], post: ['Nneka Ogwumike'], energy: ['Angel Reese'], twoWay: ['Napheesa Collier'] },
  c: { post: ["A'ja Wilson"], hubBig: ['Aliyah Boston'], rim: ['Brittney Griner'], stretch: ['Jonquel Jones'], energy: ['Sylvia Fowles'] }
};
WCOMPS.any = WCOMPS.pg;
var WLEFTY = ['Kelsey Plum', "A'ja Wilson", 'Skylar Diggins-Smith', 'Kelsey Mitchell'];
var DAYINIT = { de: ['M', 'D', 'M', 'D', 'F', 'S', 'S'], fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], ar: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'], fa: ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'], rw: ['Mbe', 'Kab', 'Gat', 'Kan', 'Gtn', 'Gtd', 'Cyu'] };
var NICK_POOLS = {
  tr: ['SolKanat', 'ÜçlükAvcısı', 'SonSaniye', 'HızlıHücum', 'PerdeUstası', 'TekElŞut', 'GeceAntrenmanı', 'KıyıŞutörü', 'SessizŞutör', 'İlkAdım', 'FileSesi', 'AlleyOop'],
  en: ['LeftyLane', 'DeepThree', 'BuzzerBeater', 'FastBreak', 'ScreenKing', 'SwishMaker', 'NightShift', 'CornerThree', 'SilentSniper', 'FirstStep', 'NothingButNet', 'AlleyOop'],
  de: ['Korbjäger', 'Dreierkönig', 'Schnellangriff', 'Linkshand', 'Netzrauschen', 'Nachtschicht', 'Eckendreier', 'StillerSchütze', 'ErsterSchritt', 'Buzzerbeater', 'Blockmeister', 'AlleyOop'],
  fr: ['Ficelle', 'RoiDuPanier', 'ContreAttaque', 'MainGauche', 'TirAuBuzzer', 'SniperDiscret', 'PremierPas', 'CoinÀTrois', 'NuitDeShoot', 'PasseMagique', 'Écran', 'AlleyOop'],
  ru: ['Снайпер', 'ТрёхочковыйАс', 'БыстрыйОтрыв', 'Левша', 'ЧистыйБросок', 'НочнаяСмена', 'ТихийСнайпер', 'ПервыйШаг', 'Сирена', 'КорольЩита', 'Разыгрывающий', 'АллиУп'],
  ar: ['القناص', 'الصاروخ', 'البرق', 'الصقر', 'النجم', 'الأعسر', 'الساحر', 'الفهد', 'الجدار', 'المايسترو', 'الهداف', 'الإعصار'],
  fa: ['تک‌تیرانداز', 'صاعقه', 'عقاب', 'یوزپلنگ', 'چپ‌دست', 'جادوگر', 'ستاره', 'طوفان', 'دیوار', 'شکارچی', 'موشک', 'رهبر'],
  rw: ['Intare', 'Inkuba', 'Kagoma', 'Ingwe', 'Intwari', 'Inyenyeri', 'Umuyaga', 'Imbaraga', 'Umuhanga', 'Umurabyo', 'Igihangange', 'AlleyOop']
};

var LIB = {
  form: ['shoot', 'Tek el form şutu', 'One-hand form shooting', '5 nokta × 10', '5 spots × 10'],
  catch: ['shoot', 'Yakala–at, 5 nokta', 'Catch and shoot, 5 spots', '50 atış', '50 shots'],
  pullup: ['shoot', 'Tek dripling çekip şut', 'One-dribble pull-up', 'Yön başına 10', '10 each way'],
  hesi: ['shoot', 'Duraksayıp çekip şut', 'Hesitation pull-up', 'Yön başına 8', '8 each way'],
  move: ['shoot', 'Hareket halinde şut', 'Shooting off movement', '20 atış', '20 shots'],
  makes5: ['shoot', '5 noktadan isabet serisi', 'Makes from 5 spots', 'Nokta başına 10 isabet', '10 makes per spot'],
  ftp: ['shoot', 'Baskılı serbest atış', 'Pressure free throws', '10 × 2', '10 × 2'],
  pop: ['shoot', 'Perde sonrası dışarı açılıp şut', 'Pick-and-pop shot', '20 atış', '20 shots'],
  pound: ['handle', 'Sert yerinde dripling serisi', 'Pound dribble series', 'Her yükseklik 20 sn', '20 s per height'],
  twoball: ['handle', 'İki topla dripling', 'Two-ball dribbling', '3 × 30 sn', '3 × 30 s'],
  tennis: ['handle', 'Tenis topuyla dripling', 'Tennis-ball dribbling', '3 × 30 sn', '3 × 30 s'],
  pace: ['handle', 'Tempo değiştirme', 'Change of pace', '6 tur', '6 trips'],
  zigzag: ['handle', 'Koni zikzak', 'Cone zigzag', '6 tur', '6 trips'],
  weak: ['handle', 'Zayıf el top sürme', 'Weak-hand dribbling', '10 dk', '10 min'],
  retreat: ['handle', 'Geri çekilme driplingi', 'Retreat dribble', '3 × 8', '3 × 8'],
  mikan: ['finish', 'Mikan serisi', 'Mikan series', '3 × 30 sn', '3 × 30 s'],
  rmikan: ['finish', 'Ters Mikan', 'Reverse Mikan', '3 × 30 sn', '3 × 30 s'],
  floater: ['finish', 'Floater serisi', 'Floater series', 'Yön başına 10', '10 each way'],
  euro: ['finish', 'Euro step', 'Euro step', 'Yön başına 8', '8 each way'],
  prohop: ['finish', 'Pro hop bitiriş', 'Pro-hop finish', 'Yön başına 8', '8 each way'],
  contact: ['finish', 'Temaslı bitiriş', 'Finishing through contact', '3 × 8', '3 × 8'],
  touch: ['finish', 'Yumuşak dokunuşlu kısa şutlar', 'Touch shots', '20 deneme', '20 attempts'],
  pivot: ['foot', 'Durak ve pivot', 'Stops and pivots', '2 × 10', '2 × 10'],
  jab: ['foot', 'Jab adımı serisi', 'Jab-step series', 'Her biri 8', '8 each'],
  stepthru: ['foot', 'Şut sahtesi ve içeri adım', 'Shot fake and step-through', 'Yön başına 8', '8 each way'],
  drop: ['foot', 'Drop step', 'Drop step', 'Yön başına 8', '8 each way'],
  upunder: ['foot', 'Up-and-under', 'Up-and-under', 'Yön başına 8', '8 each way'],
  first: ['foot', 'İlk adım patlaması', 'First-step explosion', '3 × 6', '3 × 6'],
  slide: ['def', 'Savunma kayması', 'Defensive slides', '4 × 20 sn', '4 × 20 s'],
  closeout: ['def', 'Close-out', 'Close-outs', '3 × 6', '3 × 6'],
  boxout: ['def', 'Kutulama', 'Box-outs', '3 × 6', '3 × 6'],
  taps: ['def', 'Ribaund tap serisi', 'Rebound taps', '3 × 15', '3 × 15'],
  vertical: ['def', 'Dikey sıçrama, eller yukarı', 'Vertical contests', '3 × 8', '3 × 8'],
  wall: ['iq', 'Duvar pası', 'Wall passing', 'Her tür 30', '30 of each'],
  target: ['iq', 'Hedefe pas', 'Target passing', '30 pas', '30 passes'],
  pnr: ['iq', 'Pick-and-roll okuma', 'Pick-and-roll reads', '12 tekrar', '12 reps'],
  oneone: ['iq', 'Bire bir', 'One-on-one', '5 sayılık 3 oyun', '3 games to 5'],
  rope: ['ath', 'İp atlama', 'Jump rope', '3 × 1 dk', '3 × 1 min'],
  box: ['ath', 'Kutu sıçrama', 'Box jumps', '3 × 6', '3 × 6'],
  plank: ['ath', 'Plank ve yana plank', 'Plank and side plank', '3 × 30 sn', '3 × 30 s'],
  sprint: ['ath', 'Tam saha sprint', 'Full-court sprints', '6 tekrar', '6 reps'],
  balance: ['ath', 'Tek ayak denge', 'Single-leg balance', '2 × 30 sn', '2 × 30 s']
};
var PLANS = {
  general: ['pace', 'pnr', 'wall', 'pullup'],
  scorer: ['catch', 'pivot', 'touch', 'oneone'],
  sniper: ['twoball', 'form', 'makes5', 'move'],
  slasher: ['first', 'euro', 'contact', 'floater'],
  lock: ['slide', 'closeout', 'boxout', 'sprint'],
  threelevel: ['pullup', 'hesi', 'catch', 'contact'],
  twoWay: ['closeout', 'catch', 'slide', 'pullup'],
  pointForward: ['zigzag', 'wall', 'pnr', 'contact'],
  stretch: ['pop', 'catch', 'touch', 'drop'],
  post: ['mikan', 'drop', 'upunder', 'stepthru'],
  hubBig: ['target', 'touch', 'floater', 'pivot'],
  rim: ['vertical', 'slide', 'boxout', 'taps'],
  energy: ['taps', 'boxout', 'sprint', 'contact']
};

/* Harder volumes: every drill now has a make target, a time limit or more sets. */
var HARD = {
  form: ['5 nokta × 15 isabet', '5 spots × 15 makes'], catch: ['100 atış, hedef 60 isabet', '100 shots, target 60 makes'],
  pullup: ['Yön başına 15 isabet', '15 makes each way'], hesi: ['Yön başına 12 isabet', '12 makes each way'],
  move: ['40 atış, koşarak', '40 shots on the run'], makes5: ['Nokta başına 15 isabet, 3 dk sınırı', '15 makes per spot, 3-min limit'],
  ftp: ['10 × 2, kaçırınca sprint', '10 × 2, sprint on a miss'], pop: ['40 atış', '40 shots'],
  pound: ['Her yükseklik 30 sn, iki el', '30 s per height, both hands'], twoball: ['4 × 45 sn', '4 × 45 s'], tennis: ['4 × 40 sn', '4 × 40 s'],
  pace: ['10 tur, maç hızında', '10 trips at game speed'], zigzag: ['10 tur, süre tut', '10 trips, timed'], weak: ['12 dk, sadece zayıf el', '12 min, weak hand only'],
  retreat: ['4 × 10', '4 × 10'], mikan: ['4 × 45 sn', '4 × 45 s'], rmikan: ['4 × 45 sn', '4 × 45 s'],
  floater: ['Yön başına 15 isabet', '15 makes each way'], euro: ['Yön başına 12 isabet', '12 makes each way'], prohop: ['Yön başına 12 isabet', '12 makes each way'],
  contact: ['4 × 10, partner temasıyla', '4 × 10 with partner contact'], touch: ['40 deneme, hedef 28 isabet', '40 attempts, target 28 makes'],
  pivot: ['3 × 12', '3 × 12'], jab: ['Her biri 12', '12 each'], stepthru: ['Yön başına 12', '12 each way'], drop: ['Yön başına 12', '12 each way'], upunder: ['Yön başına 12', '12 each way'],
  first: ['4 × 8, tam hız', '4 × 8 at full speed'], slide: ['6 × 30 sn', '6 × 30 s'], closeout: ['4 × 8', '4 × 8'], boxout: ['4 × 8, partnerle', '4 × 8 with a partner'],
  taps: ['4 × 25', '4 × 25'], vertical: ['4 × 10', '4 × 10'], wall: ['Her tür 50, iki el', '50 of each, both hands'], target: ['50 pas', '50 passes'],
  pnr: ['20 tekrar, sandalyeyle', '20 reps with a chair'], oneone: ['7 sayılık 3 oyun', '3 games to 7'],
  rope: ['4 × 90 sn', '4 × 90 s'], box: ['4 × 6', '4 × 6'], plank: ['3 × 45 sn', '3 × 45 s'], sprint: ['10 tekrar', '10 reps'], balance: ['3 × 30 sn', '3 × 30 s']
};
Object.keys(HARD).forEach(function (id) { if (LIB[id]) { LIB[id][3] = HARD[id][0]; LIB[id][4] = HARD[id][1]; } });

/* Solo replacements for partner drills, plus conditioning finishers. */
LIB.beatpro = ['iq', 'Hayalet rakip oyunu', 'Beat the ghost', 'İsabet +1, kaçan −2, 10 sayıya ulaş', 'Make +1, miss −2, get to 10'];
LIB.conemove = ['finish', 'Koniye karşı tek hamle ve bitiriş', 'One move at a cone, then finish', 'Yön başına 12', '12 each way'];
LIB.power = ['finish', 'Çift ayak güç bitirişi', 'Two-foot power finish', '4 × 10', '4 × 10'];
LIB.shadow = ['def', 'Gölge savunma', 'Shadow defense', '6 × 30 sn', '6 × 30 s'];
LIB.wallbox = ['def', 'Duvardan ribaund ve kutulama adımı', 'Wall rebound with box-out step', '4 × 12', '4 × 12'];
LIB.mirror = ['def', 'Ayna drili', 'Mirror drill', '6 × 20 sn', '6 × 20 s'];
LIB.ppass = ['iq', 'Partnerle hareketli pas', 'Partner passing on the move', '6 tur', '6 trips'];
LIB.ftfatigue = ['ath', 'Yorgunken serbest atış', 'Free throws under fatigue', '5 × (2 sprint + 2 atış)', '5 × (2 sprints + 2 shots)'];
LIB.seventeen = ['ath', '17\'ler', 'Seventeens', '70 sn içinde 17 yan çizgi, 2 set', '17 sideline touches in 70 s, 2 sets'];

var PARTNER_ONLY = ['oneone', 'contact', 'mirror', 'ppass', 'boxout'];
var SOLO_ALT = { oneone: 'beatpro', contact: 'power', mirror: 'shadow', ppass: 'wall', boxout: 'wallbox' };
var SHOOT_STYLES = ['scorer', 'sniper', 'threelevel', 'stretch', 'hubBig', 'post'];
PLANS = {
  general: ['pace', 'pnr', 'ppass', 'pullup'],
  scorer: ['catch', 'pivot', 'touch', 'oneone'],
  sniper: ['twoball', 'form', 'makes5', 'move'],
  slasher: ['first', 'euro', 'contact', 'floater'],
  lock: ['mirror', 'closeout', 'boxout', 'slide'],
  threelevel: ['pullup', 'hesi', 'catch', 'contact'],
  twoWay: ['closeout', 'catch', 'mirror', 'pullup'],
  pointForward: ['zigzag', 'ppass', 'pnr', 'contact'],
  stretch: ['pop', 'catch', 'touch', 'drop'],
  post: ['mikan', 'drop', 'upunder', 'stepthru'],
  hubBig: ['target', 'touch', 'floater', 'pivot'],
  rim: ['vertical', 'mirror', 'boxout', 'taps'],
  energy: ['taps', 'boxout', 'sprint', 'contact']
};

/* ---------- Görevler: günlük, haftalık, aylık ---------- */
// İlerleme gerçek kayıtlardan gelir: antrenman, meydan okuma, serbest atış testi, drill ekleme, davet ve şut takibinde
// kaydedilen antrenmanlar. "man" görevleri kendi beyanıdır (Yaptım düğmesi). Seçim her dönem için sabittir
// (sayfa yenilenince değişmez), oyun tarzına göre ağırlıklıdır ve bir önceki dönemin görevlerini tekrar etmemeye çalışır.
var QREW = { d: 10, w: 40, m: 100 };
var QGROUPS = { d: ['core', 'cam', 'skill', 'skill'], w: ['vol', 'cam', 'habit', 'extra', 'skill'], m: ['vol', 'cam', 'streak', 'meta', 'extra'] };
var QTAGS = {
  general: ['handle', 'iq', 'shoot'], scorer: ['shoot', 'handle', 'finish'], sniper: ['shoot', 'ath', 'handle'],
  slasher: ['finish', 'handle', 'ath'], lock: ['def', 'ath', 'iq'], threelevel: ['shoot', 'handle', 'finish'],
  twoWay: ['def', 'shoot', 'ath'], pointForward: ['iq', 'handle', 'finish'], stretch: ['shoot', 'finish', 'def'],
  post: ['finish', 'def', 'ath'], hubBig: ['iq', 'finish', 'def'], rim: ['def', 'finish', 'ath'], energy: ['ath', 'def', 'finish']
};
var QICON = {
  shoot: 'M3 17C5 7 13 4 18 9M18 9V5M18 9h-4M14 15h6M15 15l.5 4h3l.5-4',
  handle: 'M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM2 11h18M11 2v18',
  finish: 'M12 2 5 12h5l-1 8 8-11h-5z',
  def: 'M11 2 4 5v6c0 4.5 3 8 7 9 4-1 7-4.5 7-9V5z',
  iq: 'M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.5 7.5l-2 5-5 2 2-5z',
  ath: 'M2 12h4l2.5-6 5 11 2.5-5H20',
  core: 'M4 5h14v14H4zM4 9h14M8 3v4M14 3v4M8 14l2 2 4-4',
  cam: 'M3 7h4l2-2h4l2 2h4v11H3zM11 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  vol: 'M11 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM11 6v5l3.5 2',
  habit: 'M11 2c1.5 4 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.2-3.8 2.5-5 0 2 .7 3 1.8 3 0-3-1.3-5 .7-8z',
  streak: 'M11 2c1.5 4 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.2-3.8 2.5-5 0 2 .7 3 1.8 3 0-3-1.3-5 .7-8z',
  meta: 'M11 2.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  extra: 'M11 2.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'
};
function QD(id, t, g, k, n, tr, en, x) { var o = { id: id, t: t, g: g, k: k, n: n, tr: tr, en: en }; return x ? Object.assign(o, x) : o; }
function QM(id, t, tag, tr, en, x) { return QD(id, t, 'skill', null, 1, tr, en, Object.assign({ man: true, tag: tag }, x || {})); }
var QUESTS = [
  // ---- Günlük: antrenman ----
  QD('d_wo', 'd', 'core', 'wo', 1, 'Bugünkü antrenmanı tamamla', "Finish today's workout"),
  QD('d_ch', 'd', 'core', 'ch', 1, 'Günün meydan okumasını tamamla', 'Complete the daily challenge'),
  QD('d_min30', 'd', 'core', 'min', 30, 'Bugün en az 30 dakika çalış', 'Train for at least 30 minutes today'),
  QD('d_am', 'd', 'core', 'am', 1, "Antrenmanı öğlen 12'den önce bitir", 'Finish a workout before noon'),
  QD('d_add', 'd', 'core', 'add', 2, 'Drill kütüphanesinden bugüne 2 drill ekle', 'Add 2 drills from the library to today'),
  QD('d_ft', 'd', 'core', 'ft', 1, 'Serbest atış testini yap (10 atış)', 'Take the free-throw test (10 shots)'),
  QD('d_ft7', 'd', 'core', 'ftBest', 7, "Serbest atış testinde 10'da en az 7", 'Make at least 7 of 10 in the free-throw test'),
  // ---- Günlük: kamera (şut takibi sayar) ----
  QD('d_att20', 'd', 'cam', 'att', 20, 'Kamerayla 20 şut at', 'Take 20 shots on camera', { cam: 1 }),
  QD('d_att40', 'd', 'cam', 'att', 40, 'Kamerayla 40 şut at', 'Take 40 shots on camera', { cam: 1 }),
  QD('d_made10', 'd', 'cam', 'made', 10, 'Kamerayla 10 isabet yap', 'Make 10 shots on camera', { cam: 1 }),
  QD('d_made20', 'd', 'cam', 'made', 20, 'Kamerayla 20 isabet yap', 'Make 20 shots on camera', { cam: 1 }),
  QD('d_pct40', 'd', 'cam', 'pct', 40, 'Takipli bir antrenmanda %40 isabet (en az 20 şut)', 'Shoot 40% in a tracked session (20+ shots)', { cam: 1 }),
  QD('d_run3', 'd', 'cam', 'run', 3, 'Kamerayla üst üste 3 isabet', 'Make 3 in a row on camera', { cam: 1 }),
  QD('d_run5', 'd', 'cam', 'run', 5, 'Kamerayla üst üste 5 isabet', 'Make 5 in a row on camera', { cam: 1 }),
  QD('d_rel', 'd', 'cam', 'rel', 1, 'Bırakış açısı ortalaması 44–55° olan bir takipli antrenman', 'A tracked session with an average release angle of 44–55°', { cam: 1 }),
  // ---- Günlük: beceri (kendi beyanın) ----
  QM('d_m_form', 'd', 'shoot', '50 form şutu: pota dibinden, tek elle', '50 form shots: close range, one hand'),
  QM('d_m_ft25', 'd', 'shoot', '25 serbest atış', '25 free throws'),
  QM('d_m_mid', 'd', 'shoot', '20 orta mesafe pull-up şut', '20 mid-range pull-up jumpers'),
  QM('d_m_corner', 'd', 'shoot', 'Köşeden 10 isabet', 'Make 10 from the corner'),
  QM('d_m_catch', 'd', 'shoot', 'Pas alıp atma: 30 şut', 'Catch-and-shoot: 30 shots'),
  QM('d_m_pound', 'd', 'handle', 'Yerinde sert top sürme: her elle 3 × 30 sn', 'Pound dribbles: 3 × 30 s with each hand'),
  QM('d_m_two', 'd', 'handle', 'İki topla 5 dakika top sürme', '5 minutes of two-ball dribbling'),
  QM('d_m_cross', 'd', 'handle', 'Gözler yukarıda 50 crossover', '50 crossovers, eyes up'),
  QM('d_m_hesi', 'd', 'handle', '20 hesitation ve turnike', '20 hesitation moves into a layup'),
  QM('d_m_weakdrib', 'd', 'handle', 'Zayıf elle 5 dakika top sürme', '5 minutes of weak-hand dribbling'),
  QM('d_m_weak', 'd', 'finish', 'Zayıf elle 30 turnike', '30 weak-hand layups'),
  QM('d_m_mikan', 'd', 'finish', 'Mikan drili: 3 × 30 sn', 'Mikan drill: 3 × 30 s'),
  QM('d_m_floater', 'd', 'finish', '20 floater', '20 floaters'),
  QM('d_m_reverse', 'd', 'finish', 'Her taraftan 15 ters turnike', '15 reverse layups on each side'),
  QM('d_m_slide', 'd', 'def', 'Savunma kayması: 4 × 30 sn', 'Defensive slides: 4 × 30 s'),
  QM('d_m_closeout', 'd', 'def', '20 kapanma (closeout) ve kayma', '20 closeouts into slides'),
  QM('d_m_wall', 'd', 'iq', 'Duvara 100 pas: göğüs, sektirme, tek el', '100 wall passes: chest, bounce, one hand'),
  QM('d_m_film', 'd', 'iq', '10 dk maç izle: bir oyuncunun topsuz hareketlerini takip et', "Watch 10 min of a game: follow one player's off-ball movement"),
  QM('d_m_jump', 'd', 'ath', '3 × 10 squat sıçraması', '3 × 10 squat jumps'),
  QM('d_m_stretch', 'd', 'ath', '10 dk esneme ve hareketlilik', '10 min of stretching and mobility'),
  QM('d_m_plank', 'd', 'ath', 'Plank: 3 × 30 sn', 'Plank: 3 × 30 s'),
  QM('d_m_rope', 'd', 'ath', '5 dakika ip atlama', '5 minutes of jump rope'),
  // ---- Haftalık ----
  QD('w_wo3', 'w', 'vol', 'wo', 3, 'Bu hafta 3 antrenman tamamla', 'Finish 3 workouts this week'),
  QD('w_wo5', 'w', 'vol', 'wo', 5, 'Bu hafta 5 antrenman tamamla', 'Finish 5 workouts this week'),
  QD('w_days4', 'w', 'vol', 'days', 4, '4 farklı günde çalış', 'Train on 4 different days'),
  QD('w_min150', 'w', 'vol', 'min', 150, 'Bu hafta toplam 150 dakika çalış', 'Train for 150 minutes in total this week'),
  QD('w_att150', 'w', 'cam', 'att', 150, 'Kamerayla 150 şut at', 'Take 150 shots on camera', { cam: 1 }),
  QD('w_made75', 'w', 'cam', 'made', 75, 'Kamerayla 75 isabet yap', 'Make 75 shots on camera', { cam: 1 }),
  QD('w_ses3', 'w', 'cam', 'ses20', 3, 'En az 20 şutluk 3 takipli antrenman', '3 tracked sessions of 20+ shots', { cam: 1 }),
  QD('w_pct50', 'w', 'cam', 'pct', 50, 'Takipli bir antrenmanda %50 isabet (en az 20 şut)', 'Shoot 50% in a tracked session (20+ shots)', { cam: 1 }),
  QD('w_run7', 'w', 'cam', 'run', 7, 'Kamerayla üst üste 7 isabet', 'Make 7 in a row on camera', { cam: 1 }),
  QD('w_rel2', 'w', 'cam', 'rel', 2, 'Bırakış açısı ortalaması 44–55° olan 2 takipli antrenman', '2 tracked sessions with an average release angle of 44–55°', { cam: 1 }),
  QD('w_stk3', 'w', 'habit', 'stk', 3, 'Serini 3 güne çıkar', 'Reach a 3-day streak'),
  QD('w_qd10', 'w', 'habit', 'qd', 10, '10 günlük görev tamamla', 'Complete 10 daily missions'),
  QD('w_ch4', 'w', 'habit', 'ch', 4, '4 meydan okuma tamamla', 'Complete 4 daily challenges'),
  QD('w_wkd', 'w', 'habit', 'wkd', 1, 'Hafta sonu bir antrenman yap', 'Finish a workout on the weekend'),
  QD('w_am2', 'w', 'habit', 'am', 2, 'İki kez öğleden önce antrenman bitir', 'Finish 2 workouts before noon'),
  QD('w_ft2', 'w', 'extra', 'ft', 2, 'İki farklı günde serbest atış testi yap', 'Take the free-throw test on 2 different days'),
  QD('w_ftb7', 'w', 'extra', 'ftBest', 7, "Serbest atış testinde 10'da 7", 'Make 7 of 10 in the free-throw test'),
  QD('w_add5', 'w', 'extra', 'add', 5, 'Kütüphaneden 5 farklı drill ekle', 'Add 5 different drills from the library'),
  QD('w_partner', 'w', 'extra', 'partner', 1, 'Partnerle bir antrenman tamamla', 'Finish a workout with a partner', { partner: 1 }),
  QD('w_inv', 'w', 'extra', 'inv', 1, 'Bir arkadaşını davet et', 'Invite a friend'),
  QM('w_m_threes', 'w', 'shoot', '100 üçlük dene ve kaçının girdiğini say', 'Attempt 100 threes and count your makes'),
  QM('w_m_spots', 'w', 'shoot', '5 noktadan 10\'ar isabet: iki köşe, iki kanat, tepe', '10 makes from each of 5 spots: corners, wings, top'),
  QM('w_m_handle', 'w', 'handle', 'Top sürme günü: 20 dakika sadece top sürme', 'Handles day: 20 minutes of dribbling only'),
  QM('w_m_finish', 'w', 'finish', 'Bitiriş günü: 100 turnike, yarısı zayıf elle', 'Finishing day: 100 layups, half with your weak hand'),
  QM('w_m_def', 'w', 'def', 'Savunma günü: 15 dk kayma, kapanma ve ribaund', 'Defense day: 15 min of slides, closeouts and rebounds'),
  QM('w_m_video', 'w', 'iq', 'Şutunu yandan videoya çek ve formunu izle', 'Film your shot from the side and watch your form'),
  QM('w_m_17s', 'w', 'ath', "17'ler koşusu: 2 set", 'Seventeens: 2 sets', { hard: 1 }),
  QM('w_m_1v1', 'w', 'iq', 'Bir arkadaşınla üç 1’e 1 maç', 'Three 1-on-1 games with a friend', { partner: 1 }),
  // ---- Aylık ----
  QD('m_wo12', 'm', 'vol', 'wo', 12, 'Bu ay 12 antrenman tamamla', 'Finish 12 workouts this month'),
  QD('m_wo20', 'm', 'vol', 'wo', 20, 'Bu ay 20 antrenman tamamla', 'Finish 20 workouts this month'),
  QD('m_days15', 'm', 'vol', 'days', 15, '15 farklı günde çalış', 'Train on 15 different days'),
  QD('m_min600', 'm', 'vol', 'min', 600, 'Bu ay toplam 600 dakika (10 saat) çalış', 'Train for 600 minutes (10 hours) this month'),
  QD('m_att600', 'm', 'cam', 'att', 600, 'Kamerayla 600 şut at', 'Take 600 shots on camera', { cam: 1 }),
  QD('m_made300', 'm', 'cam', 'made', 300, 'Kamerayla 300 isabet yap', 'Make 300 shots on camera', { cam: 1 }),
  QD('m_ses10', 'm', 'cam', 'ses20', 10, 'En az 20 şutluk 10 takipli antrenman', '10 tracked sessions of 20+ shots', { cam: 1 }),
  QD('m_ses50', 'm', 'cam', 'ses50', 3, 'En az 50 şutluk 3 takipli antrenman', '3 tracked sessions of 50+ shots', { cam: 1 }),
  QD('m_pct55', 'm', 'cam', 'pct', 55, 'Takipli bir antrenmanda %55 isabet (en az 20 şut)', 'Shoot 55% in a tracked session (20+ shots)', { cam: 1 }),
  QD('m_run10', 'm', 'cam', 'run', 10, 'Kamerayla üst üste 10 isabet', 'Make 10 in a row on camera', { cam: 1 }),
  QD('m_stk7', 'm', 'streak', 'stk', 7, '7 günlük seri yap', 'Reach a 7-day streak'),
  QD('m_stk14', 'm', 'streak', 'stk', 14, '14 günlük seri yap', 'Reach a 14-day streak'),
  QD('m_qd40', 'm', 'meta', 'qd', 40, '40 günlük görev tamamla', 'Complete 40 daily missions'),
  QD('m_qw6', 'm', 'meta', 'qw', 6, '6 haftalık görev tamamla', 'Complete 6 weekly missions'),
  QD('m_ch15', 'm', 'meta', 'ch', 15, '15 meydan okuma tamamla', 'Complete 15 daily challenges'),
  QD('m_pts', 'm', 'meta', 'pts', 1500, 'Bu ay 1500 puan topla', 'Earn 1500 points this month'),
  QD('m_ftb8', 'm', 'extra', 'ftBest', 8, "Serbest atış testinde 10'da 8", 'Make 8 of 10 in the free-throw test'),
  QD('m_rel5', 'm', 'extra', 'rel', 5, 'Bırakış açısı ortalaması 44–55° olan 5 takipli antrenman', '5 tracked sessions with an average release angle of 44–55°', { cam: 1 }),
  QD('m_ft8', 'm', 'extra', 'ft', 8, '8 farklı günde serbest atış testi yap', 'Take the free-throw test on 8 different days'),
  QD('m_wkd4', 'm', 'extra', 'wkd', 4, '4 hafta sonu antrenmanı yap', 'Finish 4 weekend workouts')
];
var QBYID = {}; QUESTS.forEach(function (x) { QBYID[x.id] = x; });

function qPeriod(t, d) {
  d = d || new Date();
  if (t === 'd') { return dayStr(d); }
  if (t === 'w') { return dayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))); }
  var m = d.getMonth() + 1; return d.getFullYear() + '-' + (m < 10 ? '0' + m : m);
}
function qEnd(t, d) {
  d = d || new Date();
  if (t === 'd') { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
  if (t === 'w') { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 7); }
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
// Kalan süre: günlükte saat ("24 saat", "6 sa 12 dk"), haftalık ve aylıkta gün ("4 gün 6 sa", "18 gün")
function qLeft(t, d, en, short) {
  var min = Math.max(1, Math.ceil((qEnd(t, d) - d) / 60000));
  var days = Math.floor(min / 1440), hrs = Math.floor(min / 60), hr = Math.floor((min % 1440) / 60), m = min % 60;
  if (t === 'd' || days < 1) {
    if (hrs >= 1) { return (short || m === 0) ? hrs + (en ? 'h' : ' saat') : hrs + (en ? 'h ' : ' sa ') + m + (en ? 'm' : ' dk'); }
    return m + (en ? 'm' : ' dk');
  }
  if (short || days >= 10 || hr === 0) { return days + (en ? 'd' : ' gün'); }
  return days + (en ? 'd ' : ' gün ') + hr + (en ? 'h' : ' sa');
}
function qLeftWords(t, d, en) {
  var s = qLeft(t, d, en, false);
  return en
    ? s.replace(/(\d+)d/, '$1 days').replace(/(\d+)h/, '$1 hours').replace(/(\d+)m$/, '$1 minutes')
    : s.replace(' sa ', ' saat ').replace(/ sa$/, ' saat').replace(' dk', ' dakika');
}
function qHash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function qRng(seed) {
  var a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function qClone(q) { return q ? JSON.parse(JSON.stringify(q)) : null; }
function qVal(Q, d) { if (!Q || !d) { return 0; } var p = Q.p || {}; return d.man ? (p['man_' + d.id] ? 1 : 0) : (p[d.k] || 0); }
function qPick(t, id, st, prev) {
  var ans = st.answers || {};
  var young = parseInt(ans.age, 10) <= 12;
  var pos = ans.position || 'any';
  var style = (ans.style && STYLES[ans.style]) ? ans.style : (STYLE_SETS[pos] || STYLE_SETS.any)[0];
  var pref = QTAGS[style] || ['shoot', 'handle', 'finish'];
  var rnd = qRng(qHash(((st.q && st.q.seed) || 'g') + ':' + t + ':' + id));
  var used = {}, tags = {}, out = [];
  QGROUPS[t].forEach(function (g) {
    var pool = QUESTS.filter(function (x) { return x.t === t && x.g === g && !used[x.id] && !(young && x.hard) && !(x.partner && !st.partner); });
    if (!pool.length) { return; }
    var w = pool.map(function (x) {
      var v = 1;
      if (x.tag) { var i = pref.indexOf(x.tag); v = i === 0 ? 3 : (i === 1 ? 2 : (i === 2 ? 1.5 : 1)); if (tags[x.tag]) { v *= 0.25; } }
      if (prev && prev.indexOf(x.id) >= 0) { v *= 0.2; }
      return v;
    });
    var sum = w.reduce(function (a, b) { return a + b; }, 0), r = rnd() * sum, k = 0;
    while (k < pool.length - 1 && r >= w[k]) { r -= w[k]; k++; }
    used[pool[k].id] = true; if (pool[k].tag) { tags[pool[k].tag] = true; }
    out.push(pool[k].id);
  });
  return out;
}
function qNew(t, id, st, prev) { return { id: id, picks: qPick(t, id, st, prev), p: {}, claimed: {} }; }
function qEnsure(st, now) {
  now = now || new Date();
  if (!st.q || typeof st.q !== 'object') { st.q = {}; }
  if (!st.q.seed) { st.q.seed = Math.random().toString(36).slice(2, 10); }
  ['d', 'w', 'm'].forEach(function (t) {
    var Q = st.q[t];
    if (!Q || !Q.picks || !Q.picks.length) { st.q[t] = qNew(t, qPeriod(t, now), st, null); }
    else { Q.p = Q.p || {}; Q.claimed = Q.claimed || {}; }
  });
}
function qMid(t, id) {
  var p = String(id || '').split('-').map(Number);
  if (t === 'm' && p.length === 2) { return new Date(p[0], p[1] - 1, 15, 12).getTime(); }
  if (p.length === 3) { return new Date(p[0], p[1] - 1, p[2] + (t === 'w' ? 3 : 0), 12).getTime(); }
  return null;
}
// Süre dolunca yeni görevler gelir. Tamamlanmış ama alınmamış ödül kaybolmaz: seviye puanına eklenir.
function qRoll(st, now) {
  now = now || new Date();
  qEnsure(st, now);
  var got = 0;
  ['d', 'w', 'm'].forEach(function (t) {
    var Q = st.q[t], id = qPeriod(t, now);
    if (Q.id === id) { return; }
    var when = qMid(t, Q.id);
    Q.picks.forEach(function (qid) {
      var d = QBYID[qid];
      if (d && !d.man && !Q.claimed[qid] && qVal(Q, d) >= d.n) {
        Q.claimed[qid] = true; got += QREW[t];
        st.totalQuests = (st.totalQuests || 0) + 1;
        if (t === 'm') { st.totalQM = (st.totalQM || 0) + 1; }
        if (when) { qBump(st, 'pts', QREW[t], when); if (t === 'd') { qBump(st, 'qd', 1, when); } if (t === 'w') { qBump(st, 'qw', 1, when); } }
      }
    });
    st.q[t] = qNew(t, id, st, Q.picks);
  });
  if (got) {
    st.totalPoints = (st.totalPoints || 0) + got;
    st.qNote = st.lang !== 'tr'
      ? 'Missions you finished but did not claim before they expired: +' + got + ' points added to your level.'
      : 'Süresi dolan, tamamladığın ama almadığın görevler: +' + got + ' puan seviyene eklendi.';
  }
}
function qBump(st, key, val, when, mode) {
  if (!st.q || !val) { return; }
  var d = when ? new Date(when) : new Date();
  ['d', 'w', 'm'].forEach(function (t) {
    var Q = st.q[t];
    if (!Q || Q.id !== qPeriod(t, d)) { return; }
    Q.p = Q.p || {};
    Q.p[key] = mode === 'max' ? Math.max(Q.p[key] || 0, val) : (Q.p[key] || 0) + val;
  });
}
// Aynı gün ya da aynı drill iki kez sayılmasın diye küme ile sayar
function qMark(st, key, token, when) {
  if (!st.q) { return; }
  var d = when ? new Date(when) : new Date();
  ['d', 'w', 'm'].forEach(function (t) {
    var Q = st.q[t];
    if (!Q || Q.id !== qPeriod(t, d)) { return; }
    Q.p = Q.p || {};
    var set = Q.p['_' + key] || (Q.p['_' + key] = {});
    if (!set[token]) { set[token] = 1; Q.p[key] = Object.keys(set).length; }
  });
}
function qWorkout(st, mins, when, partner, streakVal, pts) {
  var d = new Date(when);
  qBump(st, 'wo', 1, when); qBump(st, 'min', mins, when); qMark(st, 'days', dayStr(d), when);
  if (d.getHours() < 12) { qBump(st, 'am', 1, when); }
  if (d.getDay() === 0 || d.getDay() === 6) { qBump(st, 'wkd', 1, when); }
  if (partner) { qBump(st, 'partner', 1, when); }
  qBump(st, 'stk', streakVal, when, 'max');
  if (pts) { qBump(st, 'pts', pts, when); }
}
function qSession(st, x, asWorkout) {
  var when = x.date, att = x.att || 0, made = x.made || 0;
  qBump(st, 'att', att, when); qBump(st, 'made', made, when); qBump(st, 'ses', 1, when);
  if (att >= 20) { qBump(st, 'ses20', 1, when); qBump(st, 'pct', Math.round(made / att * 100), when, 'max'); }
  if (att >= 50) { qBump(st, 'ses50', 1, when); }
  if (x.run) { qBump(st, 'run', x.run, when, 'max'); }
  if (att >= 10 && typeof x.release === 'number' && x.release >= 44 && x.release <= 55) { qBump(st, 'rel', 1, when); }
  if (!asWorkout && x.min) { qBump(st, 'min', x.min, when); }
  qMark(st, 'days', dayStr(new Date(when)), when);
}
function qPct(v, en) { return en ? v + '%' : '%' + v; }
function qSub(d, v, en) {
  if (d.man) { return en ? 'Self-reported' : 'Kendi beyanın'; }
  var cam = d.cam ? (en ? ' · counted by camera' : ' · kamera sayar') : '';
  var vv = Math.min(v, d.n);
  if (d.n === 1) { return (v >= 1 ? (en ? 'Done' : 'Tamam') : (en ? 'Not yet' : 'Henüz yapılmadı')) + cam; }
  if (d.k === 'pct') { return (en ? 'Best: ' : 'En iyi: ') + qPct(v, en) + ' / ' + qPct(d.n, en) + cam; }
  if (d.k === 'run' || d.k === 'ftBest') { return (en ? 'Best: ' : 'En iyi: ') + vv + ' / ' + d.n + cam; }
  var unit = { min: en ? ' min' : ' dk', days: en ? ' days' : ' gün', stk: en ? '-day streak' : ' günlük seri' }[d.k] || '';
  return vv + ' / ' + d.n + unit + cam;
}
// Sorular bitince (aynı gün) görevleri oyun tarzına göre yeniden seç; ilerleme varsa dokunma
function qRepick(s) {
  var q2 = qClone(s.q);
  if (!q2) { return {}; }
  var tmp = { q: q2, answers: s.answers, partner: s.partner };
  ['d', 'w', 'm'].forEach(function (t) { var Q = q2[t]; if (Q && !Object.keys(Q.p || {}).length && !Object.keys(Q.claimed || {}).length) { Q.picks = qPick(t, Q.id, tmp, null); } });
  return { q: q2 };
}
function dayRoll(st) {
  if (st.day !== todayStr()) { st.day = todayStr(); st.doneToday = false; st.challenge = 0; st.added = {}; st.verifiedToday = false; }
  if (st.week !== weekStr() || !st.wk || !st.wk.byDay) { st.week = weekStr(); st.wk = emptyWeek(); }
}
function prevDayStr(ds) { var p = String(ds).split('-').map(Number); return dayStr(new Date(p[0], p[1] - 1, p[2] - 1)); }
function nextDayStr(ds) { var p = String(ds).split('-').map(Number); return dayStr(new Date(p[0], p[1] - 1, p[2] + 1)); }
function weekOfDay(ds) { var p = String(ds).split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]); return dayStr(new Date(p[0], p[1] - 1, p[2] - ((d.getDay() + 6) % 7))); }
// Dinlenme hakkı: haftada (7 - seçilen gün sayısı), en az 1 gün. Planındaki dinlenme günü seriyi bozmaz.
function restAllowed(st) { var f = parseInt((st.answers || {}).freq, 10); return Math.max(1, 7 - (f || 6)); }
function restLeft(st, wk) { return Math.max(0, restAllowed(st) - ((st.restUsed || {})[wk || weekStr()] || 0)); }
// Son antrenmanla hedef gün arasındaki boş günleri dinlenme hakkıyla kapatır. Hak yetmezse seri biter.
function bridge(st, target) {
  var base = (st.covered && st.covered > (st.lastDone || '')) ? st.covered : st.lastDone;
  if (!base || !st.streak) { return false; }
  if (base >= prevDayStr(target)) { return true; }
  st.restUsed = Object.assign({}, st.restUsed); st.restDays = Object.assign({}, st.restDays);
  var d = nextDayStr(base), n = 0;
  while (d < target) {
    var wk = weekOfDay(d);
    if (++n > 14 || (st.restUsed[wk] || 0) >= restAllowed(st)) { st.streak = 0; return false; }
    st.restUsed[wk] = (st.restUsed[wk] || 0) + 1; st.restDays[d] = 1; st.covered = d;
    d = nextDayStr(d);
  }
  return true;
}
// Bir günü antrenman yapılmış say ve seriyi ilerlet. Yeni seri değerini döndürür.
function streakAdvance(st, day) {
  if (st.restDays && st.restDays[day]) {
    st.restDays = Object.assign({}, st.restDays); delete st.restDays[day];
    st.restUsed = Object.assign({}, st.restUsed); var wk = weekOfDay(day); st.restUsed[wk] = Math.max(0, (st.restUsed[wk] || 0) - 1);
  }
  var ok = bridge(st, day);
  st.streak = (ok && st.streak > 0) ? st.streak + 1 : 1;
  st.lastDone = day;
  if (!st.covered || st.covered < day) { st.covered = day; }
  return st.streak;
}
// Seri kontrolü: dünden önceki boş günler dinlenme hakkıyla kapatılır; hak biterse seri biter.
// Şut takibinden gelen geçmiş günler işlendikten SONRA çalışır.
function streakCheck(st) {
  if (st.streak > 0) { bridge(st, todayStr()); }
  var cut = dayStr(new Date(Date.now() - 40 * 86400000));
  ['restUsed', 'restDays'].forEach(function (k) { var o = st[k]; if (!o) { return; } Object.keys(o).forEach(function (x) { if (x < cut) { delete o[x]; } }); });
  if (st.hist) { Object.keys(st.hist).forEach(function (x) { if (x < dayStr(new Date(Date.now() - 120 * 86400000))) { delete st.hist[x]; } }); }
}
function histAdd(st, day, mins) { st.hist = Object.assign({}, st.hist); st.hist[day] = (st.hist[day] || 0) + Math.max(0, mins || 0); }
// Şut takibi ekranında kaydedilen antrenmanları işle (aynı sitede, aynı tarayıcı deposu)
function applySessions(st) {
  var n = 0;
  try {
    var sess = JSON.parse(window.localStorage.getItem('greenai.sessions') || '[]');
    var seen = st.sessionsSeen || 0;
    sess.filter(function (x) { return x && x.date > seen; }).sort(function (p, q) { return p.date - q.date; }).forEach(function (x) {
      n++;
      st.shotAtt = (st.shotAtt || 0) + (x.att || 0);
      st.shotMade = (st.shotMade || 0) + (x.made || 0);
      var d = new Date(x.date);
      var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
      if (dayStr(mon) === st.week) {
        st.wk = Object.assign({}, st.wk, { shotAtt: (st.wk.shotAtt || 0) + (x.att || 0), shotMade: (st.wk.shotMade || 0) + (x.made || 0) });
      }
      var asWorkout = false;
      // 20 ve üstü şutluk takipli antrenman, o günün antrenmanı sayılır (kendi beyanı değil, kamera doğrular).
      // Kayıt geç saatte yapılıp uygulama ertesi gün açılsa da o gün sayılır, seri bozulmaz.
      var sday = dayStr(d);
      if ((x.att || 0) >= 20 && (!st.lastDone || sday > st.lastDone)) {
        var ns = streakAdvance(st, sday);
        var bonus = (ns % 7 === 0) ? 70 : 0;
        var mins = Math.max(1, x.min || 0);
        if (dayStr(mon) === st.week) {
          var w = Object.assign({}, st.wk, { byDay: st.wk.byDay.slice() });
          w.workouts += 1; w.minutes += mins; w.ptsW += 20; w.ptsS += 10 + bonus; w.byDay[(d.getDay() + 6) % 7] += mins;
          st.wk = w;
        }
        if (sday === todayStr()) { st.doneToday = true; st.verifiedToday = true; }
        st.totalWorkouts = (st.totalWorkouts || 0) + 1; st.totalPoints = (st.totalPoints || 0) + 30 + bonus;
        qWorkout(st, mins, x.date, st.partner, ns, 30 + bonus);
        asWorkout = true;
      }
      if (x.min) { histAdd(st, sday, x.min); }
      qSession(st, x, asWorkout);
      seen = Math.max(seen, x.date);
    });
    st.sessionsSeen = seen;
  } catch (err) {}
  streakCheck(st);
  return n;
}

