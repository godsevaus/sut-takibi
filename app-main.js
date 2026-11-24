class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.timer = null;
    this.storeOk = false;
    var st = this.freshState();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      this.storeOk = true;
      if (raw) {
        var saved = JSON.parse(raw);
        KEEP.forEach(function (k) { if (saved && saved[k] !== undefined) { st[k] = saved[k]; } });
      }
    } catch (err) { this.storeOk = false; }
    dayRoll(st);
    qEnsure(st);
    applySessions(st);
    qRoll(st);
    if (st.onboarded) { st.screen = this.steps('tr', {}).length + 4; }
    this.state = st;
    // Görev seçimi ve dönem bilgisi hemen kaydedilsin: sayfa hiç dokunulmadan kapansa bile aynı gün aynı görevler gelir
    this.componentDidUpdate();
    this.sbBoot();
    // Kalan süre her yarım dakikada güncellenir; süre dolunca görevler yenilenir. Uygulamaya geri dönünce de kontrol edilir.
    var self = this;
    this.qTimer = setInterval(function () { self.tick(); }, 30000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { self.tick(); } });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { self.tick(); } });
    window.addEventListener('storage', function (e) { if (e.key === 'greenai.sessions') { self.tick(); } });
    // Klan: sohbet açıkken 8 sn'de bir, değilse 40 sn'de bir yeni mesaj kontrolü (anlık bildirim de ayrıca dinlenir)
    this.clanN = 0;
    this.clanTimer = setInterval(function () {
      var st = self.state;
      if (!st.authed || st.sbOk !== true || !st.onboarded || document.visibilityState === 'hidden') { return; }
      self.clanN++;
      var chat = st.tab === 'clan' && st.clanView !== 'members';
      if (chat || self.clanN % 5 === 0) { clanRefresh(self, st.tab === 'clan'); }
    }, 8000);
  }

  tick() {
    var s = this.state;
    if (!s.onboarded || document.visibilityState === 'hidden') { return; }
    var st = JSON.parse(JSON.stringify(s));
    var before = JSON.stringify(st);
    dayRoll(st); qEnsure(st); applySessions(st); qRoll(st);
    if (JSON.stringify(st) !== before) { this.setState(st); } else { this.setState({ now: Date.now() }); }
  }

  freshState() {
    return {
      screen: 0, answers: {}, height: 165, weight: 55, lang: 'tr', langOpen: false,
      progress: 0, factIndex: 0, nickPage: 0, onboarded: false, planMode: 'general',
      tab: 'home', day: todayStr(), doneToday: false, challenge: 0, added: {}, ft: null, scope: 'group', libCat: 'all',
      streak: 0, lastDone: '', week: weekStr(), wk: emptyWeek(),
      totalWorkouts: 0, totalChallenges: 0, totalPoints: 0, reminder: false, partner: false, sessionsSeen: 0, shotAtt: 0, shotMade: 0, verifiedToday: false,
      totalQuests: 0, totalQM: 0, q: null, qTab: 'd', qNote: '',
      authed: false, email: '', emailDraft: '', codeDraft: '', authStep: 'email', demoCode: '', authErr: '', authInfo: '', authBusy: false,
      serverNick: null, sbOk: null, lb: null
    };
  }

  componentDidUpdate() {
    if (this.scrollChat) {
      this.scrollChat = false;
      var cl = document.getElementById('chatlist');
      if (cl) { cl.scrollTop = cl.scrollHeight; }
    }
    if (!this.storeOk) { return; }
    try {
      var out = {};
      var s = this.state;
      KEEP.forEach(function (k) { out[k] = s[k]; });
      window.localStorage.setItem(STORE_KEY, JSON.stringify(out));
    } catch (err) { this.storeOk = false; }
    this.schedulePush();
  }

  // ---- Supabase senkronu ----
  sbBoot() {
    var self = this;
    sb().then(function (c) { return c.auth.getSession(); }).then(function (r) {
      var ok = !!(r && r.data && r.data.session);
      self.setState({ sbOk: ok });
      if (ok) { clanRefresh(self, false); }
    }).catch(function () {});
  }

  schedulePush() {
    var s = this.state;
    if (!s || !s.authed || !s.onboarded || s.sbOk === false) { return; }
    var self = this;
    if (this.pushT) { clearTimeout(this.pushT); }
    this.pushT = setTimeout(function () { self.pushT = null; self.pushNow(); }, 2500);
  }

  pushNow() {
    var self = this;
    var s = this.state;
    if (!s.authed || !s.onboarded) { return Promise.resolve(); }
    return sb().then(function (c) {
      return c.auth.getSession().then(function (r) {
        var ses = r && r.data && r.data.session;
        if (!ses) { if (self.state.sbOk !== false) { self.setState({ sbOk: false }); } return null; }
        var s2 = self.state;
        var ans = s2.answers || {};
        var base = typeof ans.nick === 'string' ? ans.nick : '';
        var sn = s2.serverNick;
        var nick = (sn && sn.for === base && sn.name) ? sn.name : cleanNick(base);
        var wk = s2.wk || emptyWeek();
        var st = {};
        KEEP.forEach(function (k) { if (k !== 'authed' && k !== 'email' && k !== 'serverNick') { st[k] = s2[k]; } });
        var uid = ses.user.id;
        var prof = { id: uid, nickname: nick, answers: ans, lang: s2.lang || 'tr', gender: sbGender(ans), league: sbLeague(ans), plan_mode: s2.planMode || 'general' };
        var prog = { user_id: uid, state: st, streak: s2.streak || 0, total_points: s2.totalPoints || 0 };
        var row = {
          user_id: uid, week_start: s2.week || weekStr(), league: sbLeague(ans), gender: sbGender(ans),
          pts_core: Math.max(0, Math.min(630, (wk.ptsW || 0) + (wk.ptsS || 0) + (wk.ptsC || 0))),
          pts_quest: Math.max(0, Math.min(980, wk.ptsQ || 0)),
          workouts: Math.max(0, Math.min(7, wk.workouts || 0)), streak: s2.streak || 0
        };
        var sig = JSON.stringify([prof, prog, row]);
        if (sig === self.lastSig) { return null; }
        var now = new Date().toISOString();
        prof.updated_at = now; prog.updated_at = now; row.updated_at = now;
        return c.from('profiles').upsert(prof).then(function (r1) {
          if (r1.error && r1.error.code === '23514') {
            prof.nickname = 'Oyuncu' + Math.floor(1000 + Math.random() * 9000);
            return c.from('profiles').upsert(prof);
          }
          if (r1.error && r1.error.code === '23505') {
            prof.nickname = cleanNick(base).slice(0, 12) + Math.floor(1000 + Math.random() * 9000);
            return c.from('profiles').upsert(prof);
          }
          return r1;
        }).then(function (r1) {
          if (r1.error) { throw r1.error; }
          return Promise.all([c.from('progress').upsert(prog), c.from('weekly_scores').upsert(row)]);
        }).then(function (rs) {
          rs.forEach(function (x) { if (x.error) { throw x.error; } });
          self.lastSig = sig;
          var up = { sbOk: true };
          if (!sn || sn.for !== base || sn.name !== prof.nickname) { up.serverNick = { for: base, name: prof.nickname }; }
          if (self.state.sbOk !== true || up.serverNick) { self.setState(up); }
          return true;
        });
      });
    }).catch(function (e) { console.warn('Green AI sync', e); return null; });
  }

  // Girişten sonra: sunucuda daha ileri bir kayıt varsa (ör. yeni telefon) onu geri yükle, sonra gönder
  afterLogin() {
    var self = this;
    return sb().then(function (c) {
      return c.auth.getSession().then(function (r) {
        var ses = r && r.data && r.data.session;
        if (!ses) { return null; }
        return c.from('progress').select('state,total_points').eq('user_id', ses.user.id).maybeSingle().then(function (res) {
          var row = res && res.data;
          var s = self.state;
          if (row && row.state && row.state.onboarded && (!s.onboarded || (row.total_points || 0) > (s.totalPoints || 0))) {
            var st = JSON.parse(JSON.stringify(s));
            KEEP.forEach(function (k) { if (k !== 'authed' && k !== 'email' && k !== 'serverNick' && row.state[k] !== undefined) { st[k] = row.state[k]; } });
            dayRoll(st); qEnsure(st); applySessions(st); qRoll(st);
            st.screen = self.steps('tr', {}).length + 4;
            st.tab = 'home';
            self.setState(st);
          }
          self.lastSig = null;
          return self.pushNow().then(function () { clanRefresh(self, false); });
        });
      });
    }).catch(function (e) { console.warn('Green AI restore', e); });
  }

  loadLb(key, scope, league, gender) {
    var self = this;
    if (this.lbBusy) { return; }
    this.lbBusy = true;
    var done = function (lb) { self.lbBusy = false; self.setState({ lb: lb }); };
    this.pushNow().then(function () { return sb(); }).then(function (c) {
      return c.rpc('leaderboard', { p_week: weekStr(), p_league: scope === 'group' ? league : null, p_gender: scope === 'group' ? (gender || null) : null, p_limit: 50 });
    }).then(function (r) {
      if (r.error) { throw r.error; }
      done({ key: key, at: Date.now(), rows: r.data || [], err: false });
    }).catch(function (e) { console.warn('Green AI leaderboard', e); done({ key: key, at: Date.now(), rows: [], err: true }); });
  }

  componentWillUnmount() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.qTimer) { clearInterval(this.qTimer); this.qTimer = null; }
  }

  facts(lang) {
    var tr = [
      'İlk basketbol maçı 1891\'de bir futbol topuyla oynandı.',
      'İlk potalar şeftali sepetiydi ve dipleri kapalıydı. Her sayıdan sonra top elle çıkarılırdı.',
      'İlk kurallarda top sürmek yoktu. Oyuncu topu tuttuğu yerden pas vermek zorundaydı.',
      'Tarihteki ilk basketbol maçı 1–0 bitti.',
      'Çember 3,05 metrede, çünkü ilk sepet salonun balkon korkuluğuna çakılmıştı. Yükseklik hiç değişmedi.',
      'Panya, balkondaki seyirciler topa müdahale etmesin diye eklendi.',
      'Basketbol topları 1950\'lerin sonuna kadar kahverengiydi. Turuncu, daha iyi görünsün diye seçildi.',
      'Smaç, ABD kolej basketbolunda 1967\'den 1976\'ya kadar yasaktı.',
      '1936 Olimpiyat finali açık havada, yağmur altında oynandı ve 19–8 bitti.',
      '24 saniye kuralı 1954\'te geldi. Öncesinde takımlar topu dakikalarca saklayabiliyordu.'
    ];
    var en = [
      'The first basketball game, in 1891, was played with a soccer ball.',
      'The first hoops were peach baskets with closed bottoms. The ball was taken out by hand after every score.',
      'The original rules had no dribbling. A player had to pass from the spot where they caught the ball.',
      'The first basketball game ever played ended 1–0.',
      'The rim is at 10 feet because the first basket was nailed to a gym balcony rail. The height never changed.',
      'Backboards were added to stop fans in the balcony from touching the ball.',
      'Basketballs were brown until the late 1950s. Orange was chosen so the ball was easier to see.',
      'Dunking was banned in US college basketball from 1967 to 1976.',
      'The 1936 Olympic final was played outdoors in the rain and ended 19–8.',
      'The 24-second shot clock arrived in 1954. Before that, teams could hold the ball for minutes.'
    ];
    return lang === 'tr' ? tr : en;
  }

  startLoading(nextScreen) {
    var self = this;
    if (this.timer) { clearInterval(this.timer); }
    var count = this.facts('tr').length;
    this.setState({ screen: nextScreen - 1, progress: 0, factIndex: Math.floor(Math.random() * count), langOpen: false, tab: 'home' });
    this.timer = setInterval(function () {
      var p = self.state.progress + 1;
      if (p >= 100) {
        clearInterval(self.timer);
        self.timer = null;
        self.setState({ progress: 100, screen: nextScreen });
        return;
      }
      var patch = { progress: p };
      if (p === 34 || p === 67) { patch.factIndex = (self.state.factIndex + 1) % count; }
      self.setState(patch);
    }, 90);
  }

  dict(lang) {
    var tr = {
      langLabel: 'Dil seç', welcomeTitle: 'Önce seni tanıyalım.',
      welcomeBody: 'Bu soruları sadece bir kez soracağım. Neredeyse hiç yazmayacaksın, sadece seçeceksin. Cevaplarına göre planın sana özel kurulacak.',
      start: 'Başlayalım', duration: 'Yaklaşık 1 dakika sürer', back: 'Geri', decrease: 'Azalt', increase: 'Artır',
      quickHint: 'Hızlı seç, sonra artı ve eksiyle ince ayar yap', skip: 'Belirtmek istemiyorum',
      next: 'Devam', finish: 'Bitir', step: 'Adım', sumTitle: 'Seni tanıdım.',
      sumTop: 'Hedefin en tepe. Planını bu bilgilere göre kuruyorum, ilk adım küçük ama her gün.',
      sumDefault: 'Planını bu bilgilere göre kuruyorum. İstediğin zaman güncelleyebilirsin.',
      createPlan: 'Planımı oluştur', editAnswers: 'Cevaplarımı düzenle', notGiven: 'Belirtilmedi', days: 'gün',
      lNick: 'Takma ad', moreNicks: 'Başka öner', nickOwn: 'Ya da kendin yaz', nickNote: 'En az 3, en fazla 16 karakter. Gerçek adını kullanma. Sonradan değiştirebilirsin.',
      loadTitle: 'Planın hazırlanıyor', load1: 'Profilin işleniyor', load2: 'Tarzına yakın oyuncu aranıyor', load3: 'Çalışmaların seçiliyor', factLabel: 'Bunu biliyor muydun?',
      lAge: 'Yaş', lGender: 'Cinsiyet', lHeight: 'Boy', lWeight: 'Kilo', lHand: 'Şut eli', lPosition: 'Pozisyon', lStyle: 'Oyun tarzı', lLevel: 'Seviye', lLeague: 'Lig', lGoal: 'Hedef', lFreq: 'Haftalık çalışma'
    };
    var en = {
      langLabel: 'Choose language', welcomeTitle: 'First, let me get to know you.',
      welcomeBody: 'I will only ask these questions once. Almost no typing, just pick. Your plan is built around your answers.',
      start: "Let's start", duration: 'Takes about 1 minute', back: 'Back', decrease: 'Decrease', increase: 'Increase',
      quickHint: 'Pick a quick value, then fine-tune with plus and minus', skip: 'Prefer not to say',
      next: 'Continue', finish: 'Finish', step: 'Step', sumTitle: 'Now I know you.',
      sumTop: 'Your goal is the very top. I am building your plan from these answers: small steps, every day.',
      sumDefault: 'I am building your plan from these answers. You can update them any time.',
      createPlan: 'Create my plan', editAnswers: 'Edit my answers', notGiven: 'Not given', days: 'days',
      lNick: 'Nickname', moreNicks: 'Suggest others', nickOwn: 'Or type your own', nickNote: '3 to 16 characters. Do not use your real name. You can change it later.',
      loadTitle: 'Building your plan', load1: 'Reading your profile', load2: 'Finding the player closest to your style', load3: 'Picking your drills', factLabel: 'Did you know?',
      lAge: 'Age', lGender: 'Gender', lHeight: 'Height', lWeight: 'Weight', lHand: 'Shooting hand', lPosition: 'Position', lStyle: 'Play style', lLevel: 'Level', lLeague: 'League', lGoal: 'Goal', lFreq: 'Weekly training'
    };
    return lang === 'tr' ? tr : en;
  }

  steps(lang, ans) {
    var en = lang !== 'tr';
    function o(id, trL, enL, trD, enD) { return { id: id, label: en ? enL : trL, desc: en ? (enD || '') : (trD || '') }; }
    function plain(list) { return list.map(function (v) { return { id: v, label: v, desc: '' }; }); }
    var set = STYLE_SETS[(ans && ans.position) || 'any'] || STYLE_SETS.any;
    var styleOptions = set.map(function (id) { var x = STYLES[id]; return { id: id, label: en ? x.en : x.tr, desc: en ? x.den : x.dtr, icon: x.icon }; });
    return [
      { key: 'age', type: 'grid',
        title: en ? 'How old are you?' : 'Kaç yaşındasın?',
        subtitle: en ? 'I set the difficulty and load of your drills by age.' : 'Çalışmaların zorluğunu ve yükünü yaşına göre ayarlıyorum.',
        options: plain(['8','9','10','11','12','13','14','15','16','17','18','19–22','23–29','30+']) },
      { key: 'gender', type: 'list',
        title: en ? 'Are you a girl or a boy?' : 'Kız mısın, erkek mi?',
        subtitle: en ? 'Optional. It lets you compete in your own group and shows you players you can relate to.' : 'İsteğe bağlı. Sıralamada kendi grubunla yarışman ve sana yakın oyuncu örnekleri için.',
        options: [
          o('female', 'Kız', 'Girl', 'Sana hem WNBA hem NBA oyuncu örnekleri gösteririm', 'I will show you both WNBA and NBA player examples'),
          o('male', 'Erkek', 'Boy', '', ''),
          o('unspecified', 'Belirtmek istemiyorum', 'Prefer not to say', 'Sorun değil, her şey aynı çalışır', 'No problem, everything works the same')
        ] },
      { key: 'height', type: 'stepper', unit: 'cm', min: 120, max: 225, quick: [140, 150, 160, 170, 180, 190, 200, 210],
        title: en ? 'How tall are you?' : 'Boyun kaç?',
        subtitle: en ? 'I use it for your shot references and position tips.' : 'Şut açını ve pozisyon önerilerini buna göre hesaplıyorum.' },
      { key: 'weight', type: 'stepper', unit: 'kg', min: 25, max: 150, quick: [40, 50, 60, 70, 80, 90, 100, 110], skippable: true,
        title: en ? 'What is your weight?' : 'Kilon kaç?',
        subtitle: en ? 'Only used to set training load. You can skip this step.' : 'Sadece antrenman yükünü ayarlamak için. İstersen bu adımı geçebilirsin.' },
      { key: 'hand', type: 'list',
        title: en ? 'Which hand do you shoot with?' : 'Hangi elinle şut atıyorsun?',
        subtitle: en ? 'Every drill and video analysis is shown for this hand.' : 'Tüm çalışmaları ve video analizini bu ele göre gösteriyorum.',
        options: [
          o('right', 'Sağ el', 'Right hand', 'Şutu sağ elimle atıyorum', 'I shoot with my right hand'),
          o('left', 'Sol el', 'Left hand', 'Şutu sol elimle atıyorum', 'I shoot with my left hand'),
          o('unsure', 'Emin değilim', 'Not sure', 'İlk videoda birlikte bulalım', 'We will find out in your first video')
        ] },
      { key: 'position', type: 'list',
        title: en ? 'Where do you play?' : 'Sahada neredesin?',
        subtitle: en ? 'I put the skills you need most first.' : 'Sana en çok lazım olan becerileri öne alıyorum.',
        options: [
          o('pg', 'Oyun kurucu', 'Point guard', 'Topu ben taşıyorum, oyunu ben kuruyorum', 'I bring the ball up and run the offense'),
          o('sg', 'Şutör gard', 'Shooting guard', 'Dışarıdan sayı üretiyorum', 'I score from the outside'),
          o('sf', 'Kısa forvet', 'Small forward', 'Hem içeride hem dışarıda oynuyorum', 'I play inside and outside'),
          o('pf', 'Uzun forvet', 'Power forward', 'Pota çevresi ve orta mesafe', 'Around the rim and mid-range'),
          o('c', 'Pivot', 'Center', 'Pota dibi, ribaund ve perde', 'Paint, rebounds and screens'),
          o('any', 'Henüz belli değil', 'Not set yet', 'Her pozisyonda oynuyorum ya da yeni başladım', 'I play everywhere or I just started')
        ] },
      { key: 'style', type: 'style',
        title: en ? 'How do you want to play?' : 'Nasıl bir oyuncu olmak istiyorsun?',
        subtitle: en ? 'Pick the style closest to the player you want to become. I chose these five for your position.' : 'Olmak istediğin oyuncuya en yakın tarzı seç. Bu beşini pozisyonuna göre çıkardım.',
        options: styleOptions },
      { key: 'level', type: 'list',
        title: en ? 'What level do you play at now?' : 'Şu an hangi seviyede oynuyorsun?',
        subtitle: en ? 'Pick the closest one. This sets your starting point.' : 'Sana en yakın olanı seç. Başlangıç noktanı buradan belirliyorum.',
        options: [
          o('new', 'Yeni başlıyorum', 'Just starting', 'Kuralları ve temelleri öğreniyorum', 'Learning the rules and basics'),
          o('friends', 'Arkadaşlarla oynuyorum', 'Playing with friends', 'Sokak sahası ya da okul bahçesi, takımım yok', 'Street court or schoolyard, no team'),
          o('school', 'Okul takımı', 'School team', 'Okulumun takımında oynuyorum', 'I play for my school'),
          o('club', 'Kulüp altyapısı', 'Club youth team', 'Lisanslı oyuncuyum, yaş grubu liginde oynuyorum', 'Licensed player in an age-group league'),
          o('select', 'Bölge ya da ülke karması', 'Regional or national selection', 'Karma takıma ya da milli takım altyapısına seçildim', 'Picked for a select or national youth team'),
          o('amateur', 'Üniversite ya da amatör lig', 'College or amateur league', 'Yetişkin seviyesinde düzenli maç oynuyorum', 'Regular games at adult level'),
          o('semi', 'Yarı profesyonel', 'Semi-pro', 'Büyükler liginde oynuyorum', 'I play in a senior league'),
          o('pro', 'Profesyonel', 'Professional', 'Basketbol benim işim', 'Basketball is my job')
        ] },
      { key: 'league', type: 'list',
        title: en ? 'Which league do you play in?' : 'Hangi ligde oynuyorsun?',
        subtitle: en ? 'I match the tempo of your drills to your opponents.' : 'Çalışmaların temposunu rakiplerine göre ayarlıyorum.',
        options: [
          o('U14', 'U14', 'U14', '14 yaş altı ligi', 'Under-14 league'),
          o('U16', 'U16', 'U16', '16 yaş altı ligi', 'Under-16 league'),
          o('U18', 'U18', 'U18', '18 yaş altı ligi', 'Under-18 league'),
          o('none', 'Ligde oynamıyorum', 'I do not play in a league', 'Şimdilik lig maçım yok', 'No league games for now')
        ] },
      { key: 'goal', type: 'list',
        title: en ? 'Where do you want to get to?' : 'Nereye ulaşmak istiyorsun?',
        subtitle: en ? 'Your plan is built for this goal. You can change it later.' : 'Planın bu hedefe göre kurulacak. Sonra değiştirebilirsin.',
        options: [
          o('top', 'En tepe: profesyonel olmak', 'The very top: go pro', 'Basketbolu en üst seviyede oynamak istiyorum', 'I want to play at the highest level'),
          o('national', 'Milli takım', 'National team', 'Ülkemin formasını giymek istiyorum', "I want to wear my country's jersey"),
          o('scholar', 'Yurt dışında burs', 'Scholarship abroad', 'Kolej ya da üniversitede basketbol bursu', 'A basketball scholarship at a school or college'),
          o('starter', 'Takımımda ilk beş', 'Starting five', 'Daha fazla süre almak istiyorum', 'I want more minutes'),
          o('tryout', 'Bir üst takıma seçilmek', 'Make the next team', 'Seçmelere ya da üst yaş grubuna hazırlanıyorum', 'Getting ready for tryouts or the next age group'),
          o('skill', 'Belirli bir beceri', 'One specific skill', 'Şut, top sürme ya da bitiriş gibi tek bir alan', 'One area such as shooting, handles or finishing'),
          o('fun', 'Keyif ve form', 'Fun and fitness', 'Daha iyi oynamak ve formda kalmak', 'Play better and stay in shape')
        ] },
      { key: 'freq', type: 'grid',
        title: en ? 'How many days a week can you train?' : 'Haftada kaç gün çalışabilirsin?',
        subtitle: en ? 'Days you can train on your own, outside team practice.' : 'Takım antrenmanlarının dışında, kendi başına ayırabileceğin günler.',
        options: plain(['1', '2', '3', '4', '5', '6', '7']) },
      { key: 'nick', type: 'nick',
        title: en ? 'Pick your nickname' : 'Takma adını seç',
        subtitle: en ? 'If you join the leaderboard, this is the name others see. Your real name is never shown.' : 'Sıralamaya girersen bu adla görünürsün. Gerçek adın kimseye gösterilmez.' }
    ];
  }

  reaction(lang, key, v, label) {
    if (v === undefined || v === null) { return ''; }
    var en = lang !== 'tr';
    function r(trS, enS) { return en ? enS : trS; }
    if (key === 'age') {
      var n = parseInt(v, 10);
      if (n <= 12) { return r('Bu yaşta öncelik sağlam temel ve keyif. Öyle başlıyoruz.', 'At this age, solid basics and fun come first. That is where we start.'); }
      if (n <= 15) { return r(v + ' yaş, tekniği oturtmak için çok iyi bir dönem. Temeli birlikte sağlam kuracağız.', v + ' is a great age to lock in technique. We will build a solid base together.'); }
      if (n <= 18) { return r('Bu yaşta maç temposuna yakın çalışmak fark yaratır. Planı öyle kuruyorum.', 'At this age, training near game speed makes the difference. I am planning for that.'); }
      return r('Tamam. Programı vaktine ve vücuduna göre dengeli kuracağım.', 'Got it. I will balance the plan around your time and your body.');
    }
    if (key === 'gender') {
      if (v === 'female') { return r('Not aldım. Tarzına en yakın oyuncuyu hem WNBA hem NBA’den göstereceğim.', 'Noted. I will show you the closest player to your style from both the WNBA and the NBA.'); }
      if (v === 'male') { return r('Tamam, not aldım.', 'Got it, noted.'); }
      return r('Sorun değil. Bu bilgi olmadan da her şey aynı çalışır.', 'No problem. Everything works the same without it.');
    }
    if (key === 'height') { return r(v + ' cm, not aldım. Şut referanslarını boyuna göre ayarlıyorum.', v + ' cm, noted. I am tuning your shot references to your height.'); }
    if (key === 'weight') { return r('Teşekkürler. Bu bilgi sadece sende kalır ve yük ayarı için kullanılır.', 'Thanks. This stays private and is only used to set training load.'); }
    if (key === 'hand') {
      if (v === 'left') { return r('Solaksın, güzel. Her çalışmayı sol eline göre göstereceğim, sağ elini de ihmal etmeyeceğiz.', 'A lefty, nice. Every drill will be shown for your left hand, and we will not neglect your right.'); }
      if (v === 'right') { return r('Tamam. Çalışmalar sağ eline göre, sol elin için de ayrı setler olacak.', 'Got it. Drills are set for your right hand, with extra sets for your left.'); }
      return r('Sorun değil. İlk videonda hangi elin daha doğal olduğuna birlikte bakarız.', 'No problem. We will see which hand is more natural in your first video.');
    }
    if (key === 'position') {
      if (v === 'any') { return r('Bu çok normal. Önce her pozisyonda işe yarayan temelleri çalışacağız.', 'That is completely normal. We will start with basics that work at every position.'); }
      return r(label + ' için en önemli becerileri planın başına koyuyorum.', 'I am putting the key skills for a ' + label.toLowerCase() + ' at the top of your plan.');
    }
    if (key === 'style') { return r(label + '. Güzel seçim, bu tarza en yakın oyuncuyu birazdan göstereceğim.', label + '. Good pick. I will show you the player closest to this style in a moment.'); }
    if (key === 'level') {
      if (v === 'new') { return r('Hoş geldin. Herkes buradan başladı, adım adım gideceğiz.', 'Welcome. Everyone started here. We will go step by step.'); }
      return r('Anladım. Başlangıç noktanı buna göre belirliyorum.', 'Understood. I am setting your starting point from this.');
    }
    if (key === 'league') {
      if (v === 'none') { return r('Sorun değil. Lig olmadan da maç temposunda çalışabiliriz.', 'No problem. We can still train at game speed without a league.'); }
      return r(v + ' liginde oynuyorsun. Rakiplerinin temposuna göre çalışacağız.', 'You play in the ' + v + " league. We will train at your opponents' tempo.");
    }
    if (key === 'goal') {
      if (v === 'top') { return r('En tepe. Büyük hedef, ciddi plan ister. Ben buradayım, her gün bir adım.', 'The very top. A big goal needs a serious plan. I am here: one step every day.'); }
      if (v === 'fun') { return r('Harika. Keyif alırken gelişmek en kalıcı yol.', 'Great. Improving while having fun is what lasts.'); }
      return r('Güzel hedef. Planını buna ulaşacak şekilde kuruyorum.', 'Good goal. I am building your plan to get you there.');
    }
    if (key === 'freq') {
      var d = parseInt(v, 10);
      if (d >= 6) { return r(v + ' gün çok iyi, ama dinlenme de antrenmanın parçası. Hafif günler ekleyeceğim.', v + ' days is great, but rest is part of training. I will add light days.'); }
      return r('Haftada ' + v + ' gün yeter. Önemli olan düzenli gelmen.', v + ' days a week is enough. What matters is showing up regularly.');
    }
    return '';
  }

  renderVals() {
    var self = this;
    var accent = this.props.accent ?? '#FF8A3D';
    var s = this.state;
    var lang = s.lang;
    var en = lang !== 'tr';
    var L = function (trS, enS) { return en ? enS : trS; };
    var t = this.dict(lang);
    var ans = s.answers;
    var steps = this.steps(lang, ans);
    __txLang(lang);
    var total = steps.length;
    var isAuth = !s.authed;
    var isWelcome = !isAuth && s.screen === 0;
    var isSummary = !isAuth && s.screen === total + 1;
    var isLoading = !isAuth && s.screen === total + 2;
    var isComp = !isAuth && s.screen === total + 3;
    var isApp = !isAuth && s.screen === total + 4;
    var isStep = !isAuth && s.screen >= 1 && s.screen <= total;
    var step = isStep ? steps[s.screen - 1] : null;
    var factList = this.facts(lang);
    var loadStatus = s.progress < 34 ? t.load1 : (s.progress < 67 ? t.load2 : t.load3);

    function look(selected) {
      return {
        pressed: selected ? 'true' : 'false',
        bg: selected ? accent : '#1A1D24',
        border: selected ? accent : '#1A1D24',
        fg: selected ? '#0F1115' : '#F3F4F6',
        descColor: selected ? '#2A2016' : '#B4B9C4',
        iconRing: selected ? '#0F1115' : '#3A3F4B'
      };
    }
    function labelOf(key, id) {
      var st = steps.filter(function (x) { return x.key === key; })[0];
      if (!st || !st.options) { return ''; }
      var op = st.options.filter(function (x) { return x.id === id; })[0];
      return op ? op.label : '';
    }
    function drill(id) {
      var d = LIB[id];
      var needsPartner = PARTNER_ONLY.indexOf(id) >= 0;
      var open = s.openDrill === id;
      return { id: id, cat: d[0], name: en ? d[2] : d[1], amount: (en ? d[4] : d[3]) + (needsPartner ? L(' · partner gerekir', ' · needs a partner') : ''),
        how: drillHow(id, en), open: open, expanded: open ? 'true' : 'false', howLabel: L('Nasıl yapılır?', 'How to do it?'),
        toggleHow: function () { self.setState({ openDrill: open ? null : id }); } };
    }
    function resolve(ids) { return ids.map(function (id) { return (!s.partner && SOLO_ALT[id]) ? SOLO_ALT[id] : id; }); }
    var youngAge = parseInt(ans.age, 10) <= 12;

    var posKey = ans.position || 'any';
    var styleKey = (ans.style && STYLES[ans.style]) ? ans.style : (STYLE_SETS[posKey] || STYLE_SETS.any)[0];
    var styleObj = STYLES[styleKey];
    var styleLabel = en ? styleObj.en : styleObj.tr;
    var compList = (COMPS[posKey] && COMPS[posKey][styleKey]) || COMPS.any[styleKey] || ['Stephen Curry'];
    var leftyMatch = ans.hand === 'left' && compList.length > 1;
    var compName = leftyMatch ? compList[1] : compList[0];
    var girl = ans.gender === 'female';
    var compNba = compName;
    if (girl) {
      var wList = (WCOMPS[posKey] && WCOMPS[posKey][styleKey]) || WCOMPS.any[styleKey] || ['Caitlin Clark'];
      compName = (ans.hand === 'left' && wList.length > 1) ? wList[1] : wList[0];
    }
    __TXE = [typeof ans.nick === 'string' ? ans.nick : '', compName, compNba, s.email, s.emailDraft].concat(((s.lb && s.lb.rows) || []).map(function (r) { return r.nickname; })).concat(Object.keys(STYLES).map(function (k) { return STYLES[k].en; }), ['Point guard', 'Shooting guard', 'Small forward', 'Power forward', 'Center']);
    var compBoth = girl ? compName + ' (WNBA) · ' + compNba + ' (NBA)' : compName;
    var finisher = SHOOT_STYLES.indexOf(styleKey) >= 0 ? 'ftfatigue' : 'seventeen';
    var planIds = resolve(PLANS[styleKey] || PLANS.scorer).concat(youngAge ? [] : [finisher]);

    var summary = [
      { label: t.lNick, value: ans.nick || t.notGiven },
      { label: t.lAge, value: ans.age || t.notGiven },
      { label: t.lGender, value: labelOf('gender', ans.gender) || t.notGiven },
      { label: t.lHeight, value: ans.height ? ans.height + ' cm' : t.notGiven },
      { label: t.lWeight, value: ans.weight ? ans.weight + ' kg' : t.notGiven },
      { label: t.lHand, value: labelOf('hand', ans.hand) || t.notGiven },
      { label: t.lPosition, value: labelOf('position', ans.position) || t.notGiven },
      { label: t.lStyle, value: ans.style ? styleLabel : t.notGiven },
      { label: t.lLevel, value: labelOf('level', ans.level) || t.notGiven },
      { label: t.lLeague, value: labelOf('league', ans.league) || t.notGiven },
      { label: t.lGoal, value: labelOf('goal', ans.goal) || t.notGiven },
      { label: t.lFreq, value: ans.freq ? ans.freq + ' ' + t.days : t.notGiven }
    ];

    var out = {
      accent: accent, t: t, a: {}, c: {},
      langCode: String(lang || 'tr').toUpperCase(),
      langOpen: s.langOpen, langOpenAttr: s.langOpen ? 'true' : 'false', showLang: !isLoading,
      toggleLang: function () { self.setState({ langOpen: !s.langOpen }); },
      langs: [{ id: 'tr', label: 'Türkçe' }, { id: 'en', label: 'English' }, { id: 'de', label: 'Deutsch' }, { id: 'fr', label: 'Français' }, { id: 'ru', label: 'Русский' }, { id: 'ar', label: 'العربية' }, { id: 'fa', label: 'فارسی' }, { id: 'rw', label: 'Ikinyarwanda' }].map(function (l) {
        var sel = lang === l.id;
        return { label: l.label, pressed: sel ? 'true' : 'false', bg: sel ? accent : 'transparent', fg: sel ? '#0F1115' : '#F3F4F6',
          pick: function () { self.setState({ lang: l.id, langOpen: false }); } };
      }),
      isWelcome: isWelcome, isStep: isStep, isSummary: isSummary, isLoading: isLoading, isComp: isComp, isApp: isApp,
      loadStatus: loadStatus, loadPercent: s.progress + '%', fact: factList[s.factIndex % factList.length],
      createPlan: function () { self.startLoading(total + 3); },
      isGrid: false, isList: false, isStyle: false, isStepper: false, skippable: false, isNick: false,
      nickOptions: [], nickValue: '', moreNicks: function () {}, onNick: function () {},
      options: [], quick: [],
      title: '', subtitle: '', unit: '', stepperValue: '',
      reaction: '', hasReaction: false,
      stepCount: '', progressWidth: '0%', progressLabel: '',
      nextLabel: t.next, nextDisabled: 'false', nextBg: accent, nextFg: '#0F1115',
      summary: summary, summaryLine: ans.goal === 'top' ? t.sumTop : t.sumDefault,
      start: function () { self.setState({ screen: 1, langOpen: false }); },
      back: function () { self.setState({ screen: Math.max(0, s.screen - 1) }); },
      restart: function () { self.setState({ screen: 1 }); },
      next: function () {}, minus: function () {}, plus: function () {}, skip: function () {},
      compReasons: [], compDrills: [],
      tabHome: false, tabTrain: false, tabRank: false, tabStats: false, tabProfile: false,
      partnerOpts: [], partnerNote: '',
      tabs: [], week: [], todayDrills: [], addedDrills: [], cats: [], libItems: [], ftOptions: [], scopes: [], breakdown: [], rows: [], rules: [], stats: [], bars: [], badges: [],
      hasRows: false, statsEmpty: false, lbNeedLink: false, lbLinkLabel: '', lbLink: function () {}
    };

    var codeStep = s.authStep === 'code';
    var newCode = function () { return String(Math.floor(100000 + Math.random() * 900000)); };
    out.isAuth = isAuth;
    out.authEmailStep = !codeStep;
    out.authCodeStep = codeStep;
    out.emailDraft = s.emailDraft;
    out.codeDraft = s.codeDraft;
    out.authErr = s.authErr;
    out.hasAuthErr = !!s.authErr;
    var authMsg = function (e, isCode) {
      var msg = String((e && (e.message || e.error_description)) || '');
      var st = e && e.status;
      if (!st && /fetch|network|import|load/i.test(msg)) { return L('Sunucuya ulaşılamadı. İnternetini kontrol edip tekrar dene.', 'Could not reach the server. Check your internet and try again.'); }
      if (st === 429 || /rate|seconds|too many/i.test(msg)) { return L('Çok sık kod istendi. Bir dakika bekleyip tekrar dene.', 'Too many code requests. Wait a minute and try again.'); }
      if (isCode) { return L('Kod yanlış ya da süresi doldu. Tekrar dene ya da yeni kod iste.', 'That code is wrong or expired. Try again or ask for a new one.'); }
      return L('Kod gönderilemedi. Biraz sonra tekrar dene.', 'Could not send the code. Try again in a moment.');
    };
    out.au = {
      title: codeStep ? L('E-postanı kontrol et', 'Check your email') : L('E-postayla giriş yap', 'Sign in with email'),
      body: codeStep
        ? L(s.emailDraft + ' adresine bir giriş kodu gönderdik. Kodu aşağıya yaz.', 'We sent a sign-in code to ' + s.emailDraft + '. Enter it below.')
        : L('Şifre yok. E-postanı yaz, sana bir giriş kodu gönderelim. İlerlemen bu hesaba kaydedilir; telefon değiştirsen de kaybolmaz.', 'No password. Enter your email and we will send you a sign-in code. Your progress is saved to this account, so you keep it on a new phone too.'),
      emailLabel: L('E-posta adresin', 'Your email address'),
      codeLabel: L('E-postadaki kod', 'Code from the email'),
      demo: s.authInfo || L('Kod bir iki dakika içinde gelir. Gelmezse spam (gereksiz) klasörüne bak.', 'The code arrives within a minute or two. If not, check your spam folder.'),
      primary: s.authBusy ? L('Bekle…', 'Please wait…') : (codeStep ? L('Giriş yap', 'Sign in') : L('Kod gönder', 'Send code')),
      resend: L('Kodu tekrar gönder', 'Resend code'),
      change: L('E-postayı değiştir', 'Change email'),
      skip: s.onboarded ? L('Geri dön', 'Go back') : L('Şimdilik atla', 'Skip for now'),
      legal: L('18 yaşından küçüksen hesabı bir ebeveynle birlikte aç.', 'If you are under 18, set up the account together with a parent.')
    };
    out.onEmail = function (e) {
      var v = (e && e.target && typeof e.target.value === 'string') ? e.target.value : '';
      self.setState({ emailDraft: v.replace(/\s+/g, '').slice(0, 80), authErr: '' });
    };
    out.onCode = function (e) {
      var v = (e && e.target && typeof e.target.value === 'string') ? e.target.value : '';
      self.setState({ codeDraft: v.replace(/\D/g, '').slice(0, 8), authErr: '' });
    };
    var sendCode = function (em, info) {
      self.setState({ authBusy: true, authErr: '', authInfo: '' });
      sb().then(function (c) { return c.auth.signInWithOtp({ email: em, options: { shouldCreateUser: true } }); })
        .then(function (r) {
          if (r.error) { throw r.error; }
          self.setState({ authBusy: false, authStep: 'code', emailDraft: em, codeDraft: '', authErr: '', authInfo: info || '', langOpen: false });
        })
        .catch(function (e) { self.setState({ authBusy: false, authErr: authMsg(e, false) }); });
    };
    out.authPrimary = function () {
      if (s.authBusy) { return; }
      if (!codeStep) {
        var em = String(s.emailDraft || '').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
          self.setState({ authErr: L('Geçerli bir e-posta adresi yaz (ör. ad@ornek.com).', 'Enter a valid email address (e.g. name@example.com).') });
          return;
        }
        sendCode(em, '');
        return;
      }
      if (!/^\d{6,8}$/.test(s.codeDraft)) {
        self.setState({ authErr: L('Kodu eksiksiz yaz.', 'Enter the full code.') });
        return;
      }
      self.setState({ authBusy: true, authErr: '' });
      sb().then(function (c) { return c.auth.verifyOtp({ email: s.emailDraft, token: s.codeDraft, type: 'email' }); })
        .then(function (r) {
          if (r.error) { throw r.error; }
          var cur = self.state;
          self.setState({ authed: true, authBusy: false, email: cur.emailDraft, authErr: '', authInfo: '', codeDraft: '', langOpen: false, sbOk: true, lb: null, screen: (cur.email || cur.onboarded) ? cur.screen : 0, tab: 'home' });
          self.afterLogin();
        })
        .catch(function (e) { self.setState({ authBusy: false, authErr: authMsg(e, true) }); });
    };
    out.resendCode = function () { if (!s.authBusy) { sendCode(s.emailDraft, L('Yeni kod gönderildi.', 'A new code was sent.')); } };
    out.authSkip = function () { self.setState({ authed: true, authBusy: false, authErr: '', authInfo: '', codeDraft: '', authStep: 'email', sbOk: s.sbOk === true ? true : false, langOpen: false, screen: s.onboarded ? s.screen : 0 }); };
    out.changeEmail = function () { self.setState({ authStep: 'email', codeDraft: '', authErr: '', authInfo: '' }); };
    out.emailShown = s.email || '–';
    out.linked = s.sbOk !== false && !!s.email;
    out.notLinked = !out.linked;
    out.logout = function () {
      sb().then(function (c) { return c.auth.signOut(); }).catch(function () {});
      self.lastSig = null;
      clanUnsub(self);
      self.setState({ authed: false, authStep: 'email', emailDraft: s.email, codeDraft: '', demoCode: '', authErr: '', authInfo: '', langOpen: false, sbOk: false, lb: null, clan: null, clanMsgs: [], clanLoaded: false });
    };

    if (isStep) {
      var key = step.key;
      var val = ans[key];
      out.title = step.title;
      out.subtitle = step.subtitle;
      out.stepCount = s.screen + ' / ' + total;
      out.progressWidth = Math.round((s.screen / total) * 100) + '%';
      out.progressLabel = t.step + ' ' + s.screen + ' / ' + total;
      out.nextLabel = s.screen === total ? t.finish : t.next;
      var ready = false;

      if (step.type === 'grid' || step.type === 'list' || step.type === 'style') {
        out.isGrid = step.type === 'grid';
        out.isList = step.type === 'list';
        out.isStyle = step.type === 'style';
        out.options = step.options.map(function (op) {
          return Object.assign({}, op, look(val === op.id), {
            pick: function () {
              var a1 = Object.assign({}, s.answers);
              a1[key] = op.id;
              if (key === 'position' && s.answers.position !== op.id) { delete a1.style; }
              self.setState({ answers: a1 });
            }
          });
        });
        var known = step.options.filter(function (x) { return x.id === val; }).length > 0;
        ready = known;
        out.reaction = known ? this.reaction(lang, key, val, labelOf(key, val)) : '';
      }

      if (step.type === 'stepper') {
        out.isStepper = true;
        out.unit = step.unit;
        out.skippable = !!step.skippable;
        var cur = s[key];
        out.stepperValue = String(cur);
        var setNum = function (n) {
          var clamped = Math.min(step.max, Math.max(step.min, n));
          var patch = {};
          patch[key] = clamped;
          var a2 = Object.assign({}, s.answers);
          a2[key] = clamped;
          patch.answers = a2;
          self.setState(patch);
        };
        out.minus = function () { setNum(cur - 1); };
        out.plus = function () { setNum(cur + 1); };
        out.quick = step.quick.map(function (q) {
          return Object.assign({ label: String(q) }, look(val === q), { pick: function () { setNum(q); } });
        });
        out.skip = function () {
          var a3 = Object.assign({}, s.answers);
          a3[key] = null;
          self.setState({ answers: a3, screen: s.screen + 1 });
        };
        ready = true;
        out.reaction = (val !== undefined && val !== null) ? this.reaction(lang, key, val, '') : '';
      }

      if (step.type === 'nick') {
        out.isNick = true;
        var pool = NICK_POOLS[lang] || NICK_POOLS.en;
        var page = s.nickPage % 2;
        var nickNow = typeof val === 'string' ? val : '';
        var setNick = function (v) {
          var a4 = Object.assign({}, s.answers);
          a4.nick = v;
          self.setState({ answers: a4 });
        };
        out.nickOptions = pool.slice(page * 6, page * 6 + 6).map(function (n) {
          return Object.assign({ label: n }, look(nickNow === n), { pick: function () { setNick(n); } });
        });
        out.moreNicks = function () { self.setState({ nickPage: s.nickPage + 1 }); };
        out.nickValue = nickNow;
        out.onNick = function (e) {
          var v = (e && e.target && typeof e.target.value === 'string') ? e.target.value : '';
          setNick(v.replace(/\s+/g, '').slice(0, 16));
        };
        var nickBad = nickNow.length >= 3 ? nickProblem(nickNow, L) : '';
        ready = nickNow.length >= 3 && !nickBad;
        out.reaction = nickBad || (ready ? L(nickNow + ', güzel isim. Sıralamada böyle görüneceksin.', nickNow + ', good one. This is how you will appear on the leaderboard.') : '');
      }

      out.hasReaction = out.reaction !== '';
      out.nextDisabled = ready ? 'false' : 'true';
      out.nextBg = ready ? accent : '#262A33';
      out.nextFg = ready ? '#0F1115' : '#B4B9C4';
      out.next = function () {
        if (!ready) { return; }
        var patch = { screen: s.screen + 1, langOpen: false };
        if (step.type === 'stepper' && val === undefined) {
          var a5 = Object.assign({}, s.answers);
          a5[key] = s[key];
          patch.answers = a5;
        }
        self.setState(patch);
      };
    }

    if (isComp) {
      var posLabel = labelOf('position', ans.position);
      var reasons = [];
      reasons.push({ text: L('Seçtiğin tarz: ' + styleLabel + '. ' + styleObj.dtr, 'Your style: ' + styleLabel + '. ' + styleObj.den) });
      if (posLabel && ans.position !== 'any') { reasons.push({ text: girl ? L('Pozisyonun: ' + posLabel + '. Bu tarzın bu pozisyondaki en bilinen örnekleri onlar.', 'Your position: ' + posLabel + '. They are the best-known examples of this style at that spot.') : L('Pozisyonun: ' + posLabel + '. Bu tarzın bu pozisyondaki en bilinen örneği o.', 'Your position: ' + posLabel + '. He is the best-known example of this style at that spot.') }); }
      if (leftyMatch && !girl) { reasons.push({ text: L('O da senin gibi solak.', 'He is a lefty, just like you.') }); }
      if (girl && ans.hand === 'left' && WLEFTY.indexOf(compName) >= 0) { reasons.push({ text: L(compName + ': senin gibi solak.', compName + ' is a lefty, just like you.') }); }
      out.compReasons = reasons;
      out.c = {
        kicker: girl ? L('Tarzına en yakın WNBA ve NBA oyuncuları', 'The WNBA and NBA players closest to your style') : L('Tarzına en yakın NBA oyuncusu', 'The NBA player closest to your style'),
        name: compBoth,
        note: L('Bu bir oyun tarzı benzetmesi, seviye ölçümü değil. Seçtiğin tarza, pozisyona ve şut eline göre yapıldı.', 'This compares play style, not skill level. It is based on the style, position and shooting hand you picked.'),
        question: L(compName + ' tarzı bir antrenman ister misin?', 'Do you want a ' + compName + '-style workout?'),
        yes: L('Evet, onun tarzında çalışayım', girl ? 'Yes, train in her style' : 'Yes, train in his style'),
        no: L('Hayır, genel planla devam', 'No, keep the general plan')
      };
      out.compDrills = planIds.map(drill);
      out.choosePlayer = function () { self.setState(Object.assign({ planMode: 'player', onboarded: true, screen: total + 4, tab: 'home' }, qRepick(s))); };
      out.chooseGeneral = function () { self.setState(Object.assign({ planMode: 'general', onboarded: true, screen: total + 4, tab: 'home' }, qRepick(s))); };
    }

    if (isApp) {
      var tab = s.tab;
      var nick = typeof ans.nick === 'string' ? ans.nick : '';
      var nickShown = nick || L('Oyuncu', 'Player');
      var hand = ans.hand;
      var ageNum = parseInt(ans.age, 10);
      var young = !!(ageNum && ageNum <= 12);
      var playerMode = s.planMode === 'player';
      var freq = ans.freq ? parseInt(ans.freq, 10) : 0;
      var wk = s.wk;
      var points = wk.ptsW + wk.ptsS + wk.ptsC + (wk.ptsQ || 0);
      var todayIndex = (new Date().getDay() + 6) % 7;
      var dayNames = en ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

      var goalShort = { top: L('en tepe', 'the top'), national: L('milli takım', 'national team'), scholar: L('burs', 'scholarship'), starter: L('ilk beş', 'starting five'), tryout: L('üst takım', 'next team'), skill: L('tek beceri', 'one skill'), fun: L('keyif', 'fun') };
      var parts = [];
      if (ans.league && ans.league !== 'none') { parts.push(ans.league); } else if (ans.level) { parts.push(labelOf('level', ans.level)); }
      if (hand === 'left') { parts.push(L('Solak', 'Lefty')); }
      if (hand === 'right') { parts.push(L('Sağ elli', 'Righty')); }
      if (ans.goal) { parts.push(L('Hedef: ', 'Goal: ') + goalShort[ans.goal]); }
      var profileLine = parts.length ? parts.join(' · ') : L('Profilini tamamla', 'Complete your profile');

      var handName = hand === 'left' ? L('Sol el', 'Left-hand') : (hand === 'right' ? L('Sağ el', 'Right-hand') : '');
      var pos = ans.position;
      var thirdId = (pos === 'pg' || pos === 'sg') ? 'pullup' : ((pos === 'sf' || pos === 'pf') ? 'move' : (pos === 'c' ? 'mikan' : 'ftp'));
      var todayIds = playerMode ? planIds : ['form', 'catch', thirdId, 'weak'].concat(young ? [] : ['ftfatigue']);
      var baseMinutes = playerMode ? (young ? 25 : 45) : (young ? 20 : 40);
      var addedIds = Object.keys(s.added).filter(function (id) { return s.added[id] && LIB[id] && todayIds.indexOf(id) < 0; });
      var duration = baseMinutes + addedIds.length * 7;
      var todayName = playerMode ? L(compName + ' tarzı antrenman', compName + '-style workout') : (handName ? L(handName + ' şut formu', handName + ' shooting form') : L('Şut formu', 'Shooting form'));

      var a = {
        headSmall: tab === 'home' ? (nick ? L('Hoş geldin, ' + nick, 'Welcome, ' + nick) : L('Hoş geldin', 'Welcome')) : 'Green AI',
        headBig: tab === 'home' ? profileLine : ({ train: L('Antrenman', 'Training'), rank: L('Sıralama', 'Leaderboard'), clan: L('Klan', 'Clan'), stats: L('İstatistik', 'Stats'), profile: L('Profil', 'Profile') })[tab],
        profileLine: profileLine,
        streakLabel: L('günlük seri', 'day streak'), weekGoal: L('Haftalık hedef', 'Weekly goal'),
        pointsWeek: L('puan · bu hafta', 'points · this week'),
        styleTitle: L('Oyun tarzın', 'Your play style'),
        todayTitle: L('Bugünkü antrenman', "Today's workout"),
        challengeTitle: L('Günün meydan okuması', 'Daily challenge'), challengeReward: L('+50 puan', '+50 points'),
        roadTitle: L('Tepeye giden yol', 'Road to the top'),
        warmup: L('Isınma, 5 dk: hafif koşu, kayma adımı, dinamik esneme, yakından form şutu.', 'Warm-up, 5 min: light jog, slides, dynamic stretches, close-range form shots.'),
        cooldown: L('Soğuma, 3 dk: yavaş yürüyüş ve hafif esneme. Su iç.', 'Cool-down, 3 min: easy walk and light stretching. Drink water.'),
        safety: L('Bir yerin ağrırsa dur. Ağrıyla çalışma, bir yetişkine ya da antrenörüne söyle.', 'If something hurts, stop. Do not train through pain; tell an adult or your coach.'),
        libTitle: L('Drill kütüphanesi', 'Drill library'), libCats: L('Drill kategorileri', 'Drill categories'),
        ftTitle: L('Serbest atış testi', 'Free-throw test'), ftSub: L('10 serbest atış at, kaç tanesi girdi? İlk gerçek istatistiğin bu olacak.', 'Shoot 10 free throws. How many went in? This becomes your first real stat.'),
        videoTitle: L('Kayıttan analiz', 'Analyze a recording'), videoSub: L('Canlı şut takibi ekranında "Video yükle" ile önceden çektiğin bir videoyu da analiz edebilirsin.', 'In the live shot tracking screen, use "Upload video" to analyze a clip you filmed earlier.'),
        scopeLabel: L('Sıralama kapsamı', 'Leaderboard scope'), youTitle: L('Bu hafta sen', 'You this week'), listLabel: L('Oyuncu sıralaması', 'Player ranking'),
        inviteButton: L('Arkadaşını davet et', 'Invite a friend'),
        howTitle: L('Puan nasıl kazanılır?', 'How do you earn points?'),
        rankNote: L('Puanlar her pazartesi sıfırlanır. Bir haftada antrenman, seri ve meydan okumadan en fazla 630, görevlerden en fazla 980 puan kazanılabilir; yani zirve her hafta herkese açık. Gerçek ad görünmez, herkes takma adıyla yarışır.', 'Points reset every Monday. In a week you can earn at most 630 points from workouts, streaks and challenges, and at most 980 from missions, so the top is open to everyone every week. Real names are never shown.'),
        questTitle: L('Görevler', 'Missions'),
        questNote: L('Kamerayla yapılan görevler şut takibinden kendiliğinden işlenir. Süre dolunca görevler yenilenir; tamamlayıp almayı unuttuğun ödül seviye puanına eklenir.', 'Camera missions update by themselves from shot tracking. Missions refresh when the timer runs out; a finished reward you forgot to claim is added to your level points.'),
        statsEmptyTitle: L('Henüz istatistik yok', 'No stats yet'),
        statsEmptyBody: L('Yeni başladın, bu çok normal. İlk antrenmanını bitirince ve serbest atış testini yapınca burası dolmaya başlar.', 'You just started, so this is normal. This fills in once you finish your first workout and take the free-throw test.'),
        goTrain: L('Antrenmana git', 'Go to training'),
        chartTitle: L('Bu hafta günlük çalışma süresi', 'Training time per day this week'), chartAria: L('Haftanın günlerine göre çalışma süresi çubukları', 'Bars showing training time for each day of the week'),
        nickLabel: L('Takma ad', 'Nickname'), badgeTitle: L('Rozetler', 'Badges'),
        reminder: L('Günlük antrenman hatırlatması', 'Daily training reminder'),
        editProfile: L('Cevaplarımı düzenle', 'Edit my answers'), resetAll: L('Her şeyi sıfırla ve baştan başla', 'Reset everything and start over'),
        navLabel: L('Ana menü', 'Main menu')
      };
      a.partnerLabel = L('Bugün kiminle çalışıyorsun?', 'Who are you training with today?');
      a.liveTitle = L('Canlı şut takibi', 'Live shot tracking');
      out.inviteNote = s.inviteNote || '';
      out.invite = function () {
        var link = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
        var text = L('Green AI ile basketbol antrenmanı yapıyorum. Sen de gel, haftalık sıralamada yarışalım!', 'I train basketball with Green AI. Join me and let us compete on the weekly leaderboard!');
        var invited = function (note) { var q7 = qClone(self.state.q); qMark({ q: q7 }, 'inv', todayStr()); self.setState({ inviteNote: note, q: q7 }); };
        if (navigator.share) {
          navigator.share({ title: 'Green AI', text: text, url: link }).then(function () { invited(L('Davet gönderildi.', 'Invite sent.')); }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text + ' ' + link).then(function () { invited(L('Davet bağlantısı kopyalandı. Arkadaşına mesajla gönder.', 'Invite link copied. Send it to a friend.')); }, function () { self.setState({ inviteNote: link }); });
        } else {
          self.setState({ inviteNote: link });
        }
      };
      var wsa = wk.shotAtt || 0, wsm = wk.shotMade || 0;
      out.liveSub = wsa
        ? L('Bu hafta ' + wsm + '/' + wsa + ' isabet (%' + Math.round(wsm / wsa * 100) + '). Kamerayla at, otomatik sayılsın.', 'This week ' + wsm + '/' + wsa + ' made (' + Math.round(wsm / wsa * 100) + '%). Shoot on camera, it counts for you.')
        : L('Kamerayla şut at: isabetler sayılır, formun ölçülür. 20+ şutluk takip, günün antrenmanı sayılır.', 'Shoot on camera: makes are counted and your form is measured. A tracked session of 20+ shots counts as today\'s workout.');
      a.accountLabel = L('Hesap', 'Account');
      a.logout = L('Çıkış yap', 'Sign out');
      a.linkTitle = L('E-posta bağla', 'Connect your email');
      a.linkBody = L('E-postanı bağlarsan ilerlemen sunucuya kaydedilir, telefon değiştirsen de kaybolmaz ve gerçek oyuncularla sıralamada görünürsün.', 'Connect your email to save your progress online, keep it on a new phone and appear in the ranking with real players.');
      a.linkButton = L('E-posta bağla', 'Connect email');
      out.a = a;
      out.partnerOpts = [{ on: false, label: L('Tek başıma', 'On my own') }, { on: true, label: L('Partnerle', 'With a partner') }].map(function (x) {
        var sel = s.partner === x.on;
        return { label: x.label, pressed: sel ? 'true' : 'false', bg: sel ? '#F3F4F6' : 'transparent', fg: sel ? '#0F1115' : '#F3F4F6', pick: function () { self.setState({ partner: x.on }); } };
      });
      out.partnerNote = s.partner
        ? L('Bire bir, ayna drili ve temaslı bitiriş gibi partner drilleri plana girdi.', 'Partner drills such as one-on-one, the mirror drill and contact finishing are now in your plan.')
        : L('Partner gerektiren driller tek kişilik karşılıklarıyla değiştirildi. Arkadaşın gelirse "Partnerle"yi seç.', 'Drills that need a partner are swapped for solo versions. Pick "With a partner" when a friend joins.');
      out.nickShown = nickShown;
      out.tabHome = tab === 'home'; out.tabTrain = tab === 'train'; out.tabRank = tab === 'rank'; out.tabStats = tab === 'stats'; out.tabProfile = tab === 'profile'; out.tabClan = tab === 'clan';

      out.tabs = [
        { id: 'home', label: L('Ana sayfa', 'Home'), icon: 'M3 10 11 3l8 7v9h-5v-6H8v6H3z' },
        { id: 'train', label: L('Antrenman', 'Training'), icon: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM3 11h16M11 3v16' },
        { id: 'rank', label: L('Sıralama', 'Ranking'), icon: 'M7 3h8v6a4 4 0 0 1-8 0zM7 5H3c0 3 1.5 5 4 5M15 5h4c0 3-1.5 5-4 5M11 13v4M7 19h8' },
        { id: 'clan', label: L('Klan', 'Clan'), icon: 'M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 18c.8-3.5 3-5 5-5s4.2 1.5 5 5M10 18c.8-3.5 3-5 5-5s4.2 1.5 5 5' },
        { id: 'stats', label: L('İstatistik', 'Stats'), icon: 'M4 18V11M9 18V5M14 18v-9M19 18v-5' },
        { id: 'profile', label: L('Profil', 'Profile'), icon: 'M11 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM3.5 19c1.5-4 13.5-4 15 0' }
      ].map(function (x) {
        var on = tab === x.id;
        var dot = x.id === 'clan' && !on && !!(s.clan && s.clan.last > (s.clanSeen || 0));
        return Object.assign({}, x, { current: on ? 'page' : 'false', color: on ? accent : '#B4B9C4', dot: dot,
          aria: x.label + (dot ? L(', yeni mesaj var', ', new messages') : ''),
          pick: function () { var p = { tab: x.id, langOpen: false }; if (x.id === 'clan') { self.scrollChat = true; setTimeout(function () { clanRefresh(self, true); }, 0); } self.setState(p); } });
      });
      out.goRank = function () { self.setState({ tab: 'rank' }); };
      out.goTrain = function () { self.setState({ tab: 'train' }); };

      // ---------- Görevler ----------
      var qNow = new Date();
      var qTier = (s.qTab === 'w' || s.qTab === 'm') ? s.qTab : 'd';
      var qState = s.q || {};
      var qReady = function (t) { var Q = qState[t]; if (!Q || !Q.picks) { return 0; } return Q.picks.filter(function (id) { var d = QBYID[id]; return d && !d.man && !Q.claimed[id] && qVal(Q, d) >= d.n; }).length; };
      var qDone = function (t) { var Q = qState[t]; return Q && Q.picks ? Q.picks.filter(function (id) { return Q.claimed[id]; }).length : 0; };
      var qClaim = function (t, id) {
        var cur = self.state, Q0 = cur.q && cur.q[t], d = QBYID[id];
        if (!Q0 || !d || Q0.claimed[id]) { return; }
        var q2 = qClone(cur.q), tmp = { q: q2 };
        if (d.man) { q2[t].p['man_' + id] = 1; }
        if (qVal(q2[t], d) < d.n) { return; }
        q2[t].claimed[id] = true;
        var rw = QREW[t];
        var w4 = Object.assign({}, cur.wk, { byDay: cur.wk.byDay.slice() });
        w4.ptsQ = (w4.ptsQ || 0) + rw;
        qBump(tmp, 'pts', rw);
        if (t === 'd') { qBump(tmp, 'qd', 1); }
        if (t === 'w') { qBump(tmp, 'qw', 1); }
        var note = L('+' + rw + ' puan. Görev tamam: ' + d.tr, '+' + rw + ' points. Mission complete: ' + d.en);
        self.setState({ q: q2, wk: w4, totalPoints: cur.totalPoints + rw, totalQuests: (cur.totalQuests || 0) + 1, totalQM: (cur.totalQM || 0) + (t === 'm' ? 1 : 0), qNote: note });
        setTimeout(function () { if (self.state.qNote === note) { self.setState({ qNote: '' }); } }, 5000);
      };
      out.qTabs = [{ t: 'd', label: L('Günlük', 'Daily') }, { t: 'w', label: L('Haftalık', 'Weekly') }, { t: 'm', label: L('Aylık', 'Monthly') }].map(function (x) {
        var sel = qTier === x.t, ready = qReady(x.t);
        return {
          label: x.label, left: qLeft(x.t, qNow, en, true), sel: sel ? 'true' : 'false',
          aria: x.label + ', ' + L('yenilenmesine ', 'refreshes in ') + qLeftWords(x.t, qNow, en) + (ready ? L(', ' + ready + ' ödül hazır', ', ' + ready + ' ready to claim') : ''),
          bg: sel ? '#F3F4F6' : 'transparent', fg: sel ? '#0F1115' : '#F3F4F6', sub: sel ? '#3A3F4B' : '#B4B9C4', dot: ready > 0,
          pick: function () { self.setState({ qTab: x.t, qNote: '' }); }
        };
      });
      var QT = qState[qTier] || { picks: [], p: {}, claimed: {} };
      out.qHead = ({ d: L('Günlük görevler', 'Daily missions'), w: L('Haftalık görevler', 'Weekly missions'), m: L('Aylık görevler', 'Monthly missions') })[qTier];
      out.qLeftText = qLeft(qTier, qNow, en, false);
      out.qLeftAria = L('Yenilenmesine ', 'Refreshes in ') + qLeftWords(qTier, qNow, en);
      out.qItems = QT.picks.map(function (id) {
        var d = QBYID[id];
        if (!d) { return null; }
        var v = qVal(QT, d), done = v >= d.n, claimed = !!QT.claimed[id], rw = QREW[qTier], name = en ? d.en : d.tr;
        var isBtn = !claimed && (d.man || done);
        return {
          name: name, nameColor: claimed ? '#B4B9C4' : '#F3F4F6',
          icon: QICON[d.tag || d.g] || QICON.meta, iconColor: claimed ? '#7BD88F' : accent,
          width: Math.round(Math.min(v, d.n) / d.n * 100) + '%', barColor: claimed ? '#7BD88F' : accent,
          sub: qSub(d, v, en), progAria: name + ': ' + qSub(d, v, en),
          reward: '+' + rw, isBtn: isBtn, isProg: !claimed && !isBtn, isClaimed: claimed, claimedLabel: L('Alındı', 'Claimed'),
          btnLabel: d.man ? L('Yaptım +' + rw, 'Done +' + rw) : L('Al +' + rw, 'Claim +' + rw),
          btnAria: (d.man ? L('Yaptım, ödülü al: ', 'Done, claim reward: ') : L('Ödülü al: ', 'Claim reward: ')) + name,
          btnBg: d.man ? 'transparent' : accent, btnFg: d.man ? '#F3F4F6' : '#0F1115', btnBorder: accent,
          act: function () { qClaim(qTier, id); }
        };
      }).filter(Boolean);
      var qReadyAll = qReady('d') + qReady('w') + qReady('m');
      out.qSummary = qReadyAll ? L(qReadyAll + ' ödül hazır', qReadyAll + ' ready to claim') : L(qDone(qTier) + ' / ' + QT.picks.length + ' tamam', qDone(qTier) + ' / ' + QT.picks.length + ' done');
      out.qNote = s.qNote || '';

      out.streakCount = String(s.streak);
      out.weekGoalValue = freq ? (wk.workouts + ' / ' + freq + ' ' + t.days) : L('Belirlenmedi', 'Not set');
      var monD = new Date(); monD.setDate(monD.getDate() - todayIndex);
      out.week = dayNames.map(function (label, i) {
        var isToday = i === todayIndex;
        var done = wk.byDay[i] > 0;
        var dd = new Date(monD.getFullYear(), monD.getMonth(), monD.getDate() + i);
        var rest = !done && !!(s.restDays && s.restDays[dayStr(dd)]);
        return {
          label: label, done: done, rest: rest,
          bg: done ? accent : 'transparent',
          border: done ? accent : (rest ? '#7B8BD8' : (isToday ? '#F3F4F6' : '#3A3F4B')),
          labelColor: isToday ? '#F3F4F6' : '#B4B9C4',
          aria: label + ', ' + (done ? L('tamamlandı', 'completed') : (rest ? L('dinlenme günü', 'rest day') : (isToday ? L('bugün', 'today') : L('boş', 'open'))))
        };
      });
      var rLeft = restLeft(s);
      var restLine = rLeft > 0
        ? L(' Bu hafta ' + rLeft + ' dinlenme hakkın var: o günlerde ara verirsen serin bozulmaz.', ' You have ' + rLeft + ' rest days left this week: taking a break on those days keeps your streak.')
        : L(' Bu haftaki dinlenme hakların bitti.', ' You have used your rest days for this week.');
      out.streakNote = (s.doneToday
        ? L('Bugün tamam. Yarın da gel, serin ' + (s.streak + 1) + ' olsun.', 'Done for today. Come back tomorrow to make it ' + (s.streak + 1) + '.')
        : (s.streak > 0
          ? L('Serin ' + s.streak + ' gün. Bugünkü antrenmanı bitir, seriyi koru.', 'Your streak is ' + s.streak + ' days. Finish today to keep it alive.')
          : L('Serin bugün başlıyor. İlk antrenmanını bitir, ilk günü işaretle.', 'Your streak starts today. Finish your first workout to mark day one.')));
      out.restNote = s.streak > 0 ? restLine.trim() : '';

      out.styleLabel = styleLabel;
      out.styleIcon = styleObj.icon;
      out.compLine = girl ? L('Tarzına en yakın oyuncular: ' + compBoth, 'Closest players to your style: ' + compBoth) : L('Tarzına en yakın oyuncu: ' + compName, 'Closest player to your style: ' + compName);
      out.planPressed = playerMode ? 'true' : 'false';
      out.planToggleLabel = playerMode ? L('Genel plana dön', 'Switch to the general plan') : L(compName + ' tarzı plana geç', 'Switch to the ' + compName + '-style plan');
      out.togglePlan = function () { self.setState({ planMode: playerMode ? 'general' : 'player' }); };

      out.points = String(points);
      out.rankLine = points > 0 ? L('Sıralamaya girdin', 'You are on the board') : L('Henüz sıralamada değilsin', 'You are not ranked yet');
      out.rankSub = points > 0 ? L('Puanların ve kurallar için dokun', 'Tap for your points and the rules') : L('İlk puanını al, sıralamaya gir', 'Earn your first points to get on the board');

      out.todayName = todayName;
      out.todayMeta = L(duration + ' dakika · ' + (todayIds.length + addedIds.length) + ' çalışma', duration + ' minutes · ' + (todayIds.length + addedIds.length) + ' drills');
      out.todayDrills = todayIds.map(drill);
      out.addedDrills = addedIds.map(drill);
      out.doneAttr = s.doneToday ? 'true' : 'false';
      out.todayButton = s.doneToday ? (s.verifiedToday ? L('Bugün tamamlandı · şut takibiyle', 'Done for today · tracked') : L('Bugün tamamlandı', 'Done for today')) : L('Antrenmanı tamamladım', 'I finished the workout');
      out.doneBg = s.doneToday ? '#262A33' : accent;
      out.doneFg = s.doneToday ? '#F3F4F6' : '#0F1115';
      out.completeToday = function () {
        if (s.doneToday) { return; }
        var sk = { streak: s.streak, lastDone: s.lastDone, covered: s.covered, restUsed: s.restUsed, restDays: s.restDays, answers: ans, hist: s.hist };
        var newStreak = streakAdvance(sk, todayStr());
        histAdd(sk, todayStr(), duration);
        var bonus = (newStreak % 7 === 0) ? 70 : 0;
        var w2 = Object.assign({}, wk, { byDay: wk.byDay.slice() });
        w2.workouts += 1; w2.minutes += duration; w2.ptsW += 20; w2.ptsS += 10 + bonus; w2.byDay[todayIndex] += duration;
        var q2 = qClone(s.q);
        qWorkout({ q: q2 }, duration, Date.now(), s.partner, newStreak, 30 + bonus);
        self.setState({ doneToday: true, streak: newStreak, lastDone: sk.lastDone, covered: sk.covered, restUsed: sk.restUsed, restDays: sk.restDays, hist: sk.hist, wk: w2, totalWorkouts: s.totalWorkouts + 1, totalPoints: s.totalPoints + 30 + bonus, q: q2 });
      };

      var chName = ({
        sniper: L('20 üçlükte en az 8 isabet', 'Make at least 8 of 20 threes'),
        general: L('Duvara 60 saniyede 40 pas', '40 wall passes in 60 seconds'),
        slasher: L('Zayıf elle 20 turnikede en az 16 isabet', 'Make at least 16 of 20 weak-hand layups'),
        lock: L('4 × 30 saniye savunma kayması, hiç dikleşmeden', '4 × 30 seconds of defensive slides without standing up'),
        post: L('30 saniyelik Mikan serisinde en az 14 isabet', 'At least 14 makes in a 30-second Mikan series'),
        rim: L('30 saniyede 25 ribaund tap', '25 rebound taps in 30 seconds'),
        energy: L('30 saniyede 25 ribaund tap', '25 rebound taps in 30 seconds')
      })[styleKey] || L('20 serbest atışta en az 12 isabet', 'Make at least 12 of 20 free throws');
      out.challengeName = chName;
      out.challengeLabel = s.challenge === 0 ? L('Kabul ediyorum', 'I accept') : (s.challenge === 1 ? L('Başardım, puanımı ver', 'I did it, give me the points') : L('Tamamlandı · +50 puan', 'Completed · +50 points'));
      out.challengeBg = s.challenge === 2 ? '#262A33' : accent;
      out.challengeFg = s.challenge === 2 ? '#F3F4F6' : '#0F1115';
      out.stepChallenge = function () {
        if (s.challenge === 0) { self.setState({ challenge: 1 }); return; }
        if (s.challenge === 1) {
          var w3 = Object.assign({}, wk, { byDay: wk.byDay.slice() });
          w3.ptsC += 50;
          var q3 = qClone(s.q), t3 = { q: q3 };
          qBump(t3, 'ch', 1); qBump(t3, 'pts', 50);
          self.setState({ challenge: 2, wk: w3, totalChallenges: s.totalChallenges + 1, totalPoints: s.totalPoints + 50, q: q3 });
        }
      };

      var level = Math.floor(s.totalPoints / 200) + 1;
      var into = s.totalPoints % 200;
      out.roadLevel = L('Seviye ' + level, 'Level ' + level);
      out.roadWidth = Math.round(into / 200 * 100) + '%';
      out.roadText = L(into + ' / 200 puan. Seviye ' + (level + 1) + ' için ' + (200 - into) + ' puan daha.', into + ' / 200 points. ' + (200 - into) + ' more to reach level ' + (level + 1) + '.');

      var catDefs = [
        { id: 'all', label: L('Tümü', 'All') }, { id: 'shoot', label: L('Şut', 'Shooting') }, { id: 'handle', label: L('Top sürme', 'Handles') },
        { id: 'finish', label: L('Bitiriş', 'Finishing') }, { id: 'foot', label: L('Ayak işi', 'Footwork') }, { id: 'def', label: L('Savunma', 'Defense') },
        { id: 'iq', label: L('Pas ve oyun zekâsı', 'Passing and IQ') }, { id: 'ath', label: L('Atletizm', 'Athleticism') }
      ];
      out.cats = catDefs.map(function (x) {
        var sel = s.libCat === x.id;
        return { label: x.label, pressed: sel ? 'true' : 'false', bg: sel ? '#F3F4F6' : 'transparent', border: sel ? '#F3F4F6' : '#3A3F4B', fg: sel ? '#0F1115' : '#F3F4F6', pick: function () { self.setState({ libCat: x.id }); } };
      });
      var allIds = Object.keys(LIB);
      var shownIds = allIds.filter(function (id) { return (s.libCat === 'all' || LIB[id][0] === s.libCat) && todayIds.indexOf(id) < 0; });
      out.libSub = L(allIds.length + ' drill. Bugüne eklemek istediğini seç.', allIds.length + ' drills. Pick any you want to add to today.');
      out.libItems = shownIds.map(function (id) {
        var d = drill(id);
        var on = !!s.added[id];
        return Object.assign(d, {
          pressed: on ? 'true' : 'false', button: on ? L('Eklendi', 'Added') : L('Ekle', 'Add'),
          bg: on ? accent : 'transparent', border: on ? accent : '#3A3F4B', fg: on ? '#0F1115' : '#F3F4F6',
          toggle: function () { var ad = Object.assign({}, s.added); ad[id] = !on; var q5 = qClone(s.q); if (!on) { qMark({ q: q5 }, 'add', id); } self.setState({ added: ad, q: q5 }); }
        });
      });

      out.ftOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) {
        return Object.assign({ label: String(n) }, look(s.ft === n), { pick: function () { var q6 = qClone(s.q), t6 = { q: q6 }; qMark(t6, 'ft', todayStr()); qBump(t6, 'ftBest', n, null, 'max'); var fh = (s.ftHist || []).filter(function (x) { return x.d !== todayStr(); }).concat([{ d: todayStr(), n: n }]).slice(-12); self.setState({ ft: n, q: q6, ftHist: fh }); } });
      });
      var ftPct = s.ft === null ? '' : (en ? (s.ft * 10) + '%' : '%' + (s.ft * 10));
      out.ftNote = s.ft === null
        ? L('Henüz test yapılmadı.', 'No test recorded yet.')
        : L('Kaydedildi: 10 atışta ' + s.ft + ' isabet (' + ftPct + '). İstatistik sekmesinde görünüyor.', 'Saved: ' + s.ft + ' of 10 (' + ftPct + '). It now shows in the Stats tab.');

      var lbG = (ans.gender === 'female' || ans.gender === 'male') ? ans.gender : null;
      var gWord = lbG === 'female' ? L(' kızlar', ' girls') : (lbG === 'male' ? L(' erkekler', ' boys') : L(' grubu', ' group'));
      var groupName = (ans.league && ans.league !== 'none') ? ans.league + gWord : (lbG ? (lbG === 'female' ? L('Kızlar', 'Girls') : L('Erkekler', 'Boys')) : L('Grubum', 'My group'));
      var scope = s.scope === 'group' ? 'group' : ((s.scope === 'clan' && s.clan) ? 'clan' : 'all');
      var scopeDefs = [{ id: 'group', label: groupName }, { id: 'all', label: L('Herkes', 'Everyone') }];
      if (s.clan) { scopeDefs.push({ id: 'clan', label: L('Klanım', 'My clan') }); }
      out.scopes = scopeDefs.map(function (x) {
        var sel = scope === x.id;
        return { label: x.label, pressed: sel ? 'true' : 'false', bg: sel ? '#F3F4F6' : 'transparent', fg: sel ? '#0F1115' : '#F3F4F6', pick: function () { self.setState({ scope: x.id }); } };
      });
      out.breakdown = [
        { label: L('Görev', 'Missions'), value: String(wk.ptsQ || 0) },
        { label: L('Meydan okuma', 'Challenges'), value: String(wk.ptsC) },
        { label: L('Seri', 'Streak'), value: String(wk.ptsS) },
        { label: L('Antrenman', 'Workouts'), value: String(wk.ptsW) }
      ];
      out.rankCardLine = points > 0
        ? L('Bu hafta ' + points + ' puan topladın. Böyle devam.', 'You have ' + points + ' points this week. Keep going.')
        : L('Henüz puanın yok. İlk antrenman 30 puan, günün meydan okuması 50 puan, her görev 10 ile 100 puan arası.', 'No points yet. Your first workout is worth 30 points, the daily challenge 50, and each mission 10 to 100.');
      var lgName = sbLeague(ans);
      var lbKey = scope + '|' + (lgName || '') + '|' + (lbG || '') + '|' + weekStr();
      var lb = s.lb;
      if (tab === 'rank' && scope !== 'clan' && s.authed && s.sbOk !== false && (!lb || lb.key !== lbKey || Date.now() - lb.at > 60000) && !self.lbBusy) {
        setTimeout(function () { self.loadLb(lbKey, scope, lgName, lbG); }, 0);
      }
      var live = scope !== 'clan' && !!(lb && lb.key === lbKey && !lb.err);
      var meRow = function (rk) { return { rank: rk, name: nickShown, sub: s.streak + ' ' + a.streakLabel, points: String(points), bg: '#2A2016', bd: a0accent }; };
      var a0accent = '#FF8A3D';
      if (scope === 'clan') {
        out.rows = (s.clan.members || []).map(function (m, i) {
          return { rank: String(i + 1), name: m.nickname + (m.me ? L(' (sen)', ' (you)') : ''), sub: (m.streak || 0) + ' ' + a.streakLabel, points: String(m.points), bg: m.me ? '#2A2016' : '#1A1D24', bd: m.me ? a0accent : '#262A33' };
        });
        out.emptyText = L('Klanındaki arkadaşlarınla bu haftaki puanlar. Kodu paylaşıp daha fazla arkadaş çağırabilirsin.', 'This week\'s points with the friends in your clan. Share the code to bring more friends.');
      } else if (live) {
        out.rows = lb.rows.map(function (r) {
          return { rank: String(r.rank), name: r.nickname + (r.is_me ? L(' (sen)', ' (you)') : ''), sub: (r.streak || 0) + ' ' + a.streakLabel, points: String(r.points), bg: r.is_me ? '#2A2016' : '#1A1D24', bd: r.is_me ? a0accent : '#262A33' };
        });
        var others = lb.rows.length ? (lb.rows[0].total_players || lb.rows.length) - (lb.rows.some(function (r) { return r.is_me; }) ? 1 : 0) : 0;
        out.emptyText = others > 0
          ? L('Bu hafta ' + (lb.rows[0].total_players) + ' oyuncu puan topladı. Sıralama her pazartesi sıfırlanır. Arkadaşlarını davet et, onlarla yarış.', lb.rows[0].total_players + ' players scored this week. The ranking resets every Monday. Invite friends to compete with them.')
          : (points > 0
            ? L('Bu hafta puan toplayan ilk oyuncu sensin. Arkadaşlarını davet edersen burada onlarla yarışırsın.', 'You are the first player to score this week. Invite friends and you will compete with them here.')
            : L('Bu hafta henüz kimse puan toplamadı. İlk antrenmanı bitir, listeye ilk sen gir.', 'Nobody has scored yet this week. Finish your first workout and be first on the list.'));
      } else {
        out.rows = points > 0 ? [meRow('–')] : [];
        out.emptyText = s.sbOk === false
          ? L('Gerçek oyuncularla sıralamada görünmek için e-postanı bir kez doğrula. İlerlemen kaybolmaz.', 'Verify your email once to appear in the ranking with real players. Your progress stays.')
          : (lb && lb.err
            ? L('Sıralamaya şu an ulaşılamadı. İnternetini kontrol et; birazdan tekrar denenecek.', 'Could not load the ranking right now. Check your internet; it will try again shortly.')
            : L('Sıralama yükleniyor…', 'Loading the ranking…'));
      }
      out.hasRows = out.rows.length > 0;
      out.lbNeedLink = s.sbOk === false;
      out.lbLinkLabel = s.email ? L('E-postamı doğrula', 'Verify my email') : L('E-posta bağla', 'Connect email');
      out.lbLink = function () { self.setState({ authed: false, authStep: 'email', emailDraft: s.email || '', codeDraft: '', authErr: '', authInfo: '' }); };
      out.rules = [
        { label: L('Günlük antrenmanı bitir', 'Finish the daily workout'), value: '+20' },
        { label: L('Seriyi bir gün uzat', 'Extend your streak by a day'), value: '+10' },
        { label: L('Her 7 günlük seride bonus', 'Bonus for every 7-day streak'), value: '+70' },
        { label: L('Dinlenme günü (seriyi bozmaz)', 'Rest day (keeps your streak)'), value: L('haftada ' + restAllowed(s), restAllowed(s) + ' a week') },
        { label: L('Günün meydan okuması', 'Daily challenge'), value: '+50' },
        { label: L('Günlük görev', 'Daily mission'), value: '+' + QREW.d },
        { label: L('Haftalık görev', 'Weekly mission'), value: '+' + QREW.w },
        { label: L('Aylık görev', 'Monthly mission'), value: '+' + QREW.m }
      ];

      out.statsEmpty = s.totalWorkouts === 0 && s.ft === null && s.totalChallenges === 0 && !(s.shotAtt > 0) && !(s.totalQuests > 0);
      out.stats = [
        { label: L('Antrenman', 'Workouts'), value: String(wk.workouts), note: L('bu hafta · toplam ' + s.totalWorkouts, 'this week · ' + s.totalWorkouts + ' total') },
        { label: L('Çalışma süresi', 'Training time'), value: wk.minutes + L(' dk', ' min'), note: L('bu hafta', 'this week') },
        { label: L('Seri', 'Streak'), value: String(s.streak), note: L('gün', 'days') },
        { label: L('Puan', 'Points'), value: String(points), note: L('bu hafta · toplam ' + s.totalPoints, 'this week · ' + s.totalPoints + ' total') },
        { label: L('Serbest atış', 'Free throws'), value: s.ft === null ? '–' : ftPct, note: s.ft === null ? L('test yapılmadı', 'no test yet') : L('10 atışta ' + s.ft, s.ft + ' of 10') },
        { label: L('Şut isabeti', 'Shot accuracy'), value: (wk.shotAtt ? (en ? Math.round(wk.shotMade / wk.shotAtt * 100) + '%' : '%' + Math.round(wk.shotMade / wk.shotAtt * 100)) : '–'), note: (wk.shotAtt ? L(wk.shotMade + '/' + wk.shotAtt + ' bu hafta · toplam ' + (s.shotMade || 0) + '/' + (s.shotAtt || 0), wk.shotMade + '/' + wk.shotAtt + ' this week · ' + (s.shotMade || 0) + '/' + (s.shotAtt || 0) + ' total') : L('canlı şut takibiyle dolar', 'fills in with live shot tracking')) },
        { label: L('Görev', 'Missions'), value: String(s.totalQuests || 0), note: L('tamamlanan · bu hafta ' + (wk.ptsQ || 0) + ' puan', 'completed · ' + (wk.ptsQ || 0) + ' points this week') },
        { label: L('Seviye', 'Level'), value: String(level), note: L(s.totalPoints + ' toplam puan', s.totalPoints + ' points in total') }
      ];
      var maxMin = Math.max(30, Math.max.apply(null, wk.byDay));
      out.bars = dayNames.map(function (label, i) {
        var m = wk.byDay[i];
        return { label: DAYINIT[lang] ? DAYINIT[lang][i] : label.charAt(0), height: Math.max(4, Math.round(m / maxMin * 70)) + 'px', color: m > 0 ? accent : '#4A5060' };
      });
      // Son 8 hafta: çalışma dakikası ve şut isabeti; serbest atış testleri
      var lp = longProgress(s, lang);
      lp[lp.length - 1].mins = Math.max(lp[lp.length - 1].mins, wk.minutes || 0);
      var maxW = Math.max(60, Math.max.apply(null, lp.map(function (x) { return x.mins; })));
      out.longTitle = L('Son 8 hafta: çalışma süresi', 'Last 8 weeks: training time');
      out.longAria = L('Son 8 haftanın her biri için toplam çalışma dakikası', 'Total training minutes for each of the last 8 weeks');
      out.longBars = lp.map(function (x) { return { label: x.label, val: x.mins ? String(x.mins) : '', height: Math.max(4, Math.round(x.mins / maxW * 70)) + 'px', color: x.mins > 0 ? accent : '#4A5060' }; });
      var hasPct = lp.some(function (x) { return x.pct !== null; });
      out.pctShow = hasPct;
      out.pctTitle = L('Haftalık şut isabeti (kamerayla)', 'Weekly shooting accuracy (camera)');
      out.pctBars = lp.map(function (x) { return { label: x.label, val: x.pct === null ? '' : (en ? x.pct + '%' : '%' + x.pct), height: x.pct === null ? '4px' : Math.max(4, Math.round(x.pct / 100 * 70)) + 'px', color: x.pct === null ? '#4A5060' : '#7BD88F' }; });
      var fh = (s.ftHist || []).slice(-8);
      out.ftShow = fh.length > 0;
      out.ftTitle = L('Serbest atış testlerin (10 atışta)', 'Your free-throw tests (out of 10)');
      out.ftBars = fh.map(function (x) { var p = x.d.split('-'); return { label: (+p[2]) + '/' + (+p[1]), val: String(x.n), height: Math.max(4, Math.round(x.n / 10 * 70)) + 'px', color: accent }; });
      out.longNote = L('Grafik bu güncellemeden sonraki antrenmanlarla dolar; şut isabeti kamerayla kaydettiğin antrenmanlardan gelir.', 'The chart fills with workouts from this update on; shooting accuracy comes from sessions you saved with the camera.');

      out.badges = [
        { name: L('İlk antrenman', 'First workout'), on: s.totalWorkouts >= 1 },
        { name: L('İlk meydan okuma', 'First challenge'), on: s.totalChallenges >= 1 },
        { name: L('İlk serbest atış testi', 'First free-throw test'), on: s.ft !== null },
        { name: L('3 günlük seri', '3-day streak'), on: s.streak >= 3 },
        { name: L('7 günlük seri', '7-day streak'), on: s.streak >= 7 },
        { name: L('Oyuncu tarzı planı', 'Player-style plan'), on: playerMode },
        { name: L('İlk görev', 'First mission'), on: (s.totalQuests || 0) >= 1 },
        { name: L('10 görev', '10 missions'), on: (s.totalQuests || 0) >= 10 },
        { name: L('50 görev', '50 missions'), on: (s.totalQuests || 0) >= 50 },
        { name: L('Aylık görev', 'Monthly mission'), on: (s.totalQM || 0) >= 1 }
      ].map(function (b) {
        return { name: b.name, state: b.on ? L('Kazanıldı', 'Earned') : L('Kilitli', 'Locked'),
          bg: b.on ? '#2A2016' : '#1A1D24', border: b.on ? accent : '#1A1D24', fg: '#F3F4F6', sub: b.on ? accent : '#B4B9C4' };
      });

      out.reminderPressed = s.reminder ? 'true' : 'false';
      out.reminderState = s.remBusy ? L('Bekle…', 'Wait…') : (s.reminder ? L('Açık', 'On') : L('Kapalı', 'Off'));
      var remHour = typeof s.remHour === 'number' ? s.remHour : 18;
      var remSet = function (on, hour) {
        var sup = pushSupport();
        if (on && !sup.ok) { self.setState({ remNote: sup.iosNeedsInstall ? L('iPhone\'da bildirim için önce uygulamayı ana ekrana ekle (Safari → Paylaş → Ana Ekrana Ekle), sonra oradan açıp tekrar dene.', 'On iPhone, first add the app to your home screen (Safari → Share → Add to Home Screen), open it from there and try again.') : L('Bu tarayıcı bildirimleri desteklemiyor.', 'This browser does not support notifications.') }); return; }
        if (on && sup.iosNeedsInstall) { self.setState({ remNote: L('iPhone\'da bildirim için önce uygulamayı ana ekrana ekle (Safari → Paylaş → Ana Ekrana Ekle), sonra oradan açıp tekrar dene.', 'On iPhone, first add the app to your home screen (Safari → Share → Add to Home Screen), open it from there and try again.') }); return; }
        if (on && s.sbOk !== true) { self.setState({ remNote: L('Hatırlatma için önce e-postanı bağla. Böylece bugün antrenman yaptıysan sana boşuna bildirim gelmez.', 'Connect your email first. That way you only get a reminder on days you have not trained yet.') }); return; }
        self.setState({ remBusy: true, remNote: '' });
        (on ? self.pushNow().then(function () { return pushEnable(hour, lang); }) : pushDisable()).then(function () {
          self.setState({ remBusy: false, reminder: on, remHour: hour, remNote: on ? L('Tamam. Antrenman yapmadığın günlerde saat ' + hour + ':00 civarında hatırlatma gelecek.', 'Done. On days you have not trained, a reminder comes around ' + hour + ':00.') : L('Hatırlatma kapatıldı.', 'Reminder turned off.') });
        }).catch(function (e) {
          var denied = e && e.message === 'denied';
          self.setState({ remBusy: false, remNote: denied ? L('Bildirim izni verilmedi. Telefonun ayarlarından Green AI için bildirimlere izin verip tekrar dene.', 'Notification permission was not given. Allow notifications for Green AI in your phone settings and try again.') : L('Hatırlatma açılamadı. İnternetini kontrol edip tekrar dene.', 'Could not turn on the reminder. Check your internet and try again.') });
        });
      };
      out.toggleReminder = function () { if (!s.remBusy) { remSet(!s.reminder, remHour); } };
      out.remNote = s.remNote || '';
      out.remOn = !!s.reminder;
      out.remHourLabel = L('Hatırlatma saati', 'Reminder time');
      out.remHours = [16, 17, 18, 19, 20, 21].map(function (h) {
        var sel = remHour === h;
        return { label: h + ':00', pressed: sel ? 'true' : 'false', bg: sel ? '#F3F4F6' : 'transparent', fg: sel ? '#0F1115' : '#F3F4F6', pick: function () { if (!sel && !s.remBusy) { remSet(true, h); } } };
      });
      // Takma adı değiştir
      out.nickEditing = !!s.nickEdit; out.nickNotEditing = !s.nickEdit;
      out.nickDraft = s.nickDraft || '';
      var nd = String(s.nickDraft || '');
      out.nickDraftProblem = s.nickEdit && nd.length ? nickProblem(nd, L) : '';
      out.nickEditLabels = { open: L('Takma adı değiştir', 'Change nickname'), save: L('Kaydet', 'Save'), cancel: L('Vazgeç', 'Cancel'), label: L('Yeni takma ad', 'New nickname') };
      out.nickEditOpen = function () { self.setState({ nickEdit: true, nickDraft: nick }); };
      out.nickEditCancel = function () { self.setState({ nickEdit: false, nickDraft: '' }); };
      out.onNickDraft = function (e) { var v = (e && e.target && typeof e.target.value === 'string') ? e.target.value : ''; self.setState({ nickDraft: v.replace(/\s+/g, '').slice(0, 16) }); };
      out.nickEditSave = function () {
        if (nickProblem(nd, L)) { return; }
        var a6 = Object.assign({}, s.answers); a6.nick = nd;
        self.setState({ answers: a6, nickEdit: false, nickDraft: '' });
      };
      out.saveNote = this.storeOk
        ? L('Cevapların ve ilerlemen bu cihazda saklanıyor; uygulamayı tekrar açınca sorular yeniden sorulmaz.', 'Your answers and progress are stored on this device, so the questions are not asked again when you reopen the app.')
        : L('Bu önizlemede kayıt kapalı, bu yüzden sayfa yenilenince sorular yeniden sorulur. Gerçek uygulamada cevaplar bir kez sorulur.', 'Saving is off in this preview, so the questions come back after a reload. In the real app they are asked only once.');

      // ---------- Klan ----------
      var cl = s.clan || null, myRole = cl ? cl.role : null, isAdmin = myRole === 'owner' || myRole === 'admin';
      var roleName = function (r) { return r === 'owner' ? L('Kurucu', 'Founder') : (r === 'admin' ? L('Yönetici', 'Admin') : ''); };
      out.c2 = {
        needLink: s.sbOk !== true,
        loading: s.sbOk === true && !s.clanLoaded,
        none: s.sbOk === true && !!s.clanLoaded && !cl,
        inClan: !!cl,
        linkTitle: L('Klanlar için e-postanı bağla', 'Connect your email to use clans'),
        linkBody: L('Klanlar arkadaşlarınla birlikte antrenman yaptığın küçük gruplardır. Sohbet edebilir, birbirinizin puanını görebilirsiniz.', 'Clans are small groups where you train with friends. You can chat and see each other\'s points.'),
        loadingText: L('Klan bilgisi yükleniyor…', 'Loading your clan…'),
        createTitle: L('Klan kur', 'Create a clan'),
        createBody: L('Bir ad seç, sana bir katılma kodu verelim. Kodu sadece tanıdığın arkadaşlarınla paylaş.', 'Pick a name and you get a join code. Share the code only with friends you know.'),
        nameLabel: L('Klan adı', 'Clan name'),
        createBtn: L('Klanı kur', 'Create clan'),
        joinTitle: L('Koda katıl', 'Join with a code'),
        joinBody: L('Arkadaşının verdiği 6 haneli kodu yaz.', 'Enter the 6-character code your friend gave you.'),
        codeLabel: L('Klan kodu', 'Clan code'),
        joinBtn: L('Katıl', 'Join'),
        safety: L('Güvenlik: adres, telefon, okul gibi kişisel bilgilerini paylaşma. Seni rahatsız eden bir mesaj olursa şikayet et ve bir yetişkine söyle.', 'Safety: never share personal details like your address, phone number or school. If a message bothers you, report it and tell an adult.'),
        name: cl ? cl.name : '', code: cl ? cl.code : '',
        meta: cl ? L((cl.members || []).length + ' üye · kod: ', (cl.members || []).length + ' members · code: ') : '',
        shareBtn: L('Kodu paylaş', 'Share code'),
        tabChat: L('Sohbet', 'Chat'), tabMembers: L('Üyeler', 'Members'),
        announceOn: !!(cl && cl.announce),
        announceBanner: L('Duyuru modu: sadece kurucu ve yöneticiler yazabilir.', 'Announcement mode: only the founder and admins can write.'),
        canWrite: !!cl && (!cl.announce || isAdmin),
        writeLabel: L('Mesaj yaz', 'Write a message'),
        placeholder: L('Bugün ne çalıştın?', 'What did you train today?'),
        sendBtn: L('Gönder', 'Send'),
        empty: L('Henüz mesaj yok. İlk mesajı sen yaz: bugün ne çalıştın?', 'No messages yet. Write the first one: what did you train today?'),
        isAdmin: isAdmin,
        settingsTitle: L('Klan ayarları', 'Clan settings'),
        announceLabel: L('Sadece yöneticiler yazabilsin (duyuru modu)', 'Only admins can write (announcement mode)'),
        announcePressed: (cl && cl.announce) ? 'true' : 'false',
        announceState: (cl && cl.announce) ? L('Açık', 'On') : L('Kapalı', 'Off'),
        leaveBtn: s.leaveConfirm ? L('Emin misin? Ayrılmak için tekrar bas', 'Are you sure? Tap again to leave') : L('Klandan ayrıl', 'Leave clan'),
        rankTitle: L('Bu haftanın klan sıralaması', 'This week\'s clan ranking'),
        err: s.clanErr || '', busy: !!s.clanBusyUi,
        reportLbl: L('Şikayet et', 'Report'), deleteLbl: L('Sil', 'Delete'),
        reported: s.clanNote || ''
      };
      var cview = s.clanView === 'members' ? 'members' : 'chat';
      out.c2.viewChat = cview === 'chat'; out.c2.viewMembers = cview === 'members';
      out.c2.tabs = [{ id: 'chat', label: out.c2.tabChat }, { id: 'members', label: out.c2.tabMembers }].map(function (x) {
        var sel = cview === x.id;
        return { label: x.label, pressed: sel ? 'true' : 'false', bg: sel ? '#F3F4F6' : 'transparent', fg: sel ? '#0F1115' : '#F3F4F6', pick: function () { if (x.id === 'chat') { self.scrollChat = true; } self.setState({ clanView: x.id }); } };
      });
      out.clanNameDraft = s.clanNameDraft || '';
      out.clanCodeDraft = s.clanCodeDraft || '';
      out.chatDraft = s.chatDraft || '';
      out.onClanName = function (e) { self.setState({ clanNameDraft: String((e && e.target && e.target.value) || '').slice(0, 24), clanErr: '' }); };
      out.onClanCode = function (e) { self.setState({ clanCodeDraft: String((e && e.target && e.target.value) || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6), clanErr: '' }); };
      out.onChat = function (e) { self.setState({ chatDraft: String((e && e.target && e.target.value) || '').slice(0, 300), clanErr: '' }); };
      out.clanCreate = function () {
        var nm = String(s.clanNameDraft || '').trim();
        if (nm.length < 3) { self.setState({ clanErr: L('Klan adı en az 3 karakter olmalı.', 'The clan name must be at least 3 characters.') }); return; }
        if (!textOk(nm)) { self.setState({ clanErr: clanErr('bad_word', L) }); return; }
        clanCall(self, 'clan_create', { p_name: nm }, L, function () { self.setState({ clanNameDraft: '', clanView: 'chat' }); });
      };
      out.clanJoin = function () {
        if (String(s.clanCodeDraft || '').length !== 6) { self.setState({ clanErr: L('Kod 6 karakter olmalı.', 'The code must be 6 characters.') }); return; }
        clanCall(self, 'clan_join', { p_code: s.clanCodeDraft }, L, function () { self.setState({ clanCodeDraft: '', clanView: 'chat' }); });
      };
      out.clanSend = function () {
        var body = String(s.chatDraft || '').trim();
        if (!body || s.clanBusyUi) { return; }
        if (!textOk(body)) { self.setState({ clanErr: clanErr('bad_word', L) }); return; }
        if (!noContact(body)) { self.setState({ clanErr: clanErr('contact', L) }); return; }
        self.scrollChat = true;
        clanCall(self, 'clan_send', { p_body: body }, L, function () { self.setState({ chatDraft: '' }); });
      };
      out.clanShare = function () {
        if (!cl) { return; }
        var text = L('Green AI\'da klanıma katıl! Uygulamada Klan sekmesine gir ve bu kodu yaz: ', 'Join my clan on Green AI! Open the Clan tab in the app and enter this code: ') + cl.code;
        var link = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
        if (navigator.share) { navigator.share({ title: 'Green AI', text: text, url: link }).catch(function () {}); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(text + ' ' + link).then(function () { self.setState({ clanNote: L('Kod kopyalandı.', 'Code copied.') }); }, function () {}); }
      };
      out.clanToggleAnnounce = function () { if (cl) { clanCall(self, 'clan_set_announce', { p_on: !cl.announce }, L); } };
      out.clanLeave = function () {
        if (!s.leaveConfirm) { self.setState({ leaveConfirm: true }); setTimeout(function () { self.setState({ leaveConfirm: false }); }, 5000); return; }
        clanCall(self, 'clan_leave', {}, L, function () { self.setState({ leaveConfirm: false, scope: s.scope === 'clan' ? 'group' : s.scope }); });
      };
      out.clanMsgs = (s.clanMsgs || []).map(function (m) {
        var sel = s.msgSel === m.id;
        return {
          id: m.id, body: m.body, nick: m.mine ? L('Sen', 'You') : m.nickname, badge: roleName(m.role), hasBadge: !!roleName(m.role),
          time: msgTime(m.created_at, lang), mine: !!m.mine, theirs: !m.mine,
          align: m.mine ? 'flex-end' : 'flex-start', bg: m.mine ? '#3A2A1C' : '#1A1D24', bd: m.mine ? accent : '#262A33',
          sel: sel, canDelete: m.mine || isAdmin, canReport: !m.mine,
          aria: (m.mine ? L('Senin mesajın', 'Your message') : m.nickname) + ', ' + msgTime(m.created_at, lang),
          pick: function () { self.setState({ msgSel: sel ? null : m.id }); },
          del: function () { clanCall(self, 'clan_hide', { p_id: m.id }, L, function () { self.setState({ msgSel: null }); }); },
          report: function () { clanCall(self, 'clan_report', { p_id: m.id }, L, function () { self.setState({ msgSel: null, clanNote: L('Şikayetin alındı. 3 şikayet alan mesaj otomatik gizlenir.', 'Report received. A message with 3 reports is hidden automatically.') }); }); }
        };
      });
      out.c2.hasMsgs = out.clanMsgs.length > 0; out.c2.noMsgs = !out.c2.hasMsgs;
      out.clanMembers = ((cl && cl.members) || []).map(function (m, i) {
        var canKick = !m.me && m.role !== 'owner' && (myRole === 'owner' || (myRole === 'admin' && m.role === 'member'));
        var canPromote = myRole === 'owner' && !m.me && m.role !== 'owner';
        return {
          rank: String(i + 1), nick: m.nickname, meTag: m.me ? L('(sen)', '(you)') : '', badge: roleName(m.role), hasBadge: !!roleName(m.role),
          points: String(m.points), streak: (m.streak || 0) + ' ' + L('günlük seri', 'day streak'),
          bg: m.me ? '#2A2016' : '#1A1D24', bd: m.me ? accent : '#262A33',
          canKick: canKick, canPromote: canPromote, hasActions: canKick || canPromote,
          kickLbl: L('Çıkar', 'Remove'), promoteLbl: m.role === 'admin' ? L('Üye yap', 'Make member') : L('Yönetici yap', 'Make admin'),
          kick: function () { clanCall(self, 'clan_kick', { p_uid: m.uid }, L); },
          promote: function () { clanCall(self, 'clan_set_role', { p_uid: m.uid, p_role: m.role === 'admin' ? 'member' : 'admin' }, L); }
        };
      });

      out.editProfile = function () { self.setState({ screen: 1, langOpen: false }); };
      out.resetAll = function () {
        if (self.timer) { clearInterval(self.timer); self.timer = null; }
        try { window.localStorage.removeItem(STORE_KEY); } catch (err) {}
        var fresh = self.freshState();
        fresh.lang = s.lang;
        qEnsure(fresh);
        self.setState(fresh);
      };
    }

    return out;
  }
}

__comp = new Component({ accent: '#FF8A3D' });
__render();
