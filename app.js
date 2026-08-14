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
    renderAccess();
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

  var mapObserver = null;
  var mapTimer = null;

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
      if (mapObserver) { mapObserver.disconnect(); mapObserver = null; }
      if (mapTimer) { clearTimeout(mapTimer); mapTimer = null; }
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
      var mounted = $('iframe', slot);
      if (mounted) mounted.setAttribute('title', t('loc.maptitle'));
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

    observeMap(slot);
  }

  /* The observer, created once per slot and never on the update path, because
     renderMapSlot() runs again on every language switch and an observer built
     in there would stack one per switch.

     rootMargin is generous on purpose: 400px above the slot means the tiles are
     already arriving while the guest is still reading the address, so the map
     is there when they look down rather than starting to load when they get
     there. Nothing is requested from Google before that, so a guest who never
     scrolls to Location never contacts Google at all. */
  function observeMap(slot) {
    if (!('IntersectionObserver' in window)) {
      // A missing capability degrades to eager, never to absent. An old browser
      // pays for the map at first paint, which is worse than lazy and far
      // better than a permanently empty frame.
      mountMap(slot);
      return;
    }

    // Only reachable with a stale observer if the address was blanked and then
    // restored, which already disconnects. Cheap to be certain.
    if (mapObserver) { mapObserver.disconnect(); mapObserver = null; }

    mapObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        mountMap(slot);
        if (mapObserver) { mapObserver.disconnect(); mapObserver = null; }
        return;
      }
    }, { rootMargin: '400px 0px' });

    mapObserver.observe(slot);
  }

  /* The one place in this codebase that creates an element loading third party
     code, so it is spelled out rather than assumed. */
  function mountMap(slot) {
    /* The idempotency guard, and it is first for a reason: an observer may
       report the same target more than once, and a second pass here would
       append a second frame and buy a second copy of tiles the guest already
       has, on mobile data, outdoors. Idempotent by construction. */
    if ($('iframe', slot)) return;

    var venue = CFG.venue || {};
    var address = typeof venue.address === 'string' ? venue.address : '';
    if (!address) return;

    var frame = document.createElement('iframe');

    /* Keyless: q plus output=embed and nothing else. No API key, therefore no
       billing account, no cloud console project, and nothing for the owner to
       renew in eighteen months. The address goes through the same
       encodeURIComponent path the directions URLs use, so one address value has
       exactly one encoding rule and the a-ring survives all of them.

       Built with setAttribute on a created element, never by assigning markup,
       which is the discipline that keeps config.js from becoming an injection
       vector. */
    frame.setAttribute('src', 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed');
    frame.setAttribute('title', t('loc.maptitle'));
    frame.setAttribute('loading', 'lazy');
    /* Google is told which site asked, over HTTPS only, and never over a
       downgrade. It still sees the guest's IP and user agent, which is the
       unavoidable cost of an embedded map and is why the frame is not created
       until the guest actually approaches it. */
    frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    /* Two attributes are deliberately absent. Recorded here so nobody adds
       them later believing they are hardening anything.

       No sandbox: a sandboxed Maps embed cannot run its own scripts and renders
       blank, so it would trade a working map for a grey box. The frame is
       already cross origin isolated by the same origin policy and this page
       exposes no postMessage listener.

       No allow with geolocation: nothing in this section needs the guest's
       position, and asking would put a permission prompt between a cold guest
       and an address. */

    /* Unconditional, and that is the point. A load at second twelve on a
       genuinely terrible connection still resolves to a live map, because the
       blocked state below never removed anything. */
    frame.addEventListener('load', function () {
      if (mapTimer) { clearTimeout(mapTimer); mapTimer = null; }
      slot.setAttribute('data-state', 'ready');
    });

    slot.appendChild(frame);
    // Next frame, so the fade actually runs from the hidden state. Same idiom
    // as showNudge() and toast(), for the same reason.
    requestAnimationFrame(function () { frame.setAttribute('data-show', '1'); });

    /* One timer, held at module scope and cleared before it is set, the same
       shape as the toast and copy revert timers above.

       Eight seconds is long enough that a slow but working connection is not
       called a failure, and short enough that nobody is left watching a bar
       wondering whether the page is broken.

       It is a message swap and nothing else. The frame is not removed, its src
       is not cleared, and it is not stopped, because a timeout that destroys a
       working element is worse than the wait it was meant to fix. */
    if (mapTimer) clearTimeout(mapTimer);
    mapTimer = setTimeout(function () {
      mapTimer = null;
      if (slot.getAttribute('data-state') === 'ready') return;
      slot.setAttribute('data-state', 'blocked');
      var waiting = $('.map-wait__line', slot);
      if (waiting) waiting.textContent = t('loc.map.blocked');
    }, 8000);
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

  /* ----------------------------------------------------------------------
     THE ACCESS SECTION

     Three answers to three separate questions, in one fixed order: written
     directions, practical notes, video, back link. Text sits above the video
     and is never merely its fallback (D-12, D-15). A guest outdoors on a weak
     signal reads a numbered list long before a clip finishes loading, and the
     list still works on the evening the clip does not.

     One standing rule for everything rendered in here, stated now because
     plan 04 is built on it: any node that must survive a re-render is held in
     a module scope reference and re-appended, never recreated. #loc-map next
     door already works this way. Nothing in this plan needs it yet. The video
     element does, because rebuilding a <video> mid playback stops it dead in
     the hand of a guest who is watching it.
     ---------------------------------------------------------------------- */

  function subHeading(key) {
    var head = document.createElement('h3');
    head.className = 'sub-h';
    head.textContent = t(key);
    return head;
  }

  /* door.directions takes either one clean sentence or a list of short steps,
     and the shape it is written in decides the shape it renders as. A numbered
     walking sequence is far faster to follow at night than a prose sentence,
     and the owner should not be forced into a list to say one simple thing.

     Every entry goes in with textContent, so an owner authored string is text
     and never markup, however long the list gets. */
  function buildDirections() {
    var door = CFG.door || {};
    var value = door.directions;

    if (Array.isArray(value) && value.length) {
      var list = document.createElement('ol');
      list.className = 'steps';

      for (var i = 0; i < value.length; i++) {
        var step = typeof value[i] === 'string' ? value[i] : '';
        if (!step) continue;
        var item = document.createElement('li');
        item.textContent = step;
        list.appendChild(item);
      }

      // A list of one renders as a single row numbered 01. Slightly formal,
      // and exactly the register the rest of the page is written in.
      if (list.children.length) return list;
    } else if (typeof value === 'string' && value) {
      var prose = document.createElement('p');
      prose.className = 'dir-prose';
      prose.textContent = value;
      return prose;
    }

    /* Null, blank, an empty list, or a list holding nothing usable. One self
       titled panel, and the caller puts no sub-heading above it: a heading
       standing over a panel that already titles itself is the redundant state,
       and a heading standing over nothing is the broken one. */
    return pendingBlock('access.dir.pending.title', 'access.dir.pending.body');
  }

  function renderAccess() {
    var host = $('#access-body');
    if (!host) return;

    // Discards the static pending markup on the first run. Everything below is
    // rebuilt from config on every language switch.
    host.textContent = '';

    /* The order is the argument. Written directions, practical notes, video,
       back link, and plan 04 appends into this same sequence rather than
       reordering it. */
    var directions = buildDirections();
    if (!directions.classList.contains('pending')) {
      host.appendChild(subHeading('access.dir.heading'));
    }
    host.appendChild(directions);

    /* Interim placeholder standing in the video position, and plan 04 task 1
       deletes this line as it adds the real .video-slot. The two must never
       both render.

       It is here because clearing #access-body above throws away the static
       pending panel that is live on the deployed page right now, and this site
       deploys from main with no build step: a commit landing between this plan
       and the next is in front of guests within the minute. Both keys already
       ship in all three languages, so this costs no copy. Keep it the last
       statement in the function, so later blocks insert above it rather than
       stranding it in the middle of the section. */
    host.appendChild(pendingBlock('access.pending.title', 'access.pending.body'));
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
