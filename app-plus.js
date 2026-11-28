// Green AI ek paket 3: antrenman sayacı, set arası mola sayacı, "geri al", kişisel rekorlar, haftalık hedef.
// app-extra.js'den sonra, app-main.js'den önce yüklenir. app-main.js içindeki renderVals bunu gaPlus(...) ile çağırır.

// ---------- Antrenman sayacı ----------
function woElapsed(s) {
  if (s.woDay !== todayStr()) { return 0; }
  return Math.max(0, (s.woAcc || 0) + (s.woStart ? Date.now() - s.woStart : 0));
}
// Sayaçla 5 dakikadan uzun çalışıldıysa gerçek süre, yoksa planlanan süre kaydedilir
function woMinutes(s, planned) {
  var m = Math.round(woElapsed(s) / 60000);
  return m >= 5 ? Math.min(m, 240) : planned;
}
function fmtClock(ms) {
  var t = Math.floor(Math.max(0, ms) / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
}
var __plusTick = null;
function plusTicker(self, on) {
  if (on && !__plusTick) { __plusTick = setInterval(function () { self.setState({ now: Date.now() }); }, 1000); }
  if (!on && __plusTick) { clearInterval(__plusTick); __plusTick = null; }
}

// ---------- Geri al ----------
var UNDO_KEYS = ['woAcc', 'woStart', 'streak', 'lastDone', 'covered', 'restUsed', 'restDays', 'hist', 'wk', 'totalWorkouts', 'totalPoints', 'q', 'bestStreak'];
function undoSnap(s) {
  var u = { day: todayStr(), seen: s.sessionsSeen || 0 };
  UNDO_KEYS.forEach(function (k) { u[k] = s[k] === undefined ? null : JSON.parse(JSON.stringify(s[k])); });
  return u;
}

// ---------- Kişisel rekorlar ----------
function bestWeekMinutes(s) {
  var best = (s.wk && s.wk.minutes) || 0, by = {};
  Object.keys(s.hist || {}).forEach(function (d) { var w = weekOfDay(d); by[w] = (by[w] || 0) + (s.hist[d] || 0); });
  Object.keys(by).forEach(function (w) { if (by[w] > best) { best = by[w]; } });
  return best;
}

function gaPlus(self, s, out, c) {
  var L = c.L;
  var today = todayStr();

  // Sayaç
  var el = woElapsed(s), running = !!s.woStart && s.woDay === today;
  var restMs = s.restEnd ? s.restEnd - Date.now() : 0;
  if (s.restEnd && restMs <= 0) {
    setTimeout(function () {
      var r = self.state.restEnd;
      if (r && r <= Date.now()) {
        try { if (navigator.vibrate) { navigator.vibrate([250, 120, 250]); } } catch (e) {}
        self.setState({ restEnd: 0, restDone: true });
      }
    }, 0);
  }
  plusTicker(self, (c.tab === 'train' && running) || restMs > 0);
  out.p = {
    title: L('Antrenman sayacı', 'Workout timer'),
    clock: fmtClock(el),
    running: running, notRunning: !running, hasTime: el > 0,
    sub: running
      ? L('Süre işliyor. Bitirince "Antrenmanı tamamladım"a bas; gerçek süren kaydedilir.', 'The clock is running. When you finish, tap "I finished the workout" and your real time is saved.')
      : (el > 0 ? L('Duraklatıldı. Devam etmek için tekrar başlat.', 'Paused. Tap start again to continue.')
        : L('Başlatırsan süren tutulur; 5 dakikadan uzun antrenmanlarda tahmini süre yerine gerçek süren kaydedilir.', 'Start it to time your session; if you train longer than 5 minutes, your real time is saved instead of the estimate.')),
    startLbl: el > 0 ? L('Devam et', 'Resume') : L('Başlat', 'Start'),
    pauseLbl: L('Duraklat', 'Pause'), resetLbl: L('Sıfırla', 'Reset'),
    restTitle: L('Set arası mola', 'Rest between sets'),
    restActive: restMs > 0, restIdle: !(restMs > 0),
    restClock: fmtClock(restMs + 999),
    restDone: !!s.restDone && !(restMs > 0),
    restDoneText: L('Mola bitti, sıradaki sete geç!', 'Rest is over, start the next set!'),
    restCancel: L('İptal', 'Cancel'),
    rests: [30, 60, 90].map(function (n) {
      return { label: n + L(' sn', ' s'), aria: L(n + ' saniyelik mola başlat', 'Start a ' + n + '-second rest'), pick: function () { self.setState({ restEnd: Date.now() + n * 1000, restDone: false }); } };
    })
  };
  out.woStart = function () { var p = { woStart: Date.now(), woDay: today }; if (self.state.woDay !== today) { p.woAcc = 0; } self.setState(p); };
  out.woPause = function () { self.setState({ woAcc: woElapsed(self.state), woStart: 0 }); };
  out.woReset = function () { self.setState({ woAcc: 0, woStart: 0, woDay: today }); };
  out.restCancelFn = function () { self.setState({ restEnd: 0, restDone: false }); };

  // Geri al (sadece aynı gün, kamerayla doğrulanmamışsa)
  var u = s.undo;
  out.canUndo = !!(s.doneToday && !s.verifiedToday && u && u.day === today && (u.seen || 0) === (s.sessionsSeen || 0));
  out.undoLbl = L('Yanlışlıkla mı bastın? Geri al', 'Tapped by mistake? Undo');
  out.undoDone = function () {
    var cur = self.state, uu = cur.undo;
    if (!uu || uu.day !== todayStr() || !cur.doneToday || cur.verifiedToday || (uu.seen || 0) !== (cur.sessionsSeen || 0)) { return; }
    var p = { doneToday: false, undo: null };
    UNDO_KEYS.forEach(function (k) { p[k] = uu[k] === null ? undefined : uu[k]; });
    self.setState(p);
  };

  // Klan bilgisi internetten alınamadıysa "klan kur / katıl" yerine hata ve tekrar dene göster
  if (out.c2) {
    var netErr = !!s.clanNetErr && !s.clan && s.sbOk === true;
    out.c2.netErr = netErr;
    if (netErr) { out.c2.none = false; out.c2.loading = false; }
    out.c2.netErrText = L('Klan bilgisi alınamadı. İnternetini kontrol edip tekrar dene.', 'Could not load your clan. Check your internet and try again.');
    out.c2.retryLbl = L('Tekrar dene', 'Try again');
    out.clanRetry = function () { self.setState({ clanLoaded: false, clanNetErr: false }); setTimeout(function () { clanRefresh(self, true); }, 0); };
  }

  // Haftalık hedef
  var freq = c.freq || 0, wo = (s.wk && s.wk.workouts) || 0;
  out.goalMet = freq > 0 && wo >= freq;
  out.goalMetText = wo > freq
    ? L('Haftalık hedefini aştın: ' + wo + ' antrenman. Harika gidiyorsun!', 'You beat your weekly goal: ' + wo + ' workouts. Great job!')
    : L('Haftalık hedefine ulaştın! Bu haftaki ekstra antrenmanlar bonus.', 'You reached your weekly goal! Any extra workouts this week are a bonus.');

  // Kişisel rekorlar
  if ((s.streak || 0) > (s.bestStreak || 0)) {
    setTimeout(function () { var st = self.state; if ((st.streak || 0) > (st.bestStreak || 0)) { self.setState({ bestStreak: st.streak }); } }, 0);
  }
  var bestStreak = Math.max(s.bestStreak || 0, s.streak || 0);
  var ftBest = (s.ftHist || []).reduce(function (m, x) { return Math.max(m, x.n); }, s.ft === null || s.ft === undefined ? -1 : s.ft);
  var bw = bestWeekMinutes(s);
  out.recTitle = L('Rekorların', 'Your records');
  out.records = [
    { label: L('En uzun seri', 'Longest streak'), value: String(bestStreak), note: L('gün', 'days') },
    { label: L('En iyi serbest atış', 'Best free-throw test'), value: ftBest < 0 ? '–' : ftBest + ' / 10', note: ftBest < 0 ? L('test yapılmadı', 'no test yet') : L('10 atışta', 'out of 10') },
    { label: L('En çok çalışılan hafta', 'Biggest training week'), value: bw + L(' dk', ' min'), note: L('bir haftada', 'in one week') },
    { label: L('Toplam antrenman', 'Total workouts'), value: String(s.totalWorkouts || 0), note: L('başından beri', 'since you started') }
  ];

  // Gizlilik ve hesap silme (Profil sekmesi)
  var online = s.sbOk === true;
  out.dl = {
    title: L('Gizlilik ve hesabın', 'Privacy and your account'),
    privLink: L('Gizlilik sayfasını oku', 'Read the privacy page'),
    privNote: L('Hangi bilgilerin saklandığını ve kimlerin görebildiğini buradan okuyabilirsin.', 'See what is stored and who can see it.'),
    canDelete: online && !s.delStep,
    confirm: online && !!s.delStep,
    needLogin: !online && !!s.email,
    noAccount: !online && !s.email,
    deleteBtn: L('Hesabımı sil', 'Delete my account'),
    warnTitle: L('Hesabın kalıcı olarak silinsin mi?', 'Delete your account for good?'),
    warnBody: L('E-postan, takma adın, cevapların, ilerlemen, puanların, klan üyeliğin ve klan mesajların sunucudan silinir. Bu cihazdaki kayıt da temizlenir. Bu işlem geri alınamaz. Klanın kurucusuysan klan başka bir üyeye geçer.', 'Your email, nickname, answers, progress, points, clan membership and clan messages are deleted from the server. The data on this device is cleared too. This cannot be undone. If you founded a clan, it passes to another member.'),
    yesBtn: s.delBusy ? L('Siliniyor…', 'Deleting…') : L('Evet, kalıcı olarak sil', 'Yes, delete for good'),
    noBtn: L('Vazgeç', 'Cancel'),
    loginText: L('Hesabını silmek için önce e-postanla tekrar giriş yap.', 'To delete your account, sign in with your email again first.'),
    loginBtn: L('Giriş yap', 'Sign in'),
    noAccountText: L('Sunucuda hesabın yok; verilerin sadece bu cihazda. Hepsini silmek için yukarıdaki "Her şeyi sıfırla ve baştan başla" düğmesini kullan.', 'You have no account on the server; your data is only on this device. To delete it all, use "Reset everything and start over" above.'),
    err: s.delErr || ''
  };
  out.delAsk = function () { self.setState({ delStep: 1, delErr: '' }); };
  out.delCancel = function () { if (!self.state.delBusy) { self.setState({ delStep: 0, delErr: '' }); } };
  out.delConfirm = function () {
    if (self.state.delBusy) { return; }
    self.setState({ delBusy: true, delErr: '' });
    sb().then(function (cl) {
      return cl.rpc('delete_my_account').then(function (r) {
        if (r.error) { throw r.error; }
        try { if (typeof pushDisable === 'function') { pushDisable().catch(function () {}); } } catch (e) {}
        return cl.auth.signOut({ scope: 'local' }).catch(function () {});
      });
    }).then(function () {
      if (self.pushT) { clearTimeout(self.pushT); self.pushT = null; }
      self.lastSig = null;
      try { clanUnsub(self); } catch (e) {}
      try {
        var ls = window.localStorage, drop = [];
        for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k === STORE_KEY || /^greenai\./.test(k) || /^sb-.*-auth-token/.test(k)) { drop.push(k); } }
        drop.forEach(function (k) { ls.removeItem(k); });
      } catch (e) {}
      var fresh = self.freshState();
      fresh.lang = self.state.lang;
      qEnsure(fresh);
      self.setState(fresh);
      var t = document.getElementById('gaToast');
      if (t) {
        t.textContent = (window.__tx || String)(L('Hesabın ve tüm verilerin silindi.', 'Your account and all your data were deleted.'));
        t.style.background = '#1E2A20'; t.style.borderColor = '#7BD88F'; t.style.display = 'block';
        setTimeout(function () { t.style.display = 'none'; t.style.background = '#2A1A18'; t.style.borderColor = '#FF9B8A'; }, 6000);
      }
    }).catch(function (e) {
      console.warn('Green AI delete', e);
      self.setState({ delBusy: false, delErr: L('Hesap silinemedi. İnternetini kontrol edip tekrar dene.', 'Could not delete the account. Check your internet and try again.') });
    });
  };
}

