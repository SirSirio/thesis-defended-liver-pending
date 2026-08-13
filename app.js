/* ==========================================================================
   COURSE 03102
   No framework, no build step. Loaded after config.js and copy.js.
   ========================================================================== */

(function () {
  'use strict';

  var CFG  = window.PARTY_CONFIG || {};
  var COPY = window.PARTY_COPY || {};

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ======================================================================
     STORAGE
     Private browsing and locked down browsers throw on localStorage access,
     so every call goes through here and the site keeps working regardless.
     ====================================================================== */

  var store = {
    get: function (k) {
      try { return window.localStorage.getItem('c03102.' + k); }
      catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem('c03102.' + k, v); return true; }
      catch (e) { return false; }
    }
  };

  /* ======================================================================
     LANGUAGE
     ====================================================================== */

  var SUPPORTED = ['it', 'en', 'da'];
  var lang = 'en';

  function resolveInitialLang() {
    var saved = store.get('lang');
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;

    var configured = CFG.defaultLanguage;
    if (configured && configured !== 'auto' && SUPPORTED.indexOf(configured) !== -1) return configured;

    // Guess from the browser, then let the guest override.
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return nav.toLowerCase().indexOf('it') === 0 ? 'it' : 'en';
  }

  // Danish only ever covers a handful of strings. Everything else falls
  // through to English, which is the joke and also the correct behaviour.
  function t(key) {
    var table = COPY[lang] || {};
    if (table[key] != null) return table[key];
    if (COPY.en && COPY.en[key] != null) return COPY.en[key];
    return '';
  }

  function applyLanguage() {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);

    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (!val) return;

      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });

    $$('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });

    renderSchedule();
    renderCountdown();
    renderDeadline();
    renderNudge();
  }

  function setLanguage(next) {
    if (SUPPORTED.indexOf(next) === -1) return;
    lang = next;
    store.set('lang', next);
    applyLanguage();
  }

  /* ======================================================================
     COUNTDOWN
     The target carries an explicit UTC offset in config.js, so every guest
     counts down to the same instant no matter which country they are in.
     ====================================================================== */

  var startMs = Date.parse(CFG.startsAt);
  var endMs   = Date.parse(CFG.endsAt);

  var els = {
    root:   $('#countdown'),
    d:      $('#cd-d'),
    h:      $('#cd-h'),
    m:      $('#cd-m'),
    s:      $('#cd-s'),
    status: $('#cd-status'),
    note:   $('#cd-note'),
    sr:     $('#cd-sr')
  };

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function phase(now) {
    if (isNaN(startMs)) return 'before';
    if (now < startMs) return 'before';
    if (!isNaN(endMs) && now >= endMs) return 'over';
    return 'live';
  }

  var lastSrMinute = null;

  function renderCountdown() {
    if (!els.root) return;

    var now = Date.now();
    var state = phase(now);
    els.root.setAttribute('data-state', state);

    if (state === 'before') {
      var left = Math.max(0, startMs - now);
      var totalSec = Math.floor(left / 1000);

      var d = Math.floor(totalSec / 86400);
      var h = Math.floor((totalSec % 86400) / 3600);
      var m = Math.floor((totalSec % 3600) / 60);
      var s = totalSec % 60;

      els.d.textContent = pad(d);
      els.h.textContent = pad(h);
      els.m.textContent = pad(m);
      els.s.textContent = pad(s);

      els.status.hidden = true;
      els.note.hidden = true;

      // Announce once a minute rather than once a second, so screen reader
      // users are informed instead of assaulted.
      if (els.sr && m !== lastSrMinute) {
        lastSrMinute = m;
        els.sr.textContent = d + ' ' + t('countdown.days') + ', ' +
                             h + ' ' + t('countdown.hours') + ', ' +
                             m + ' ' + t('countdown.minutes');
      }
      return;
    }

    var titleKey = state === 'live' ? 'countdown.live.title' : 'countdown.over.title';
    var noteKey  = state === 'live' ? 'countdown.live.note'  : 'countdown.over.note';
    var labelKey = state === 'live' ? 'countdown.live.label' : 'countdown.over.label';

    var label = $('.countdown__label', els.root);
    if (label) label.textContent = t(labelKey);

    els.status.textContent = t(titleKey);
    els.status.hidden = false;
    els.note.textContent = t(noteKey);
    els.note.hidden = false;
    if (els.sr) els.sr.textContent = t(titleKey);
  }

  var tick = null;

  function startClock() {
    renderCountdown();
    if (tick) clearInterval(tick);
    tick = setInterval(renderCountdown, 1000);
  }

  // A backgrounded tab throttles timers, so the clock is re-synced on return
  // rather than left showing a stale value.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) startClock();
  });

  /* ======================================================================
     COURSE FACTS driven by config
     ====================================================================== */

  function formatSchedule() {
    if (isNaN(startMs)) return t('facts.location.tbd');

    var locale = lang === 'it' ? 'it-IT' : (lang === 'da' ? 'da-DK' : 'en-GB');
    var opts = {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Copenhagen'
    };
    try {
      return new Intl.DateTimeFormat(locale, opts).format(new Date(startMs));
    } catch (e) {
      return new Date(startMs).toLocaleString();
    }
  }

  function renderSchedule() {
    var sched = $('#fact-schedule');
    if (sched) sched.textContent = formatSchedule();

    var num = $('#fact-number');
    if (num && CFG.course && CFG.course.number) num.textContent = CFG.course.number;

    var badge = $('#course-mark');
    if (badge && CFG.course && CFG.course.number) badge.textContent = CFG.course.number;

    var host = $('#fact-host');
    if (host && CFG.course && CFG.course.host) host.textContent = CFG.course.host;

    var loc = $('#fact-location');
    if (loc) {
      var venue = CFG.venue || {};
      if (venue.name || venue.address) {
        loc.textContent = venue.name || venue.address;
        loc.removeAttribute('data-i18n');
      } else {
        loc.setAttribute('data-i18n', 'facts.location.tbd');
        loc.textContent = t('facts.location.tbd');
      }
    }
  }

  /* ======================================================================
     ENROLLMENT DEADLINE and NUDGE
     The form itself arrives in phase 3. The pressure to use it is built
     here, because it depends only on the clock.

     Rule: an enrolled guest is never nudged again. Nagging someone who has
     already done the thing is the fastest way to lose them.
     ====================================================================== */

  var deadlineMs = Date.parse((CFG.enrollment || {}).deadline);

  function daysUntil(ms) {
    return Math.ceil((ms - Date.now()) / 86400000);
  }

  function formatDate(ms) {
    var locale = lang === 'it' ? 'it-IT' : (lang === 'da' ? 'da-DK' : 'en-GB');
    try {
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Copenhagen'
      }).format(new Date(ms));
    } catch (e) { return new Date(ms).toLocaleDateString(); }
  }

  function isEnrolled() { return store.get('enrolled') === '1'; }

  function renderDeadline() {
    var el = $('#hero-deadline');
    var fact = $('#fact-deadline');
    if (isNaN(deadlineMs)) {
      if (el) el.hidden = true;
      return;
    }

    if (fact) fact.textContent = formatDate(deadlineMs);

    if (!el) return;
    if (isEnrolled() || Date.now() > deadlineMs) { el.hidden = true; return; }

    el.textContent = t('hero.deadline').replace('{date}', formatDate(deadlineMs));
    el.hidden = false;
    el.setAttribute('data-urgent', daysUntil(deadlineMs) <= 7 ? '1' : '0');
  }

  /* The bar has two states. Not enrolled, it asks you to enroll. Enrolled,
     it hands you the group link, which is the one remaining thing to do. */
  function renderNudge() {
    var bar = $('#nudge');
    if (!bar) return;

    var text = $('#nudge-text');
    var cta  = $('#nudge-cta');
    var wa   = (CFG.whatsapp || {}).inviteUrl;

    // Dismissed for this session, so leave it alone.
    if (sessionDismissed) { hideNudge(bar); return; }

    if (!isEnrolled()) {
      // Phase 3 turns this on. Until enrollment exists there is nothing to
      // nudge toward, so the bar stays down rather than pointing at a
      // placeholder.
      if (!enrollmentReady()) { hideNudge(bar); return; }

      var days = isNaN(deadlineMs) ? null : daysUntil(deadlineMs);
      var msg;
      if (days === null || days > 7) msg = t('nudge.enrol.text');
      else if (days > 1)             msg = t('nudge.enrol.soon').replace('{n}', days);
      else if (days === 1)           msg = t('nudge.enrol.last');
      else if (days === 0)           msg = t('nudge.enrol.today');
      else { hideNudge(bar); return; }   // deadline passed, stop asking

      bar.setAttribute('data-state', 'enrol');
      text.textContent = msg;
      cta.textContent = t('nudge.enrol.cta');
      cta.setAttribute('href', '#enrol');
      cta.removeAttribute('target');
      showNudge(bar);
      return;
    }

    // Enrolled. Offer the group once, then never bother them again.
    if (wa && store.get('wa_joined') !== '1') {
      bar.setAttribute('data-state', 'group');
      text.textContent = t('nudge.group.text');
      cta.textContent = t('nudge.group.cta');
      cta.setAttribute('href', wa);
      cta.setAttribute('target', '_blank');
      cta.setAttribute('rel', 'noopener');
      showNudge(bar);
      return;
    }

    hideNudge(bar);
  }

  function enrollmentReady() {
    var p = CFG.photos || {};
    return Boolean(p.supabaseUrl && p.supabaseAnonKey);
  }

  function showNudge(bar) {
    bar.hidden = false;
    document.body.setAttribute('data-nudge', '1');
    requestAnimationFrame(function () { bar.setAttribute('data-show', '1'); });
  }

  function hideNudge(bar) {
    bar.removeAttribute('data-show');
    document.body.removeAttribute('data-nudge');
    setTimeout(function () { bar.hidden = true; }, 240);
  }

  var sessionDismissed = false;

  function wireNudge() {
    var close = $('#nudge-close');
    var cta = $('#nudge-cta');
    var bar = $('#nudge');
    if (!bar) return;

    if (close) close.addEventListener('click', function () {
      sessionDismissed = true;
      hideNudge(bar);
    });

    // Tapping through to WhatsApp counts as done.
    if (cta) cta.addEventListener('click', function () {
      if (bar.getAttribute('data-state') === 'group') {
        store.set('wa_joined', '1');
        hideNudge(bar);
      }
    });
  }

  /* ======================================================================
     TOAST
     ====================================================================== */

  var toastEl = $('#toast');
  var toastTimer = null;

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    // Next frame, so the transition actually runs from the hidden state.
    requestAnimationFrame(function () { toastEl.setAttribute('data-show', '1'); });

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.removeAttribute('data-show');
      setTimeout(function () { toastEl.hidden = true; }, 260);
    }, 2400);
  }

  /* ======================================================================
     EASTER EGG: Danish
     Three clicks on the language of instruction row. Deliberately findable
     by anyone who pokes at things, invisible to anyone who does not.
     ====================================================================== */

  function wireDanishEgg() {
    var row = $('#lang-egg');
    var btn = $('.langswitch__egg');
    if (!row || !btn) return;

    if (store.get('da_found') === '1') { btn.hidden = false; return; }

    var hits = 0;
    function bump() {
      hits += 1;
      if (hits < 3) return;
      btn.hidden = false;
      store.set('da_found', '1');
      toast(t('lang.da.found'));
    }

    row.addEventListener('click', bump);
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bump(); }
    });
  }

  /* ======================================================================
     INIT
     ====================================================================== */

  function init() {
    lang = resolveInitialLang();
    wireNudge();
    applyLanguage();
    startClock();
    wireDanishEgg();

    $$('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLanguage(btn.getAttribute('data-set-lang'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
