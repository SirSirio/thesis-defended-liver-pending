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
    /* Written on every set, whether or not localStorage accepted it, and that
       is what makes the private browsing path work: a guest there registers,
       sees their receipt and gets the handoff for the whole session, and
       nothing survives a reload, which is the honest outcome rather than a
       broken page (D-17, ID-06). The site tells them nothing is wrong, because
       nothing they can act on is.

       Unconditional on purpose. A map that only filled in after a failed write
       would go stale the moment one write succeeded, and a read after a
       mid-session quota failure would then hand back the wrong value. */
    mem: {},

    /* Probed once, by writing and removing a key rather than by touching the
       object, because Safari in private mode exposes localStorage and throws on
       setItem rather than on access. */
    ok: (function () {
      try {
        window.localStorage.setItem('c03102.probe', '1');
        window.localStorage.removeItem('c03102.probe');
        return true;
      } catch (e) { return false; }
    })(),

    get: function (k) {
      if (this.ok) {
        try { return window.localStorage.getItem('c03102.' + k); }
        catch (e) { /* fall through to the map */ }
      }
      return Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null;
    },

    // Still returns a boolean, and the c03102. prefix is still applied in here
    // so callers keep passing bare keys. Both are load bearing: lang, enrolled
    // and wa_joined already flow through this and phase 4 will too.
    set: function (k, v) {
      this.mem[k] = String(v);
      if (this.ok) {
        try { window.localStorage.setItem('c03102.' + k, String(v)); return true; }
        catch (e) { this.ok = false; }   // quota exceeded part way through a session
      }
      return false;
    },

    remove: function (k) {
      delete this.mem[k];
      if (this.ok) {
        try { window.localStorage.removeItem('c03102.' + k); }
        catch (e) { /* gone from the map either way */ }
      }
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
    /* Before renderNudge(), and the order is load bearing. renderEnrollment()
       is what creates #enrol-form, and the bar's readiness gate below tests for
       that element existing. The other way round the bar is one render behind
       on first paint, which on a phone means it never appears at all until the
       guest switches language. */
    renderEnrollment();
    /* Beside the enrollment renderer and also before the bar, so the section and
       the bar read the same config value in the same pass and cannot disagree
       about the link on first paint. */
    renderWhatsApp();
    renderNudge();
    renderLocation();
    renderAccess();

    /* Non blocking, so its position in this list costs nothing. A switch has to
       re-render its two labels and re-sort the names into the new language's
       collation, which is why it is in the chain at all. */
    renderSocialProof();

    /* Last, and after the sweep above has rewritten every string in the bar.
       Danish wraps the nudge copy onto a second line, which makes the bar
       taller, and a reserve measured before the rewrite would be a reserve for
       the previous language. */
    measureNudge();
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
    /* The caption below the slot. It is a sibling of the slot rather than a
       child of it, because the CSS reveal keys on the slot's own state through
       an adjacent sibling selector, and because a caption inside a fixed ratio
       box would have to sit on top of the map. */
    var note = $('#loc-map-note', host);

    /* No address, no map. Nothing to point at, so the section falls back to
       exactly one pending block and nothing else: no empty frame, no grey
       rectangle standing in for a decision that has not been made. The caption
       goes with the slot, so a blanked address leaves no orphan sentence
       standing under nothing. */
    if (!address) {
      if (mapObserver) { mapObserver.disconnect(); mapObserver = null; }
      if (mapTimer) { clearTimeout(mapTimer); mapTimer = null; }
      if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
      if (note && note.parentNode) note.parentNode.removeChild(note);
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
      if (note) note.textContent = t('loc.map.fallback');
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

    /* Appended immediately after the slot and never between them, because the
       stylesheet reveals this sentence through an adjacent sibling selector and
       anything inserted in between would break the reveal silently.

       It is present in every state rather than only in the failed one. A page
       cannot read the inside of a cross origin frame, so it cannot tell a map
       from Google's own error page, a captive portal or a rate limit notice.
       All of those complete, and a sentence that only appears when the failure
       is detectable is no help on the network where it is not. */
    note = document.createElement('p');
    note.id = 'loc-map-note';
    note.className = 'map-note';
    note.textContent = t('loc.map.fallback');
    host.appendChild(note);

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

    /* This event proves that a document arrived. It does not prove that the
       document is a map, and it cannot: Google's own error pages, a captive
       portal login, a rate limit notice and a blocked network's browser error
       page are all completed documents and all fire it. So the state it writes
       reads as 'a document arrived' and nothing stronger, and the caption below
       the slot carries the guidance for the guest who got one of the others.

       It deliberately does not cancel the timer below. Cancelling a fallback on
       evidence this weak is what made the blocked message unreachable on the
       fast failure network. The timer's own guard decides instead.

       Unconditional, and that is the point. A load at second twelve on a
       genuinely terrible connection still resolves to a live map, because the
       blocked state below never removed anything. */
    frame.addEventListener('load', function () {
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
      /* This guard, and not the load handler, is the one place that decides.
         The ready state now means only that a document arrived, so leaving
         quietly here is right on both readings of it: if that document is the
         map, there is nothing to say, and if it is not, the guest already has
         the caption under the slot pointing back at the address and the two
         buttons above it. Contradicting a frame that is showing something is
         the one outcome worth avoiding, because it sends a guest away from an
         affordance that may well be serving them.

         Nothing arriving at all is the other reading, and that one still lands
         below: the message swaps, and the frame stays exactly where it is. */
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

  /* A literal ordered array rather than Object.keys, so the render order is a
     property of this file and not of what an owner did to config.js at two in
     the morning. Door questions first, because the section is written for
     somebody already standing outside. What to bring and when to arrive are
     read before leaving home, so they sit last. */
  var NOTE_KEYS = ['entrance', 'floor', 'buzzer', 'parking', 'transit', 'bring', 'arrive'];

  /* The page's own institutional list, reused rather than replaced by a card
     grid. The density is part of the parody, and a guest who has already read
     the course fact table knows how to read this the moment they see it.

     Labels come from copy.js so a Danish guest never meets an English one.
     Values come from config.js and are shown exactly as written in every
     language. That is a documented tradeoff, not an oversight: an address
     fragment like "3. sal" should not be translated, and a per language notes
     object is a structure a non programmer would get wrong. */
  function buildNotes() {
    var notes = (CFG.venue || {}).notes || {};

    var list = document.createElement('dl');
    list.className = 'facts facts--notes';

    for (var i = 0; i < NOTE_KEYS.length; i++) {
      var key = NOTE_KEYS[i];
      var value = notes[key];

      // A row the owner has not filled in contributes nothing at all. No n/a
      // filler and no empty row: the absence is the honest answer (D-16).
      if (typeof value !== 'string' || !value) continue;

      var row = document.createElement('div');
      row.className = 'facts__row';

      var label = document.createElement('dt');
      label.textContent = t('notes.' + key);
      row.appendChild(label);

      var cell = document.createElement('dd');
      cell.textContent = value;
      row.appendChild(cell);

      list.appendChild(row);
    }

    // Nothing filled in, so there is nothing to title. The caller adds neither
    // the sub-heading nor the list, rather than shipping an empty shell.
    return list.children.length ? list : null;
  }

  /* The player is the first node on this page that genuinely needs the module
     scope rule stated in the banner above. renderAccess() clears #access-body
     on every language switch, and rebuilding a <video> mid playback stops it
     dead in the hand of a guest who is watching it, thirty seconds after they
     changed the language to read the heading above it. So the element is held
     here and re-appended, exactly the way #loc-map next door is kept.

     The failure flag is held beside it for the same reason. Once a source has
     errored, re-appending it would fire the same error on every re-render and
     flash a broken player between each one. */
  var videoEl = null;
  var videoMountedSrc = '';
  var videoFailed = false;

  /* Returns a slot in every case, configured or not, and that is the whole
     design (D-11). The unconfigured state is not a stopgap standing in for the
     player: it is a panel of the player's exact size and shape, so the day the
     owner sets one line in config.js the video appears and nothing below it
     moves by a pixel.

     The ratio is read from config rather than measured from the viewport, so
     the box is already the right shape before a single byte of video has been
     requested. A clip filmed upright gets an upright box instead of being
     letterboxed into the black pillars D-14 forbids outright. */
  function buildVideo() {
    var door = CFG.door || {};

    var slot = document.createElement('div');
    slot.className = 'video-slot';

    /* Anything unparseable falls back to landscape rather than to a collapsed
       box. A wrong shape is a far smaller harm than no shape, which would drop
       the section's height to zero and undo everything above. */
    var parts = typeof door.aspect === 'string' ? door.aspect.split('/') : [];
    var wide = parseFloat(parts[0]);
    var tall = parseFloat(parts[1]);
    if (!(wide > 0) || !(tall > 0)) { wide = 16; tall = 9; }

    slot.style.setProperty('--video-aspect', wide + '/' + tall);
    // The CSS cap that keeps a 9 by 16 clip from being taller than the phone
    // it is read on. Deterministic, and it needs no viewport arithmetic.
    if (wide < tall) slot.setAttribute('data-orient', 'portrait');

    var src = typeof door.videoSrc === 'string' ? door.videoSrc : '';

    /* No file yet. One panel, filling the slot, and no video element is
       constructed at all: an empty <video> is a black rectangle wearing a
       broken control bar. Both strings have been live in all three languages
       since phase 1, so the deliberate state costs no copy (D-18). */
    if (!src) {
      slot.appendChild(pendingBlock('access.pending.title', 'access.pending.body'));
      return slot;
    }

    // The configured file is not the one being held, so the held element is
    // stale. Discard it and build fresh rather than re-appending the old one.
    if (videoMountedSrc !== src) {
      videoEl = null;
      videoFailed = false;
      videoMountedSrc = src;
    }

    /* This file already failed once. The panel it resolved to is rendered
       directly, so a language switch does not put a broken player back on the
       page just to watch it break again. */
    if (videoFailed) {
      slot.appendChild(pendingBlock('access.pending.title', 'access.pending.body'));
      return slot;
    }

    // A re-render with the same file. Re-appended, never rebuilt: playback
    // continues untouched and the metadata is not fetched a second time.
    if (videoEl) {
      slot.appendChild(videoEl);
      return slot;
    }

    var video = document.createElement('video');

    /* The pair that keeps iOS Safari from taking the whole screen the instant
       a guest presses play (D-13, ACC-01). Both are set as attributes AND as
       properties: older WebKit honours the property where an attribute set
       after creation is ignored, and either one alone fails inline playback.
       They are a pair, they are asserted as a pair, and neither of them ever
       ships without the other.

       Nothing here starts by itself and nothing calls play from script. A clip
       that begins moving on its own, in a section a guest opened to read, is
       both a bandwidth cost they did not agree to and a noise risk. */
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.muted = true;

    /* Native controls, required by ACC-01 and not restyled anywhere in this
       codebase. A hand rolled player is pure failure surface on iOS Safari.

       Metadata only, so a guest outdoors on mobile data pays for the shape of
       the file rather than the whole of it before deciding to watch. */
    video.setAttribute('controls', '');
    video.setAttribute('preload', 'metadata');

    /* Set only when there is something to point at. An empty poster attribute
       makes Safari request the page itself as an image, so it is omitted
       entirely rather than written blank. */
    var poster = typeof door.posterSrc === 'string' ? door.posterSrc : '';
    if (poster) video.setAttribute('poster', poster);

    /* On the element itself rather than inside a child source element, so a
       file that is missing fires its error on the node this handler is
       attached to. A child would fire on the child, and this would never
       hear it. */
    video.setAttribute('src', src);

    /* The sanctioned exception to the rule that listeners live in a wire
       function. This element is created once and held at module scope, so the
       listener is attached exactly once and cannot stack across re-renders.

       Wrong path, missing file, unsupported codec: to a guest standing outside
       these are one event and deserve one message, and it is the same message
       an unmade clip gets. Nothing is written to the console and no browser
       text reaches the page. The owner catches the difference in config.js,
       which is the file they were going to open anyway. */
    video.addEventListener('error', function () {
      videoFailed = true;
      var box = video.parentNode;
      if (!box) return;
      box.textContent = '';
      box.appendChild(pendingBlock('access.pending.title', 'access.pending.body'));
    });

    videoEl = video;
    slot.appendChild(video);
    return slot;
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

    var notes = buildNotes();
    if (notes) {
      host.appendChild(subHeading('access.notes.heading'));
      host.appendChild(notes);
    }

    /* The heading and the slot are unconditional, unlike the two blocks above.
       Nothing has to be checked first because the slot always renders
       something at the player's ratio, so there is no path here where a
       heading stands over nothing. */
    host.appendChild(subHeading('access.video.heading'));
    host.appendChild(buildVideo());

    /* A link and not a third button. This is a jump within the page rather
       than an action, the fact table already uses this component for exactly
       that, and a third large button under a video would compete with the two
       directions buttons, which are the real actions on this page.

       The href does the whole job. No scripted scroll is attached anywhere,
       because the smooth behaviour in styles.css already becomes an instant
       jump inside the reduced motion query, and a scripted scroll would drive
       straight past a preference the guest set deliberately. */
    var back = document.createElement('a');
    back.className = 'inline-link inline-link--back';
    back.setAttribute('href', '#location');
    back.textContent = t('access.back');
    host.appendChild(back);
  }

  /* ======================================================================
     ENROLLMENT: IDENTITY

     One uuid, generated in the browser, written once, kept forever. It never
     appears in the page, never in a URL, and never in a link a guest could
     share. This is the whole identity system: no login, no email, no password,
     and no surface anywhere on the site that asks a guest their name twice.
     ====================================================================== */

  /* Feature detected by function type and not by property presence, because on
     an insecure origin the crypto object is absent altogether rather than
     merely missing the method.

     The fallback builds a real version 4 string, bits and all, rather than a
     random hex run, because the column is typed uuid and a malformed one comes
     back 400 with code 22P02.

     Returning null when there is no crypto at all is deliberate and is not a
     missing case. A pseudo random id would collide on the unique constraint and
     hand a 409 to a guest who has never registered, which reads as "you are
     already enrolled" to someone who is not. Null lands cleanly in the pending
     branch instead, which is this site's established answer to "this cannot
     work here". */
  function newGuestId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // Safari before 15.4, and any non secure context that still has the object.
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      var b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40;      // version 4
      b[8] = (b[8] & 0x3f) | 0x80;      // variant 10xx
      var h = [];
      for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
      return h[0] + h[1] + h[2] + h[3] + '-' + h[4] + h[5] + '-' + h[6] + h[7] + '-' +
             h[8] + h[9] + '-' + h[10] + h[11] + h[12] + h[13] + h[14] + h[15];
    }

    return null;
  }

  // Probed once. A browser that cannot mint an identity renders the pending
  // panel and no form, so the nudge bar stays down with it.
  var IDENTITY_OK = newGuestId() !== null;

  /* The storage layout under the c03102. prefix, exactly: lang, enrolled,
     wa_joined, guest_id, name, extra_guests, note. The first three were written
     by phase 1 and are neither renamed nor repurposed, because live guests
     already carry them on their devices.

     enrolled is the string 1 and is cleared to the string 0, because
     isEnrolled() compares against that exact string and renderNudge() and
     renderDeadline() both read it. Writing true, or the number 1, or removing
     the key are three subtly different things and only one of them is right. */
  var identity = {
    get: function () {
      var n = parseInt(store.get('extra_guests'), 10);
      return {
        guest_id: store.get('guest_id'),
        name: store.get('name'),
        extra_guests: isNaN(n) ? 0 : n,
        note: store.get('note'),
        enrolled: store.get('enrolled') === '1'
      };
    },

    save: function (f) {
      if (f.guest_id) store.set('guest_id', f.guest_id);
      if (typeof f.name === 'string') store.set('name', f.name);
      // A decimal string, read back with parseInt base 10, so no float and no
      // locale formatting ever enters storage.
      store.set('extra_guests', String(f.extra_guests == null ? 0 : f.extra_guests));
      if (f.note == null || f.note === '') store.remove('note');
      else store.set('note', f.note);
      store.set('enrolled', f.enrolled === false ? '0' : '1');
    },

    /* Withdrawing clears the registration, not the identity (D-15). Forgetting
       the device clears both, and that is what this is for.

       Every key this phase writes is removed rather than blanked, the flag
       included. A guest who hands their phone to somebody else has asked for no
       residue, and a flag left sitting at the string 0 is residue: it is a
       record that this device was once used to register, which is exactly the
       fact they asked to have removed. The absent flag reads as not enrolled
       everywhere it is tested, because every reader compares against the string
       1 and nothing else. */
    clear: function () {
      store.remove('guest_id');
      store.remove('name');
      store.remove('extra_guests');
      store.remove('note');
      store.remove('enrolled');
    }
  };

  /* ======================================================================
     ENROLLMENT: THE WIRE

     Plain fetch against PostgREST. No client library, no CDN script tag, on a
     page whose whole point is loading fast on bad mobile data outdoors.
     ====================================================================== */

  function sbUrl() { return (CFG.photos || {}).supabaseUrl || ''; }

  function sbKey() {
    var p = CFG.photos || {};
    return p.supabaseKey || p.supabaseAnonKey || '';
  }

  /* The identical expression the nudge bar's readiness gate uses, including its
     acceptance of either key name, or the two functions would disagree about
     the same configuration and the bar would nudge toward a panel. */
  function sbConfigured() {
    var p = CFG.photos || {};
    return Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
  }

  /* Resolves to { ok, status, code, body } and never rejects, so no call site
     needs a catch and no code path can leave the submit button locked.

     The key travels in the apikey header and nowhere else. A bearer header
     carrying a publishable key hard fails 401 on its own, and duplicating the
     value into it rides a documented exception clause whose own wording reads
     like it is describing a future rejection. One header, verified working,
     correct for both the publishable and the legacy key formats config.js
     promises the owner, and one fewer header from a phone on mobile data.

     The body is read as text and parsed only when there is something to parse.
     A return=minimal insert answers 201 with an empty body and the amend
     function answers with a bare integer; handing either to the JSON reader
     throws, the outer catch would call it a network failure, and every
     successful registration would land in the failure state. That is the single
     most likely way to break the happy path on this project.

     The settlement is unconditional; the abort is not, and the difference
     matters. A browser with fetch and no AbortController is a real population,
     and there the timer used to fire into nothing: the fetch went on hanging,
     neither branch below ran, and the promise never settled at all. Every
     caller's state reset lives in one of those branches, so on that population
     setFormState(form,'submitting') became permanent, the whole form stayed
     disabled with every typed value trapped behind it, and the withdrawal
     confirmation stayed frozen the same way, with no recovery short of a
     reload. That falsified both of the invariants written down for this
     helper and for setFormState: that no code path can leave the button
     locked, and that no call site needs a catch.

     Racing the wire against a timeout that resolves is what makes those two
     sentences true rather than merely asserted. The abort still fires wherever
     it can, because a request nobody is waiting for should not stay on the
     wire; the answer no longer depends on it having taken effect. The timer is
     cleared once the race resolves, on both outcomes. */
  function sbRequest(method, path, body, prefer, timeoutMs) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = null;

    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () {
        if (ctl) ctl.abort();
        // The same shape the catch returns. To a guest a request that failed
        // and one that never answered are the same event.
        resolve({ ok: false, status: 0, code: 'NETWORK', body: null });
      }, timeoutMs || 12000);
    });

    var headers = { 'apikey': sbKey() };
    if (body) headers['Content-Type'] = 'application/json';
    if (prefer) headers['Prefer'] = prefer;

    var opts = { method: method, headers: headers };
    if (body) opts.body = JSON.stringify(body);
    if (ctl) opts.signal = ctl.signal;

    var wire = fetch(sbUrl() + path, opts).then(function (res) {
      return res.text().then(function (txt) {
        var parsed = null;
        if (txt) {
          try { parsed = JSON.parse(txt); } catch (e) { parsed = null; }
        }
        return {
          ok: res.ok,
          status: res.status,
          code: (parsed && parsed.code) || null,
          body: parsed
        };
      });
    }).catch(function () {
      // Abort, offline, DNS failure, CORS. To a guest these are one event.
      return { ok: false, status: 0, code: 'NETWORK', body: null };
    });

    return Promise.race([wire, timeout]).then(function (out) {
      clearTimeout(timer);
      return out;
    });
  }

  /* Three outcomes only, so the caller has three branches rather than thirteen:
       ok       the registration is in the database
       pending  the owner has not re-run supabase/schema.sql yet
       failed   anything else, and the guest sees the failure state

     Classified on the code field and never on the message string, which is
     English, unstable, and embeds constraint names.

     Prefer: return=minimal is not relaxed and the row is never asked for back
     in any form. Both read-back preferences answer 401 with code 42501 AND the
     row is not written, and the message blames the insert policy while the real
     cause is the missing read policy. */
  function submitEnrollment(fields, ident) {
    var row = {
      guest_id: ident.guest_id,
      name: fields.name,
      extra_guests: fields.extra_guests,
      note: fields.note,          // already null, never the empty string
      lang: lang                  // the resolved module variable, never a raw locale
    };

    return sbRequest('POST', '/rest/v1/enrollments', row, 'return=minimal')
      .then(function (res) {
        /* Any 2xx, and read the same way the two RPC callers read theirs. There
           is nothing to disambiguate with: Prefer: return=minimal guarantees an
           empty body, so a 2xx on this path means the row was written and
           nothing else it could mean. Gating on the one exact status this
           endpoint happens to answer today reports a written row as a lost one
           the day a proxy normalises it, in the single most important branch in
           the file. */
        if (res.ok) return { result: 'ok' };

        /* Not a failure. This browser already holds a registration, which D-15
           makes reachable by design, and a lost response on a bad connection
           makes it reachable by accident. The guest sees one success. A 409 is
           not ok, so it reaches this test exactly as it did before. */
        if (res.status === 409 && res.code === '23505') return amendEnrollment(fields, ident);

        return { result: 'failed', code: res.code };
      });
  }

  /* An update request against the table itself is never built here. The live
     probe proved it matches zero rows and answers 204, so the guest would be
     told it worked and nothing would happen, on every device, forever. The
     function runs as its owner instead and hands back the number of rows it
     touched, which is the only honest answer available. */
  function amendEnrollment(fields, ident) {
    var args = {
      p_guest_id: ident.guest_id,
      p_name: fields.name,
      p_extra_guests: fields.extra_guests,
      p_note: fields.note === null ? '' : fields.note,   // empty means clear it
      p_lang: lang,
      p_withdrawn: false
    };

    return sbRequest('POST', '/rest/v1/rpc/amend_enrollment', args, null)
      .then(function (res) {
        // The owner has not re-run the schema file. A pending state, not an
        // error: the registration is intact and the copy says so.
        if (res.status === 404 && res.code === 'PGRST202') return { result: 'pending' };

        // A bare integer: rows touched.
        if (res.ok && res.body === 1) return { result: 'ok' };
        if (res.ok && res.body === 0) return { result: 'failed', code: 'NOT_FOUND' };

        return { result: 'failed', code: res.code };
      });
  }

  /* The edit path's controller, and the reason it exists is the zero.

     A row count of zero is not a failure and must not be shown as one. It means
     this device is holding a guest id the database has never seen, which a lost
     response on a bad connection produces, and which the owner clearing the
     table also produces. The honest recovery is to write the registration the
     guest plainly believes they have, so the insert runs and they experience
     one success rather than a dead end they can do nothing about.

     The insert cannot bounce back here in a loop: its own conflict branch calls
     the amend function directly, not this one. */
  function saveAmendment(fields, ident) {
    return amendEnrollment(fields, ident).then(function (res) {
      if (res.result === 'failed' && res.code === 'NOT_FOUND') {
        return submitEnrollment(fields, ident);
      }
      return res;
    });
  }

  /* Leaving. The guest id and the flag, and deliberately nothing else.

     Every other argument is omitted rather than sent, and the function
     coalesces an omitted argument against the column's existing value, so a
     parameter this call has no business choosing cannot blank a column on the
     way past. Widening this argument list is how leaving the course quietly
     becomes a rewrite of somebody's name.

     Three outcomes plus the wire, all read from the integer the function hands
     back and from its error code, never from a status code. On this project a
     status code is not proof of anything: a blocked read answers with an empty
     list and a blocked delete answers 204, and both look exactly like success.
     That is the entire reason this function exists instead of an update.

       ok       the row was found and flagged, which is the real thing
       gone     zero rows, so the database holds no registration under this
                guest id at all. The device and the database disagree, and the
                honest answer is to believe the database and correct the device:
                the guest's stated intent is already satisfied, and arguing with
                them about a row they are structurally forbidden from seeing
                would be absurd
       pending  the owner has not re-run supabase/schema.sql
       failed   the request never arrived */
  function withdrawEnrollment(ident) {
    var args = { p_guest_id: ident.guest_id, p_withdrawn: true };

    return sbRequest('POST', '/rest/v1/rpc/amend_enrollment', args, null)
      .then(function (res) {
        if (res.status === 404 && res.code === 'PGRST202') return { result: 'pending' };

        // A bare integer: rows touched.
        if (res.ok && res.body === 1) return { result: 'ok' };
        if (res.ok && res.body === 0) return { result: 'gone' };

        return { result: 'failed', code: res.code };
      });
  }

  /* ======================================================================
     ENROLLMENT: THE FORM AND THE PANELS

     #enrol-body holds exactly one of five bodies. This plan ships four of
     them: the inherited pending block, the form, the success receipt and the
     returning view. Plan 05 adds the withdrawn state.
     ====================================================================== */

  // Session only. A reload turns the success panel into the returning view,
  // which is correct: success is a moment and the registration is a status.
  var successShown = false;
  var amendPending = false;

  /* Editing is a mode of the one registration screen rather than a second
     screen, which is why there is no change your name control anywhere on this
     site: changing a name and changing a registration are the same act, so they
     are the same form (D-16, ID-04). Session only, like the two flags above. */
  var editing = false;

  /* Session only, and that is the whole design of the state it drives. On the
     next load an unenrolled guest with a stored name gets the form, prefilled,
     carrying the ordinary submit label, which is already correct and needs no
     state of its own to express it. */
  var withdrawnShown = false;

  function maxGuests() {
    var n = parseInt((CFG.enrollment || {}).maxGuestsPerPerson, 10);
    if (isNaN(n) || n < 0) return 0;
    return n;
  }

  function clampGuests(n, max) {
    if (isNaN(n) || n < 0) return 0;
    return n > max ? max : n;
  }

  /* ----------------------------------------------------------------------
     VALIDATION

     Every validator returns a copy KEY or null, never a rendered string, so a
     message survives a language switch without being re-computed.

     Two channels, two jobs, and conflating them is the usual mistake. A field
     error is DESCRIBED through aria-describedby and is never announced. A
     failed submit is ANNOUNCED through the alert role, which carries an
     assertive politeness and interrupts. Assertive is right for a submit that
     did not happen and wrong for a character the guest is still typing.

     The newer ARIA error-message attribute is deliberately not used anywhere
     here, and its absence is a decision rather than an oversight. MDN
     recommends it, but its screen reader support is materially weaker than
     aria-describedby, and this site's audience is on phones running VoiceOver
     and TalkBack.
     ---------------------------------------------------------------------- */

  function validateName(v) {
    // Trimmed first, because the database bound is computed on the trimmed
    // value and a name of sixty spaces is not a name.
    var s = (v || '').trim();
    if (!s) return 'enrol.err.nameRequired';
    if (s.length > 60) return 'enrol.err.nameLong';
    return null;
  }

  function validateNote(v) {
    return (v || '').length > 500 ? 'enrol.err.noteLong' : null;
  }

  function validateGuests(v) {
    var max = maxGuests();
    var n = parseInt(v, 10);
    if (isNaN(n) || n < 0 || n > max) return 'enrol.err.guestsRange';
    return null;
  }

  // The closest lookup guarded and the manual walk kept as the fallback, the
  // same shape wireLocation() uses.
  function fieldWrap(el) {
    var node = (el && el.closest) ? el.closest('.field') : null;
    if (node) return node;

    node = el ? el.parentNode : null;
    while (node && node.classList) {
      if (node.classList.contains('field')) return node;
      node = node.parentNode;
    }
    return null;
  }

  /* The sole owner of the aria wiring, so no call site can set half of it and
     leave a control that looks invalid and reads as fine, or the reverse. The
     copy key is stored on the control so a language switch can re-render a
     currently visible error without re-running validation. */
  function showFieldError(input, errKey) {
    var wrap = fieldWrap(input);
    var err = document.getElementById(input.id + '-err');

    if (errKey) {
      input.setAttribute('aria-invalid', 'true');
      if (wrap) wrap.setAttribute('data-invalid', 'true');
      if (err) err.textContent = t(errKey);
      input.setAttribute('data-errkey', errKey);
      return;
    }

    input.setAttribute('aria-invalid', 'false');
    if (wrap) wrap.setAttribute('data-invalid', 'false');
    if (err) err.textContent = '';
    input.removeAttribute('data-errkey');
  }

  function wireField(input, validate) {
    input.addEventListener('blur', function () {
      /* Untouched and empty says nothing at all. The guidance is explicit: do
         not mark an empty required control invalid until the guest attempts to
         submit, because they may still be working on it. Scolding somebody for
         tabbing past a field they have not reached yet is the fastest way to
         make a short form feel hostile. */
      if (!input.value && !input.getAttribute('data-touched')) return;
      showFieldError(input, validate(input.value));
    });

    input.addEventListener('input', function () {
      input.setAttribute('data-touched', '1');
      // Only while an error is already showing, so it clears the instant it is
      // fixed and never appears mid-word.
      if (input.getAttribute('aria-invalid') === 'true') {
        showFieldError(input, validate(input.value));
      }
    });
  }

  /* The radiogroup is absent from this list by construction: it carries a
     checked default and cannot hold an invalid value. enrol.err.guestsRange
     exists for the select branch and for a tampered DOM. */
  function fieldValidators(form) {
    var out = [];

    var name = $('#enrol-name', form);
    if (name) out.push({ input: name, validate: validateName });

    var guests = $('#enrol-guests', form);
    if (guests && guests.tagName === 'SELECT') {
      out.push({ input: guests, validate: validateGuests });
    }

    var note = $('#enrol-note', form);
    if (note) out.push({ input: note, validate: validateNote });

    return out;
  }

  // Populates every error node and hands back the first invalid control, so the
  // caller can move focus to it rather than leaving the guest to hunt.
  function validateAll(form) {
    var first = null;

    fieldValidators(form).forEach(function (pair) {
      var key = pair.validate(pair.input.value);
      showFieldError(pair.input, key);
      if (key && !first) first = pair.input;
    });

    return first;
  }

  /* One .field row: label, control, hint, error. The error node exists from the
     first render and is empty when the field is valid, so aria-describedby is
     written once in markup and is never added or removed, which is where most
     hand rolled forms break screen readers. An empty node contributes nothing
     to the accessible description, so this is correct in the valid state too. */
  function buildField(spec) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.setAttribute('data-invalid', 'false');

    /* A radiogroup is labelled by this node through aria-labelledby rather than
       wrapped in a fieldset and legend: a legend inside a grid container has
       documented layout bugs in Safari, and every workaround either duplicates
       the string into two nodes or hacks the legend out of flow. One string,
       one node, byte identical semantics. */
    var label = document.createElement(spec.group ? 'p' : 'label');
    label.className = 'field__label';
    label.setAttribute('data-i18n', spec.labelKey);
    label.textContent = t(spec.labelKey);
    if (spec.group) label.id = spec.id + '-label';
    else label.setAttribute('for', spec.id);
    wrap.appendChild(label);

    var control = document.createElement('div');
    control.className = 'field__control';
    control.appendChild(spec.control);

    var hint = document.createElement('p');
    hint.className = 'field__hint';
    hint.id = spec.id + '-hint';
    hint.setAttribute('data-i18n', spec.hintKey);
    hint.textContent = t(spec.hintKey);
    control.appendChild(hint);

    var err = document.createElement('p');
    err.className = 'field__err';
    err.id = spec.id + '-err';
    control.appendChild(err);

    wrap.appendChild(control);
    return wrap;
  }

  /* Zero placeholder attributes anywhere in this phase, and that is a decision
     rather than an omission: a placeholder is not a label, it vanishes the
     moment somebody types, and it is one more string whose contrast has to be
     defended. Every field is labelled with words that stay on the screen. */
  function buildNameInput(value) {
    var el = document.createElement('input');
    el.className = 'field__input';
    el.id = 'enrol-name';
    el.name = 'name';
    el.type = 'text';
    el.setAttribute('maxlength', '60');
    el.setAttribute('required', 'required');
    el.setAttribute('autocomplete', 'name');
    el.setAttribute('autocapitalize', 'words');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('enterkeyhint', 'next');
    el.setAttribute('aria-describedby', 'enrol-name-hint enrol-name-err');
    if (value) el.value = value;
    return el;
  }

  /* A segmented radio group is one tap for a three value choice, shows every
     option at once, needs nothing opened or closed, and reuses the selected
     segment grammar .langswitch already ships. A stepper would put a disabled
     control on the happy path and a native picker is three interactions on iOS.

     Above four values the segments no longer fit at 320px and the field renders
     as a native select over the same range instead. That is the documented
     overflow branch, not a fallback. */
  function buildGuestsControl(max, value) {
    if (max > 4) {
      var sel = document.createElement('select');
      sel.className = 'field__select';
      sel.id = 'enrol-guests';
      sel.name = 'extra_guests';
      sel.setAttribute('aria-describedby', 'enrol-guests-hint enrol-guests-err');
      for (var i = 0; i <= max; i++) {
        var opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = String(i);
        if (i === value) opt.selected = true;
        sel.appendChild(opt);
      }
      return sel;
    }

    var set = document.createElement('div');
    set.className = 'segset';
    set.id = 'enrol-guests';
    set.setAttribute('role', 'radiogroup');
    set.setAttribute('aria-labelledby', 'enrol-guests-label');
    set.setAttribute('aria-describedby', 'enrol-guests-hint enrol-guests-err');

    for (var j = 0; j <= max; j++) {
      var seg = document.createElement('label');
      seg.className = 'seg';

      // Visually hidden and fully real: the native inputs still supply the
      // grouping, the arrow key roving and the checked state for free.
      var radio = document.createElement('input');
      radio.className = 'sr-only';
      radio.type = 'radio';
      radio.name = 'extra_guests';
      radio.value = String(j);
      if (j === value) radio.checked = true;

      var face = document.createElement('span');
      face.textContent = String(j);

      seg.appendChild(radio);
      seg.appendChild(face);
      set.appendChild(seg);
    }
    return set;
  }

  function buildNoteControl(value) {
    var el = document.createElement('textarea');
    el.className = 'field__textarea';
    el.id = 'enrol-note';
    el.name = 'note';
    el.setAttribute('rows', '3');
    el.setAttribute('maxlength', '500');
    el.setAttribute('autocapitalize', 'sentences');
    el.setAttribute('enterkeyhint', 'done');
    el.setAttribute('aria-describedby', 'enrol-note-hint enrol-note-err');
    if (value) el.value = value;
    return el;
  }

  /* Name, guests, note, in that order and for one reason: name is required and
     is the fastest field on the page because autocomplete fills it in a single
     tap, guest count is one tap so it costs nothing in the middle, and the note
     is the only field that costs typing, so it goes last and a guest who does
     not want it reaches the submit with their thumb already moving down. */
  function buildForm(mode) {
    var ident = identity.get();
    var max = maxGuests();

    var form = document.createElement('form');
    form.id = 'enrol-form';
    form.className = 'enrol-form';
    /* novalidate suppresses the browser's own validation bubbles. They are
       unstyleable, wrongly registered, and rendered in the browser's language
       rather than the site's, which breaks trilingual parity the first time a
       Danish guest with an English browser leaves the name blank. */
    form.setAttribute('novalidate', 'novalidate');
    form.setAttribute('data-state', 'idle');
    if (mode === 'edit') form.setAttribute('data-mode', 'edit');

    form.appendChild(buildField({
      id: 'enrol-name',
      labelKey: 'enrol.form.name.label',
      hintKey: 'enrol.form.name.hint',
      control: buildNameInput(ident.name || '')
    }));

    // Zero extra guests permitted: the whole field is absent rather than a one
    // option control, and the request sends zero.
    if (max > 0) {
      form.appendChild(buildField({
        id: 'enrol-guests',
        // Only the radiogroup branch is labelled by reference. The select
        // branch is a real control and takes a real label with a for.
        group: max <= 4,
        labelKey: 'enrol.form.guests.label',
        hintKey: 'enrol.form.guests.hint',
        control: buildGuestsControl(max, clampGuests(ident.extra_guests, max))
      }));
    }

    form.appendChild(buildField({
      id: 'enrol-note',
      labelKey: 'enrol.form.note.label',
      hintKey: 'enrol.form.note.hint',
      control: buildNoteControl(ident.note || '')
    }));

    /* In the DOM from the first render, hidden, and unhidden and filled on
       failure. Many screen readers will not announce a live region that is
       inserted at the same moment its content is written. It sits directly
       above the action row so the message and the retry button are one object
       under the thumb. */
    var alertBox = document.createElement('div');
    alertBox.id = 'enrol-alert';
    alertBox.className = 'form-alert';
    alertBox.setAttribute('role', 'alert');
    alertBox.hidden = true;
    form.appendChild(alertBox);

    var actions = document.createElement('div');
    actions.className = 'enrol-actions';

    /* The same component and the same keyframe the map waiting state already
       uses, so the page has one vocabulary for "something is happening" rather
       than two. Empty by design: it says nothing a screen reader needs, because
       the button label beside it says all of it in words. No spinner glyph,
       which would be a hand drawn shape this project has refused twice, and no
       percentage, which would be a fabricated progress claim. */
    var bar = document.createElement('div');
    bar.className = 'sweep';
    actions.appendChild(bar);

    /* Bound to the form's submit event rather than to a click on this button,
       so Enter in the name field submits. */
    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.id = 'enrol-submit';
    submit.className = 'btn btn--primary';
    // Not data-i18n: the label depends on data-state, and the sweep would put
    // enrol.submit back on a button that should be reading enrol.retry.
    submit.textContent = mode === 'edit' ? t('enrol.update') : t('enrol.submit');
    actions.appendChild(submit);

    form.appendChild(actions);

    /* The way back out, and it exists only in edit mode because in the other
       one there is nothing to discard. Understated rather than a second button:
       a guest who opened this screen meant to change something, and offering
       them two controls of equal weight at the bottom of it argues with them.

       Inside the form, so the submitting state disables it along with
       everything else, and typed rather than left to default, so it cannot
       submit the form it is offering to abandon. */
    if (mode === 'edit') {
      form.appendChild(panelRow(
        panelButton('enrol.cancel', 'discard', 'subtle-action'), 'panel__row--cta'
      ));
    }

    /* Attached here rather than in a wire function, and it is the sanctioned
       exception rather than a slip: this form is built exactly once and
       persists for the life of the page, so these listeners cannot stack on a
       language switch the way a listener inside a re-rendering function would. */
    fieldValidators(form).forEach(function (pair) { wireField(pair.input, pair.validate); });

    return form;
  }

  /* One attribute drives everything. CSS reads it, JS sets it, and there is no
     class juggling and no second flag. Every branch of the submit path ends in
     a call to this, so no code path can leave the button locked. */
  function setFormState(form, state) {
    form.setAttribute('data-state', state);

    var busy = (state === 'submitting');
    $$('input, select, textarea, button', form).forEach(function (el) { el.disabled = busy; });

    var btn = $('#enrol-submit', form);
    if (!btn) return;

    /* Read off the form rather than off the module flag, so the label is a
       function of the thing the guest is looking at. The language sweep calls
       through here to re seat the label, and a mode read from anywhere else
       could put "Submit registration" on a form that is amending one. */
    btn.textContent = busy ? t('enrol.submitting')
                   : (state === 'failure' ? t('enrol.retry')
                   : (form.getAttribute('data-mode') === 'edit' ? t('enrol.update')
                                                                : t('enrol.submit')));
    // A disabled button on its own tells a screen reader nothing about why.
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function showAlert(form) {
    var box = $('#enrol-alert', form);
    if (!box) return;

    box.textContent = '';

    /* A PostgREST message string is never rendered here. Those are English,
       unstable, and leak table and constraint names. Every failure maps to the
       same pair of copy keys, which name the problem, name the recovery, and
       say that nothing the guest typed was lost. */
    var title = document.createElement('p');
    title.className = 'form-alert__t';
    title.setAttribute('data-i18n', 'enrol.fail.title');
    title.textContent = t('enrol.fail.title');
    box.appendChild(title);

    var body = document.createElement('p');
    body.className = 'form-alert__b';
    body.setAttribute('data-i18n', 'enrol.fail.body');
    body.textContent = t('enrol.fail.body');
    box.appendChild(body);

    box.hidden = false;
  }

  function hideAlert(form) {
    var box = $('#enrol-alert', form);
    if (!box) return;
    box.hidden = true;
    box.textContent = '';
  }

  /* One row of the fact table, and two components share it: the receipt in the
     panels, and the social proof block below the registration body. The optional
     class on the value cell is the only difference between them, and it exists
     so the expected attendance figure can take the mono family with its tabular
     figures without a second builder being written. */
  function recordRow(labelKey, value, valueClass) {
    var row = document.createElement('div');
    row.className = 'facts__row';

    var dt = document.createElement('dt');
    dt.setAttribute('data-i18n', labelKey);
    dt.textContent = t(labelKey);
    row.appendChild(dt);

    // Guest input reaches the DOM here and only ever through textContent. This
    // is the first phase where a markup string near this value would be
    // exploitable rather than untidy.
    var dd = document.createElement('dd');
    if (valueClass) dd.className = valueClass;
    dd.textContent = value;
    row.appendChild(dd);

    return row;
  }

  /* The receipt, in the fact table's own grammar. One component, two hosts.

     Echoing the note back is the answer to the honesty gap the note field
     carries: it is structurally unreadable from the database forever, so this
     echo from the guest's own device is the only confirmation they will ever
     get that it arrived. It costs nothing, because it is already in storage. */
  function buildRecord(rec) {
    var list = document.createElement('dl');
    list.className = 'facts facts--record';

    list.appendChild(recordRow('enrol.record.name', rec.name));

    // A bare 0 in a receipt reads as a missing value. facts.location.tbd
    // already set the precedent for a worded value in this table.
    list.appendChild(recordRow(
      'enrol.record.guests',
      rec.extra_guests > 0 ? String(rec.extra_guests) : t('enrol.record.guests.none')
    ));

    // Absent entirely rather than filled with an n/a, matching the practical
    // notes discipline next door.
    if (rec.note) list.appendChild(recordRow('enrol.record.note', rec.note));

    return list;
  }

  /* An id rather than a boolean, because two of the three panels now take focus
     on mount and they cannot share one. A panel that is a page state rather
     than an event passes nothing and stays unfocusable, which is the returning
     view: arriving at it is not something that happened to the guest. */
  function panelHeading(key, focusId) {
    var head = document.createElement('h3');
    head.className = 'sub-h';
    head.setAttribute('data-i18n', key);
    head.textContent = t(key);
    if (focusId) {
      head.id = focusId;
      head.setAttribute('tabindex', '-1');
    }
    return head;
  }

  /* One control, in a row of its own so the not recordable answer can replace
     that row and leave everything around it standing. Every control on the
     panels is built through here or through the understated builder below, so
     the delegated listener has exactly one class to look for. */
  function panelButton(labelKey, action, className) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className + ' enrol-act';
    btn.setAttribute('data-action', action);
    btn.setAttribute('data-i18n', labelKey);
    btn.textContent = t(labelKey);
    return btn;
  }

  function panelRow(child, modifier) {
    var row = document.createElement('div');
    row.className = modifier ? 'panel__row ' + modifier : 'panel__row';
    row.appendChild(child);
    return row;
  }

  /* The line the tapped control's row is replaced by when the owner has not
     re-run the schema file. Not the pending panel, which would be a nested
     card, and not the failure banner, because nothing failed: the registration
     is intact and the sentence says so in as many words. */
  function amendPendingLine() {
    var line = document.createElement('p');
    line.className = 'panel__pending';
    /* Focusable only programmatically, and focused the moment it replaces the
       control that was tapped. That control is gone, so focus would otherwise
       fall to the document body and the next Tab would restart at the top of
       the page, while a screen reader guest would be told nothing at all about
       why the thing they pressed did not happen. Landing on the sentence is
       both the announcement and the answer.

       Carries no id, deliberately. Two of these can stand at once, on the row
       the edit control used to occupy and on the row the leaving control used
       to occupy, because both are backed by the same absent function and each
       reports in its own place. A shared id across two live nodes is invalid
       and would send both focus calls to whichever one happened to be first. */
    line.setAttribute('tabindex', '-1');
    line.setAttribute('data-i18n', 'enrol.amend.pending');
    line.textContent = t('enrol.amend.pending');
    return line;
  }

  /* The two step confirmation, inline and in place. It takes over the row of
     the control that summoned it and touches nothing else on the panel.

     Not a native dialog and not the browser's own one liner. The browser's is
     unstyleable and renders in the browser's language rather than the site's,
     which breaks trilingual parity for the one question on the page where being
     understood matters most. A dialog element would be the only modal on the
     site, would need focus trapping written and maintained for it, and is a lot
     of machinery for a party invitation being read one handed on a phone.

     Three elements and no more. A question naming both the consequence and the
     recovery in one sentence, a control whose label names the consequence in
     full and never says yes or ok, and a way back that is not a button at all.

     No animation on the reveal, deliberately. A destructive confirmation that
     fades in is a confirmation a thumb already in motion can tap straight
     through during the fade.

     No timer either, and that is the same decision from the other side: a
     confirmation that expires is one that vanishes while somebody is still
     reading it. It waits as long as it is left. */
  function buildWithdrawConfirm() {
    var box = document.createElement('div');
    box.className = 'withdraw-confirm';
    box.setAttribute('data-state', 'idle');

    /* The same component and the same keyframe the form's action row uses, so
       the page keeps one vocabulary for "something is happening" rather than
       growing a second one for the one request that most needs to be believed. */
    var bar = document.createElement('div');
    bar.className = 'sweep';
    box.appendChild(bar);

    var q = document.createElement('p');
    q.className = 'withdraw-confirm__q';
    q.setAttribute('data-i18n', 'enrol.withdraw.confirm.q');
    q.textContent = t('enrol.withdraw.confirm.q');
    box.appendChild(q);

    /* The phase's only destructive treatment, and the colour is not what
       carries it: the design brief locks one accent and permits no second hue,
       so destructive and accent share a red by contract. Three things that are
       not colour carry the difference instead. This is the only ghost control
       on the page whose border and label are red at rest, it is the only one
       reached through two steps, and its label names what happens.

       No data-i18n, for the same reason the submit button carries none: this
       label depends on the block's state, and the language sweep would put
       "Confirm withdrawal" back on a control that is mid request. */
    var yes = document.createElement('button');
    yes.type = 'button';
    yes.id = 'enrol-withdraw-yes';
    yes.className = 'btn btn--ghost panel__confirm enrol-act';
    yes.setAttribute('data-action', 'withdraw-yes');
    yes.textContent = t('enrol.withdraw.confirm.yes');
    box.appendChild(yes);

    box.appendChild(panelRow(
      panelButton('enrol.withdraw.confirm.no', 'withdraw-no', 'subtle-action')
    ));

    /* Escape reverts, and it is bound to the block rather than to the document
       because the block owns the state it reverts. Focus is moved inside on
       reveal, so the key is live from the first frame, and the listener dies
       with the node rather than accumulating one more copy of itself every time
       the control is tapped.

       Ignored while the request is in flight: at that point the withdrawal has
       left the device and there is nothing left for a key press to take back. */
    box.addEventListener('keydown', function (ev) {
      var key = ev.key || ev.keyCode;
      if (key !== 'Escape' && key !== 'Esc' && key !== 27) return;
      if (box.getAttribute('data-state') === 'submitting') return;
      ev.preventDefault();
      keepRegistration();
    });

    return box;
  }

  /* A registration receipt, not a celebration. The roadmap's done-when sentence
     lives in this panel. */
  function buildSuccessPanel(rec) {
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('data-panel', 'success');

    panel.appendChild(panelHeading('enrol.success.title', 'enrol-success-title'));

    var lede = document.createElement('p');
    lede.className = 'panel__lede';
    lede.setAttribute('data-i18n', 'enrol.success.lede');
    lede.textContent = t('enrol.success.lede');
    panel.appendChild(lede);

    panel.appendChild(buildRecord(rec));

    /* The registration is in the database and could not be amended, because the
       owner has not re-run the schema file yet. Nothing failed, so this is not
       the alert banner, and it is one line rather than a nested panel. */
    if (amendPending) panel.appendChild(amendPendingLine());

    /* The group position, and it holds exactly one of two things.

       With a link it holds the framing line and then the button, at the instant
       the write resolved and the guest is most willing to tap one more thing.
       The framing line reuses the section's own body copy rather than a second
       string being written for it: one message, one voice, and it already
       carries the course announcement register this asks for.

       With no link it holds one dim line naming the state and the next thing
       that will happen. Not a pending panel, which would be a nested card, and
       not a disabled button, because absent beats broken. That is the shipping
       state today and it was designed first.

       Nothing writes the joined flag at this site. The anchor arrives from
       whatsappButton(), which wires markGroupJoined() itself, and a second
       writer here is exactly the drift the single writer exists to prevent. */
    var join = whatsappButton('wa.cta', 'btn btn--primary panel__wa');
    if (join) {
      var framing = document.createElement('p');
      framing.className = 'panel__handoff';
      framing.setAttribute('data-i18n', 'wa.body');
      framing.textContent = t('wa.body');
      panel.appendChild(framing);
      panel.appendChild(join);
    } else {
      var group = document.createElement('p');
      group.className = 'panel__pending';
      group.setAttribute('data-i18n', 'enrol.success.group.pending');
      group.textContent = t('enrol.success.group.pending');
      panel.appendChild(group);
    }

    /* The panel's last item, and the only control it carries besides the group
       handoff: the way back for the guest who reads their own receipt one
       second after sending it and spots a typo in their name. It routes to the
       same edit path the returning view routes to, because there is only one.

       The accent link treatment is right here and wrong on the returning view's
       controls, and the difference is the job. This one is a helpful jump at a
       moment of relief, and it should catch the eye. Those are reached for
       deliberately or not at all.

       This panel carries no leaving control of any kind, and that is a refusal
       rather than an omission. This panel and the returning view are near
       identical in content and opposite in purpose, and the tempting move,
       building them as one component with a flag, puts a control for undoing
       the registration at the exact instant of celebrating it. They are two
       builders sharing one receipt. Do not merge them. */
    panel.appendChild(panelRow(
      panelButton('enrol.success.amend', 'edit', 'inline-link'), 'panel__row--cta'
    ));

    return panel;
  }

  /* Rendered entirely from storage and never from a fetch, because the database
     is structurally incapable of answering the question and a blocked read
     comes back as an empty array rather than as an error. There is no loading
     state here for exactly that reason.

     Deliberately not the success panel with a flag: they are near identical in
     content and opposite in purpose, and one component with a flag produces a
     leaving control at the instant of celebration.

     And deliberately no group button. Three affordances for that one intent
     already exist, each with a different job, and a fourth sitting directly
     above the section built for exactly that purpose is the duplicate intent
     failure. Do not add one here.

     The three controls below it render optimistically, and that is the whole of
     D-36 in one sentence: this site cannot know whether the owner has re-run
     the schema file without calling the function and finding out. So nothing is
     hidden and nothing is disabled. A control that might work and refuses to
     say so is worse than one that answers honestly the moment it is asked. */
  function buildReturnPanel(rec) {
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('data-panel', 'return');

    panel.appendChild(panelHeading('enrol.return.title', null));

    /* Carries a substitution token, so it is written here rather than left to
       the data-i18n sweep, which would overwrite the guest's own name with the
       raw template. Exactly how renderDeadline() already handles the hero
       deadline's date token. */
    var lede = document.createElement('p');
    lede.className = 'panel__lede';
    lede.textContent = t('enrol.return.lede').replace('{name}', rec.name);
    panel.appendChild(lede);

    panel.appendChild(buildRecord(rec));

    /* Ghost rather than primary, because the correct action for a guest who has
       already registered is nothing at all, and the section should not spend a
       filled accent button arguing otherwise.

       When the amend function has already answered that it is not there, this
       row holds that answer instead of the control. The receipt above it is
       untouched, which is the point: the registration stands and only the
       ability to change it is missing. */
    panel.appendChild(amendPending
      ? panelRow(amendPendingLine(), 'panel__row--cta')
      : panelRow(panelButton('enrol.edit', 'edit', 'btn btn--ghost panel__edit'), 'panel__row--cta'));

    /* Leaving, and forgetting, in that order and one step apart. Neither is the
       accent treatment: both must be reachable without inviting a thumb.

       The second one is the understated path for the guest who hands their
       phone to somebody else, and it is the only control on this page that
       removes an identity rather than a registration. */
    var acts = document.createElement('div');
    acts.className = 'panel__acts';
    acts.appendChild(panelRow(
      panelButton('enrol.withdraw', 'withdraw', 'subtle-action')
    ));
    acts.appendChild(panelRow(
      panelButton('enrol.identity.clear', 'forget', 'subtle-action')
    ));
    panel.appendChild(acts);

    return panel;
  }

  /* The state after a confirmed withdrawal, and it is structurally required
     rather than a nicety. Without it the branch chain above would hand a guest
     who has just left a blank registration screen, which reads as "did that
     work", two seconds after they were told it did.

     Read the shape of it, because the shape is load bearing. There is no
     registration screen inside this panel, so the bar's readiness gate finds
     nothing to point at and the bar stays down. Nudging somebody to sign up
     again two seconds after they left would be the single most obnoxious thing
     this site could do, and it is prevented by what this builder does not
     contain rather than by a special case in the bar that somebody could later
     tidy away as dead code.

     The way back in is explicit, because leaving here is technically reversible
     and not visibly so: re-registering reuses the same guest id, so the insert
     conflicts, falls to the amend path and resurrects the existing row with the
     flag cleared, which the unique constraint makes the only correct behaviour.
     The guest can never watch any of that happen, so they are handed a control
     that says it instead.

     Forgetting stays reachable from here. Someone who has left the course is at
     least as likely to want their name off the device as someone who has not. */
  function buildWithdrawnPanel() {
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('data-panel', 'withdrawn');

    panel.appendChild(panelHeading('enrol.withdrawn.title', 'enrol-withdrawn-title'));

    var lede = document.createElement('p');
    lede.className = 'panel__lede';
    lede.setAttribute('data-i18n', 'enrol.withdrawn.body');
    lede.textContent = t('enrol.withdrawn.body');
    panel.appendChild(lede);

    panel.appendChild(panelRow(
      panelButton('enrol.withdrawn.again', 'again', 'btn btn--ghost panel__again'),
      'panel__row--cta'
    ));

    var acts = document.createElement('div');
    acts.className = 'panel__acts';
    acts.appendChild(panelRow(
      panelButton('enrol.identity.clear', 'forget', 'subtle-action')
    ));
    panel.appendChild(acts);

    return panel;
  }

  function storedRecord() {
    var ident = identity.get();
    return { name: ident.name || '', extra_guests: ident.extra_guests, note: ident.note };
  }

  function mountPanel(host, panel) {
    host.appendChild(panel);
    // Next frame, so the fade actually runs from the hidden state. Same idiom
    // as showNudge(), toast() and the map frame, for the same reason.
    requestAnimationFrame(function () { panel.setAttribute('data-show', '1'); });
  }

  /* Re-applies to the persistent form everything the data-i18n sweep cannot.
     The sweep re-translates every static label, hint and heading for free; what
     it cannot do is the submit label, which depends on data-state, and a
     currently visible field error, which is re-rendered from the copy key
     stored on the control rather than by re-running validation. */
  function syncFormLanguage(form) {
    if (!form) return;

    setFormState(form, form.getAttribute('data-state') || 'idle');

    $$('[data-errkey]', form).forEach(function (el) {
      var node = document.getElementById(el.id + '-err');
      if (node) node.textContent = t(el.getAttribute('data-errkey'));
    });
  }

  /* renderLocation()'s shape exactly: null-guard the host, branch rather than
     early return, and reconcile the persistent child instead of rebuilding it.

     The form is built once and persists. #enrol-body is swapped only when the
     body state actually changes, so a language switch re-translates the labels
     through the existing sweep and cannot destroy a typed value or move the
     caret out from under somebody mid-sentence. */
  function renderEnrollment() {
    var host = $('#enrol-body');
    if (!host) return;

    var ident = identity.get();
    var body;

    /* Either credential blank, or a browser that cannot mint an identity at
       all. Both get the inherited pending block, and neither renders
       #enrol-form, so the bar's readiness gate stays false and the nudge bar
       stays down rather than pointing at a placeholder. */
    if (!sbConfigured() || !IDENTITY_OK) body = 'pending';
    // Editing outranks the registration, because it is the registration being
    // changed. The same screen, in a mode, and never a second one.
    else if (editing) body = 'form';
    /* Above the enrolled test rather than below it, and above the success one
       too. The flag has already gone to the string 0 by the time this is read,
       so the enrolled test would fall through to the form and hand a blank
       registration screen to somebody who just left. */
    else if (withdrawnShown) body = 'withdrawn';
    else if (successShown) body = 'success';
    // A guest_id with no name is not a registration, so it renders the form.
    else if (ident.enrolled && ident.name) body = 'return';
    else body = 'form';

    /* The form persists across a language switch and across nothing else, which
       is what this early exit is for: it is the reason a switch cannot destroy
       a typed value or pull the caret out from under somebody mid sentence.

       Crossing into or out of edit mode is not a language switch, and the mode
       is baked into the element that was built, so a reconciled form would come
       back still carrying the mode it was born with, prefilled from the wrong
       side of the change. Those two cases rebuild, deliberately, and the guest
       has typed nothing yet at the instant either one happens. */
    if (body === 'form' && host.getAttribute('data-body') === 'form') {
      var standing = $('#enrol-form', host);
      if (standing && (standing.getAttribute('data-mode') === 'edit') === editing) {
        syncFormLanguage(standing);
        return;
      }
    }

    host.textContent = '';          // discards the static pending markup
    host.setAttribute('data-body', body);

    if (body === 'pending') {
      host.appendChild(pendingBlock('enrol.pending.title', 'enrol.pending.body'));
      return;
    }

    if (body === 'form') {
      host.appendChild(buildForm(editing ? 'edit' : 'new'));
      return;
    }

    if (body === 'withdrawn') {
      mountPanel(host, buildWithdrawnPanel());
      return;
    }

    mountPanel(host, body === 'success'
      ? buildSuccessPanel(storedRecord())
      : buildReturnPanel(storedRecord()));
  }

  /* Every enrollment mutation runs this one function rather than three calls
     from four places. The deadline line hides once a guest is enrolled and the
     bar has to be told the state changed, and neither is only a language
     concern. Order matters here for the same reason it matters in the language
     chain: the bar reads the form's existence. */
  function refreshEnrollmentState() {
    renderEnrollment();
    renderDeadline();
    renderNudge();
    // Registering changes the number the guest just changed, so it is re-read
    // here rather than only on the next load.
    renderSocialProof();
  }

  /* ======================================================================
     SOCIAL PROOF

     The one place in this project where a string one guest typed is rendered
     into every other guest's browser. The view truncates each name to its first
     token server side but does not sanitise, so the createElement plus
     textContent rule that has been house style since phase 1 becomes
     load bearing here for the first time rather than merely tidy.

     Nothing splits a name in this file either. The truncation lives in the
     view, which is what makes a full name structurally incapable of reaching
     the page rather than merely unlikely to.
     ====================================================================== */

  /* Two callers, the language chain and every enrollment mutation, and both can
     have a read out at the same time. Held at module scope and read back in the
     continuation, so a response that has been superseded is discarded rather
     than painted. */
  var proofSeq = 0;

  function renderSocialProof() {
    var host = $('#enrol-proof');
    if (!host || !sbConfigured()) return;

    /* Claimed before the request goes out. The reachable sequence is a
       withdrawal, which fires a read that will no longer count the withdrawing
       guest, and then a language switch inside that round trip, which fires a
       second. If the first lands last the guest is shown a head count that
       still counts them, in the one widget on this page whose entire job is to
       be believed.

       Checked above the clear below rather than after it, and that placement is
       the whole fix rather than a detail of it. Clearing on a superseded
       response blanks a block a newer response has already painted correctly,
       so a token checked one line later would still destroy the right answer
       and merely decline to write the wrong one. */
    var seq = ++proofSeq;

    /* 8 seconds rather than the write path's 12. This is a non blocking
       decoration and a guest should never wait on it. The wire also offers a
       newest first ordering, and it is deliberately not requested: that is
       precisely the social feed reading this block rejects, and the rows are
       sorted here into a register instead. */
    sbRequest('GET', '/rest/v1/attendees?select=first_name,extra_guests', null, null, 8000)
      .then(function (res) {
        // A newer read is already out or has already landed. This one is not
        // new information, and writing anything at all from here, the clear
        // included, would be replacing a fresher answer with a staler one.
        if (seq !== proofSeq) return;

        // Cleared on every outcome, so a switch to a language whose fetch fails
        // does not leave the previous language's block standing.
        host.textContent = '';

        /* Silent. Nobody standing outside a building needs an error message
           about a head count widget, and a guest who sees nothing here has lost
           nothing. There is no skeleton above either: the block may legitimately
           never appear, and a skeleton promises content that is not coming. */
        if (!res.ok || !Array.isArray(res.body)) return;

        var rows = res.body;
        var total = rows.length;
        var names = [];

        for (var i = 0; i < rows.length; i++) {
          var extra = parseInt(rows[i].extra_guests, 10);
          if (!isNaN(extra) && extra > 0) total += extra;

          // Duplicates are kept. Two guests called Maria are two people, and
          // dropping one would make the list disagree with the count.
          var first = rows[i].first_name;
          if (typeof first === 'string' && first) names.push(first);
        }

        /* Read in exactly one place. A second literal threshold anywhere is how
           the two halves of this feature drift apart, and below it the whole
           block is absent: not a zero, and not an invitation to be the first,
           which reads as an empty room. */
        var from = parseInt((CFG.enrollment || {}).showCountFrom, 10);
        if (isNaN(from) || from < 0) from = 0;
        if (total < from) return;

        var list = document.createElement('dl');
        list.className = 'facts facts--proof';

        // A bare figure with no unit word: the label already says what it counts.
        list.appendChild(recordRow('enrol.proof.count.label', String(total), 'mono'));

        /* The flag removes the name row only. The count row always stays.

           Alphabetical through a locale aware compare in the active language,
           which sorts the Danish extra vowels after z for free. The separator is
           a comma and a space with no conjunction before the last name:
           institutional lists do not use one, and localising a conjunction into
           a joined string across three languages is churn for a worse result. */
        if ((CFG.enrollment || {}).showAttendeeList !== false && names.length) {
          names.sort(function (a, b) { return a.localeCompare(b, lang); });
          list.appendChild(recordRow('enrol.proof.list.label', names.join(', ')));
        }

        host.appendChild(list);
      });
  }

  function readGuests(form) {
    var max = maxGuests();
    if (max <= 0) return 0;

    var control = $('#enrol-guests', form);
    var raw = '0';

    if (control && control.tagName === 'SELECT') {
      raw = control.value;
    } else {
      var checked = $('input[name="extra_guests"]:checked', form);
      if (checked) raw = checked.value;
    }

    // Parsed base 10 and clamped before sending, so a string never reaches a
    // smallint column and the config bound, which is tighter than the database
    // one, is the bound the UI enforces.
    return clampGuests(parseInt(raw, 10), max);
  }

  function readFields(form) {
    var nameEl = $('#enrol-name', form);
    var noteEl = $('#enrol-note', form);

    // Trimmed, because the database bound is computed on the trimmed value.
    var name = nameEl ? nameEl.value.trim() : '';
    var note = noteEl ? noteEl.value.trim() : '';

    return {
      name: name,
      extra_guests: readGuests(form),
      // Never the empty string. An empty note must be a null in the owner's
      // dashboard rather than a column of blank cells.
      note: note ? note : null
    };
  }

  /* The focus move is what announces the change to a screen reader user whose
     focus was on a control that no longer exists, and what brings the new
     content into view for everyone else. The panels deliberately carry no alert
     role as well: doing both reads as a stutter.

     Every path in this section that destroys the control the guest just pressed
     hands focus somewhere deliberate through here or through the field helper
     below. Leaving it on a removed node drops it to the document body, which
     sends the next Tab back to the top of the page. */
  function focusPanelHeading(id) {
    var head = document.getElementById(id);
    if (head && head.focus) head.focus();
  }

  function focusNameField() {
    var name = $('#enrol-name');
    if (name && name.focus) name.focus();
  }

  function handleSubmit(form) {
    if (form.getAttribute('data-state') === 'submitting') return;

    /* Validate everything, populate every error node, and move focus to the
       first control that is wrong. This branch terminates in a setFormState
       call like every other one, so there is no path out of here that leaves
       the button locked. The state is carried through rather than reset,
       because a form that already failed on the wire must keep reading
       enrol.retry while the guest fixes a field. */
    var invalid = validateAll(form);
    if (invalid) {
      setFormState(form, form.getAttribute('data-state') === 'failure' ? 'failure' : 'idle');
      if (invalid.focus) invalid.focus();
      return;
    }

    hideAlert(form);

    var ident = identity.get();

    /* Minted on the first submit and written to storage before the request goes
       out, so a lost response cannot orphan a row. A second submit from this
       browser reuses it, and the unique constraint turns that into an amendment
       rather than a second row. */
    if (!ident.guest_id) {
      var fresh = newGuestId();
      if (!fresh) { setFormState(form, 'failure'); showAlert(form); return; }
      store.set('guest_id', fresh);
      ident.guest_id = fresh;
    }

    var fields = readFields(form);
    var edit = form.getAttribute('data-mode') === 'edit';

    setFormState(form, 'submitting');

    if (edit) { handleAmend(form, fields, ident); return; }

    submitEnrollment(fields, ident).then(function (res) {
      // The form this answer belongs to has left the document. Same reasoning
      // as the withdrawal's guard: a continuation cannot report into a subtree
      // nobody is looking at, and must not write module state from it either.
      if (!stillMounted(form)) return;

      if (res.result === 'ok' || res.result === 'pending') {
        /* The registration exists in the database on both branches: the ok one
           wrote it, and the pending one proved it with a 409 before finding the
           amend function missing. Storage is the only place a receipt can come
           from, so it is written on both, and the pending branch says plainly
           in the panel that the change itself is not recorded yet. */
        amendPending = (res.result === 'pending');
        identity.save({
          guest_id: ident.guest_id,
          name: fields.name,
          extra_guests: fields.extra_guests,
          note: fields.note,
          enrolled: true
        });

        setFormState(form, 'success');
        successShown = true;
        refreshEnrollmentState();
        focusPanelHeading('enrol-success-title');
        return;
      }

      setFormState(form, 'failure');
      showAlert(form);
    });
  }

  /* Saving an edit. Four outcomes, none of them silent, and every one of them
     read from the integer the function hands back and from its error code
     rather than from a status code. On this project a status code proves
     nothing: a blocked read answers with an empty list and a blocked delete
     answers 204, and both of those look exactly like success.

     A real amendment writes the new values to storage, because storage is the
     only place a receipt can ever come from here, and routes back to the
     returning view with the receipt now showing them. The brief confirmation
     goes through the toast, and that is the one job the toast is assigned in
     this phase: the primary moments stay full state changes in the section
     body, and an incidental "yes, that saved" is exactly what a transient line
     at the bottom of the screen is for.

     A row count of zero is handled a layer down, by the insert fallback, so it
     never reaches here as its own branch.

     Not recordable means the owner has not re-run the schema file. The edit is
     dropped, the registration is left exactly as it was, and the control that
     was tapped is replaced in place by the line that says so.

     Anything else is the wire failing, and it keeps the form standing with
     every typed value intact and the retry label on the button. That is a
     deliberate split from the not recordable branch directly above it: a guest
     who has just retyped their name and their note on a phone outdoors must not
     lose that work to one bad moment of mobile data, and the failure state was
     built to hold it. The pending line is for a thing that cannot work yet; the
     banner is for a thing that did not work this time. */
  function handleAmend(form, fields, ident) {
    saveAmendment(fields, ident).then(function (res) {
      // As above, and for the same reason.
      if (!stillMounted(form)) return;

      if (res.result === 'ok') {
        amendPending = false;
        identity.save({
          guest_id: ident.guest_id,
          name: fields.name,
          extra_guests: fields.extra_guests,
          note: fields.note,
          enrolled: true
        });

        editing = false;
        setFormState(form, 'idle');
        refreshEnrollmentState();
        toast(t('enrol.updated.toast'));
        focusAfterEdit();
        return;
      }

      if (res.result === 'pending') {
        amendPending = true;
        editing = false;
        setFormState(form, 'idle');
        refreshEnrollmentState();
        focusAmendPending(null);
        return;
      }

      setFormState(form, 'failure');
      showAlert(form);
    });
  }

  /* ----------------------------------------------------------------------
     THE CONTROLS ON THE PANELS

     Every one of them ends in refreshEnrollmentState(), so the bar, the hero
     deadline line and the head count re-render in the same tick as the thing
     that changed them. Three renderers called from four places is how those
     four places start disagreeing.
     ---------------------------------------------------------------------- */

  // The control that was tapped is gone by the time this runs, so focus is
  // handed to its replacement rather than left on a removed node.
  function focusEnrolAction(action) {
    var el = $('#enrol-body [data-action="' + action + '"]');
    if (!el || !el.focus) return false;
    el.focus();
    return true;
  }

  // Scoped, because two of these can stand at once and each one answers for the
  // row it is standing in.
  function focusAmendPending(scope) {
    var line = $('.panel__pending[tabindex="-1"]', scope || $('#enrol-body'));
    if (line && line.focus) line.focus();
  }

  /* Coming back out of the form, by either door. The edit control is absent in
     exactly one case, which is the case where the pending line has taken its
     row, so the line is where focus belongs instead: it is both the reason the
     control is gone and the answer to what happened. */
  function focusAfterEdit() {
    if (focusEnrolAction('edit')) return;
    focusAmendPending(null);
  }

  /* Reached from the returning view and from the success panel, and both mean
     the same thing, which is why there is one edit path and no separate change
     your name control anywhere on this site (D-16, ID-04).

     The success moment is cleared on the way in. A guest who edits from the
     receipt and then discards has left that moment behind them, and putting
     them back on a panel that says "Registration confirmed" would be
     celebrating something that happened several taps ago. */
  function startEdit() {
    successShown = false;
    editing = true;
    refreshEnrollmentState();
    focusNameField();
  }

  // Sends nothing. The form is discarded with whatever was typed into it and
  // the registration is untouched, because nothing ever left the device.
  function discardEdit() {
    editing = false;
    refreshEnrollmentState();
    focusAfterEdit();
  }

  /* The only control on this page that removes an identity rather than a
     registration, and it is for the guest who hands their phone to somebody
     else. Every key this phase writes goes, from storage and from the in memory
     map behind it, and what is left is an empty form with no residue.

     Focus is deliberately not moved afterwards, from the returning view. The
     only focusable thing left there is the name field, and putting a caret in
     it would throw the soft keyboard up in the face of the person the phone was
     just handed to, which is the opposite of what was asked for. The toast is a
     polite live region and announces the outcome without taking the screen.

     That reasoning is about the form, and it is exactly why the withdrawn panel
     needs a different answer. This control also stands on the withdrawn panel,
     which 03-05 added after this function was written, and that panel has no
     name field to avoid focusing. The panel is replaced underneath the button
     the guest just pressed, so with nowhere to land focus falls to the document
     body and the next Tab restarts at the top of the page, which is the one
     outcome every path in this section is written to prevent. It lands on the
     section heading instead, the same way this file hands focus to a
     replacement rather than leaving it on a removed node. */
  function forgetIdentity() {
    // Read before anything is cleared, because clearing it is the point.
    var fromWithdrawn = withdrawnShown;

    identity.clear();
    successShown = false;
    amendPending = false;
    editing = false;
    // The identity is gone, so there is no registration left to have withdrawn
    // from. Left true, renderEnrollment re-selects the withdrawn body and
    // rebuilds the panel under the control that was just pressed.
    withdrawnShown = false;
    refreshEnrollmentState();
    toast(t('enrol.identity.cleared'));

    if (fromWithdrawn) {
      var head = $('#enrol .section__h');
      if (head && head.focus) {
        head.setAttribute('tabindex', '-1');
        head.focus();
      }
    }
  }

  /* The closest lookup with the manual class check kept as its fallback, the
     same shape the location wiring uses. One class for every control on the
     panels, so this listener has one thing to look for and each control names
     its own job in an attribute rather than in a selector. */
  function enrolAction(node) {
    var el = (node && node.closest) ? node.closest('.enrol-act') : null;
    if (!el && node && node.classList && node.classList.contains('enrol-act')) el = node;
    return el;
  }

  /* The row a control lives in, which is the unit every in place replacement on
     these panels works on. The closest lookup with the manual walk kept as its
     fallback, the same shape the location wiring uses. */
  function enrolRow(node) {
    var el = (node && node.closest) ? node.closest('.panel__row') : null;
    if (el) return el;

    el = node ? node.parentNode : null;
    while (el && el.classList) {
      if (el.classList.contains('panel__row')) return el;
      el = el.parentNode;
    }
    return null;
  }

  function withdrawBox(node) {
    var el = (node && node.closest) ? node.closest('.withdraw-confirm') : null;
    if (el) return el;

    el = node ? node.parentNode : null;
    while (el && el.classList) {
      if (el.classList.contains('withdraw-confirm')) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* Whether a node is still part of the live document.

     An async continuation runs in a world that may have been replaced entirely
     between the request leaving and the answer arriving. When the node it was
     written for has left the document, nothing it renders can be seen and
     nothing it writes can be believed, so it must not run at all rather than
     run into a detached subtree and report success into a void.

     Degrades to true rather than throwing on a browser with no Node.contains,
     because the consequence of the guard being absent is exactly the behaviour
     this file shipped before it existed, and the consequence of it throwing is
     a continuation that never reaches the state reset at its end. */
  function stillMounted(node) {
    if (!node) return false;
    if (!document || typeof document.contains !== 'function') return true;
    return document.contains(node);
  }

  /* Step one. The confirmation takes over the row of the control that summoned
     it, so the receipt above and the forget control below both stay exactly
     where the guest last saw them, and nothing on the panel moves except the
     one line that is being asked about.

     Focus lands on the control that does the thing, which is deliberate in both
     directions: a screen reader guest hears the question and then the
     consequence named in full, and a keyboard guest is one key from either
     answer. */
  function askWithdraw(btn) {
    var row = enrolRow(btn);
    if (!row) return;

    row.textContent = '';
    row.appendChild(buildWithdrawConfirm());

    var yes = $('#enrol-withdraw-yes', row);
    if (yes && yes.focus) yes.focus();
  }

  /* Step one, declined, and by two routes: the keep control and the Escape key.
     Both put the original line back with nothing sent and nothing changed, and
     hand focus to the control that was there before, which is where the guest
     was standing when they changed their mind. */
  function keepRegistration() {
    var box = $('#enrol-body .withdraw-confirm');
    var row = box ? box.parentNode : null;
    if (!row) return;

    row.textContent = '';
    row.appendChild(panelButton('enrol.withdraw', 'withdraw', 'subtle-action'));

    var back = $('[data-action="withdraw"]', row);
    if (back && back.focus) back.focus();
  }

  /* The block borrows the form's submitting grammar rather than inventing a
     second one: the control disables, its label swaps to the label the form
     already uses, the busy attribute goes on, and the same 2px bar sweeps
     across the top of the block. No new component and no new copy key.

     The freeze is scoped to #enrol-body and not to the box, and the asymmetry
     with setFormState is the whole point rather than an inconsistency. There
     the form IS the entire body, so disabling the form leaves nothing else
     reachable. Here the box is a sibling of the edit and the forget controls,
     and each of those calls refreshEnrollmentState(), which clears #enrol-body
     outright and tears this box out of the document while its request is still
     on the wire. Freezing the box alone leaves every control that can break the
     withdrawal live for the whole twelve second window.

     Escape is deliberately untouched by the freeze. It is a key press rather
     than a control, the block's own listener already declines while the state
     is submitting, and the contract that the confirmation never expires on a
     timer and reverts on Escape holds exactly as it did.

     Falls back to the box when the host is missing, which keeps a caller in a
     detached or half built body doing the narrower correct thing rather than
     throwing. */
  function setWithdrawState(box, state) {
    box.setAttribute('data-state', state);

    var busy = (state === 'submitting');
    var body = $('#enrol-body');
    $$('button', body || box).forEach(function (el) { el.disabled = busy; });

    var yes = $('#enrol-withdraw-yes', box);
    if (!yes) return;

    yes.textContent = busy ? t('enrol.submitting') : t('enrol.withdraw.confirm.yes');
    yes.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  /* Step two, and the whole plan exists for this function.

     Between the tap and the answer there is a defined state, because a
     withdrawal that just sits there for twelve seconds on bad mobile data reads
     as frozen. The block always terminates somewhere defined, and two things
     are what make that true rather than merely claimed. sbRequest races its own
     timeout and settles whether or not the abort could take effect, so an
     answer always arrives. And setWithdrawState freezes the whole panel, so no
     control that could destroy this box is reachable while the answer is on its
     way.

     Two of the four answers mean the guest is off the list, and both write the
     flag before the state that claims it is ever mounted. There is no path here
     where the interface tells somebody they have withdrawn while the database
     still counts them: that is the exact failure the schema change was made to
     prevent, and it is prevented by reading the integer rather than the status,
     and by the mounted guard below, which is what stops a continuation from
     writing a flag back onto a device whose owner has since asked to be
     forgotten.

     The identity survives, and only the registration goes. The guest id and the
     name stay on the device because the photo album attributes pictures to
     them, and somebody who cannot come to this one may still have photographs
     from an earlier evening (D-15, ID-05).

     The last two answers are not one answer. A missing amend function means the
     change cannot be recorded at all, so the block is replaced in place by the
     line that says so, says to tell the host directly, and says the
     registration stands, all three of which are true and none of which a retry
     would change. A wire failure means it did not work this time, and the
     recovery for that is to press again, so the confirmation keeps standing
     with the retry label on it. That is the same split the form's own submit
     path already makes, and this is the one request the file calls the one that
     most needs to be believed, so it is the last place that split should be
     collapsed. */
  function doWithdraw(btn) {
    var box = withdrawBox(btn);
    if (!box) return;
    if (box.getAttribute('data-state') === 'submitting') return;

    var ident = identity.get();

    setWithdrawState(box, 'submitting');

    withdrawEnrollment(ident).then(function (res) {
      /* The panel was replaced under the request, by a language switch or by
         anything else that re-rendered the body. Nothing this continuation
         renders can be seen and nothing it writes can be believed, so it does
         not run. This is what stops store.set('enrolled','0') below from
         resurrecting a flag that forgetIdentity() has just removed, which
         identity.clear names as the exact residue a guest asked to have gone. */
      if (!stillMounted(box)) return;

      if (res.result === 'ok' || res.result === 'gone') {
        store.set('enrolled', '0');

        withdrawnShown = true;
        successShown = false;
        editing = false;

        refreshEnrollmentState();
        focusPanelHeading('enrol-withdrawn-title');
        return;
      }

      /* The flag first, then the line, exactly as the edit path's pending
         branch does it. Written to module state rather than only into this row,
         because the next render for any reason rebuilds the panel from scratch
         and a decoration that lives only in the DOM evaporates there, taking
         the explanation with it and handing the Withdraw button back to a guest
         who would get the same non-answer from it. */
      if (res.result === 'pending') {
        amendPending = true;

        var row = box.parentNode;
        if (!row) return;

        row.textContent = '';
        row.appendChild(amendPendingLine());
        focusAmendPending(row);
        return;
      }

      /* The wire failed. The confirmation stays exactly where it is, because
         replacing it with a paragraph would take away the only way to withdraw
         for the rest of the page's life over one bad moment of mobile data.
         The question becomes the line that names the recovery, the control
         becomes the retry label the form already uses for this same class of
         failure, and focus moves onto it, which is where the guest's attention
         is standing already. */
      setWithdrawState(box, 'failure');

      var q = $('.withdraw-confirm__q', box);
      if (q) q.textContent = t('enrol.fail.body');

      var yes = $('#enrol-withdraw-yes', box);
      if (!yes) return;

      yes.textContent = t('enrol.retry');
      if (yes.focus) yes.focus();
    });
  }

  /* Back in, from the state that follows leaving. The form comes up prefilled
     from the storage the withdrawal deliberately kept, and submitting it reuses
     the same guest id, so the insert conflicts and falls to the amend path,
     which clears the flag on the row that is already there. One guest, one row,
     which the unique constraint makes the only correct answer. */
  function registerAgain() {
    withdrawnShown = false;
    successShown = false;
    editing = false;
    refreshEnrollmentState();
    focusNameField();
  }

  function runEnrolAction(action, btn) {
    if (action === 'edit')         { startEdit();          return; }
    if (action === 'discard')      { discardEdit();        return; }
    if (action === 'forget')       { forgetIdentity();     return; }
    if (action === 'withdraw')     { askWithdraw(btn);     return; }
    if (action === 'withdraw-yes') { doWithdraw(btn);      return; }
    if (action === 'withdraw-no')  { keepRegistration();   return; }
    if (action === 'again')        { registerAgain();      return; }
  }

  /* Delegated from the stable container and wired once from init(), because a
     listener attached inside a render function stacks a duplicate on every
     language switch. The closest lookup is guarded and keeps the manual check
     as a fallback, exactly as wireLocation() does. */
  function wireEnrollment() {
    var host = $('#enrol-body');
    if (!host) return;

    host.addEventListener('submit', function (ev) {
      var node = ev.target;
      var form = (node && node.closest) ? node.closest('#enrol-form') : null;
      if (!form && node && node.id === 'enrol-form') form = node;
      if (!form) return;

      ev.preventDefault();
      handleSubmit(form);
    });

    /* Every control on the panels, through one listener on the container that
       outlives all of them. Attached inside a builder instead, these would
       stack one more copy of themselves on every language switch, because the
       panels are rebuilt by the sweep and the form is not.

       A disabled button emits no click, so the in flight states below need no
       guard here. */
    host.addEventListener('click', function (ev) {
      var btn = enrolAction(ev.target);
      if (!btn) return;
      runEnrolAction(btn.getAttribute('data-action'), btn);
    });

    /* The bar yields to the keyboard.

       A bar pinned to the bottom of the viewport with the iOS soft keyboard
       open sits on top of the keyboard, jumps through the keyboard animation,
       or covers the field being typed into, depending on the version. It also
       covers the submit button of the form it is pointing at, which is the
       whole absurdity: the bar is telling a guest to do a thing while standing
       in front of the control that does it.

       Detected here rather than with a relational CSS selector, for the same
       Safari 15.4 reason the segmented control avoids one: on the browsers this
       matters most for, the selector does nothing and the bar would silently
       keep sitting on the keyboard. */
    host.addEventListener('focusin', function (ev) {
      if (!inEnrolForm(ev.target)) return;
      var bar = $('#nudge');
      if (bar) hideNudge(bar);
    });

    /* Restoration goes back through the renderer and never through the direct
       show helper. The session dismissal flag and the enrolled check are read
       inside renderNudge() and nowhere else, so a bar brought back any other
       way returns after a guest dismissed it, or after they registered. Both
       are outright requirement failures rather than cosmetic slips. */
    host.addEventListener('focusout', function (ev) {
      // Moving between two fields of the same form is not leaving it, and
      // bringing the bar back for one frame between two taps would flicker it
      // across the keyboard.
      if (inEnrolForm(ev.relatedTarget)) return;
      renderNudge();
    });
  }

  /* The closest lookup with the manual walk kept as its fallback, the same
     shape the location wiring uses. */
  function inEnrolForm(node) {
    if (!node) return false;
    if (node.closest) return Boolean(node.closest('#enrol-form'));

    var el = node;
    while (el) {
      if (el.id === 'enrol-form') return true;
      el = el.parentNode;
    }
    return false;
  }

  /* ======================================================================
     THE GROUP HANDOFF

     Exactly three places send a guest to the group, and each one has a
     different job. The success panel is the moment, at peak willingness, and it
     is gone on the next load. The section below registration is the permanent
     address of the link, for the guest who tapped past that moment. The bar's
     second state catches the guest who scrolled past both.

     The returning view deliberately carries none. A fourth affordance for one
     intent, sitting directly above the section that exists for exactly that
     purpose, is the duplicate CTA failure, and it is written down here so it is
     not helpfully added later.

     One writer sits under all three, so the flag cannot be set on one path and
     missed on another.
     ====================================================================== */

  /* The single writer of the joined flag, and the string it writes appears once
     in this file. Every group CTA on the page routes through here.

     Re-rendering the bar afterwards is the whole point rather than a courtesy:
     the bar's second state is gated on this flag, so a guest who joined from
     the panel or from the section is never asked about the group again. */
  function markGroupJoined() {
    store.set('wa_joined', '1');
    renderNudge();
  }

  /* Absent, never disabled, and never rewritten.

     A falsy link returns null and the caller builds nothing, which is why no
     call site owns a greyed out button waiting for a value. The two layer read
     is the same defensive shape every other config read in this file uses,
     because the owner edits that file by hand.

     The href is the configured value, verbatim. No parameter is appended and no
     host is substituted anywhere in this file, so the only way to change where a
     guest lands is to change one line of config.js. No code to save, no image to
     scan, and no intermediate screen: one tap is the whole handoff.

     The opener blocking relationship attribute matches the one the bar's anchor
     already carries. Without it the tab this opens can navigate the one it came
     from, which is a real attack against a link a guest was told to trust. */
  function whatsappButton(labelKey, className) {
    var group = CFG.whatsapp || {};
    var url = typeof group.inviteUrl === 'string' ? group.inviteUrl : '';
    if (!url) return null;

    var a = document.createElement('a');
    a.className = className;
    a.setAttribute('data-i18n', labelKey);
    a.textContent = t(labelKey);
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    a.addEventListener('click', markGroupJoined);
    return a;
  }

  /* The hidden attribute is removed only when there is a link to remove it for.
     With none it stays exactly where index.html put it and the section is never
     taken out of the DOM: no flash, no layout shift, nothing to tear down, and
     the page order below registration does not change at all on the day this
     lands. The day the owner fills the value in, one config line turns it on.

     No new class is introduced for the section. It is the existing section
     scaffolding unchanged, and its CTA is a plain primary button rather than the
     unused legacy class further down styles.css, which carries a side stripe
     this phase has committed to not spreading to a new usage. */
  function renderWhatsApp() {
    var section = $('#wa');
    var host = $('#wa-body');
    if (!section || !host) return;

    host.textContent = '';

    var cta = whatsappButton('wa.cta', 'btn btn--primary wa__cta');
    if (!cta) return;

    section.removeAttribute('hidden');
    host.appendChild(cta);
  }

  /* ======================================================================
     ENROLLMENT DEADLINE and NUDGE
     The pressure to register, which depends only on the clock. The form it
     points at is built above; the gate below reads that form's existence and
     is deliberately not touched by it.

     Rule: an enrolled guest is never nudged again. Nagging someone who has
     already done the thing is the fastest way to lose them.
     ====================================================================== */

  var deadlineMs = Date.parse((CFG.enrollment || {}).deadline);

  /* One close test, two callers. It exists because the hero line and the bar
     answer the same question and used to answer it differently: the hero line
     asked whether the deadline had passed before saying anything, and the bar
     asked only after it had already bucketed the days, so for a full day after
     closing the hero line was hidden for being past while the bar was still
     telling guests registration was open. One screen, two contradictory
     statements, neither of them checkable by the guest. */
  function deadlinePassed() {
    return !isNaN(deadlineMs) && Date.now() > deadlineMs;
  }

  /* The day bucket, in calendar days rather than in 24 hour windows.

     Every string in the ladder below makes a calendar claim: "closes today"
     means the deadline falls on today's date, and "closes tomorrow" means it
     falls on tomorrow's. So the number is built from the year, month and day
     parts in Europe/Copenhagen, the same zone formatDate already pins, and it
     counts the days a guest counts on a calendar.

     The millisecond division it replaces could not make that claim. At 09:00 on
     the closing date there are fifteen hours left, Math.ceil of that is 1, and
     the bar said "closes tomorrow" on the last day there was.

     The catch is the same shape formatDate uses and is there for the same
     reason: on a platform that cannot answer the better question this degrades
     to the old arithmetic rather than throwing. That fallback can still yield
     negative zero, which is exactly the defect this region carried, and it is
     harmless here only because deadlinePassed() runs above every caller. */
  function calendarDaysUntil(ms) {
    try {
      var fmt = new Intl.DateTimeFormat('en-GB', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Copenhagen'
      });
      var dayOf = function (at) {
        var parts = fmt.formatToParts(new Date(at));
        var y = 0, m = 0, d = 0;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (p.type === 'year') y = Number(p.value);
          else if (p.type === 'month') m = Number(p.value);
          else if (p.type === 'day') d = Number(p.value);
        }
        return Date.UTC(y, m - 1, d);
      };
      return Math.round((dayOf(ms) - dayOf(Date.now())) / 86400000);
    } catch (e) {
      return Math.ceil((ms - Date.now()) / 86400000);
    }
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
    if (isEnrolled() || deadlinePassed()) { el.hidden = true; return; }

    el.textContent = t('hero.deadline').replace('{date}', formatDate(deadlineMs));
    el.hidden = false;
    el.setAttribute('data-urgent', calendarDaysUntil(deadlineMs) <= 7 ? '1' : '0');
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

      /* Closed, so the bar stops asking. Above the bucketing rather than below
         it, which is the whole of this fix: the hero line asks this same
         question through the same function, so the two surfaces cannot end up
         describing the same fact differently on one screen. */
      if (deadlinePassed()) { hideNudge(bar); return; }

      /* What was wrong here, written down so the next reader does not have to
         re-derive it. The bucket used to be Math.ceil((deadline - now) / a day).
         Math.ceil of a small negative is negative zero, negative zero compares
         equal to zero, so every deadline inside the twenty-four hours after
         closing took the days === 0 branch and rendered "Registration closes
         today." for a full day after registration closed.

         The corollary was worse. No positive offset could produce zero under
         that arithmetic, so the today branch was unreachable in the meaning its
         string claims: it made a calendar claim that only ever printed once the
         calendar day it named was over. The bucket is a calendar difference
         now, so the branch renders on the day the deadline falls, which is what
         the string says. */
      var days = isNaN(deadlineMs) ? null : calendarDaysUntil(deadlineMs);
      var msg;
      if (days === null || days > 7) msg = t('nudge.enrol.text');
      else if (days > 1)             msg = t('nudge.enrol.soon').replace('{n}', days);
      else if (days === 1)           msg = t('nudge.enrol.last');
      else if (days === 0)           msg = t('nudge.enrol.today');
      // Defensive floor only. The close test above already covers every past
      // deadline, so nothing reaches this in the shipped configuration.
      else { hideNudge(bar); return; }

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

  /* ----------------------------------------------------------------------
     The reserve is measured, never guessed.

     The shipped 76px was a guess, and it is wrong on the devices this site is
     actually read on: the bar is 12 + max(44, text) + 12 + a 1px border +
     env(safe-area-inset-bottom), which is 69px on a flat bottomed phone and up
     to 103px on a notched iPhone in portrait. Short by 27px is the footer's
     last line, or the address, sitting underneath a bar nobody can move.

     offsetHeight already includes the bar's own bottom padding for the safe
     area, so one read covers every device with the same arithmetic. A hidden
     bar reads 0, which is the right answer: the scroll padding below is
     unconditional and must not reserve room for a bar that is not there.
     ---------------------------------------------------------------------- */
  function measureNudge() {
    var bar = $('#nudge');
    if (!bar) return;
    document.documentElement.style.setProperty('--nudge-h', bar.offsetHeight + 'px');
  }

  function onNudgeViewportChange() { measureNudge(); }

  var nudgeObserver = null;

  /* Guarded the same way the map observer is: a missing capability degrades to
     the event list, never to absent. Held at module scope and disconnected
     before it is re-created.

     The event list is attached in both branches rather than only in the
     fallback, and the visual viewport entry is the reason. iOS Safari's
     collapsing toolbar changes the visual viewport without resizing the bar's
     own box and without firing a normal window resize, so neither the observer
     nor the plain resize event sees it. That is precisely the scroll where the
     reserve goes wrong, so it gets its own listener. */
  function observeNudge() {
    var bar = $('#nudge');
    if (!bar) return;

    if (typeof ResizeObserver === 'function') {
      if (nudgeObserver) { nudgeObserver.disconnect(); nudgeObserver = null; }
      nudgeObserver = new ResizeObserver(function () { measureNudge(); });
      nudgeObserver.observe(bar);
    }

    window.addEventListener('resize', onNudgeViewportChange);
    window.addEventListener('orientationchange', onNudgeViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onNudgeViewportChange);
    }

    measureNudge();
  }

  /* The teardown timer is held rather than fired and forgotten. A hide followed
     by a show inside the 240ms slide out would otherwise let the stale timer
     hide a bar that had just been brought back, which is reachable the moment
     the bar starts yielding to the keyboard. */
  var nudgeHideTimer = null;

  /* The queued frame is held for the same reason the teardown timer above is,
     and the trace is this one. Registering again re-renders: the guest has
     withdrawn so they are not enrolled, the form has just been built so the
     readiness gate is true, and a frame is queued to slide the bar in. The very
     next statement focuses the name field, which dispatches focusin
     synchronously, which hides the bar. Removing the attribute is a no-op,
     because the frame that sets it has not run yet. It runs a frame later, the
     bar slides in over the soft keyboard the focus call just raised, carrying a
     message pointed at a form the guest is already typing into, and 240ms after
     that it vanishes with no transition. */
  var nudgeShowFrame = null;

  function showNudge(bar) {
    if (nudgeHideTimer) { clearTimeout(nudgeHideTimer); nudgeHideTimer = null; }
    bar.hidden = false;
    measureNudge();
    document.body.setAttribute('data-nudge', '1');
    if (nudgeShowFrame !== null) cancelAnimationFrame(nudgeShowFrame);
    nudgeShowFrame = requestAnimationFrame(function () {
      nudgeShowFrame = null;
      bar.setAttribute('data-show', '1');
    });
  }

  /* R3. The reserve is released inside the timeout, after the bar has finished
     sliding out. Dropping it at the instant of the tap pulls the page up by the
     bar's whole height while the bar is still animating away, under the thumb
     that just tapped dismiss. */
  function hideNudge(bar) {
    if (nudgeShowFrame !== null) { cancelAnimationFrame(nudgeShowFrame); nudgeShowFrame = null; }
    bar.removeAttribute('data-show');
    if (nudgeHideTimer) clearTimeout(nudgeHideTimer);
    nudgeHideTimer = setTimeout(function () {
      nudgeHideTimer = null;
      bar.hidden = true;
      document.body.removeAttribute('data-nudge');
      measureNudge();
    }, 240);
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

    /* Tapping through counts as done, but only from the state that actually
       hands over a link. In the other state this anchor is an in page jump to
       the registration form and joins nothing.

       The flag is written by the shared helper and never here, so this CTA
       cannot disagree with the other two. The helper re-renders the bar, which
       is what takes it down: the group state is gated on the flag it just
       wrote. */
    if (cta) cta.addEventListener('click', function () {
      if (bar.getAttribute('data-state') !== 'group') return;
      markGroupJoined();
    });
  }

  /* ======================================================================
     TOAST
     ====================================================================== */

  var toastEl = $('#toast');
  var toastTimer = null;
  var toastHideTimer = null;

  /* Both timers held at module scope and both cleared before either is set,
     which is the rule this file states for itself and already applies to
     copyRevert, mapTimer and nudgeHideTimer. The hide timer used to be the one
     exception, and this phase is what made the exception reachable: it added
     two toasts fired from controls sitting two rows apart on the same panel, so
     a second message arriving inside the previous one's 260ms fade is an
     ordinary sequence rather than a contrivance. The stale hide would then set
     hidden on the new message, and [hidden] takes it off the screen entirely,
     so a guest is told something and never gets to read it. */
  function toast(msg) {
    if (!toastEl) return;

    if (toastTimer !== null)     { clearTimeout(toastTimer);     toastTimer = null; }
    if (toastHideTimer !== null) { clearTimeout(toastHideTimer); toastHideTimer = null; }

    toastEl.textContent = msg;
    toastEl.hidden = false;
    // Next frame, so the transition actually runs from the hidden state.
    requestAnimationFrame(function () { toastEl.setAttribute('data-show', '1'); });

    toastTimer = setTimeout(function () {
      toastTimer = null;
      toastEl.removeAttribute('data-show');
      toastHideTimer = setTimeout(function () {
        toastHideTimer = null;
        toastEl.hidden = true;
      }, 260);
    }, 2400);
  }

  /* ======================================================================
     INIT
     ====================================================================== */

  function init() {
    lang = resolveInitialLang();
    wireNudge();
    observeNudge();
    wireLocation();
    wireEnrollment();
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
