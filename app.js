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

    // 'auto' only: guess from the browser, then let the guest override.
    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    if (nav.indexOf('it') === 0) return 'it';
    if (nav.indexOf('da') === 0) return 'da';
    return 'en';
  }

  // English is the fallback for any key a translation has not filled in yet,
  // so a missing string degrades to readable rather than to blank.
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
    renderLocation();
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
     LOCATION AND ACCESS
     The core value of the whole site. A guest standing outside a 76 unit
     kollegium at night needs the address readable in two seconds and one tap
     from a route. Everything here is optimised for that guest, not for this
     page being looked at on a desk.
     ====================================================================== */

  /* Rebuilds the .pending block that index.html ships as static markup. The
     first render replaces the container's contents, so the static one is gone
     and every later pending state has to be built here instead.

     createElement plus textContent, never a markup string: config values flow
     through these nodes and that discipline is what keeps config.js from
     becoming an injection vector. */
  function pendingBlock(titleKey, bodyKey) {
    var box = document.createElement('div');
    box.className = 'pending';

    var head = document.createElement('p');
    head.className = 'pending__t';
    head.textContent = t(titleKey);

    var body = document.createElement('p');
    body.className = 'pending__b';
    body.textContent = t(bodyKey);

    box.appendChild(head);
    box.appendChild(body);
    return box;
  }

  /* Directions URLs, not place URLs, per D-05. A place URL drops the guest on a
     pin and asks them to press one more thing in the cold. Both of these open
     the native app when it is installed, on both platforms. The address is
     encoded once, which is what keeps the a-ring and the spaces from
     truncating the query. */
  function directionsUrls(address) {
    var q = encodeURIComponent(address);
    return {
      google: 'https://www.google.com/maps/dir/?api=1&destination=' + q,
      apple: 'https://maps.apple.com/?daddr=' + q + '&dirflg=d'
    };
  }

  /* D-06, evaluated in order, any positive signal wins.

     Handing a Danish guest on Android an Apple Maps button gives them a web
     page they cannot act on, so it is withheld there. The failure mode is the
     part worth stating: when every signal is absent or unreadable this returns
     true, because a button that does nothing on one platform is a smaller harm
     than hiding the right button from someone standing outside who needed it.

     Never inferred from screen width, from touch support, or by opening the URL
     and measuring what happens. Those all guess, and this only reads. */
  function isApplePlatform() {
    var seen = false;

    try {
      var uad = navigator.userAgentData;
      if (uad && typeof uad.platform === 'string' && uad.platform) {
        seen = true;
        if (/mac|ios|iphone|ipad/i.test(uad.platform)) return true;
      }
    } catch (e) { /* unreadable signal counts as absent, not as non Apple */ }

    try {
      if (typeof navigator.platform === 'string' && navigator.platform) {
        seen = true;
        // iPadOS 13 and later report MacIntel, and on a desktop Mac the link
        // does open the Maps app, so the Mac prefix is deliberate.
        if (/^(iPhone|iPad|iPod|Mac)/.test(navigator.platform)) return true;
      }
    } catch (e) { /* same */ }

    try {
      if (typeof navigator.userAgent === 'string' && navigator.userAgent) {
        seen = true;
        if (/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)) return true;
      }
    } catch (e) { /* same */ }

    // A signal was present and clearly non Apple, so hide it. No signal at all
    // is inconclusive, and inconclusive shows both.
    return !seen;
  }

  function renderLocation() {
    var host = $('#location-body');
    if (!host) return;

    var venue = CFG.venue || {};

    /* #location-body owns two separate children. #loc-data is cleared and
       rebuilt on every language switch. The map slot that arrives later is a
       sibling, created once, because rebuilding it would tear down a mounted
       iframe and make the guest pay Google a second time on mobile data. */
    var data = $('#loc-data', host);
    if (!data) {
      host.textContent = '';          // discards the static pending markup
      data = document.createElement('div');
      data.id = 'loc-data';
      host.appendChild(data);
    } else {
      data.textContent = '';
    }

    /* Branch rather than early return, because the map slot below has to be
       reconciled in both directions. An address that is later blanked must
       take its map with it, and that only happens if the last line runs on
       every path through this function. */
    var address = typeof venue.address === 'string' ? venue.address : '';
    if (!address) {
      data.appendChild(pendingBlock('loc.pending.title', 'loc.pending.body'));
    } else {
      var box = document.createElement('div');
      box.className = 'addr';

      var label = document.createElement('p');
      label.className = 'addr__label';
      label.textContent = t('loc.address');
      box.appendChild(label);

      var value = document.createElement('p');
      value.className = 'addr__value';

      /* Split on the first comma only: street on one line, postcode and city and
         country on the second. Two short lines are read in one glance outdoors,
         a single line wrapping wherever a 340px screen decides is not. This is
         presentation only. venue.address stays intact for the copy action and
         the map URLs, which must never be rebuilt out of the rendered lines. */
      var lines = [];
      var cut = address.indexOf(',');
      if (cut === -1) {
        lines.push(address);
      } else {
        lines.push(address.slice(0, cut));
        lines.push(address.slice(cut + 1).replace(/^\s+/, ''));
      }
      for (var i = 0; i < lines.length; i++) {
        var line = document.createElement('span');
        line.textContent = lines[i];
        value.appendChild(line);
      }
      box.appendChild(value);

      if (venue.note) {
        var note = document.createElement('p');
        note.className = 'addr__note';
        note.textContent = venue.note;
        box.appendChild(note);
      }

      data.appendChild(box);

      /* Actions sit in their own row below the address. This block is only ever
         reached with an address in hand, so there is no disabled button and no
         dead affordance anywhere in the section. Absent beats greyed out. */
      var dirs = document.createElement('div');
      dirs.className = 'dirs';

      var urls = directionsUrls(address);

      /* Google is the filled accent button because it works on every platform and
         is the universal answer. That also keeps exactly one filled accent button
         in this section, matching the hero and the nudge bar. */
      var google = document.createElement('a');
      google.className = 'btn btn--primary';
      google.textContent = t('loc.google');
      google.setAttribute('href', urls.google);
      google.setAttribute('target', '_blank');
      google.setAttribute('rel', 'noopener');
      dirs.appendChild(google);

      // Apple only where it can act, and absent from the DOM rather than hidden.
      if (isApplePlatform()) {
        var apple = document.createElement('a');
        apple.className = 'btn btn--ghost';
        apple.textContent = t('loc.apple');
        apple.setAttribute('href', urls.apple);
        apple.setAttribute('target', '_blank');
        apple.setAttribute('rel', 'noopener');
        dirs.appendChild(apple);
      }

      /* Copy goes last. Both handoffs belong under the thumb, and copying an
         address is the least urgent of the three things a guest does here.

         No loading state and no error state on either handoff: this is a
         navigation handoff, the OS owns the transition, and every heuristic for
         whether a native app opened produces false negatives on slow devices.
         That refusal is deliberate, and recorded so nobody adds one later. */
      var copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn btn--ghost copybtn';
      copy.textContent = t('loc.copy');
      dirs.appendChild(copy);

      data.appendChild(dirs);
    }

    renderMapSlot();
  }

  /* ----------------------------------------------------------------------
     THE MAP SLOT

     Last in the section because it is the slowest and least essential thing
     in it. The address and both handoffs are already usable above, which is
     the sentence the waiting copy exists to say out loud.

     The slot is a sibling of #loc-data, not a child, and it is created once
     and never rebuilt. #loc-data is emptied on every language switch, and
     emptying a mounted map would send the guest's phone back to Google for a
     second copy of tiles it already has, on mobile data, outdoors.
     ---------------------------------------------------------------------- */

  function renderMapSlot() {
    var host = $('#location-body');
    if (!host) return;

    var venue = CFG.venue || {};
    var address = typeof venue.address === 'string' ? venue.address : '';
    var slot = $('#loc-map', host);

    /* No address, no map. Nothing to point at, so the section falls back to
       exactly one pending block and nothing else: no empty frame, no grey
       rectangle standing in for a decision that has not been made. */
    if (!address) {
      if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
      return;
    }

    /* The slot already exists, so this is a language switch. Update the
       translated strings in place and touch nothing else. Rebuilding here is
       what would cost the guest a second request. */
    if (slot) {
      var line = $('.map-wait__line', slot);
      if (line) {
        line.textContent = slot.getAttribute('data-state') === 'blocked'
          ? t('loc.map.blocked')
          : t('loc.map.loading');
      }
      return;
    }

    slot = document.createElement('div');
    slot.id = 'loc-map';
    slot.className = 'map-slot';
    slot.setAttribute('data-state', 'mounting');

    var wait = document.createElement('div');
    wait.className = 'map-wait';

    // Empty by design: it is the loader bar, and it says nothing a screen
    // reader needs, because the line below it says all of it in words.
    var bar = document.createElement('div');
    bar.className = 'map-wait__bar';
    wait.appendChild(bar);

    var text = document.createElement('p');
    text.className = 'map-wait__line';
    text.textContent = t('loc.map.loading');
    wait.appendChild(text);

    slot.appendChild(wait);
    host.appendChild(slot);
  }

  var copyRevert = null;

  /* Two confirmation channels for one action, on purpose. On a phone the button
     is under the guest's thumb at the moment its label changes, so they may
     never see it. The toast is bottom centre, carries the full sentence, and
     #toast already owns the polite live region, so assistive tech is served
     without putting aria-live on the control itself. */
  function copyFeedback(btn, state, labelKey, toastKey, ms) {
    btn.setAttribute('data-state', state);
    btn.textContent = t(labelKey);
    toast(t(toastKey));

    // One timer, cleared first, so repeated taps do not stack reverts.
    if (copyRevert) clearTimeout(copyRevert);
    copyRevert = setTimeout(function () {
      btn.removeAttribute('data-state');
      btn.textContent = t('loc.copy');
    }, ms);
  }

  /* Tier one of D-10. The copied string is always CFG.venue.address, never text
     read back out of the DOM, so the a-ring and the o-slash survive byte for
     byte with no normalisation on the way through. */
  function copyAddress(btn) {
    var venue = CFG.venue || {};
    var address = typeof venue.address === 'string' ? venue.address : '';
    if (!address) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(function () {
          copyFeedback(btn, 'copied', 'loc.copied', 'loc.copied.toast', 2000);
        }, function () {
          copyByHand(btn, address);
        });
        return;
      }
    } catch (e) { /* no async clipboard here, fall through to tier two */ }

    copyByHand(btn, address);
  }

  /* Tiers two and three. Older iOS Safari and some in app browsers have no
     async clipboard but still honour execCommand. When that refuses too, the
     address is selected on the page instead, which puts the guest one long
     press from their own copy menu. Never a silent failure, and never a console
     message as the guest facing outcome. */
  function copyByHand(btn, address) {
    var ok = false;
    try {
      var pad = document.createElement('textarea');
      pad.value = address;
      pad.setAttribute('readonly', 'readonly');   // stops iOS raising the keyboard
      pad.style.position = 'fixed';
      pad.style.top = '-1000px';
      pad.style.opacity = '0';
      document.body.appendChild(pad);
      pad.select();
      if (pad.setSelectionRange) pad.setSelectionRange(0, address.length);
      ok = document.execCommand('copy') === true;
      document.body.removeChild(pad);
    } catch (e) { ok = false; }

    if (ok) {
      copyFeedback(btn, 'copied', 'loc.copied', 'loc.copied.toast', 2000);
      return;
    }

    try {
      var value = $('.addr__value');
      if (value && window.getSelection && document.createRange) {
        var range = document.createRange();
        range.selectNodeContents(value);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) { /* the selection is a courtesy, losing it changes nothing */ }

    copyFeedback(btn, 'failed', 'loc.copy.failed', 'loc.copy.failed.toast', 4000);
  }

  /* Delegated from the stable container and wired once from init(), because
     renderLocation() re-runs on every language switch and a listener attached
     in there would stack a duplicate handler per switch. */
  function wireLocation() {
    var host = $('#location-body');
    if (!host) return;

    host.addEventListener('click', function (ev) {
      var node = ev.target;
      var btn = (node && node.closest) ? node.closest('.copybtn') : null;
      if (!btn && node && node.classList && node.classList.contains('copybtn')) btn = node;
      if (!btn) return;
      copyAddress(btn);
    });
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

  /* Credentials alone are not enough to justify a nudge. Having a database
     does not mean there is a form to submit, and a bar that pushes someone
     toward a placeholder is worse than no bar at all.

     So this gates on the form actually existing in the page. Phase 3 renders
     #enrol-form, and the nudge switches itself on the moment it does, with no
     flag to remember to flip. */
  function enrollmentReady() {
    var p = CFG.photos || {};
    var configured = Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
    return configured && Boolean($('#enrol-form'));
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
     INIT
     ====================================================================== */

  function init() {
    lang = resolveInitialLang();
    wireNudge();
    wireLocation();
    applyLanguage();
    startClock();

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