// Bu paketin çevirileri: her satır [İngilizce, de, fr, ru, ar, fa, rw]. Dil dosyası yüklendikten sonra sözlüğe eklenir.
var GA_LP = ['de', 'fr', 'ru', 'ar', 'fa', 'rw'];
var GA_ROWS_P = [
  ["Privacy and your account", "Datenschutz und dein Konto", "Confidentialité et ton compte", "Конфиденциальность и твой аккаунт", "الخصوصية وحسابك", "حریم خصوصی و حساب تو", "Ibanga na konti yawe"],
  ["Read the privacy page", "Datenschutzseite lesen", "Lire la page de confidentialité", "Прочитать страницу о конфиденциальности", "اقرأ صفحة الخصوصية", "صفحهٔ حریم خصوصی را بخوان", "Soma paji y'ibanga"],
  ["See what is stored and who can see it.", "Sieh nach, was gespeichert wird und wer es sehen kann.", "Découvre ce qui est enregistré et qui peut le voir.", "Узнай, что хранится и кто это видит.", "اطّلع على ما يُحفَظ ومن يمكنه رؤيته.", "ببین چه چیزهایی ذخیره می‌شود و چه کسی می‌تواند آن‌ها را ببیند.", "Reba ibibikwa n'ababibona."],
  ["Delete my account", "Mein Konto löschen", "Supprimer mon compte", "Удалить мой аккаунт", "احذف حسابي", "حسابم را حذف کن", "Siba konti yanjye"],
  ["Delete your account for good?", "Konto endgültig löschen?", "Supprimer ton compte définitivement ?", "Удалить аккаунт навсегда?", "هل تريد حذف حسابك نهائيًا؟", "حسابت برای همیشه حذف شود؟", "Urashaka gusiba konti yawe burundu?"],
  ["Your email, nickname, answers, progress, points, clan membership and clan messages are deleted from the server. The data on this device is cleared too. This cannot be undone. If you founded a clan, it passes to another member.", "Deine E-Mail, dein Spitzname, deine Antworten, dein Fortschritt, deine Punkte, deine Clan-Mitgliedschaft und deine Clan-Nachrichten werden vom Server gelöscht. Auch die Daten auf diesem Gerät werden entfernt. Das kann nicht rückgängig gemacht werden. Wenn du einen Clan gegründet hast, geht er an ein anderes Mitglied.", "Ton e-mail, ton pseudo, tes réponses, ta progression, tes points, ton appartenance au clan et tes messages de clan sont supprimés du serveur. Les données sur cet appareil sont aussi effacées. C'est irréversible. Si tu as fondé un clan, il passe à un autre membre.", "Твоя почта, ник, ответы, прогресс, очки, членство в клане и сообщения в клане удаляются с сервера. Данные на этом устройстве тоже стираются. Это нельзя отменить. Если ты основал клан, он перейдёт другому участнику.", "يُحذف من الخادم بريدك الإلكتروني واسمك المستعار وإجاباتك وتقدّمك ونقاطك وعضويتك في العشيرة ورسائلك فيها. وتُمسح البيانات على هذا الجهاز أيضًا. لا يمكن التراجع عن ذلك. إذا كنت مؤسس عشيرة فستنتقل إلى عضو آخر.", "ایمیل، نام مستعار، پاسخ‌ها، پیشرفت، امتیازها، عضویت در کلن و پیام‌های کلنت از سرور حذف می‌شود. داده‌های این دستگاه هم پاک می‌شود. این کار برگشت‌پذیر نیست. اگر بنیان‌گذار کلن باشی، کلن به عضو دیگری می‌رسد.", "Imeyili yawe, izina ry'irihimbano, ibisubizo, aho ugeze, amanota, kuba umunyamuryango w'itsinda n'ubutumwa bwawe mu itsinda bisibwa kuri seriveri. Ibiri kuri iki gikoresho na byo birasibwa. Ntibishobora gusubizwa. Niba ari wowe washinze itsinda, rihabwa undi munyamuryango."],
  ["Deleting…", "Wird gelöscht…", "Suppression…", "Удаление…", "جارٍ الحذف…", "در حال حذف…", "Birasibwa…"],
  ["Yes, delete for good", "Ja, endgültig löschen", "Oui, supprimer définitivement", "Да, удалить навсегда", "نعم، احذف نهائيًا", "بله، برای همیشه حذف کن", "Yego, siba burundu"],
  ["To delete your account, sign in with your email again first.", "Um dein Konto zu löschen, melde dich zuerst wieder mit deiner E-Mail an.", "Pour supprimer ton compte, reconnecte-toi d'abord avec ton e-mail.", "Чтобы удалить аккаунт, сначала снова войди по почте.", "لحذف حسابك، سجّل الدخول ببريدك الإلكتروني مجددًا أولًا.", "برای حذف حساب، اول دوباره با ایمیلت وارد شو.", "Kugira ngo usibe konti yawe, banza wongere winjire ukoresheje imeyili yawe."],
  ["You have no account on the server; your data is only on this device. To delete it all, use \"Reset everything and start over\" above.", "Du hast kein Konto auf dem Server; deine Daten sind nur auf diesem Gerät. Um alles zu löschen, nutze oben „Alles zurücksetzen und neu anfangen“.", "Tu n'as pas de compte sur le serveur ; tes données sont seulement sur cet appareil. Pour tout supprimer, utilise « Tout réinitialiser et recommencer » plus haut.", "У тебя нет аккаунта на сервере; данные хранятся только на этом устройстве. Чтобы удалить всё, нажми выше «Сбросить всё и начать заново».", "ليس لديك حساب على الخادم؛ بياناتك موجودة على هذا الجهاز فقط. لحذفها كلها، استخدم «أعد ضبط كل شيء وابدأ من جديد» في الأعلى.", "در سرور حسابی نداری؛ داده‌هایت فقط روی این دستگاه است. برای پاک کردن همه، از «همه‌چیز را پاک کن و از نو شروع کن» در بالا استفاده کن.", "Nta konti ufite kuri seriveri; amakuru yawe ari kuri iki gikoresho gusa. Kugira ngo uyasibe yose, koresha \"Siba byose utangire bushya\" hejuru."],
  ["Could not delete the account. Check your internet and try again.", "Konto konnte nicht gelöscht werden. Prüfe dein Internet und versuch es erneut.", "Impossible de supprimer le compte. Vérifie ta connexion et réessaie.", "Не удалось удалить аккаунт. Проверь интернет и попробуй снова.", "تعذّر حذف الحساب. تحقّق من الإنترنت وحاول مجددًا.", "حساب حذف نشد. اینترنتت را بررسی کن و دوباره امتحان کن.", "Ntitwabashije gusiba konti. Reba interineti wongere ugerageze."],
  ["Your account and all your data were deleted.", "Dein Konto und alle deine Daten wurden gelöscht.", "Ton compte et toutes tes données ont été supprimés.", "Твой аккаунт и все данные удалены.", "تم حذف حسابك وكل بياناتك.", "حساب و همهٔ داده‌هایت حذف شد.", "Konti yawe n'amakuru yawe yose byasibwe."],
  ["Privacy page", "Datenschutz", "Confidentialité", "Конфиденциальность", "صفحة الخصوصية", "صفحهٔ حریم خصوصی", "Paji y'ibanga"]
];
function plusI18n(lang) {
  var i = GA_LP.indexOf(lang), D = window.GA_I18N && window.GA_I18N[lang];
  if (i < 0 || !D || D['\u0000plus']) { return; }
  GA_ROWS_P.forEach(function (r) { if (r[i + 1] != null) { D[r[0]] = r[i + 1]; } });
  D['\u0000plus'] = true;
}

// Giriş ekranındaki "Gizlilik sayfası" bağlantısı: app-main.js'e dokunmadan giriş ekranına yazı ekler
(function hookAuth() {
  if (typeof Component === 'undefined' || typeof __comp === 'undefined' || !__comp) { setTimeout(hookAuth, 0); return; }
  if (Component.prototype.__plusAuth) { return; }
  var orig = Component.prototype.renderVals;
  Component.prototype.renderVals = function () {
    var out = orig.apply(this, arguments);
    try { plusI18n(this.state.lang); } catch (e) {}
    if (out && out.au) { out.au.privacy = this.state.lang === 'tr' ? 'Gizlilik sayfası' : 'Privacy page'; }
    return out;
  };
  Component.prototype.__plusAuth = true;
  __comp.setState({});
})();
