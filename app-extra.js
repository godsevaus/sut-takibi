// Green AI ek özellikler: metin filtresi, drill açıklamaları, hatırlatma bildirimi, klanlar, uzun dönem ilerleme.
// app-core.js'den sonra, app-main.js'den önce yüklenir.

// ---------- Metin filtresi (sunucudaki public.text_ok ile aynı liste ve aynı kural) ----------
var BADWORDS = ['fuck', 'fck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'nigger', 'nigga', 'fagot', 'faggot', 'rapist', 'porn', 'sex', 'nazi', 'hitler', 'asshole', 'bastard', 'retard', 'penis', 'vagina', 'boobs', 'tits', 'dildo', 'jizz', 'wank', 'motherf', 'kys', 'killyourself', 'amk', 'aminak', 'amcik', 'amcık', 'orospu', 'orosbu', 'pickurusu', 'siktir', 'sikerim', 'sikis', 'sikiş', 'sikik', 'sikim', 'sokuk', 'yarrak', 'yarak', 'ibne', 'kahpe', 'pezevenk', 'gavat', 'kaltak', 'surtuk', 'sürtük', 'yavsak', 'yavşak', 'gotveren', 'götveren', 'anasini', 'anasını', 'sicmak', 'scheis', 'scheiss', 'hurensohn', 'fotze', 'wichser', 'arschloch', 'putain', 'salope', 'connard', 'encule', 'enculé', 'merde', 'хуй', 'пизд', 'бляд', 'блят', 'ебат', 'ебан', 'сука', 'мудак', 'шлюх', 'شرموط', 'قحبه', 'جنده', 'indaya'];
function normText(t) {
  var from = 'ışğçöüâîûéè013457@$8', to = 'isgcouaiueeoieastasb';
  var x = String(t || '').toLowerCase().split('').map(function (ch) { var i = from.indexOf(ch); return i >= 0 ? to[i] : ch; }).join('');
  x = x.replace(/[^a-zа-яё؀-ۿ]/g, '');
  return x.replace(/(.)\1+/g, '$1');
}
var BAD_NORM = BADWORDS.map(normText).filter(function (w) { return w.length > 0; });
function textOk(t) { var n = normText(t); return !BAD_NORM.some(function (w) { return n.indexOf(w) >= 0; }); }
function noContact(t) {
  t = String(t || '');
  return !(/(https?:\/\/|www\.|\.(com|net|org|io|me|gg|tr|ru|link|app|ly|co|tv)\b)/i.test(t) || /([0-9][ .()-]?){7,}/.test(t) || /@[A-Za-z0-9_.]{3,}/.test(t));
}
function nickProblem(n, L) {
  n = String(n || '');
  if (n.length < 3) { return L('En az 3 karakter olmalı.', 'It must be at least 3 characters.'); }
  if (n.length > 16) { return L('En fazla 16 karakter olabilir.', 'It can be at most 16 characters.'); }
  if (/\s/.test(n)) { return L('Boşluk kullanma.', 'Do not use spaces.'); }
  if (!textOk(n)) { return L('Bu ad kullanılamaz. Başka bir ad seç.', 'This name is not allowed. Pick another one.'); }
  return '';
}

// ---------- Drill açıklamaları: nasıl yapılır ----------
var DESC = {
  form: ['Potanın 1–2 metre önünde dur. Sadece şut elinle, dirsek topun altında, bileği kırarak at. Top dönerek ve yüksek kavisle girsin.', 'Stand 1–2 metres from the rim. Shoot with your shooting hand only, elbow under the ball, and snap your wrist. The ball should spin and arc high.'],
  catch: ['İki köşe, iki kanat ve tepe olmak üzere 5 nokta seç. Topu kendine at ya da pas al, ayakların hazır şekilde yakala ve dribbling yapmadan hemen şut at.', 'Pick 5 spots: both corners, both wings and the top. Toss the ball to yourself or get a pass, catch with your feet ready and shoot right away without dribbling.'],
  pullup: ['Kanattan bir dribbling al, iki ayakla dengeli dur ve yukarı doğru şut at. Her iki yöne de çalış.', 'From the wing, take one dribble, stop balanced on both feet and rise straight up into the shot. Work both directions.'],
  hesi: ['Top sürerken bir an yavaşla, omuzlarını kaldırıp savunmayı dondur, sonra durup şut at.', 'While dribbling, slow down for a moment, lift your shoulders to freeze the defender, then stop and shoot.'],
  move: ['Bir noktadan diğerine koş, ayaklarını şut öncesi hızlıca ayarla ve yakaladığın gibi at. Maçtaki perdeden çıkış gibi düşün.', 'Run from one spot to another, set your feet quickly before the shot and shoot on the catch. Think of coming off a screen in a game.'],
  makes5: ['5 noktanın her birinden hedef isabet sayısına ulaşmadan diğer noktaya geçme. Kaçanları değil, girenleri say.', 'Do not move to the next of the 5 spots until you reach the target number of makes. Count makes, not attempts.'],
  ftp: ['Her serbest atıştan önce aynı rutini yap (örneğin 2 dribbling, nefes). Kaçırırsan kısa bir sprint at, sonra devam et.', 'Use the same routine before every free throw (for example 2 dribbles and a breath). If you miss, run a short sprint, then continue.'],
  pop: ['Hayali bir perde kurduktan sonra potadan uzaklaşarak dışarı açıl, yakala ve şut at.', 'After setting an imaginary screen, step away from the basket, catch and shoot.'],
  pound: ['Topu yerinde sert ve hızlı sür: diz, bel ve omuz yüksekliğinde. Gözlerin yukarıda, her iki elle de yap.', 'Dribble hard and fast in place at knee, waist and shoulder height. Keep your eyes up and use both hands.'],
  twoball: ['Her elde bir top, aynı anda ya da sırayla sür. Gözlerini yerden kaldır.', 'One ball in each hand, dribble them together or alternating. Keep your eyes off the floor.'],
  tennis: ['Bir elle basketbol topunu sürerken diğer elle tenis topunu havaya at ve yakala.', 'Dribble the basketball with one hand while tossing and catching a tennis ball with the other.'],
  pace: ['Saha boyunca yavaş başla, aniden hızlan, sonra tekrar yavaşla. Hız değişimiyle savunmacıyı geçmeyi öğrenirsin.', 'Go up the court slowly, burst into speed, then slow down again. Changing pace is how you beat a defender.'],
  zigzag: ['Konileri zikzak şeklinde diz. Her konide yön değiştir (crossover, bacak arası, arkadan) ve hızını koru.', 'Set cones in a zigzag. Change direction at each cone (crossover, between the legs, behind the back) and keep your speed.'],
  weak: ['Sadece zayıf elinle top sür: yerinde, yürürken ve koşarken. Zor gelmesi normal, gelişme buradan gelir.', 'Dribble only with your weak hand: in place, walking and running. It feels hard at first; that is where the progress comes from.'],
  retreat: ['İki-üç geri dribbling ile baskıdan uzaklaş, sonra tekrar ileri hücum et.', 'Take two or three dribbles backwards to escape pressure, then attack forward again.'],
  mikan: ['Potanın altında sağdan sağ elle, soldan sol elle sırayla turnike at. Top yere düşmeden yakalamaya çalış.', 'Under the basket, alternate layups: right hand on the right side, left hand on the left. Try to catch the ball before it hits the floor.'],
  rmikan: ['Mikan gibi ama ters turnike: sırtın potaya dönük, çemberin diğer tarafından bitir.', 'Like the Mikan drill but with reverse layups: back to the rim, finish on the other side of the hoop.'],
  floater: ['Boyalı alana girerken tek ayaktan kalk ve topu uzun bir adamın üstünden yumuşak, yüksek bir kavisle bırak.', 'Driving into the paint, take off from one foot and release the ball softly with a high arc, as if over a tall defender.'],
  euro: ['Bir yöne adım at, ikinci adımda ters yöne kayarak savunmacının yanından geç ve turnikeyle bitir.', 'Step one way, then step across in the other direction on your second step to get past the defender and finish.'],
  prohop: ['Hücumda iki ayakla aynı anda yere bas, dengeni topla ve yukarı güçlü bitir.', 'On the drive, land on both feet at the same time, gather your balance and finish strong upward.'],
  contact: ['Partnerin seni pedle ya da elle hafifçe iterken turnike at. Temasa rağmen dengeni koru.', 'Finish layups while your partner bumps you lightly with a pad or hand. Keep your balance through the contact.'],
  touch: ['Çemberin yakınından farklı açılardan yumuşak, düşük güçle şut at. Topun çemberde zıplayıp girmesini hedefle.', 'Shoot from close to the rim at different angles with a soft touch. Aim for the ball to bounce gently and drop in.'],
  pivot: ['Top elindeyken bir ayağını sabit tutup diğeriyle ileri ve geri dön. Gözlerin potada olsun.', 'With the ball, keep one foot planted and turn forward and backward with the other. Keep your eyes on the rim.'],
  jab: ['Topu tutarken bir adım öne doğru sahte at, savunmacının tepkisine göre şut at ya da geç.', 'Holding the ball, jab one foot forward as a fake and then shoot or drive depending on the defender\'s reaction.'],
  stepthru: ['Şut sahtesi yap, savunmacı zıplarsa yanından içeri adım atıp bitir.', 'Fake the shot; if the defender jumps, step through past them and finish.'],
  drop: ['Sırtın potaya dönükken, savunmacının bir tarafına geniş bir adım at ve potaya dönerek bitir.', 'With your back to the basket, drop one foot wide past the defender and turn to finish at the rim.'],
  upunder: ['Şut sahtesi yap, savunmacı kalkınca altından geçerek diğer taraftan bitir.', 'Fake the shot, and when the defender rises, go under and finish on the other side.'],
  first: ['Üçlü tehdit pozisyonundan tek, patlayıcı bir ilk adımla hücuma çık. Alçak kal ve omzunu öne ver.', 'From triple threat, burst out with one explosive first step. Stay low and lead with your shoulder.'],
  slide: ['Dizler bükük, ayaklar geniş, eller açık. Ayaklarını çaprazlamadan yana kay.', 'Knees bent, feet wide, hands active. Slide sideways without crossing your feet.'],
  closeout: ['Hızla şutöre koş, son metrelerde kısa adımlarla yavaşla, el yukarıda dur ve geçişi engelle.', 'Sprint toward the shooter, slow down with short steps at the end, keep a hand up and stop the drive.'],
  boxout: ['Şut atılınca rakibine dön, sırtını ona yasla, alçak dur ve topun düşeceği yeri kapat.', 'When the shot goes up, turn to your opponent, put your back into them, stay low and seal the rebound spot.'],
  taps: ['Topu panyaya karşı art arda, havadayken parmak uçlarınla vur. Zıplamaya devam et.', 'Tap the ball against the backboard again and again with your fingertips while in the air. Keep jumping.'],
  vertical: ['Eller tamamen yukarıda, dikey zıpla. Şutu bloklamaya çalışırken faul yapmamayı öğrenirsin.', 'Jump straight up with your arms fully raised. You learn to contest shots without fouling.'],
  wall: ['Duvara göğüs, sektirme ve tek el pası at. Topu yakalar yakalamaz tekrar at.', 'Throw chest, bounce and one-hand passes against a wall. Pass again as soon as you catch it.'],
  target: ['Duvara bir hedef çiz ya da yapıştır ve pasları o noktaya isabet ettir.', 'Draw or stick a target on a wall and hit that spot with your passes.'],
  pnr: ['Sandalye ya da koniyi perde gibi kullan. Perdeden çıkınca savunmayı oku: şut, pas ya da içeri.', 'Use a chair or cone as a screen. Coming off it, read the defense: shoot, pass or drive.'],
  oneone: ['Bir arkadaşınla bire bir oyna. Her hücumda farklı bir hareket dene.', 'Play one-on-one with a friend. Try a different move on each possession.'],
  rope: ['Ayak uçlarında, hafif ve ritmik atla. Ayak hızını ve kondisyonunu geliştirir.', 'Jump lightly and rhythmically on the balls of your feet. It builds foot speed and fitness.'],
  box: ['Sağlam bir kutu ya da basamağa iki ayakla zıpla, yumuşak in, aşağı yürüyerek in.', 'Jump with both feet onto a sturdy box or step, land softly and step back down.'],
  plank: ['Dirsekler omuz altında, vücut düz bir çizgi. Kalçanı düşürme. Yana plankta tek dirsek üstünde dur.', 'Elbows under shoulders, body in a straight line. Do not let your hips drop. For side plank, rest on one elbow.'],
  sprint: ['Saha boyunca tam hızla koş, yürüyerek dön. Her sprintte aynı hızı korumaya çalış.', 'Sprint the length of the court at full speed and walk back. Try to keep the same speed each time.'],
  balance: ['Tek ayak üstünde dur, diz hafif bükük. Zorlaştırmak için gözlerini kapat ya da top tut.', 'Stand on one leg with a slightly bent knee. To make it harder, close your eyes or hold a ball.'],
  beatpro: ['Hayali rakibe karşı: her isabet sana +1, her kaçan rakibe +2. 10 sayıya önce sen ulaş.', 'Against an imaginary opponent: each make is +1 for you, each miss is +2 for them. Reach 10 first.'],
  conemove: ['Koniyi savunmacı say. Önünde tek hamle yap (crossover, spin, hesitation) ve bitir.', 'Treat the cone as a defender. Make one move in front of it (crossover, spin, hesitation) and finish.'],
  power: ['İki ayakla güçlü sıçra, topu iki elle koru ve potaya sertçe bitir.', 'Jump powerfully off both feet, protect the ball with two hands and finish strong at the rim.'],
  shadow: ['Hayali bir hücumcunun önünde kay, geri çekil ve kapan. Savunma duruşunu bozma.', 'Slide, backpedal and close out in front of an imaginary attacker. Keep your defensive stance.'],
  wallbox: ['Topu duvara at, dönerken kutulama adımını at ve topu en yüksek noktada yakala.', 'Throw the ball off the wall, take a box-out step as you turn and catch it at its highest point.'],
  mirror: ['Partnerinle karşılıklı dur. O yön değiştirdikçe sen de aynı anda ayna gibi kay.', 'Face your partner. As they change direction, slide with them at the same time like a mirror.'],
  ppass: ['Partnerinle saha boyunca koşarken top yere değmeden pas alıp verin.', 'Run up the court with your partner, passing back and forth without the ball touching the floor.'],
  ftfatigue: ['İki sprint at, hemen ardından iki serbest atış kullan. Maç sonu yorgunluğunu taklit eder.', 'Run two sprints, then shoot two free throws right away. It copies late-game fatigue.'],
  seventeen: ['Sahanın eni boyunca yan çizgiden yan çizgiye 17 kez dokun. Süreye karşı yap, dinlen, tekrarla.', 'Touch sideline to sideline across the court 17 times. Race the clock, rest and repeat.']
};
function drillHow(id, en) { var d = DESC[id]; return d ? (en ? d[1] : d[0]) : ''; }

// ---------- Hatırlatma bildirimi ----------
var VAPID_PUBLIC = 'BF4-KfQxgZP272PDJLmzfprRypsft1Wj2w7yvsUAr4csdjl2MjUy7WeY2zSA_o-MtHECT7P8ltowvwLN5aERPy0';
function b64uToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) { s += '='; }
  var raw = atob(s), out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) { out[i] = raw.charCodeAt(i); }
  return out;
}
function pushSupport() {
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ok = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  return { ok: ok, iosNeedsInstall: ios && !standalone };
}
// Abone ol (ya da saati güncelle). Başarılıysa true.
function pushEnable(hour, lang) {
  return Notification.requestPermission().then(function (perm) {
    if (perm !== 'granted') { throw new Error('denied'); }
    return navigator.serviceWorker.ready;
  }).then(function (reg) {
    return reg.pushManager.getSubscription().then(function (sub) {
      return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(VAPID_PUBLIC) });
    });
  }).then(function (sub) {
    var j = sub.toJSON();
    var tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
    return sb().then(function (c) { return c.rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_tz: tz, p_hour: hour, p_lang: lang || 'tr' }); })
      .then(function (r) { if (r.error) { throw r.error; } return true; });
  });
}
function pushDisable() {
  return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
    if (!sub) { return true; }
    var ep = sub.endpoint;
    return sub.unsubscribe().catch(function () {}).then(function () { return sb(); })
      .then(function (c) { return c.rpc('push_unsubscribe', { p_endpoint: ep }); }).then(function () { return true; });
  });
}

