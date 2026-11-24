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
}