// ---------- Klanlar ----------
function clanErr(e, L) {
  var m = String((e && (e.message || e.details)) || e || '');
  var map = {
    not_signed_in: L('Önce e-postanı bağla.', 'Connect your email first.'),
    no_profile: L('Profilin henüz kaydedilmedi. İnternetini kontrol edip tekrar dene.', 'Your profile is not saved yet. Check your internet and try again.'),
    in_clan: L('Zaten bir klandasın. Önce ondan ayrıl.', 'You are already in a clan. Leave it first.'),
    bad_length: L('Uzunluk uygun değil.', 'The length is not right.'),
    bad_word: L('Bu kelimeler kullanılamaz.', 'These words are not allowed.'),
    not_found: L('Bu koda ait bir klan yok. Kodu kontrol et.', 'No clan has this code. Check the code.'),
    full: L('Bu klan dolu (en fazla 30 kişi).', 'This clan is full (30 people at most).'),
    announce_only: L('Bu klanda şu an sadece yöneticiler yazabiliyor.', 'Right now only admins can write in this clan.'),
    contact: L('Link, telefon numarası ya da kullanıcı adı paylaşılamaz.', 'Links, phone numbers and usernames cannot be shared.'),
    too_fast: L('Biraz yavaş: birkaç saniye bekle.', 'Slow down: wait a few seconds.'),
    not_allowed: L('Bunu yapma yetkin yok.', 'You are not allowed to do this.'),
    not_member: L('Artık bu klanda değilsin.', 'You are no longer in this clan.')
  };
  for (var k in map) { if (m.indexOf(k) >= 0) { return map[k]; } }
  if (/fetch|network|Failed/i.test(m)) { return L('Sunucuya ulaşılamadı. İnternetini kontrol et.', 'Could not reach the server. Check your internet.'); }
  return L('Bir sorun oldu. Tekrar dene.', 'Something went wrong. Try again.');
}
// Klan bilgisini ve mesajları getirir; sonuçları bileşenin geçici durumuna yazar (kaydedilmez).
function clanRefresh(comp, withMsgs) {
  if (comp.clanBusy) { return Promise.resolve(); }
  comp.clanBusy = true;
  return sb().then(function (c) {
    return c.rpc('clan_info', { p_week: weekStr() }).then(function (r) {
      if (r.error) { throw r.error; }
      var info = r.data || null;
      var patch = { clan: info, clanLoaded: true, clanNetErr: false };
      if (!info) { patch.clanMsgs = []; clanUnsub(comp); comp.clanBusy = false; comp.setState(patch); return; }
      clanSub(comp, c);
      if (!withMsgs) { comp.clanBusy = false; comp.setState(patch); return; }
      return c.rpc('clan_messages_recent').then(function (m) {
        if (m.error) { throw m.error; }
        patch.clanMsgs = m.data || [];
        var last = patch.clanMsgs.length ? patch.clanMsgs[patch.clanMsgs.length - 1].id : 0;
        if (comp.state.tab === 'clan' && comp.state.clanView !== 'members') { patch.clanSeen = Math.max(comp.state.clanSeen || 0, last, info.last || 0); comp.scrollChat = true; }
        comp.clanBusy = false; comp.setState(patch);
      });
    });
  }).catch(function (e) { comp.clanBusy = false; console.warn('Green AI clan', e); comp.setState({ clanLoaded: true, clanNetErr: true }); });
}
function clanSub(comp, c) {
  if (comp.clanChan) { return; }
  try {
    comp.clanChan = c.channel('clan-msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clan_messages' }, function () {
      clanRefresh(comp, comp.state.tab === 'clan');
    }).subscribe();
  } catch (e) { comp.clanChan = null; }
}
function clanUnsub(comp) {
  if (!comp.clanChan) { return; }
  var ch = comp.clanChan; comp.clanChan = null;
  sb().then(function (c) { c.removeChannel(ch); }).catch(function () {});
}
function clanCall(comp, fn, args, L, after) {
  comp.setState({ clanBusyUi: true, clanErr: '' });
  return comp.pushNow().then(function () { return sb(); }).then(function (c) { return c.rpc(fn, args || {}); }).then(function (r) {
    if (r.error) { throw r.error; }
    comp.setState({ clanBusyUi: false });
    if (after) { after(r.data); }
    return clanRefresh(comp, true);
  }).catch(function (e) { comp.setState({ clanBusyUi: false, clanErr: clanErr(e, L) }); });
}
function msgTime(iso, lang) {
  var d = new Date(iso), now = new Date();
  var loc = { tr: 'tr-TR', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU', ar: 'ar', fa: 'fa-IR', rw: 'rw-RW' }[lang] || 'tr-TR';
  try {
    return d.toDateString() === now.toDateString() ? d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(loc, { day: 'numeric', month: 'short' });
  } catch (e) { return ''; }
}

// ---------- Uzun dönem ilerleme ----------
function weekStartOf(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); }
function longProgress(s, lang) {
  var weeks = [], now = new Date(), mon = weekStartOf(now);
  var sess = []; try { sess = JSON.parse(window.localStorage.getItem('greenai.sessions') || '[]'); } catch (e) {}
  for (var i = 7; i >= 0; i--) {
    var a = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() - 7 * i), b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7);
    var mins = 0;
    for (var k = 0; k < 7; k++) { var dk = dayStr(new Date(a.getFullYear(), a.getMonth(), a.getDate() + k)); mins += (s.hist && s.hist[dk]) || 0; }
    var att = 0, made = 0;
    sess.forEach(function (x) { if (x && x.date >= a.getTime() && x.date < b.getTime()) { att += x.att || 0; made += x.made || 0; } });
    var loc = { tr: 'tr-TR', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', ru: 'ru-RU', ar: 'ar', fa: 'fa-IR', rw: 'rw-RW' }[lang] || 'tr-TR';
    var lab = ''; try { lab = a.toLocaleDateString(loc, { day: 'numeric', month: 'numeric' }); } catch (e) { lab = (a.getDate()) + '/' + (a.getMonth() + 1); }
    weeks.push({ label: lab, mins: mins, att: att, pct: att ? Math.round(made / att * 100) : null });
  }
  return weeks;
}
