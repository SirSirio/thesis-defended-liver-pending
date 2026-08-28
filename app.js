/* ==========================================================================
   COURSE 31026
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

    // Immediately after the sweep, which is what it exists to correct.
    syncNavLabel();

    renderSchedule();
    /* Beside renderSchedule and before the countdown, because it answers the
       same question the fact table answers and the two must never be a render
       apart. It also rewrites the weekday, which is the one string in the hero
       that is generated by Intl rather than looked up in copy.js, so a
       language switch has to reach it. */
    renderSaveDate();
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

    /* Beside social proof and for the same reason: non blocking, so its
       position costs nothing, and a switch has to re-render its labels and its
       album head. Deliberately not last, because measureNudge() owns that slot
       and the reserve it measures must be taken after every string in the bar
       has been rewritten, which nothing in the photos section touches. */
    renderPhotos();
    /* The album used to be re-rendered here. It is a page of its own now
       (album.html), it resolves its own language from the same storage key,
       and this page no longer holds a node for it, so a call from here would
       be a call to nothing. That is exactly the shape of the defect this
       section just fixed, and it is not being recreated one line lower. */

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

  /* The photo portal's opening moment, parsed once, here, by the same helper
     and beside the same two values, because it is the same kind of value doing
     the same job. The configured string carries its own UTC offset, so the
     parse yields one instant that every guest shares no matter which country
     their phone thinks it is in. */
  var photosOpenMs = Date.parse((CFG.photos || {}).opensAt);

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

  /* ======================================================================
     SAVE THE DATE

     The hero's anchor, and the one thing on this page with a job outside the
     page: getting 3 October into a calendar the guest actually looks at.

     Every value here is derived from CFG.startsAt. Nothing about the date is
     written down twice, so the big number in the hero, the sentence under it,
     the .ics file and the Google Calendar link cannot disagree with each
     other or with the countdown, and moving the party is still a one line
     edit in config.js.
     ====================================================================== */

  function saveDateLocale() {
    return lang === 'it' ? 'it-IT' : (lang === 'da' ? 'da-DK' : 'en-GB');
  }

  /* Day, month and year as the venue reads them. Europe/Copenhagen is pinned
     here for the same reason formatDate and calendarDaysUntil pin it: a guest
     opening this in Rome must be told the Copenhagen date, and a guest who
     opens it on a phone still set to a holiday timezone must be told the same
     one. The catch degrades to the device clock rather than to nothing. */
  function zoneParts(ms) {
    var out = {};
    try {
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Copenhagen',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(new Date(ms)).forEach(function (p) { out[p.type] = p.value; });
      if (out.day && out.month) return out;
    } catch (e) { /* fall through */ }

    var d = new Date(ms);
    return {
      day: pad(d.getDate()),
      month: pad(d.getMonth() + 1),
      year: String(d.getFullYear())
    };
  }

  /* The weekday matters more than anything else in this string. "Saturday"
     tells a guest whether they have to take a day off; "3 October" does not,
     and nobody holds next year's calendar in their head. */
  function formatFullDate() {
    if (isNaN(startMs)) return '';
    try {
      return new Intl.DateTimeFormat(saveDateLocale(), {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Copenhagen'
      }).format(new Date(startMs));
    } catch (e) {
      return formatSchedule();
    }
  }

  // The canonical address, so the link inside a calendar entry survives being
  // opened from a device that never visited the page.
  function pageUrl() {
    var og = $('meta[property="og:url"]');
    var href = og && og.getAttribute('content');
    if (href) return href;
    return String(window.location.href).split('#')[0];
  }

  // The end of the party is a guess in config.js and the comment there says
  // so. A missing or unparseable one must not produce a calendar entry with
  // no duration, so it falls back to six hours.
  function partyEndMs() {
    if (!isNaN(endMs) && endMs > startMs) return endMs;
    return startMs + 6 * 3600000;
  }

  /* RFC 5545 wants UTC timestamps in this exact shape. Emitting the Z form
     rather than a local time plus a VTIMEZONE block is the deliberate choice:
     it is unambiguous, it needs no timezone database shipped inside the file,
     and every calendar client converts it back into the reader's own zone,
     which is the behaviour a guest flying in from Italy actually wants. */
  function icsStamp(ms) {
    var d = new Date(ms);
    return String(d.getUTCFullYear()) +
      pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  // RFC 5545 section 3.3.11. Backslash first, or it escapes its own escapes.
  function icsText(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');
  }

  function octets(ch) {
    var c = ch.charCodeAt(0);
    if (c < 0x80) return 1;
    if (c < 0x800) return 2;
    return 3;
  }

  /* RFC 5545 section 3.1: content lines are folded at 75 octets and each
     continuation begins with one space. Counted in octets rather than in
     characters because the Danish table puts multi byte characters straight
     into SUMMARY and DESCRIPTION, and a fold counted in characters would push
     those lines over the limit. Surrogate pairs are consumed whole so a fold
     can never land inside one. */
  function icsFold(line) {
    var out = '';
    var cur = '';
    var used = 0;
    var i = 0;

    while (i < line.length) {
      var ch = line.charAt(i);
      var n = octets(ch);

      if (ch >= '\uD800' && ch <= '\uDBFF' && i + 1 < line.length) {
        ch = line.substr(i, 2);
        n = 4;
        i += 2;
      } else {
        i += 1;
      }

      if (used + n > 75) {
        out += cur + '\r\n';
        cur = ' ';
        used = 1;
      }

      cur += ch;
      used += n;
    }

    return out + cur;
  }

  /* Stable, and derived from the start time. A guest who taps the button
     twice gets one entry updated rather than two entries stacked, and a guest
     who tapped it before a date change gets the moved party rather than a
     second party. */
  function icsUid() {
    return 'course-31026-' + icsStamp(startMs) + '@thesis-defended-liver-pending';
  }

  function buildIcs() {
    if (isNaN(startMs)) return null;

    var venue = CFG.venue || {};
    var where = venue.name || venue.address || '';
    var body = t('savedate.event.body') + '\n\n' + pageUrl();

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Course 31026//Thesis Defended Liver Pending//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + icsUid(),
      'DTSTAMP:' + icsStamp(Date.now()),
      'DTSTART:' + icsStamp(startMs),
      'DTEND:' + icsStamp(partyEndMs()),
      'SUMMARY:' + icsText(t('savedate.event.title'))
    ];

    if (where) lines.push('LOCATION:' + icsText(where));

    lines.push('DESCRIPTION:' + icsText(body));
    lines.push('URL:' + icsText(pageUrl()));
    lines.push('TRANSP:OPAQUE');

    // One day before, which is the reminder a party needs. An hour before is
    // useless for something you have to travel to and buy a bottle for.
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('TRIGGER:-P1D');
    lines.push('DESCRIPTION:' + icsText(t('savedate.event.title')));
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    // CRLF between lines is required by the spec, not a Windows habit.
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  function googleCalUrl() {
    if (isNaN(startMs)) return null;

    var venue = CFG.venue || {};
    var where = venue.name || venue.address || '';
    var body = t('savedate.event.body') + '\n\n' + pageUrl();

    var q = [
      'action=TEMPLATE',
      'text=' + encodeURIComponent(t('savedate.event.title')),
      'dates=' + icsStamp(startMs) + '/' + icsStamp(partyEndMs()),
      'details=' + encodeURIComponent(body)
    ];
    if (where) q.push('location=' + encodeURIComponent(where));

    return 'https://calendar.google.com/calendar/render?' + q.join('&');
  }

  /* A Blob and a synthetic click, with a data URI as the fallback. Both paths
     are tried because this has to work on the two browsers that matter here
     and they disagree: iOS Safari hands a .ics to the calendar import sheet,
     Android Chrome puts it in downloads where tapping it opens the calendar.
     Returns whether anything was actually handed over, because the guest has
     to be told the truth either way. */
  function downloadIcs() {
    var text = buildIcs();
    if (!text) return false;

    var name = 'course-31026.ics';

    function click(href, revoke) {
      var a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (revoke) setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
    }

    try {
      var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
      click(URL.createObjectURL(blob), true);
      return true;
    } catch (e) { /* fall through to the data URI */ }

    try {
      click('data:text/calendar;charset=utf-8,' + encodeURIComponent(text), false);
      return true;
    } catch (e2) {
      return false;
    }
  }

  function numPart(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function renderSaveDate() {
    var host = $('#savedate');
    if (!host) return;

    // No parseable date means no save the date block at all. A calendar
    // button that exports nothing is worse than no button.
    if (isNaN(startMs)) { host.hidden = true; return; }
    host.hidden = false;

    var parts = zoneParts(startMs);

    var num = $('#savedate-num');
    if (num) {
      num.textContent = '';
      num.appendChild(numPart('savedate__d', parts.day));
      num.appendChild(numPart('savedate__dot', '.'));
      num.appendChild(numPart('savedate__m', parts.month));
    }

    var full = $('#savedate-full');
    if (full) full.textContent = formatFullDate();

    var gcal = $('#savedate-gcal');
    if (gcal) {
      var url = googleCalUrl();
      if (url) { gcal.href = url; gcal.hidden = false; }
      else { gcal.hidden = true; }
    }
  }

  function wireSaveDate() {
    var btn = $('#savedate-add');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var ok = downloadIcs();
      toast(t(ok ? 'savedate.toast.ok' : 'savedate.toast.fail'));
      if (!ok) return;

      /* Announced rather than acted on. motion.js listens for this and throws
         confetti; this file does not know that and must not care, because the
         motion layer is optional by construction and the calendar export has
         to work identically whether or not it ever loaded. */
      try { document.dispatchEvent(new CustomEvent('c03102:saved')); }
      catch (e) { /* no CustomEvent constructor here, so nothing celebrates */ }
    });
  }

  /* ======================================================================
     THE AWAKENING

     For five seconds this is a DTU course page. Then it stops being one.

     Deliberately here and not in motion.js. The morph is the site's identity
     rather than an embellishment on it, it is CSS from end to end, and it has
     to happen on a phone that never finished downloading GSAP. motion.js only
     listens for the event and adds the parts that need a tween.

     Three seconds is long enough to read "Course 31026" and the headline and
     take the joke at face value, and short enough that nobody has scrolled
     past the hero yet. Nothing it changes is a layout property, so a guest
     who is mid sentence when it fires does not get the sentence moved.
     ====================================================================== */

  /* The objectives list ships open and is closed here on a phone only, which
     is the safe direction: a browser where this never runs shows the list,
     which is what this section did before. A disclosure that fails open loses
     nothing; one that fails closed hides content behind a control that may
     also be broken.

     Only touched once, on load. A guest who opens it and then rotates the
     phone has made a decision and it is not re-made for them. */
  function foldObjectivesOnPhone() {
    var fold = $('#obj-fold');
    if (!fold || !window.matchMedia) return;
    try {
      if (!window.matchMedia('(min-width: 901px)').matches) fold.removeAttribute('open');
    } catch (e) { /* leave it open */ }
  }

  /* Five, not three. Three was the first guess and it was short: a guest who
     lands mid sentence in the headline has barely finished reading it before
     the page changes character, which spends the joke before it has landed. */
  var AWAKEN_AFTER_MS = 5000;

  /* The morph is announced rather than simply happening, and the announcement
     is a droplet being dispensed from a needle: the host's thesis is modular
     automated liquid dispensing for point of care diagnostics, so the thing
     that transforms the page is the thing the party is celebrating.

     This is how long the droplet is in the air. motion.js starts the dispense
     when the event below fires and the drop lands exactly as the page morphs,
     so the morph reads as caused by the impact rather than as coinciding with
     it. One owner and one constant: motion.js runs no clock of its own, and
     if it never loads these two timers still morph the page on schedule with
     nothing falling. */
  var DISPENSE_LEAD_MS = 1700;

  var awakenTimer = null;
  var dispenseTimer = null;
  var revealStarted = false;

  function awaken() {
    if (awakenTimer !== null) { clearTimeout(awakenTimer); awakenTimer = null; }
    if (dispenseTimer !== null) { clearTimeout(dispenseTimer); dispenseTimer = null; }
    if (document.documentElement.getAttribute('data-awake') === '1') return;

    document.documentElement.setAttribute('data-awake', '1');

    /* Announced for the same reason the calendar save is announced: this file
       does not know or care whether anything is listening, and the morph is
       finished either way. */
    try { document.dispatchEvent(new CustomEvent('c03102:awake')); }
    catch (e) { /* no CustomEvent constructor, so nothing embellishes it */ }
  }

  /* Starts the announcement and arms the morph behind it. Idempotent, because
     both the clock and the guest's first touch can call it and whichever
     arrives first wins.

     An early touch does not skip the dispense, it brings it forward. The
     announcement is the point of the whole sequence, so a guest who taps at
     one second gets the droplet at one second rather than getting no droplet
     at all. */
  function beginReveal() {
    if (revealStarted) return;
    revealStarted = true;

    if (dispenseTimer !== null) { clearTimeout(dispenseTimer); dispenseTimer = null; }

    try { document.dispatchEvent(new CustomEvent('c03102:dispensing')); }
    catch (e) { /* nothing is dispensed, and the morph below still happens */ }

    if (awakenTimer !== null) { clearTimeout(awakenTimer); awakenTimer = null; }
    awakenTimer = setTimeout(awaken, DISPENSE_LEAD_MS);
  }

  function scheduleAwakening() {
    // Armed so the drop lands on AWAKEN_AFTER_MS, not so it starts there.
    dispenseTimer = setTimeout(beginReveal, Math.max(0, AWAKEN_AFTER_MS - DISPENSE_LEAD_MS));

    /* There is deliberately no "wake early on first touch" shortcut here.

       There was one, and on a phone it defeated the whole sequence: the tap
       that triggers a reload lands as a pointerdown on the newly loaded page,
       so the morph fired the instant the guest refreshed and the five seconds
       of straight faced DTU never happened. The owner reported exactly that.

       The five seconds are the joke. Nothing may pre-empt them, and the
       supposed benefit of the shortcut, saving an impatient guest three
       seconds, was speculative where the damage was not. */
  }

  /* ======================================================================
     MOBILE NAVIGATION

     Below 900px this is the navigation. The bar keeps the course mark and the
     Building access link and nothing else, so everything the guest cannot see
     has to be reachable from here or it is not reachable at all.
     ====================================================================== */

  var navOpen = false;
  var navPushed = false;
  var navShowFrame = null;
  var navReturnFocus = null;

  function navFocusables(menu) {
    return $$('a[href], button', menu).filter(function (el) {
      return !el.disabled && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  /* Which section the guest is currently looking at, as an index into the
     sheet's tiles. The last one whose top has passed a third of the way down
     the viewport, which reads as "the one I am in" rather than "the one
     nearest the top edge": at a section boundary the latter flickers between
     two answers while the former commits. Falls back to the first. */
  function currentSectionIndex(links) {
    var mark = (window.innerHeight || 800) / 3;
    var found = 0;
    for (var i = 0; i < links.length; i++) {
      var id = (links[i].getAttribute('href') || '').slice(1);
      var target = id && document.getElementById(id);
      if (!target || target.hidden) continue;
      if (target.getBoundingClientRect().top <= mark) found = i;
    }
    return found;
  }

  /* Slides the box onto the active tile. Read once, written once: every
     measurement is taken before anything is set, so this cannot bounce the
     browser between layout and paint down the list of tiles.

     The index is passed in rather than computed here, and that is the fix for
     a real bug: openNav applies a body scroll lock, and locking the body
     perturbs the scroll position, so a reading taken after it answered the
     wrong section. The page is measured before it is frozen. */
  function positionSpot(active) {
    var menu = $('#navmenu');
    var spot = $('#navmenu-spot');
    if (!menu || !spot) return;

    var links = $$('.navmenu__grid a', menu);
    if (!links.length) return;

    if (typeof active !== 'number' || active < 0 || active >= links.length) {
      active = currentSectionIndex(links);
    }
    var box = links[active];
    var grid = box.parentNode;

    links.forEach(function (a, i) {
      if (i === active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });

    /* Measured against the grid's own rectangle rather than through
       offsetLeft and offsetTop. Those are relative to offsetParent, which is
       whichever ancestor happens to be positioned, and while the sheet is
       still mid entrance that answered 0 for every tile and parked the box on
       the first one no matter which section the guest was in. Two rectangles
       subtracted cannot be confused about what they are relative to. */
    var gb = grid.getBoundingClientRect();
    var bb = box.getBoundingClientRect();

    /* The tiles are mid entrance when this runs: they animate from
       translateY(16px) to none, and getBoundingClientRect reports where a
       thing is drawn, not where it was laid out. So the box was being placed
       16px below the tile and never caught up, because the box has its own
       transition and was already at rest by the time the tile finished.

       Subtracting the tile's in flight translation gives its resting position,
       which is the one the highlight has to agree with. Read from the computed
       matrix rather than assumed, so it stays correct if the entrance changes. */
    var shiftX = 0, shiftY = 0;
    try {
      var tf = window.getComputedStyle(box).transform;
      if (tf && tf !== 'none') {
        var n = tf.slice(tf.indexOf('(') + 1, tf.lastIndexOf(')')).split(',');
        if (n.length === 6) {            // matrix(a,b,c,d,tx,ty)
          shiftX = parseFloat(n[4]) || 0;
          shiftY = parseFloat(n[5]) || 0;
        } else if (n.length === 16) {    // matrix3d
          shiftX = parseFloat(n[12]) || 0;
          shiftY = parseFloat(n[13]) || 0;
        }
      }
    } catch (e) { /* leave both at zero and place it where it is drawn */ }

    // Nothing has been laid out yet. Try again next frame rather than writing
    // a position that is known to be wrong.
    if (!bb.width || !bb.height) {
      requestAnimationFrame(function () { positionSpot(active); });
      return;
    }

    spot.style.width = bb.width + 'px';
    spot.style.height = bb.height + 'px';
    spot.style.transform = 'translate(' +
      (bb.left - gb.left - shiftX) + 'px, ' +
      (bb.top - gb.top - shiftY) + 'px)';
    spot.setAttribute('data-on', '1');
  }

  function openNav() {
    var toggle = $('#navtoggle');
    var menu = $('#navmenu');
    if (!toggle || !menu || navOpen) return;

    navOpen = true;
    navReturnFocus = document.activeElement;

    /* Measured first, while the page is still where the guest left it. The
       scroll lock below moves it, so anything read after this line is reading
       a page that has already been disturbed. */
    var active = currentSectionIndex($$('.navmenu__grid a', menu));

    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', t('nav.menu.close'));

    /* The page behind must not scroll while a full screen panel is over it.
       Clearing the inline value on close restores overflow-x: hidden from the
       stylesheet rather than losing it. */
    document.body.style.overflow = 'hidden';

    try { window.history.pushState({ c03102: 'index' }, ''); navPushed = true; }
    catch (e) { navPushed = false; }

    if (navShowFrame !== null) { cancelAnimationFrame(navShowFrame); navShowFrame = null; }
    navShowFrame = requestAnimationFrame(function () {
      navShowFrame = null;
      menu.setAttribute('data-show', '1');
      /* Placed in the same frame the sheet is told to rise. The tiles have
         layout by now because the container is no longer hidden, and putting
         it here means the box is already under the right tile as the sheet
         arrives rather than jumping onto it a moment later. */
      positionSpot(active);
    });

    var first = navFocusables(menu)[0];
    if (first) first.focus();
  }

  function closeNav(restoreFocus, fromPop) {
    var toggle = $('#navtoggle');
    var menu = $('#navmenu');
    if (!toggle || !menu || !navOpen) return;

    navOpen = false;

    /* Same history contract as the lightbox: the sheet is a screenful of
       overlay, so the system back gesture has to dismiss it rather than
       navigate the page behind it. */
    if (navPushed && !fromPop) {
      navPushed = false;
      try { window.history.back(); } catch (e) { /* nothing to unwind */ }
    } else {
      navPushed = false;
    }

    if (navShowFrame !== null) { cancelAnimationFrame(navShowFrame); navShowFrame = null; }
    menu.removeAttribute('data-show');
    menu.hidden = true;

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('nav.menu.open'));
    document.body.style.overflow = '';

    /* Only when the guest closed it themselves. Following a link out of the
       panel must leave focus on the section they jumped to, not drag it back
       to a button at the top of a page they have just left. */
    if (restoreFocus) {
      var target = navReturnFocus && navReturnFocus.focus ? navReturnFocus : toggle;
      try { target.focus(); } catch (e) { /* detached, so nothing to restore to */ }
    }
    navReturnFocus = null;
  }

  /* The [data-i18n] sweep rewrites the toggle's accessible name from
     nav.menu.open unconditionally, and the language buttons live inside the
     panel, so a guest switching language while the panel is open is an
     ordinary sequence rather than a contrivance. Without this the button would
     then say "open the menu" while the menu is open. */
  function syncNavLabel() {
    var toggle = $('#navtoggle');
    if (toggle && navOpen) toggle.setAttribute('aria-label', t('nav.menu.close'));
  }

  function wireNav() {
    var toggle = $('#navtoggle');
    var menu = $('#navmenu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      if (navOpen) closeNav(true); else openNav();
    });

    // A jump link has done its job the moment it is followed.
    $$('a[href]', menu).forEach(function (a) {
      a.addEventListener('click', function () { closeNav(false); });
    });

    // Tapping the dimmed area outside the sheet dismisses it, which is what a
    // sheet is expected to do. Its own element, so the hit area is exactly the
    // scrim and never the sheet.
    var scrim = $('#navmenu-scrim');
    if (scrim) scrim.addEventListener('click', function () { closeNav(true); });

    // Switching language leaves the panel open. The guest is still choosing.
    document.addEventListener('keydown', function (e) {
      if (!navOpen) return;

      var key = e.key;
      if (key === 'Escape' || key === 'Esc') {
        e.preventDefault();
        closeNav(true);
        return;
      }

      if (key !== 'Tab') return;

      /* Focus trap. Without it, Tab walks straight out of the panel and into
         the page underneath, which is still there and still full of links a
         guest cannot see. */
      var items = navFocusables(menu);
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    /* A phone rotated into landscape can cross 900px, where the panel is
       display:none and the button that closes it does not exist. Left open, it
       would take the scroll lock with it and freeze a page that looks fine. */
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 901px)');
      var onWide = function (e) { if (e.matches) closeNav(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }
  }

  function phase(now) {
    if (isNaN(startMs)) return 'before';
    if (now < startMs) return 'before';
    if (!isNaN(endMs) && now >= endMs) return 'over';
    return 'live';
  }

  /* Epoch milliseconds and nothing else: no date built from separate year,
     month and day arguments, no comparison of formatted strings, and the
     browser's own offset is never consulted. Both sides of the comparison are
     integers, so the per-tick cost below is nothing.

     The fallback cuts the opposite way from phase() above, and that inversion
     is load bearing rather than an oversight. An unparseable or absent opensAt
     opens the portal, never shuts it: config.js documents `opensAt: null` as
     the owner's one line recovery from a phone showing the wrong date, on the
     night, with nobody at a laptop, and a typo in that field must not lock the
     album shut for everybody. Written as: closed only when there is a valid
     timestamp still in the future. */
  function photosOpen(now) {
    if (isNaN(photosOpenMs)) return true;
    return now >= photosOpenMs;
  }

  /* The gate rides the clock that already exists. No new interval and no new
     timer is created anywhere in this phase, and the countdown's own one is
     neither duplicated nor restarted.

     renderPhotos() runs only when the boolean flips, so a guest reading the
     closed panel does not have it rebuilt under them once a second, and a
     guest sitting on the page when the moment passes gets the upload body
     without touching anything.

     opensAt is kept earlier than startsAt, and config.js names that
     relationship beside the value: the countdown's closing state tells guests
     to go and upload, so it must always land inside the open window and can
     never invite them to a portal that is shut. */
  var photosWasOpen = photosOpen(Date.now());

  function syncPhotosGate() {
    var open = photosOpen(Date.now());
    if (open === photosWasOpen) return;
    photosWasOpen = open;
    renderPhotos();
  }

  var lastSrMinute = null;

  function renderCountdown() {
    /* Above the node guards on purpose. This is the countdown's tick, and the
       gate has to be re-evaluated on a page whose countdown markup is missing
       just as much as on one where it is present. The visibility handler below
       reaches this same call through startClock(), which renders once before
       it re-arms the interval, so the two re-evaluation sites the contract
       asks for are the tick and the return from a backgrounded tab. */
    syncPhotosGate();

    if (!els.root) return;
    /* The six cached nodes below are dereferenced unguarded while els.sr and the
       label are guarded, which is the file's defensive style applied to two
       nodes out of eight. Every one of them is in index.html today, so this is
       consistency rather than a live crash, and one guard beside the root check
       is the whole of it: the function cannot render either of its two states
       without these. */
    if (!els.d || !els.h || !els.m || !els.s || !els.status || !els.note) return;

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

  /* A backgrounded tab throttles timers, so the clock is re-synced on return
     rather than left showing a stale value. startClock() renders once before
     it re-arms the interval, and renderCountdown() re-evaluates the photo
     portal's gate as its first statement, so a phone that was in a pocket
     while uploads opened shows the control the moment it comes back out. */
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

    var hostName = (CFG.course && CFG.course.host) || '';

    var host = $('#fact-host');
    if (host && hostName) host.textContent = hostName;

    /* The course responsible in the hero, name and face.

       Both come from config.course and neither is written in the markup, so
       the name appears in exactly one place in this file and the fold row and
       the hero card cannot disagree about who is hosting.

       The photograph is optional and degrades to the initial in a disc. That
       is the rule every unset value on this site follows: a placeholder has to
       read as deliberate rather than as something that failed to load. A path
       that is configured but 404s falls back the same way, because a broken
       frame in the hero is the one outcome worse than no photograph at all. */
    var cardName = $('#hostcard-name');
    if (cardName && hostName) cardName.textContent = hostName;

    var pic = $('#hostcard-pic');
    if (pic) {
      var initial = hostName ? hostName.charAt(0).toUpperCase() : '';

      /* A var rather than a block scoped function declaration. Declaring a
         function inside a block is a syntax error in ES5 strict mode, which is
         the dialect this file is written in, and it is exactly the kind of
         thing that passes a parse check here and fails on an older phone. */
      var monogram = function () {
        pic.textContent = '';
        pic.setAttribute('data-mono', '1');
        pic.textContent = initial;
      };

      var photo = CFG.course && CFG.course.photo;
      if (!photo) {
        monogram();
      } else {
        var img = document.createElement('img');
        img.alt = '';                      // decorative: the name is beside it
        img.decoding = 'async';
        img.onerror = monogram;
        img.src = photo;

        pic.textContent = '';
        pic.removeAttribute('data-mono');
        pic.appendChild(img);
      }
    }

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
     wa_joined, guest_id, name, extra_guests, note, photo_count. The first three
     were written by phase 1 and are neither renamed nor repurposed, because
     live guests already carry them on their devices. photo_count was added by
     phase 4 and is the soft half of the five per guest limit; the hard half is
     the trigger in supabase/schema.sql section 4.

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

    /* The extra_guests treatment exactly: a decimal string in, parseInt base 10
       out, and an isNaN default, so no float and no locale formatting ever
       enters storage. */
    photoCount: function () {
      var n = parseInt(store.get('photo_count'), 10);
      return isNaN(n) || n < 0 ? 0 : n;
    },

    setPhotoCount: function (n) {
      store.set('photo_count', String(n == null ? 0 : n));
    },

    /* The guest's own submissions, by storage path, on this device.

       This exists because public.album deliberately does not carry guest_id
       and must never be asked for it (T-04-01, schema section 9): that id is
       the credential for amending a registration, and putting it in a public
       view or in a query string hands one guest the ability to edit another
       guest's entry. "Show me my photos" is therefore answered on the device
       that uploaded them and nowhere else.

       Same accepted limitation as every other identity value here: clearing
       browser data or switching phones loses the list. IDEA.md already states
       that trade for the photo cap and it is the same trade. The shared album
       is unaffected either way, because it is read from the view.

       Every path is re-validated against STORAGE_PATH_RE on the way out, not
       just on the way in. localStorage is guest writable, these strings become
       image URLs, and a value that has been sitting in storage since a
       previous version of this file has not earned any trust. */
    photoPaths: function () {
      var raw = store.get('photo_paths');
      if (!raw) return [];

      var list;
      try { list = JSON.parse(raw); }
      catch (e) { return []; }
      if (!Array.isArray(list)) return [];

      var out = [];
      for (var i = 0; i < list.length; i++) {
        if (typeof list[i] === 'string' &&
            STORAGE_PATH_RE.test(list[i]) &&
            out.indexOf(list[i]) === -1) {
          out.push(list[i]);
        }
      }
      return out;
    },

    /* The bulk write, and the only one that can SHRINK the list.

       addPhotoPath appends one at a time, which is right when this device is
       the thing that just uploaded. It is useless for the case this was added
       for: a device that holds a guest_id and a count but no paths at all,
       because it uploaded before paths were recorded. That device has nothing
       to append to and no way to learn what it is missing.

       Validated exactly as the read side validates, because the list arrives
       from the network here rather than from this file, and a path that does
       not match the contract must never reach an img src. */
    setPhotoPaths: function (list) {
      if (!Array.isArray(list)) return;
      var out = [];
      for (var i = 0; i < list.length; i++) {
        if (typeof list[i] === 'string' &&
            STORAGE_PATH_RE.test(list[i]) &&
            out.indexOf(list[i]) === -1) {
          out.push(list[i]);
        }
      }
      store.set('photo_paths', JSON.stringify(out));
    },

    addPhotoPath: function (p) {
      if (typeof p !== 'string' || !STORAGE_PATH_RE.test(p)) return;
      var list = this.photoPaths();
      if (list.indexOf(p) !== -1) return;
      list.push(p);
      store.set('photo_paths', JSON.stringify(list));
    },

    /* addPhotoPath's mirror, written the day a guest was allowed to take a
       photograph back out of the album.

       It reads through photoPaths() rather than through the raw string, which
       means the write also re-validates: a list that has been sitting in
       storage since a previous version of this file, or that a guest has
       edited by hand, is cleaned by the removal rather than preserved by it.
       Same reasoning as the read side, applied on the way past.

       Silent on a path that is not in the list. The caller has already been
       told the photograph is gone, and this feature deliberately cannot tell
       "not yours" from "already removed" anywhere else either. */
    removePhotoPath: function (p) {
      if (typeof p !== 'string') return;
      var list = this.photoPaths();
      var at = list.indexOf(p);
      if (at === -1) return;
      list.splice(at, 1);
      store.set('photo_paths', JSON.stringify(list));
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
      // Forgetting the device must not leave a submission tally behind, nor a
      // list of which photographs in the shared album belong to whoever was
      // holding this phone before. That list is the more revealing of the two.
      store.remove('photo_count');
      store.remove('photo_paths');
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
    /* Last, and it belongs here for the same reason the two above do. The
       photos ladder is a pure function of ident.name, ident.guest_id and the
       stored photo count, and every enrollment control writes at least one of
       those three. Without this call the gate stands after a registration and,
       worse, the upload control stands after "forget this device": the next
       pick would send bytes to the bucket under a null identity and leave an
       orphan object per file. renderPhotos()'s mid batch skip guard makes it
       safe to call at any moment. */
    renderPhotos();
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
      if (res.result === 'ok' || res.result === 'pending') {
        /* The registration exists in the database on both branches: the ok one
           wrote it, and the pending one proved it with a 409 before finding the
           amend function missing. Storage is the only place a receipt can come
           from, so it is written on both, and the pending branch says plainly
           in the panel that the change itself is not recorded yet.

           Written before any mounted test, and never behind one. A row that
           exists in the database and nowhere on the device is the worst state
           this file can produce: the guest is handed back an empty form with no
           confirmation, no error and no banner, while the host is counting
           them. refreshEnrollmentState() renders the receipt out of storage and
           module state rather than out of this node, so it appears whether the
           form survived or not.

           Today no reachable sequence detaches the form here, and the reason is
           worth writing down because it is a coupling and not an accident:
           renderEnrollment's early exit keeps a standing #enrol-form across a
           language switch whenever the selected body is the form and the mode
           matches, which is exactly the state this continuation runs in, and
           setFormState(form,'submitting') has disabled everything else in the
           body. Change either of those and the guard below becomes reachable.
           It is placed so that when that day comes it costs a repaint and not a
           registration. */
        amendPending = (res.result === 'pending');
        identity.save({
          guest_id: ident.guest_id,
          name: fields.name,
          extra_guests: fields.extra_guests,
          note: fields.note,
          enrolled: true
        });
        successShown = true;

        if (stillMounted(form)) setFormState(form, 'success');
        refreshEnrollmentState();
        focusPanelHeading('enrol-success-title');
        return;
      }

      // The failure branch renders into the form and into nothing else, so a
      // form that has left the document has nowhere to put the banner.
      if (!stillMounted(form)) return;

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
      /* As above, and for the same reason. The two answers the database has
         acted on write storage and module state first and unconditionally, and
         then render from those, so neither can be lost to a form that was
         replaced while the request was out. Only the state call on the old node
         needs it to still be there. */
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
        if (stillMounted(form)) setFormState(form, 'idle');
        refreshEnrollmentState();
        toast(t('enrol.updated.toast'));
        focusAfterEdit();
        return;
      }

      if (res.result === 'pending') {
        amendPending = true;
        editing = false;
        if (stillMounted(form)) setFormState(form, 'idle');
        refreshEnrollmentState();
        focusAmendPending(null);
        return;
      }

      // And as above, the failure banner has nowhere to go without the form.
      if (!stillMounted(form)) return;

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
     still counts them, and none the other way either, where the database has
     dropped them and the panel still offers to edit their registration. That is
     the exact failure the schema change was made to prevent, and it is
     prevented by reading the integer rather than the status, and by writing
     those two answers unconditionally rather than only when this box happened
     to survive the wait.

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
      /* The two answers that mean the guest is off the list are handled before
         any mounted test, and deliberately so. Neither of them writes into this
         box: they write storage and module state, and then refreshEnrollmentState()
         renders the withdrawn panel out of those, not out of this node. So they
         are correct whether the box is still in the document or not.

         Guarding them was worse than useless. The forget control cannot run
         during the request, because setWithdrawState freezes every button in
         #enrol-body for its duration, so the flag it used to guard against
         cannot be resurrected by that route. What can still detach the box is a
         language switch: the three language buttons live in the page header,
         outside the freeze, and renderEnrollment's form preserving early exit
         is gated on the form body, so the return panel is torn out and rebuilt.
         Bailing out here on that ordinary action threw away a withdrawal the
         database had already accepted and left the device saying "you are
         registered" while the head count no longer counted the guest, which is
         the invariant this function's header claims to have eliminated, running
         the other way. */
      if (res.result === 'ok' || res.result === 'gone') {
        store.set('enrolled', '0');

        withdrawnShown = true;
        successShown = false;
        editing = false;

        refreshEnrollmentState();
        focusPanelHeading('enrol-withdrawn-title');
        return;
      }

      /* Below here every branch renders into this box and into nothing else, so
         a box that has left the document has nowhere to put its answer. The
         panel was rebuilt under the request and already carries the untouched
         registration, which on these two branches is the truth. */
      if (!stillMounted(box)) return;

      /* The flag first, then the line, exactly as the edit path's pending
         branch does it. Written to module state rather than only into this row,
         because the next render for any reason rebuilds the panel from scratch
         and a decoration that lives only in the DOM evaporates there, taking
         the explanation with it and handing the Withdraw button back to a guest
         who would get the same non-answer from it. */
      if (res.result === 'pending') {
        amendPending = true;

        /* Out of the freeze first, and this is not the dead call it used to be.
           While the freeze was scoped to the box it was: the box was about to
           be destroyed anyway. The freeze now covers the whole of #enrol-body,
           so this is the only thing that hands the edit and the forget controls
           back, and they are in sibling rows that survive the replacement
           below. Without it this branch ends with every control on the panel
           disabled for the rest of the page's life and no re-render scheduled
           to rebuild them, recoverable only by reloading. It has to run above
           the parentNode test too, because that test returns as well. */
        setWithdrawState(box, 'idle');

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

  /* The bar's CTA, written by hand rather than through whatsappButton(). That
     function builds a new anchor, and #nudge-cta is a single static one that
     both bar states share and reuse: replacing the element would take its place
     in the bar's layout with it, and would drop the listeners wireNudge()
     attached at load.

     Same two part shape as the button though, and for the same reason. The
     glyph is a child rather than part of the text, so writing the label cannot
     delete it. textContent = '' first, because the two states swap through this
     one element and the enrol state must not inherit the group state's icon
     when a guest withdraws. */
  function setNudgeCta(cta, label, withGlyph) {
    cta.textContent = '';

    if (withGlyph) {
      var glyph = waGlyph();
      if (glyph) cta.appendChild(glyph);
    }

    var span = document.createElement('span');
    span.className = 'btn__label';
    span.textContent = label;
    cta.appendChild(span);
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
  /* The brand mark, cloned from the inert <template> in index.html rather than
     built here. Two rules meet at this function: this file may not assign
     innerHTML, and hand-rolling a forty-term SVG path through createElementNS
     would be unreadable. A template satisfies both, and keeps markup in markup.

     Returns null when the template is absent, because a missing decoration must
     never cost the guest the button it decorates. */
  function waGlyph() {
    var tpl = $('#wa-glyph');
    if (!tpl || !tpl.content) return null;
    var node = tpl.content.firstElementChild;
    return node ? node.cloneNode(true) : null;
  }

  /* The label lives in its own span, and that is load bearing rather than
     tidiness. applyLanguage() writes every [data-i18n] element with
     `el.textContent = val`, which replaces all children. With the attribute on
     the anchor the icon would render correctly on first paint and then vanish
     the first time a guest touched the language switch, which is precisely the
     kind of failure nobody tests for. The attribute sits on the span, so the
     sweep rewrites the words and never reaches its sibling. */
  function whatsappButton(labelKey, className) {
    var group = CFG.whatsapp || {};
    var url = typeof group.inviteUrl === 'string' ? group.inviteUrl : '';
    if (!url) return null;

    var a = document.createElement('a');
    a.className = className;
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');

    var glyph = waGlyph();
    if (glyph) a.appendChild(glyph);

    var label = document.createElement('span');
    label.className = 'btn__label';
    label.setAttribute('data-i18n', labelKey);
    label.textContent = t(labelKey);
    a.appendChild(label);

    a.addEventListener('click', markGroupJoined);
    return a;
  }

  /* The hidden attribute is removed only when there is a link to remove it for.
     With none it stays exactly where index.html put it and the section is never
     taken out of the DOM: no flash, no layout shift, nothing to tear down, and
     the page order below registration does not change at all on the day this
     lands. The day the owner fills the value in, one config line turns it on.

     No new class is introduced for the section. It is the existing section
     scaffolding unchanged, and its CTA is a plain primary button. */
  function renderWhatsApp() {
    var section = $('#wa');
    var host = $('#wa-body');
    if (!section || !host) return;

    host.textContent = '';

    var cta = whatsappButton('wa.cta', 'btn btn--primary wa__cta');
    if (!cta) return;

    /* The invitation card. Built here rather than in index.html for the reason
       the section's own hidden attribute exists: with no link configured there
       is no card, no empty frame and no bordered box standing around a button
       that was never created. The early return above still owns that case, so
       nothing below runs in the unconfigured state.

       Emptying #wa-body cannot reach the <template>, which is its sibling and
       not its child. The mark is cloned a second time here, independently of
       the one inside the button: same glyph, two different jobs, and a node
       cannot be in two places at once. */
    var card = document.createElement('div');
    card.className = 'wa-invite';

    var mark = waGlyph();
    if (mark) {
      /* Replaces the template's own class rather than adding to it. Both
         selectors weigh 0,1,0 and .wa-glyph sits later in the stylesheet, so
         carrying both classes let its fixed 22px beat the card's clamp and the
         mark rendered at label size. One class, one job. */
      mark.setAttribute('class', 'wa-invite__mark');
      card.appendChild(mark);
    }

    card.appendChild(cta);

    section.removeAttribute('hidden');
    host.appendChild(card);
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
     reason: a platform without IANA zone data or without formatToParts must
     still get an answer rather than an exception. What it degrades is the zone,
     from Copenhagen to the device's own, and nothing else. It is still a
     calendar difference between two midnights, so it still answers the calendar
     question every string in the ladder asks, it cannot return negative zero,
     and it does not need deadlinePassed() above it to be harmless.

     Degrading instead to the millisecond division this function replaced would
     have reintroduced the whole defect on those platforms: a 24 hour window
     cannot render "closes today" at all, and prints "closes tomorrow" on the
     last day there is. A guest on an old browser would be shown the false
     statement on the day the pressure is meant to peak, which is the outcome
     that was rejected when deleting the today key was considered. */
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
      var a = new Date(ms);
      var b = new Date();
      return Math.round((
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
        Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
      ) / 86400000);
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
      setNudgeCta(cta, t('nudge.enrol.cta'), false);
      cta.setAttribute('href', '#enrol');
      cta.removeAttribute('target');
      showNudge(bar);
      return;
    }

    // Enrolled. Offer the group once, then never bother them again.
    if (wa && store.get('wa_joined') !== '1') {
      bar.setAttribute('data-state', 'group');
      text.textContent = t('nudge.group.text');
      setNudgeCta(cta, t('nudge.group.cta'), true);
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
     PHOTOS: THE SECTION

     A guest picks a photograph, the browser shrinks it, it goes to Supabase
     Storage as an object, it gains a row in public.photos, and the album
     below reads it back through public.album and paints a tile.

     The write is two steps and the order is not symmetric. Storage first,
     then the row (D-19). A failed storage write leaves nothing anywhere. A
     failed row insert leaves an object nothing references, which is an
     invisible orphan in a bucket the owner can see from the dashboard. That
     is the cheaper of the two failures and it is accepted rather than
     repaired, because the alternative is a row pointing at bytes that are
     not there, which is a permanently broken tile in everyone's album.

     Success is proved by reading public.album back, never by a status code
     (D-27). The storage write answers 200 and the row insert answers 201, in
     the same upload of the same photograph, which is exactly why nothing in
     here is tested against a literal status.
     ====================================================================== */

  /* Clamped on read rather than trusted. An out of range quality is silently
     ignored by the encoder and replaced with the browser's default, so a typo
     in config.js produces larger files and no error anywhere. */
  function jpegQuality() {
    var q = (CFG.photos || {}).jpegQuality;
    if (typeof q !== 'number' || !isFinite(q)) return 0.82;
    return Math.min(1, Math.max(0, q));
  }

  /* One reader of the configured ceiling, two callers. The refusal copy
     photos.err.size carries {mb} and has to name the same number the check
     enforced, and two parses of one config value are two numbers that drift
     apart on a typo. */
  function maxFileMb() {
    var mb = parseFloat((CFG.photos || {}).maxFileSizeMb);
    return (isNaN(mb) || mb <= 0) ? 12 : mb;
  }

  function maxFileBytes() {
    return maxFileMb() * 1024 * 1024;
  }

  function maxEdgePx() {
    var n = parseInt((CFG.photos || {}).maxEdgePx, 10);
    if (isNaN(n) || n <= 0) return 1600;
    return n;
  }

  /* Returns a copy KEY or null, the same contract validateName() and
     validateNote() use, so a refusal survives a language switch without being
     re-computed.

     None of these three is a security control and it matters that nobody
     later reads them as one. The key is public by design, so anyone can talk
     to the API directly and skip every line below. The controls that actually
     hold against a crafted request are the bucket's file_size_limit, which is
     counted on the bytes that arrive, and the row level rules in
     supabase/schema.sql. These checks protect a guest from picking the wrong
     file, which is a different and equally real job.

     All three run BEFORE the decode, deliberately (D-21, PH-07). A file too
     large to decode is refused before it can exhaust the phone's memory, and
     ordering the size check after a decode would be the whole protection
     thrown away. */
  /* WHAT KIND OF THING THE GUEST PICKED.

     Type first, extension second, and the order matters. A file.type the
     browser filled in is better evidence than a name the guest controls, but
     an EMPTY type is not evidence of anything and must not be read as one.

     That empty case is the open bug photo-rejections-unexplained: iOS and
     Android share sheets, the Files app and cloud providers all hand back a
     File with type === '', and the old rule tested indexOf('image/') !== 0 and
     reported "Not an image file". That sentence was a lie, and it was the
     refusal the owner could not explain on a real phone.

     Returns 'photo', 'video', or null for something that is neither. */
  function fileKind(file) {
    if (!file) return null;

    var type = String(file.type || '').toLowerCase();
    if (type.indexOf('image/') === 0) return 'photo';
    if (type.indexOf('video/') === 0) return 'video';

    /* No usable type. Fall back to the name's extension rather than refusing,
       because refusing here is exactly the reported bug. The list is closed
       and deliberately generous on the image side: these are only ever used to
       decide which pipeline to run, and the decode or the metadata probe is
       the real judge of whether the bytes are what the name claims. */
    if (type) return null;              // a type that exists and is neither

    var name = String(file.name || '').toLowerCase();
    if (/\.(jpe?g|png|heic|heif|webp|gif|tiff?|bmp|avif)$/.test(name)) return 'photo';
    if (/\.(mp4|mov|m4v|3gp|webm|avi|mkv|qt)$/.test(name)) return 'video';
    return null;
  }

  /* The extension the object is STORED under, which is not the extension it
     arrived with. A photograph is always re-encoded to jpeg, so it is always
     .jpg whatever the phone called it. A video is never re-encoded, so it
     keeps a container, and quicktime is normalised to mov.

     Anything unrecognised returns null and storagePath() refuses it, rather
     than a default that would write a video to a .jpg key. */
  function storedExtFor(file, kind) {
    if (kind === 'photo') return 'jpg';
    if (kind !== 'video') return null;

    var type = String((file && file.type) || '').toLowerCase();
    if (type === 'video/mp4') return 'mp4';
    if (type === 'video/quicktime') return 'mov';

    var name = String((file && file.name) || '').toLowerCase();
    if (/\.(mp4|m4v)$/.test(name)) return 'mp4';
    if (/\.(mov|qt)$/.test(name)) return 'mov';
    return null;
  }

  /* The content type DECLARED on the upload, which is what the bucket's
     allowed_mime_types list is checked against. Derived from the stored
     extension rather than from file.type, so the declaration and the key can
     never disagree, and an empty file.type still uploads correctly. */
  function contentTypeFor(ext) {
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'mov') return 'video/quicktime';
    return 'image/jpeg';
  }

  function videoMaxBytes() {
    var mb = parseFloat(photoVideoCfg().maxFileSizeMb);
    return ((isNaN(mb) || mb <= 0) ? 50 : mb) * 1024 * 1024;
  }

  function videoMaxSeconds() {
    var n = parseFloat(photoVideoCfg().maxSeconds);
    return (isNaN(n) || n <= 0) ? 60 : n;
  }

  /* The substitution values a refusal key needs, in one place.

     This was an inline ternary on the one key that carried a number. There are
     four of them now, and four ternaries at one call site is where the fifth
     gets forgotten and a guest reads "Larger than {mb} MB" with the braces
     still in it. */
  function photoRefusalVals(key) {
    if (key === 'photos.err.size')        return { mb: maxFileMb() };
    if (key === 'photos.err.video.size')  return { mb: photoVideoCfg().maxFileSizeMb || 50 };
    if (key === 'photos.err.video.long')  return { n: videoMaxSeconds() };
    return null;
  }

  /* The synchronous half of validation. Everything here is cheap and runs
     before a single byte is decoded or probed.

     Returns a copy KEY or null, the same contract validateName() and
     validateNote() use, so a refusal survives a language switch without being
     re-computed.

     None of this is a security control and it matters that nobody later reads
     it as one. The key is public by design, so anyone can talk to the API
     directly and skip every line below. The controls that actually hold
     against a crafted request are the bucket's file_size_limit, counted on the
     bytes that arrive, and the row level rules in supabase/schema.sql. These
     checks protect a guest from picking the wrong file, which is a different
     and equally real job.

     All of it runs BEFORE the decode, deliberately (D-21, PH-07). A file too
     large to decode is refused before it can exhaust the phone's memory, and
     ordering the size check after a decode would be the whole protection
     thrown away. The video duration probe obeys the same rule: see
     probeVideoDuration(), which runs only once size has passed. */
  function validateFile(file, maxBytes) {
    if (!file || !file.size) return 'photos.err.empty';

    var kind = fileKind(file);
    if (!kind) return 'photos.err.type';

    if (kind === 'video') {
      if (!photoVideoOn()) return 'photos.err.video.off';
      if (!storedExtFor(file, 'video')) return 'photos.err.video.format';
      /* Its own ceiling and its own sentence. photos.maxFileSizeMb protects
         the phone's memory before a canvas decode and a video is never
         decoded, so reusing that number here would refuse at 12 MB with a
         message naming a limit that does not apply. */
      if (file.size > videoMaxBytes()) return 'photos.err.video.size';
      return null;
    }

    if (file.size > maxBytes) return 'photos.err.size';
    return null;
  }

  /* The asynchronous half, for video only.

     Duration cannot be known without handing the file to a <video> element and
     waiting for loadedmetadata, which is the expensive check, so it runs only
     after size has already passed.

     THE SETTLE GUARD AND THE TIMER ARE downscaleToJpeg()'s, for the identical
     reason, and that reasoning is written out in full above that function. In
     short: the flag prevents a second settle but it does not produce a first
     one. If neither loadedmetadata nor error ever fires, and an abandoned
     decode under memory pressure or a File handle the operating system
     invalidated between pick and read are both real, then done() is never
     called, runNextFile() never re-enters, the object URL is never revoked,
     and the control sits in preparing with the pick button disabled for the
     rest of the page's life. There is no recovery short of a reload.

     Twelve seconds. Reading a container header is not decoding: the browser
     needs the moov atom and nothing more, and on a 50 MB file picked from
     local storage that is fast. This fires only where the browser has stopped
     answering. */
  function probeVideoDuration(file, done) {
    var url = URL.createObjectURL(file);
    var el = document.createElement('video');
    var settled = false;

    function finish(errKey) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      /* Cleared before the callback so the next file starts on a clean heap.
         removeAttribute after the empty string is the pair that actually
         releases the buffer on WebKit; src = '' alone leaves it holding. */
      el.removeAttribute('src');
      try { el.load(); } catch (e) { /* older browser, nothing held */ }
      done(errKey);
    }

    var timer = setTimeout(function () { finish('photos.err.video.read'); }, 12000);

    el.onerror = function () { finish('photos.err.video.read'); };

    el.onloadedmetadata = function () {
      var secs = el.duration;
      /* Infinity and NaN are both real answers here. A stream with no declared
         duration reports Infinity, and a container the browser half understood
         reports NaN. Neither can be compared against the limit, and treating
         an unknown length as acceptable would let a ten minute clip through on
         exactly the files whose headers are strangest. */
      if (!isFinite(secs) || isNaN(secs) || secs <= 0) return finish('photos.err.video.read');
      /* A whole second of tolerance. Phones routinely report 60.04 for a clip
         the camera UI counted as sixty, and refusing that is refusing the
         thing the guest was told they could send. */
      if (secs > videoMaxSeconds() + 1) return finish('photos.err.video.long');
      finish(null);
    };

    el.preload = 'metadata';
    el.muted = true;
    el.playsInline = true;
    el.src = url;
  }

  /* One decode, one draw, one encode, and then everything is released by hand.

     There is no orientation code here and that is the point. image-orientation
     defaults to from-image, both Chromium and WebKit honour it when an <img>
     is drawn to a canvas, and naturalWidth/naturalHeight already report the
     ORIENTED dimensions. A portrait photo reports portrait. Writing a rotation
     on top of that turns every correct photo sideways, which is the bug it was
     supposed to prevent, arriving through the code written to prevent it.

     createImageBitmap would decode off the main thread, which is nicer. It
     would also add a version floor: the imageOrientation value from-image is
     only accepted from Safari 16, and Safari before 17.2 spelled the same
     behaviour none. An enum a dictionary does not recognise throws, so the
     safeguard costs more than the risk it covers. See 04-RESEARCH.md, THE
     ORIENTATION REFINEMENT.

     The settled flag and the timer below together mirror sbRequest's
     invariant: the caller cannot be left waiting. The flag alone was only half
     of it, and sbRequest's own long comment explains which half. Errors
     surface as copy keys, matching the validator convention. */
  function downscaleToJpeg(file, maxEdge, quality, done) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    var settled = false;

    /* The flag prevents a second settle; it does not produce a first one, and
       the two are not the same promise. sbRequest earns the invariant by
       racing the wire against a timer that RESOLVES, and this needs the same
       thing for the same reason: if neither onload nor onerror ever fires, and
       an abandoned decode under memory pressure or a File handle the operating
       system invalidated between pick and read are both real, then done() is
       never called, runNextFile() never re-enters, the object URL is never
       revoked, and photoState stays preparing with the pick button disabled
       for the rest of the page's life. renderPhotos() will not rebuild the
       control either, because its skip guard reads that same stuck state, so
       there is no recovery short of a reload.

       Twenty seconds. A twelve megapixel decode and a 1600px encode is a real
       second or two on the phone this is written for and nothing like twenty,
       so this fires only where the browser has genuinely stopped answering.
       The file is refused rather than failed, matching every other decode
       outcome: nothing was sent, so nothing can be retried. */
    var timer = setTimeout(function () { finish(null, 'photos.err.decode'); }, 20000);

    function finish(blob, errKey) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      /* Released before the callback, so the next file in the sequence starts
         on a clean heap. canvas.width = 0 is the one people leave out and it
         is the one that actually frees the backing store on WebKit. */
      URL.revokeObjectURL(url);
      img.src = '';
      done(blob, errKey);
    }

    img.onerror = function () { finish(null, 'photos.err.decode'); };

    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return finish(null, 'photos.err.decode');

      // Never upscale. A small photo stays small.
      var scale = Math.min(1, maxEdge / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));

      var canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;

      /* Every return past the allocation above goes through this, not only the
         two inside the encoder callback. A canvas that is reachable solely
         through this closure still holds a cw by ch backing store, which at
         the ceiling is 1600 by 1600 by four bytes carried into the next file's
         decode, and the drawImage failure below is itself a memory pressure
         signal: the leak would arrive exactly when the heap is already tight. */
      function release() { canvas.width = canvas.height = 0; }

      var ctx = canvas.getContext('2d');
      if (!ctx) { release(); return finish(null, 'photos.err.decode'); }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';   // Chromium and WebKit honour it, Firefox ignores it

      try {
        ctx.drawImage(img, 0, 0, cw, ch);
      } catch (e) {
        release();
        return finish(null, 'photos.err.decode');
      }

      canvas.toBlob(function (blob) {
        /* null, or a blob so small it can only be a blank canvas, is terminal
           for this file. Never retried: each retry re-decodes the full
           resolution source, and the third attempt is where a phone gives up. */
        if (!blob || blob.size < 256) {
          release();
          return finish(null, 'photos.err.encode');
        }
        release();
        finish(blob, null);
      }, 'image/jpeg', quality);
    };

    img.decoding = 'async';
    img.src = url;
  }

  /* {yyyy-mm-dd}/{fresh-uuid}.jpg. The uuid is minted here per upload and has
     nothing to do with guest_id.

     supabase/schema.sql section 9 states why, and it is not a style
     preference: the bucket is public, so a storage_path is every bit as
     readable as a column, and public.album hands the path to anyone holding
     the publishable key. A guest_id in a filename is the credential from
     section 8 published through the view section 9 built to stop publishing
     it, and renaming the object later does not un-publish it.

     The date prefix costs nothing and makes the dashboard navigable, which is
     the owner's only tool for cleanup.

     STORAGE_PATH_RE below is this same contract read backwards. The two must
     change together, in one commit: a shape change that lands without the
     regex change makes every new photograph invisible, and there is no
     migration available from a static page. */
  /* The extension allowlist, closed, and the only source of the three strings
     the path may end in.

     NEVER derived from file.name. That is guest supplied, it travels into a
     URL, and "trust the extension the picker handed us" is how a path shape
     stops being a shape. The caller decides photo or video from the validated
     type and this maps that decision onto exactly one of three literals. */
  var STORAGE_EXT = { jpg: 1, mp4: 1, mov: 1 };

  function storagePath(ext) {
    var id = newGuestId();
    /* No source of randomness at all. The file cannot be given a safe name, so
       the path is refused rather than built from a weaker generator, which is
       the same branch enrollment takes at the identical moment. */
    if (!id) return null;

    /* An unknown extension is refused rather than defaulted to jpg. A video
       silently written to a .jpg key would upload, insert, and then never
       render, and the failure would surface days later as a missing tile with
       nothing to trace it back to. */
    var e = String(ext || 'jpg').toLowerCase();
    if (!STORAGE_EXT[e]) return null;

    var d = new Date();
    var day = d.getUTCFullYear() + '-' +
              ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
              ('0' + d.getUTCDate()).slice(-2);
    return day + '/' + id + '.' + e;
  }

  /* The render time allowlist, anchored at both ends, and the other half of the
     storagePath() contract above. Change one and you change both, together.

     Two things it buys. A database supplied string stops being able to steer a
     URL: the path is concatenated into both href and src, and without this it
     could carry traversal segments, a query or a fragment. And the album is
     clean on day one, because the research session's zz-research rows do not
     match the shape and therefore never render, before the owner's cleanup
     rather than after it. */
  /* FOUR COPIES OF THIS SHAPE EXIST AND THEY CHANGE IN ONE COMMIT:

       storagePath() above          writes it
       STORAGE_PATH_RE here         reads it back at render time
       STORAGE_PATH_RE in album.js  a second copy, maintained by hand
       photos_storage_path_check    the database's own CHECK constraint

     The fourth was found by reading the live schema during phase 04.1 and is
     the one that bites hardest: it refuses the insert outright, so a client
     that has been widened and a database that has not produces an upload that
     succeeds into Storage and then fails at the row, leaving an orphaned
     object nothing points at. */
  var STORAGE_PATH_RE = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|mp4|mov)$/;

  /* Which of the two things a stored path is, decided by the path and not by a
     database column, so a row whose kind disagrees with its own extension
     cannot render as the wrong element. The column exists and is authoritative
     for counting; this is authoritative for building a tag. */
  function pathIsVideo(p) {
    return /\.(?:mp4|mov)$/i.test(String(p || ''));
  }

  function photoPublicUrl(storagePath) {
    return sbUrl() + '/storage/v1/object/public/' + (CFG.photos || {}).bucket + '/' + storagePath;
  }

  /* The only XMLHttpRequest in this codebase, and the deliberate exception to
     phase 3's fetch-only rule. The reason is one line long: fetch has no
     upload progress event and never will, and an indeterminate spinner on a
     ten second upload over party wifi is exactly the "is this broken?" moment
     PH-05 was written against.

     It copies four properties of sbRequest's contract and inherits none of
     them, so it owes each one separately:
       the key travels in apikey and in no other authentication header;
       it resolves through a callback rather than throwing, so no call site
         needs a catch;
       a single settle guard, so the caller cannot be answered twice;
       all four terminal handlers wired, because three of four is a control
         that spins forever on the fourth.

     cache-control is not decoration. Without it every album image is served
     Cache-Control: no-cache and is refetched on every page view. With it the
     served header is public, max-age=31536000. Verified on the wire.

     Content-Type is set explicitly rather than read off the blob, because the
     bucket's allowed_mime_types list is checked against what the uploader
     declares and this is the one place that declaration is made. */
  function uploadObject(path, blob, contentType, onProgress, done) {
    var xhr = new XMLHttpRequest();
    var settled = false;
    var type = contentType || 'image/jpeg';
    var isVideo = type.indexOf('video/') === 0;

    function settle(out) { if (!settled) { settled = true; done(out); } }

    xhr.open('POST', sbUrl() + '/storage/v1/object/' + (CFG.photos || {}).bucket + '/' + path, true);
    xhr.setRequestHeader('apikey', sbKey());
    xhr.setRequestHeader('Content-Type', type);
    xhr.setRequestHeader('cache-control', 'max-age=31536000');

    /* THE TIMEOUT IS PER KIND AND THE ARITHMETIC IS HERE TO BE CHECKED.

       Sixty seconds was right for a photograph: 1600px of jpeg is a few
       hundred kilobytes and party wifi is bad, not absent.

       It is wrong for a video by a wide margin. Fifty megabytes at a realistic
       2 Mbps uplink is 50 * 8 / 2 = 200 seconds, and the uplink at a party
       with thirty phones on one access point is the thing least likely to hold
       up. At sixty seconds every large video would abort mid transfer and be
       reported as a dropped connection, which would be false and would send
       the guest back to retry the same doomed upload.

       Six minutes, which covers 50 MB down to roughly 1.1 Mbps. Slower than
       that and the guest genuinely is not going to succeed, and saying so is
       better than holding the control open all evening.

       NOT raised for photographs, deliberately. A photograph still stuck after
       sixty seconds is not moving, and a six minute wait to be told so is
       worse than a wrong answer. */
    xhr.timeout = isVideo ? 360000 : 60000;

    xhr.upload.onprogress = function (e) {
      if (typeof onProgress !== 'function') return;
      /* The false side is reported rather than dropped. A browser that will
         not measure gets the held bar from the start, which is honest, rather
         than a bar sitting at zero for ten seconds while the photograph is in
         fact moving. It keeps the Sending word with it: see setRowProgress. */
      onProgress(e.lengthComputable ? (e.loaded / e.total) : null);
    };

    xhr.onload = function () {
      /* 200, not 201. The photos row insert answers 201 and this answers 200,
         in the same upload of the same photograph. Test the range, never a
         literal: gating on the one exact status this endpoint happens to
         answer today reports a written object as a lost one. */
      if (xhr.status >= 200 && xhr.status < 300) return settle({ ok: true });
      /* The object is already sitting at this exact key, which is a success
         rather than a refusal. The key is a fresh uuid minted once per record,
         so nothing else in the world can have written it: it is this record's
         own earlier attempt, whose response was lost. Answering ok here is the
         other half of the retry's idempotency, and without it a retry after a
         lost insert response can never get past the upload to reach the row.
         Deliberately not an upsert: the bucket policy in schema.sql section 6
         grants anon insert and select and no update, so an upsert would be
         refused, and overwriting is not wanted in any case. */
      if (storageDuplicate(xhr)) return settle({ ok: true, duplicate: true });
      settle({ ok: false, status: xhr.status, code: storageBodyStatus(xhr) });
    };

    xhr.onerror   = function () { settle({ ok: false, status: 0, code: 'NETWORK' }); };
    xhr.onabort   = function () { settle({ ok: false, status: 0, code: 'NETWORK' }); };
    xhr.ontimeout = function () { settle({ ok: false, status: 0, code: 'NETWORK' }); };

    xhr.send(blob);
  }

  /* Storage's own error body, unpacked, and nothing else reads it.

     The outer HTTP status is 400 for everything the service refuses, and the
     real one is a string inside the body, { statusCode, error, message, code },
     with code carrying a name such as KeyAlreadyExists rather than a Postgres
     SQLSTATE. The message that travels beside it is deliberately not returned
     from here: it is English, unstable, and it is a Supabase sentence, and no
     Supabase sentence reaches a guest anywhere in this section. */
  function storageBodyStatus(xhr) {
    try {
      var parsed = JSON.parse(xhr.responseText);
      return parsed.statusCode || null;
    } catch (e) { return null; }
  }

  /* The one Storage outcome that is not a failure, read from the same body and
     read broadly on purpose. The service has spelled this refusal three ways
     across its versions: an outer 409, an outer 400 carrying statusCode 409,
     and an outer 400 carrying statusCode 23505, the Postgres unique violation
     underneath it. All three name the same fact and the site must not have to
     be redeployed when the fourth spelling arrives, so every one of them is
     accepted and the short stable error token is accepted too.

     error is read here where message is not, and the distinction is the one
     storageBodyStatus() already draws: Duplicate is a machine token, and the
     sentence beside it is English, unstable, and never reaches a guest. */
  function storageDuplicate(xhr) {
    if (xhr.status === 409) return true;
    try {
      var parsed = JSON.parse(xhr.responseText);
      if (!parsed) return false;
      if (parsed.error === 'Duplicate') return true;
      var code = String(parsed.statusCode || '');
      return code === '409' || code === '23505';
    } catch (e) { return false; }
  }

  /* The first of two classifiers, and the two are deliberately not one.

     The temptation to merge them is not a first-draft risk, it is a later
     refactor that sees two small functions returning copy keys and folds them
     together. They cannot be folded: one service answers an outer 400 for
     every failure with the real status buried in a body, and the other answers
     the real status with a Postgres code. A shared classifier would silently
     mis-brand one of the two, and the branch it mis-brands is the limit.

     No outer status literal is tested here, for the same reason. */
  function classifyStorage(out) {
    /* Supabase Storage, the object write. A synthesised NETWORK code is the
       one outcome that means the bytes never arrived, which is a sentence a
       guest can act on; everything else is the archive declining them, which
       is one line and not a status. */
    if (!out || out.code === 'NETWORK') return 'photos.err.network';
    return 'photos.err.server';
  }

  /* The second classifier, for the other service, and three outcomes so the
     caller has three branches rather than nine:
       ok             the photograph is indexed, this attempt or an earlier one
       limit          the guest is already at the configured maximum
       a photos.err.* key   anything else

     Classified on the code field and never on the message string, which is
     English, unstable, and embeds constraint names.

     Prefer: return=minimal is not relaxed. return=representation answers 401
     with code 42501 AND the row is not written, because section 9 revokes
     select on public.photos from anon.

     The limit code is raise_exception from the trigger in section 4, and it is
     never retried with a fresh path. The trigger is BEFORE INSERT, so it fires
     ahead of the unique constraint and a guest at the maximum sees the same
     code for a path collision too. A retry loop there would upload bytes
     forever. hitQuota() is where that rule is enforced. */
  function classifyPhotoInsert(res) {
    /* PostgREST, the row insert. It answers the real status directly and
       carries a Postgres SQLSTATE in code, which is the whole reason this is
       not the same function as the Storage one above. */
    if (!res) return 'photos.err.server';
    if (res.ok) return 'ok';
    /* BOTH trigger ceilings raise P0001, because that is the SQLSTATE plpgsql
       gives every raise_exception, so the code alone cannot tell them apart
       and the message is the only thing that can.

       This file's rule is to classify on code and never on message, "which is
       English, unstable, and embeds constraint names". That rule is about
       POSTGREST's sentences and it still holds for them. This is different in
       the way that matters: video_limit_reached is OUR OWN token, raised by
       our own trigger in supabase/schema.sql, and it is a stable identifier
       rather than prose. It is matched as a substring so a future PostgREST
       that wraps it in its own sentence does not break the branch.

       Checked before the bare P0001 below, because that one is the general
       case and would otherwise swallow this. */
    if (res.code === 'P0001') {
      var msg = String((res.body && res.body.message) || '');
      if (msg.indexOf('video_limit_reached') !== -1) return 'videolimit';
      return 'limit';
    }
    /* Alongside the limit branch and never inside it, and the order is the
       contract. The trigger in section 4 is BEFORE INSERT, so a guest already
       at the maximum receives P0001 for a path collision too and the limit has
       to be read first; a guest below the maximum receives the real 23505.

       Reaching here means this record's key is already in the table, and the
       key is minted once per record, so the row that holds it is this record's
       own earlier insert whose response was lost on the wire. The photograph
       is recorded. Saying so is what stops the retry writing a second row and
       spending a second slot for one photograph. */
    if (res.code === '23505') return 'ok';
    /* The same synthesised code classifyStorage() singles out, for the same
       reason and from the same sbRequest shape. Without this branch a dropped
       connection during the row insert is reported as "The archive refused
       it", which is false on both halves: nothing arrived at the archive and
       nothing refused anything. It also removes the one cue that pressing
       retry is the right move, which since the key is now held on the record
       it genuinely is. */
    if (res.code === 'NETWORK') return 'photos.err.network';
    /* Anything else, and the object this row was meant to point at is already
       in the bucket. That orphan is D-19's written accepted consequence and
       not a defect: it appears in no view, no page and no URL anyone holds,
       and the owner clears it from the dashboard. The alternative is a row
       pointing at bytes that are not there, which is a permanently broken tile
       in everyone's album, forever, with no delete path from the browser for
       either half. */
    return 'photos.err.server';
  }

  function insertPhotoRow(ident, path, kind, done) {
    var row = {
      guest_id: ident.guest_id,
      name: ident.name,
      storage_path: path,
      /* Sent explicitly rather than left to the column default, so a row is
         never a photograph merely because nobody said otherwise. The column
         defaults to 'photo' for the rows that predate the column, which is a
         different situation from this one. */
      kind: kind === 'video' ? 'video' : 'photo'
    };

    sbRequest('POST', '/rest/v1/' + (CFG.photos || {}).table, row, 'return=minimal')
      .then(function (res) { done(classifyPhotoInsert(res)); });
  }

  /* ======================================================================
     THE LIGHTBOX

     D-10 chose not to build one, and the reasoning was good: the browser's own
     image viewer gives pinch zoom, save and share for zero code. That decision
     is overturned here on the owner's explicit instruction that the album is
     the part guests will use most and has to feel like a gallery. Opening a
     new tab per photograph is not a gallery, and on a phone it walks the guest
     off the site.

     D-10's actual benefit is kept rather than discarded: every frame still
     carries a real link to the full size object, so save, share and open in a
     new tab all still work through the browser's own machinery. What is added
     is staying on the page, and moving between photographs without going back.
     ====================================================================== */

  var lbEl = null;          // the overlay, built once and reused
  var lbItems = [];         // [{ path, name }]
  var lbIndex = 0;
  var lbReturnFocus = null;
  var lbTouchX = null;

  function lbCaptionFor(item) {
    if (!item) return '';
    return item.name
      ? t('gallery.by').replace('{name}', item.name)
      : t('gallery.by.you');
  }

  /* dir: +1 stepping forward, -1 back, 0 opening cold. It only picks which
     side the new frame arrives from. */
  function lbShow(i, dir) {
    if (!lbEl || !lbItems.length) return;

    // Wraps rather than stops. A gallery that dead ends at the last photo
    // makes a guest reverse out of it.
    lbIndex = (i + lbItems.length) % lbItems.length;
    var item = lbItems[lbIndex];
    var url = photoPublicUrl(item.path);

    var img = $('.lb__img', lbEl);
    var vid = $('.lb__vid', lbEl);
    var link = $('.lb__open', lbEl);
    var cap = $('.lb__by', lbEl);
    var count = $('.lb__count', lbEl);
    var isVid = pathIsVideo(item.path);

    /* One kind on stage at a time, and the OTHER ONE IS ALWAYS TORN DOWN.

       Stepping off a video without clearing its src leaves it decoding, and
       leaves its audio playing, underneath a photograph. The guest then hears
       a clip they cannot see and has no control to stop it, because the
       controls went away with the element that was hidden. */
    if (vid) {
      vid.hidden = !isVid;
      if (!isVid) {
        try { vid.pause(); } catch (e) { /* nothing playing */ }
        vid.removeAttribute('src');
        try { vid.load(); } catch (e) { /* older browser */ }
      }
    }
    if (img) img.hidden = isVid;

    if (isVid && vid) {
      try { vid.pause(); } catch (e) { /* nothing playing */ }
      vid.src = url;
      /* Deliberately not played. The guest opened a frame, they did not ask
         for sound, and a video that starts talking the instant it appears is
         the behaviour every site is disliked for. The controls are right
         there. */
    }

    if (img && !isVid) {
      /* The step, animated. It used to be a bare src swap, which on a phone
         reads as the picture being yanked away rather than as moving through
         an album.

         The outgoing frame leaves in the direction of travel and the incoming
         one arrives from the opposite side, so a swipe left and a swipe right
         are visibly different gestures. Transform and opacity only.

         Cleared before the new src so a slow photograph shows nothing rather
         than showing the previous one under the new one's caption, which would
         attribute somebody's picture to somebody else. */
      var enterFrom = (dir || 0) * 26;

      img.style.transition = 'none';
      img.style.opacity = '0';
      img.style.transform = 'translateX(' + enterFrom + 'px) scale(0.985)';

      img.removeAttribute('src');
      img.alt = '';

      var settle = function () {
        img.onload = null;
        img.onerror = null;
        requestAnimationFrame(function () {
          // Back to the stylesheet's transition, then to rest.
          img.style.transition = '';
          img.style.opacity = '1';
          img.style.transform = 'none';
        });
      };
      // Either way it must end visible. A photograph that 404s should leave an
      // empty frame, not an invisible one that never finishes arriving.
      img.onload = settle;
      img.onerror = settle;

      img.src = url;
    }
    if (link) link.href = url;
    if (cap) cap.textContent = lbCaptionFor(item);
    if (count) {
      count.textContent = t('gallery.count.of')
        .replace('{i}', String(lbIndex + 1))
        .replace('{n}', String(lbItems.length));
    }

    // Single photograph: nothing to step through, so the arrows go away
    // rather than sitting there doing nothing.
    var many = lbItems.length > 1;
    $$('.lb__step', lbEl).forEach(function (b) { b.hidden = !many; });
    if (count) count.hidden = !many;
  }

  /* ANDROID BACK

     An overlay that is not in the history stack is invisible to the system
     back gesture, so pressing back navigated the page underneath while the
     photograph stayed on top of it. The owner saw exactly that: it appeared to
     go back for a moment and then the picture was still there.

     So opening pushes an entry and popstate closes. The entry is consumed
     again on a normal close, otherwise every photograph a guest looked at
     would need a separate press of back to get out of the page. */
  var lbPushed = false;

  function lbClose(fromPop) {
    if (!lbEl || lbEl.hidden) return;

    lbEl.removeAttribute('data-show');
    lbEl.hidden = true;
    document.body.style.overflow = '';

    var img = $('.lb__img', lbEl);
    // Stops a large photograph decoding into a closed overlay.
    if (img) img.removeAttribute('src');

    /* And stops a video PLAYING into one, which is the louder version of the
       same bug: the overlay is hidden, the guest believes they closed it, and
       the sound carries on with no visible control to stop it. Pause first,
       then drop the source, then load() so the buffer is actually released
       rather than merely detached. */
    var vid = $('.lb__vid', lbEl);
    if (vid) {
      try { vid.pause(); } catch (e) { /* nothing playing */ }
      vid.removeAttribute('src');
      try { vid.load(); } catch (e) { /* older browser */ }
    }

    if (lbReturnFocus && lbReturnFocus.focus) {
      try { lbReturnFocus.focus(); } catch (e) { /* detached */ }
    }
    lbReturnFocus = null;

    /* Closed by a tap or Escape rather than by back, so the entry opening
       pushed is still on the stack and has to be taken off. Without this the
       guest would have to press back once per photograph they opened before
       leaving the page. */
    if (lbPushed && !fromPop) {
      lbPushed = false;
      try { window.history.back(); } catch (e) { /* nothing to unwind */ }
    } else {
      lbPushed = false;
    }
  }

  /* A photograph that has left the album must not stay steppable.

     lbItems is captured when the strip or the gallery is built and it outlives
     both: it is still held after the overlay closes, and rebuilding the tiles
     hands the NEXT open a fresh array without touching the one already stored.
     So a removal has to reach in here as well, or the guest closes the
     overlay, removes a photograph, reopens a neighbour, presses next, and is
     shown the thing they just deleted.

     Open on the removed photograph is not reachable today, because the removal
     control lives in the strip underneath an overlay that covers the screen.
     It is handled anyway rather than argued about: closing costs one line, and
     the alternative is a comment claiming an ordering nobody will re-check the
     next time a tile grows a second control. */
  function lbForget(path) {
    if (!lbItems || !lbItems.length) return;

    var kept = [];
    for (var i = 0; i < lbItems.length; i++) {
      if (lbItems[i] && lbItems[i].path !== path) kept.push(lbItems[i]);
    }
    if (kept.length === lbItems.length) return;

    // Standing over a set that just changed under it. Closing is the honest
    // answer: re-indexing mid view would slide a different photograph under a
    // caption the guest is reading.
    if (lbEl && !lbEl.hidden) { lbClose(); return; }

    lbItems = kept;
  }

  function buildLightbox() {
    var el = document.createElement('div');
    el.className = 'lb';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');

    var stage = document.createElement('div');
    stage.className = 'lb__stage';

    var img = document.createElement('img');
    img.className = 'lb__img';
    img.alt = '';
    img.decoding = 'async';
    stage.appendChild(img);

    /* The video stage, built once beside the image rather than swapped in and
       out of the DOM. One element per kind, and lbShow() hides the one it is
       not using, so stepping from a photograph to a video and back does not
       create and destroy a media element on every press.

       controls, because this is the one place the guest is meant to drive it.
       No autoplay and no loop: a clip that restarts forever in an overlay is
       something a guest has to close to escape. */
    var vid = document.createElement('video');
    vid.className = 'lb__vid';
    vid.setAttribute('controls', '');
    vid.setAttribute('playsinline', '');
    vid.playsInline = true;
    vid.preload = 'metadata';
    vid.hidden = true;
    stage.appendChild(vid);

    var bar = document.createElement('div');
    bar.className = 'lb__bar';

    var by = document.createElement('p');
    by.className = 'lb__by';
    bar.appendChild(by);

    var count = document.createElement('p');
    count.className = 'lb__count mono';
    bar.appendChild(count);

    // D-10's escape hatch, kept explicitly.
    var open = document.createElement('a');
    open.className = 'lb__open';
    open.target = '_blank';
    open.rel = 'noopener';
    open.setAttribute('data-i18n', 'gallery.original');
    bar.appendChild(open);

    function stepBtn(dir, cls, labelKey) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lb__step ' + cls;
      b.setAttribute('data-i18n', labelKey);
      b.setAttribute('data-i18n-attr', 'aria-label');
      b.appendChild(document.createTextNode(dir < 0 ? '‹' : '›'));
      b.addEventListener('click', function () { lbShow(lbIndex + dir, dir); });
      return b;
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'lb__close';
    close.setAttribute('data-i18n', 'gallery.close');
    close.setAttribute('data-i18n-attr', 'aria-label');
    close.appendChild(document.createTextNode('×'));
    close.addEventListener('click', lbClose);

    el.appendChild(close);
    el.appendChild(stepBtn(-1, 'lb__step--prev', 'gallery.prev'));
    el.appendChild(stage);
    el.appendChild(stepBtn(1, 'lb__step--next', 'gallery.next'));
    el.appendChild(bar);

    // Tapping the backdrop closes. Tapping the photograph does not, because
    // that is where a guest puts a finger to pinch it.
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target === stage) lbClose();
    });

    /* Swipe, which is the gesture a phone guest will try first. Threshold is
       generous and vertical movement is ignored, so a scroll attempt inside a
       tall photograph does not count as a step. */
    el.addEventListener('touchstart', function (e) {
      var p = e.touches && e.touches[0];
      lbTouchX = p ? p.clientX : null;
    }, { passive: true });

    el.addEventListener('touchend', function (e) {
      if (lbTouchX === null) return;
      var p = e.changedTouches && e.changedTouches[0];
      if (!p) { lbTouchX = null; return; }
      var dx = p.clientX - lbTouchX;
      lbTouchX = null;
      if (Math.abs(dx) > 45) {
        var step = dx < 0 ? 1 : -1;
        lbShow(lbIndex + step, step);
      }
    }, { passive: true });

    document.body.appendChild(el);
    return el;
  }

  /* items: [{ path, name }]. name empty means the guest's own, which is what
     picks the "by you" caption. */
  function lbOpen(items, i, opener) {
    if (!items || !items.length) return;

    if (!lbEl) lbEl = buildLightbox();
    lbItems = items;
    lbReturnFocus = opener || document.activeElement;

    lbEl.hidden = false;
    document.body.style.overflow = 'hidden';

    // Puts the overlay in the history stack so the system back gesture closes
    // it instead of navigating the page underneath it.
    try { window.history.pushState({ c03102: 'lightbox' }, ''); lbPushed = true; }
    catch (e) { lbPushed = false; }

    lbShow(i, 0);

    // The overlay's own strings, in the current language, every time.
    $$('[data-i18n]', lbEl).forEach(function (node) {
      var val = t(node.getAttribute('data-i18n'));
      if (!val) return;
      var attr = node.getAttribute('data-i18n-attr');
      if (attr) node.setAttribute(attr, val);
      else node.textContent = val;
    });

    requestAnimationFrame(function () {
      if (lbEl) lbEl.setAttribute('data-show', '1');
    });

    var close = $('.lb__close', lbEl);
    if (close) close.focus();
  }

  /* One handler for both overlays, and the order matters: the lightbox opens
     on top of the index sheet's world, so if both are somehow open the
     photograph is what back should dismiss first. */
  function wireBackGesture() {
    window.addEventListener('popstate', function () {
      if (lbEl && !lbEl.hidden) { lbClose(true); return; }
      if (navOpen) closeNav(true, true);
    });
  }

  function wireLightboxKeys() {
    document.addEventListener('keydown', function (e) {
      if (!lbEl || lbEl.hidden) return;

      var k = e.key;
      if (k === 'Escape' || k === 'Esc') { e.preventDefault(); lbClose(); return; }
      if (k === 'ArrowRight') { e.preventDefault(); lbShow(lbIndex + 1, 1); return; }
      if (k === 'ArrowLeft')  { e.preventDefault(); lbShow(lbIndex - 1, -1); return; }

      if (k !== 'Tab') return;

      var items = $$('button, a[href]', lbEl).filter(function (n) { return !n.hidden; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ======================================================================
     YOUR SUBMISSIONS

     Read from this device, never from the network. The paths are already
     known, so this block costs no request and renders on first paint even on
     a connection that cannot reach the album at all.
     ====================================================================== */

  /* One frame is two controls, because there are two things a guest wants to
     do with their own photograph and only one of them is looking at it.

     They are separate targets rather than one target with a corner hotspot. A
     52px hit area in the corner of a 104px frame is a quarter of the frame, so
     the tap that means "show me this bigger" would land on the tap that means
     "destroy it" often enough to be the feature's defining experience. The
     removal gets its own full width control under the frame instead, at the
     52px this section holds every other control to.

     No control of either kind appears in #gallery. That is the shared album
     and those photographs are not this guest's to remove: the strip is the
     only place on the site that knows which ones are. */
  /* A duration, as a badge reads it. Seconds only, because nothing here is
     over a minute by rule and "1:04" for a clip the guest was told could be
     sixty seconds invites the question this badge exists to answer. */
  function durationLabel(secs) {
    var n = Math.round(secs);
    if (!isFinite(n) || n < 0) return '';
    return n + 's';
  }

  /* THE THUMBNAIL FOR A STORED OBJECT, WHICHEVER KIND IT IS.

     A photograph is an <img> and always was. A video is a <video> carrying a
     #t=0.1 media fragment, which asks the browser to seek to the first tenth
     of a second and paint that frame. So the poster IS the video's own first
     frame and no second object is uploaded for it. There is no build step here
     and Storage does not thumbnail on the free tier, so the alternative was
     capturing a frame client side and uploading it, which doubles the write
     path and the failure surface for one still image.

     THE FALLBACK IS BUILT, NOT ASSUMED. iOS Safari does not reliably paint the
     fragment frame before the element is interacted with, and preload metadata
     is a hint a browser is free to ignore. When no frame arrives, the tile
     shows a designed panel carrying the play glyph rather than a black
     rectangle, which is the difference between a deliberate state and a bug.

     onBroken fires only for a genuinely missing object, never for a video that
     merely declined to paint, because those two want opposite treatments: the
     first should take the frame off the page and the second should keep it. */
  function mediaThumb(path, onBroken) {
    var url = photoPublicUrl(path);

    if (!pathIsVideo(path)) {
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.onerror = onBroken;
      img.src = url;
      return img;
    }

    var wrap = document.createElement('span');
    wrap.className = 'media media--video';
    /* Assumed until a frame proves otherwise, so a browser that never fires
       loadeddata still shows the designed panel rather than a void. */
    wrap.setAttribute('data-poster', 'none');

    var vid = document.createElement('video');
    vid.className = 'media__v';
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');      // the attribute too, for older WebKit
    vid.setAttribute('tabindex', '-1');       // the tile is the control, not this
    vid.setAttribute('aria-hidden', 'true');

    var badge = document.createElement('span');
    badge.className = 'media__dur';

    vid.addEventListener('loadedmetadata', function () {
      var label = durationLabel(vid.duration);
      if (label) badge.textContent = label;
    });

    // A frame actually painted, so the panel can stand down.
    vid.addEventListener('loadeddata', function () {
      wrap.setAttribute('data-poster', 'ok');
    });

    /* The object is not there at all. Distinct from "did not paint": this is
       the owner having cleared it from the dashboard, which no device can know
       about, and the frame should leave the page. */
    vid.addEventListener('error', function () { if (onBroken) onBroken(); });

    vid.src = url + '#t=0.1';

    var play = document.createElement('span');
    play.className = 'media__play';
    play.setAttribute('aria-hidden', 'true');

    wrap.appendChild(vid);
    wrap.appendChild(play);
    wrap.appendChild(badge);
    return wrap;
  }

  function mineTile(path, items, i) {
    var item = document.createElement('div');
    item.className = 'mine__item';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mine__tile';
    btn.setAttribute('aria-label',
      t(pathIsVideo(path) ? 'photos.mine.open.video' : 'photos.mine.open')
        .replace('{i}', String(i + 1)));

    /* A frame with no photograph in it is worse than one fewer frame. Same
       rule the album tiles follow, and here it also covers the owner clearing
       an object from the dashboard, which this device cannot know about.

       The whole item is hidden rather than the frame alone, because a removal
       control hanging under nothing is worse than either of them. */
    btn.appendChild(mediaThumb(path, function () {
      item.setAttribute('data-broken', '1');
    }));
    btn.addEventListener('click', function () { lbOpen(items, i, btn); });

    /* The label is the plain verb and the accessible name is the whole
       sentence, because five identical squares in a row make "Remove" on its
       own a question rather than an answer to a screen reader guest. */
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'mine__remove';
    rm.setAttribute('aria-label',
      t('photos.mine.remove.aria').replace('{i}', String(i + 1)));
    rm.textContent = t('photos.mine.remove');
    rm.addEventListener('click', function () { askRemove(path, item, rm); });

    item.appendChild(btn);
    item.appendChild(rm);
    return item;
  }

  function buildMine() {
    var paths = identity.photoPaths();
    if (!paths.length) return null;

    var items = paths.map(function (p) { return { path: p, name: '' }; });

    var box = document.createElement('div');
    box.className = 'mine';

    var head = document.createElement('p');
    head.className = 'mine__head';
    head.textContent = paths.length === 1
      ? t('photos.mine.one')
      : t('photos.mine.many').replace('{n}', String(paths.length));
    box.appendChild(head);

    var strip = document.createElement('div');
    strip.className = 'mine__strip';
    for (var i = 0; i < paths.length; i++) {
      strip.appendChild(mineTile(paths[i], items, i));
    }
    box.appendChild(strip);

    /* The confirmation lands here and nowhere else, and the slot is in the
       document from the first render rather than created on demand.

       Under the strip rather than inside it, deliberately: the strip scrolls
       sideways, so a question mounted in a 104px frame can be scrolled off the
       screen while it is being read, and the two answers with it. */
    var slot = document.createElement('div');
    slot.className = 'mine__slot';
    box.appendChild(slot);

    return box;
  }

  /* ----------------------------------------------------------------------
     TAKING ONE BACK

     The only destructive request this site can make, and the only place on
     the page a photograph can be removed from.
     ---------------------------------------------------------------------- */

  /* withdrawEnrollment()'s shape, and for the same reason it has that shape.
     A delete against public.photos is refused: section 5 grants anon insert
     and nothing else, and section 8 deliberately made the table unreadable
     because it carries guest_id. A security definer function takes the
     credential as an argument, checks it server side, and never hands the
     table back.

     BOTH arguments are the check, and only one of them is a secret. A storage
     path proves nothing at all: those are public URLs, and every guest who has
     opened the album is holding all of them. The guest_id is the credential,
     exactly as it is for amending a registration, and this site never
     publishes it. The function requires the pair to match a row.

     Three answers, read from the integer the function hands back and from its
     error code, never from a status code. On this project a status code is not
     proof of anything: a blocked read answers with an empty list and a blocked
     delete answers 204, and both look exactly like success.

       gone     one row or zero rows, and they are one answer on purpose. One
                means it was theirs and it is deleted. Zero means it was not
                theirs, or somebody removed it already. The caller must not be
                able to tell those apart, or this becomes a way to ask whether
                a given path belongs to a given id, and the ids are what the
                whole scheme rests on. Either way the honest thing to say is
                that the photograph is gone
       absent   the owner has not run supabase/10-delete-own-photo.sql, so
                nothing was deleted and the guest is told exactly that
       failed   the request never arrived */
  function deleteOwnPhoto(ident, path) {
    var args = { p_guest_id: ident.guest_id, p_storage_path: path };

    return sbRequest('POST', '/rest/v1/rpc/delete_own_photo', args, null)
      .then(function (res) {
        if (res.status === 404 && res.code === 'PGRST202') return { result: 'absent' };

        // A bare integer: rows deleted. One and zero are one answer.
        if (res.ok && (res.body === 1 || res.body === 0)) return { result: 'gone' };

        /* Anything else, the 2xx carrying something that is not a number
           included. A body this function cannot read is not a deletion it can
           claim, and claiming one is the single worst thing this file could
           do here. */
        return { result: 'failed', code: res.code };
      });
  }

  function mineHost() { return $('#photos-mine'); }

  /* Both halves of the reveal undone together: the question goes and the frame
     it was pointing at stops being singled out. Written as a sweep over the
     strip rather than a held reference, because the strip is rebuilt from
     storage on several paths and a held node outlives the frame it named. */
  function clearRemoveConfirm() {
    var host = mineHost();
    if (!host) return;

    $$('.mine__item[data-confirming]', host).forEach(function (n) {
      n.removeAttribute('data-confirming');
    });

    var slot = $('.mine__slot', host);
    if (slot) slot.textContent = '';
  }

  /* Step one, and buildWithdrawConfirm()'s component rather than a second one
     written for photographs. The same question paragraph, the same destructive
     control that names what happens and never says yes or ok, the same way
     back that is not a button at all, and the same sweep bar for the wait. The
     page keeps one vocabulary for "are you sure", across the two controls on
     this site that destroy something.

     No reveal animation and no timer, for the two reasons that function's
     header gives in full: a destructive confirmation that fades in is one a
     thumb already in motion can tap through, and one that expires is one that
     vanishes while somebody is still reading it.

     No data-i18n anywhere in the block, which is the withdrawal's rule for the
     same reason. These labels depend on the block's state, and the language
     sweep would put "Remove the photograph" back on a control that is mid
     request. A language tap rebuilds the strip through renderPhotos() and this
     block goes with it, which is the correct outcome: nothing has been sent
     and the guest is asked again in the language they just chose. */
  function buildRemoveConfirm(path, item, opener) {
    var box = document.createElement('div');
    box.className = 'withdraw-confirm mine__confirm';
    box.setAttribute('data-state', 'idle');

    var bar = document.createElement('div');
    bar.className = 'sweep';
    box.appendChild(bar);

    var q = document.createElement('p');
    q.className = 'withdraw-confirm__q';
    q.textContent = t('photos.mine.confirm.q');
    box.appendChild(q);

    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'btn btn--ghost panel__confirm';
    yes.textContent = t('photos.mine.confirm.yes');
    yes.addEventListener('click', function () { doRemove(path, box, yes); });
    box.appendChild(yes);

    var row = document.createElement('div');
    row.className = 'panel__row';

    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'subtle-action';
    no.textContent = t('photos.mine.confirm.no');
    no.addEventListener('click', function () { keepPhoto(opener); });
    row.appendChild(no);
    box.appendChild(row);

    /* Escape reverts, bound to the block rather than to the document because
       the block owns the state it reverts, and it dies with the node rather
       than accumulating one more copy every time a frame is tapped. Ignored in
       flight: at that point the request has left the device. */
    box.addEventListener('keydown', function (ev) {
      var key = ev.key || ev.keyCode;
      if (key !== 'Escape' && key !== 'Esc' && key !== 27) return;
      if (box.getAttribute('data-state') === 'submitting') return;
      ev.preventDefault();
      keepPhoto(opener);
    });

    return box;
  }

  /* The frame is marked while its question stands. Five of these are
     interchangeable grey squares, so a sentence saying "this photograph" has
     to be able to point at one, and the mark is what makes the question
     answerable rather than a guess. */
  function askRemove(path, item, opener) {
    var slot = $('.mine__slot', mineHost() || document);
    if (!slot) return;

    // A second question replaces the first rather than joining it. Two
    // confirmations standing at once, each pointing at a different frame, is
    // two ways to remove the wrong photograph.
    clearRemoveConfirm();

    item.setAttribute('data-confirming', '1');
    slot.appendChild(buildRemoveConfirm(path, item, opener));

    // Focus onto the control that does the thing, which is deliberate in both
    // directions: the question is heard and then the consequence named in
    // full, and a keyboard guest is one key from either answer.
    var yes = $('.panel__confirm', slot);
    if (yes && yes.focus) yes.focus();
  }

  /* Declined, by two routes: the keep control and the Escape key. Both put the
     strip back exactly as it was with nothing sent, and hand focus to the
     control the guest was standing on when they changed their mind. */
  function keepPhoto(opener) {
    clearRemoveConfirm();
    if (opener && opener.focus) {
      try { opener.focus(); } catch (e) { /* detached */ }
    }
  }

  /* setWithdrawState()'s shape, including the part that matters: the freeze
     covers the whole strip and not just the box.

     Every other frame in the strip carries a removal control, and each of
     those calls askRemove(), which empties the slot and tears this box out of
     the document while its request is still on the wire. Freezing the box
     alone would leave four ways to destroy the block that is waiting for an
     answer. */
  function setRemoveState(box, state) {
    box.setAttribute('data-state', state);

    var busy = (state === 'submitting');
    var host = mineHost();
    $$('button', host || box).forEach(function (el) { el.disabled = busy; });

    var yes = $('.panel__confirm', box);
    if (!yes) return;

    yes.textContent = busy ? t('photos.mine.busy') : t('photos.mine.confirm.yes');
    yes.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  /* The reconciliation, in one function, because it is one act.

     Four visible things are projections of the two storage keys written here,
     and a caller that does three of them leaves the page telling two different
     stories about the same photograph. The count and the strip in particular
     are read from photo_count and photo_paths, which are written on the same
     branch on the way in and are written on the same branch here on the way
     out, so they cannot drift apart unless somebody writes one and forgets the
     other.

     The ladder is why the count is not merely a number in a table. A guest at
     the five photograph maximum is looking at the quota body and has no
     uploader at all, so freeing a slot has to put the control back, and
     renderPhotos() owns that decision. It is called on that transition and on
     no other, because everywhere else it would rebuild the uploader and throw
     away a transcript the guest may still be reading.

     The shared album is read back rather than edited in place. A status code
     is not proof (D-27), and the view is the only thing that knows what is
     actually in the album now. */
  function forgetPhoto(path) {
    var wasFull = identity.photoCount() >= photosMaxPerGuest();

    identity.removePhotoPath(path);
    identity.setPhotoCount(Math.max(0, identity.photoCount() - 1));

    lbForget(path);

    if (wasFull) {
      renderPhotos();
    } else {
      renderMine();
      /* The figure and nothing else, for the same reason renderPhotos() is not
         called on this branch: the control is standing and it keeps what it is
         holding. */
      writeAllowance();
    }

    /* The shared album is not touched from here, and does not need to be. It
       is a page of its own now and it reads public.album on open, so the row
       this function just removed is simply not in the next read. There is no
       cached copy of it on this page to correct. */
  }

  /* The strip alone, rebuilt from storage. renderPhotos() would do this too
     and would also discard the uploader, its transcript and any batch still
     settling, which is the wrong price for one frame leaving a row. */
  function renderMine() {
    var body = $('#photos-body');
    if (!body) return;

    var host = mineHost();
    var mine = buildMine();

    /* Nothing to show. The host goes rather than standing empty, and the next
       recorded photograph builds a new one through the branch below. */
    if (!mine) {
      if (host && host.parentNode) host.parentNode.removeChild(host);
      return;
    }

    /* The host is created here and not only in renderPhotos(), which is the
       whole of the bug this function was missing.

       A guest with no submissions yet has no strip in the document at all, so
       a version of this that could only refill an existing host did nothing on
       the one upload that matters most: the first. The photograph landed, the
       count moved, and the frame appeared only after a reload. Creating the
       host is one branch and it removes the entire class of "it worked, come
       back later and you will see it". */
    if (!host) {
      host = document.createElement('div');
      host.id = 'photos-mine';
      /* Above the way through to the album and below the control, which is the
         order renderPhotos() builds and the order the section reads in: submit,
         then what you submitted, then everybody's. Appending blindly would put
         a guest's own photographs underneath the link that leaves for the
         album. */
      var after = $('.photos__toalbum', body);
      if (after) body.insertBefore(host, after);
      else body.appendChild(host);
    }

    host.textContent = '';
    host.appendChild(mine);
  }

  /* The line the block is replaced by when the owner has not run
     supabase/10-delete-own-photo.sql. amendPendingLine()'s treatment exactly,
     including the programmatic focus: the control the guest pressed is gone,
     so focus would otherwise fall to the document body, and a screen reader
     guest would be told nothing at all about why the thing they pressed did
     not happen. Landing on the sentence is both the announcement and the
     answer.

     It says nothing was changed, because nothing was. This is the one branch
     where a silent no-op would be indistinguishable from success, and the
     photograph is still sitting in the strip and still in the album to prove
     the sentence right. */
  function mineAbsentLine() {
    var line = document.createElement('p');
    line.className = 'panel__pending';
    line.setAttribute('tabindex', '-1');
    line.textContent = t('photos.mine.absent');
    return line;
  }

  /* Step two, and this whole block exists for it.

     doWithdraw()'s shape, including the part that matters most: the answer
     that changes the world is applied before any mounted test, because it
     writes storage and module state and then re-renders out of those rather
     than into this node. A language tap landing mid request tears this box out
     of the document, and bailing there would leave the device still listing a
     photograph the database has already dropped, which is the exact
     disagreement the function was written to prevent, running backwards.

     Below that, every branch renders into this box and into nothing else, so a
     box that has left the document has nowhere to put its answer. */
  function doRemove(path, box, yes) {
    if (box.getAttribute('data-state') === 'submitting') return;

    var ident = identity.get();

    setRemoveState(box, 'submitting');

    deleteOwnPhoto(ident, path).then(function (res) {
      if (res.result === 'gone') {
        forgetPhoto(path);
        /* Nothing is un-frozen on this branch and nothing needs to be. The
           strip was rebuilt out of storage above, so every control now in the
           document is a new one, and the box this ran from is detached. */
        toast(t('photos.mine.removed'));
        return;
      }

      if (!stillMounted(box)) return;

      // Out of the freeze first on both remaining branches. It covers every
      // control in the strip, so without this the whole strip stays disabled
      // for the rest of the page's life with no re-render scheduled.
      setRemoveState(box, 'idle');

      if (res.result === 'absent') {
        var slot = $('.mine__slot', mineHost() || document);
        clearRemoveConfirm();
        if (!slot) return;

        var line = mineAbsentLine();
        slot.appendChild(line);
        if (line.focus) { try { line.focus(); } catch (e) { /* older browser */ } }
        return;
      }

      /* The wire failed. The confirmation stays exactly where it is, because
         replacing it with a paragraph would take away the only way to remove
         this photograph for the rest of the page's life over one bad moment of
         mobile data. The question becomes the line that names the state, the
         control becomes a retry, and focus moves onto it, which is where the
         guest's attention is standing already. */
      setRemoveState(box, 'failure');

      var q = $('.withdraw-confirm__q', box);
      if (q) q.textContent = t('photos.mine.fail');

      if (!yes) return;
      yes.textContent = t('photos.mine.retry');
      if (yes.focus) yes.focus();
    });
  }

  /* ----------------------------------------------------------------------
     THE SECTION BODY

     One control, seven states, and a batch that is a JavaScript array rather
     than a reading of the DOM. Everything visible below is a projection of
     that array: the transcript, the counted sentence, the button's own busy
     state. A language switch therefore costs a repaint and never a lost file,
     and the guest can be told by name what happened to every file they chose,
     which is the whole of PH-05.
     ---------------------------------------------------------------------- */

  /* The batch model, and everything that is a function of it, in one
     statement, because it is one model. A second declaration somewhere else
     is how two halves of a control start disagreeing about what is in flight.

     A record is { file, index, slot, state, reasonKey, reasonVals, path,
     progress } plus the nodes its row was rendered into. index is the numeral
     the guest reads and counts every picked file; slot counts only the
     accepted ones and is the {i} of "Sending {i} of {n}". */
  var photoBatch = [],            // the records, in pick order
      photoBatchPending = false,  // a language render was skipped mid batch
      photoBatchTotal = 0,        // accepted files, the {n} of "Sending {i} of {n}"
      photoUploader = null,       // the standing .uploader, held rather than queried
      photoQueueEl = null,        // its transcript list, likewise
      photoIdent = null,          // identity, read once at pick time
      photoState = 'idle',        // the control state. setUploaderState is its only writer
      photoStatus = null,         // { key, vals } for the polite line, or null
      photoAlert = null,          // { key, vals } for the assertive line, or null
      /* The one thing that outlives the control. When the batch that fills the
         allowance settles, the ladder replaces the whole .uploader with the
         quota body in the same task, which would destroy the counted sentence,
         the assertive line and the transcript before a frame is painted. PH-05
         says no file a guest picked is disposed of without an answer, so the
         answer is carried over the swap and rendered under the quota panel
         instead. Held as { status, alert, batch, announced }, or null. */
      photoQuotaSummary = null;

  /* The seven values written out, so a typo cannot invent an eighth and reach
     CSS that has no rule for it.

     The quota is deliberately not one of them, and the earlier draft of this
     list that carried a full value was wrong rather than forward looking.
     Nothing can write it: setUploaderState is called with preparing,
     uploading, a re-seated photoState, or settleBatch's computed state, which
     is one of idle, partial, success, failed, refused. At the maximum the
     ladder in renderPhotos() replaces the whole control with the quota body,
     so there is no .uploader element left to carry a full attribute and the
     stylesheet has no rule for one. Naming a state the control cannot enter
     was a trap for the next reader, who would reasonably take
     setUploaderState(uploader, 'full') for a supported call, watch it be
     accepted, and find nothing on the page. With the value gone the guard
     below answers that call the way it answers any other typo. The quota is a
     body of the ladder, not a state of the control. */
  var UPLOADER_STATES = ['idle', 'preparing', 'uploading', 'success', 'partial', 'refused', 'failed'];

  /* The seven row states and the word each one renders. A table rather than a
     concatenated key, for two reasons: a bogus state cannot silently produce a
     missing string, and every key this section can render is greppable in the
     file rather than assembled at run time. */
  var ROW_STATE_KEY = {
    waiting:   'photos.queue.waiting',
    preparing: 'photos.queue.preparing',
    uploading: 'photos.queue.uploading',
    recording: 'photos.queue.recording',
    done:      'photos.queue.done',
    refused:   'photos.queue.refused',
    failed:    'photos.queue.failed'
  };

  /* Substitution in one place. t() returns the template and this fills it, so
     no key carrying {n} can reach the DOM with the brace still in it. */
  function phrase(key, vals) {
    var s = t(key);
    if (!vals) return s;
    for (var k in vals) {
      if (Object.prototype.hasOwnProperty.call(vals, k)) {
        s = s.split('{' + k + '}').join(String(vals[k]));
      }
    }
    return s;
  }

  function photosMaxPerGuest() {
    var n = parseInt((CFG.photos || {}).maxPerGuest, 10);
    return isNaN(n) || n < 0 ? 5 : n;
  }

  /* Read from config, never hardcoded, and never negative: a stored count
     above the maximum is a drifted count, not a negative allowance. */
  function photosRemaining() {
    return Math.max(0, photosMaxPerGuest() - identity.photoCount());
  }

  /* The allowance, written in one place.

     Four separate call sites used to carry this three line block:

       var fig = $('.uploader__count', photoUploader);
       if (fig) fig.textContent = String(photosRemaining());

     Four copies of one intent was survivable while the intent was one number.
     It stops being survivable the moment the same fact is also drawn as five
     pips, because a call site that updates the digit and forgets the pips
     produces a control that contradicts itself on screen, and the site with the
     lowest traffic is the one nobody would test. So all four now call this and
     the duplication is gone rather than tripled.

     The pip count comes from config through photosMaxPerGuest(), never from a
     literal five. config.js already warns that the limit is a three file change
     and that two of the three will not complain if you forget them; a hardcoded
     five here would have made it four.

     Pips are rebuilt rather than mutated. There are at most five of them, this
     runs once per recorded file, and a rebuild cannot leave a stale attribute
     on a pip that changed meaning. */
  function writeAllowance(uploader) {
    var host = uploader || photoUploader;
    if (!host) return;

    var max = photosMaxPerGuest();
    var used = Math.min(max, Math.max(0, identity.photoCount()));

    var fig = $('.uploader__count', host);
    if (fig) fig.textContent = String(photosRemaining());

    var pips = $('.allow__pips', host);
    if (!pips) return;

    pips.textContent = '';
    for (var i = 0; i < max; i++) {
      var pip = document.createElement('span');
      pip.className = 'allow__pip';
      /* Spent or free, and nothing in between. The video variant is built by
         the same branch reading a kind the records do not carry yet, so it is
         written here rather than bolted on later, and it stays unreachable
         until the video work lands. */
      if (i < used) pip.setAttribute('data-spent', photoKindAt(i) === 'video' ? 'video' : '1');
      pips.appendChild(pip);
    }
  }

  /* What kind of thing occupies slot i.

     Read from the stored paths rather than from a column, because the
     extension IS the kind and this device already holds every path it has
     submitted. That also means the pip is correct without a request, and stays
     correct on a phone that has not spoken to the database since.

     The order is the order photographs were added, which is the order the
     strip below shows them in, so the coloured pip and the video frame line up
     rather than being two unrelated truths about the same allowance. */
  function photoKindAt(i) {
    var paths = identity.photoPaths();
    return pathIsVideo(paths[i]) ? 'video' : 'photo';
  }

  function photoVideoCfg() {
    return (CFG.photos || {}).video || {};
  }

  function photoVideoOn() {
    return photoVideoCfg().enabled === true;
  }

  /* The zone stops being a target while bytes are moving.

     It mirrors setUploaderState()'s own busy test rather than keeping a second
     flag, because two booleans describing one condition drift the first time
     somebody adds a state. Read from photoState, which setUploaderState is the
     only writer of. */
  function photoZoneBusy() {
    return photoState === 'preparing' || photoState === 'uploading';
  }

  /* THE LIMITS, STATED ABOVE THE PICKER.

     The owner asked for the video rule to be written "explicitely and big".
     This is that, and it sits above the button rather than only inside a
     refusal, because a rule a guest reads after being refused is a rule that
     arrived too late.

     TWO lines and not one, and that is the whole design decision here. There
     are two ceilings in this section and they are different numbers doing
     different jobs: photos.maxFileSizeMb protects the phone's memory before a
     canvas decode, and photos.video.maxFileSizeMb refuses a video that is
     never decoded at all. A single strip naming one megabyte figure would be
     read as applying to both, so each line owns its own kind and its own
     number.

     The second line does not exist while video.enabled is false. It states a
     rule nothing enforces yet, and a page that promises to accept a video and
     then refuses the next picked file is worse than a page that never
     mentioned it.

     Every number comes from config. config.js:216 already warns that spelling
     the limit into copy is a three file trap where two of the three will not
     complain if you forget them; substituting here rather than writing "5" and
     "60" into copy.js is what keeps it from becoming a fourth.

     The separators are drawn by CSS rather than written into the strings, so
     no translator has to carry punctuation and no language ends up with a
     trailing middot. */
  function writeRules(uploader) {
    var host = uploader || photoUploader;
    if (!host) return;

    var strip = $('.uploader__rules', host);
    if (!strip) return;

    var vid = photoVideoCfg();

    strip.textContent = '';

    function line(video) {
      var p = document.createElement('p');
      p.className = 'rules__line' + (video ? ' rules__line--video' : '');
      return p;
    }

    function term(text, key) {
      var span = document.createElement('span');
      span.className = 'rules__t' + (key ? ' rules__t--key' : '');
      span.textContent = text;
      return span;
    }

    var one = line(false);
    one.appendChild(term(t('photos.rules.files').replace('{n}', String(photosMaxPerGuest()))));
    one.appendChild(term(t('photos.rules.photo').replace('{mb}', String(maxFileMb()))));
    strip.appendChild(one);

    if (!photoVideoOn()) return;

    /* The seconds term is the emphasised one, in --ink at 600 against the
       strip's --ink-dim at 400. That is the "big" the owner asked for, done
       with weight and colour rather than by setting one line of a four term
       block at a larger size, which would tip the card's balance for a rule
       that is one of several. */
    var two = line(true);
    two.appendChild(term(t('photos.rules.video')));
    two.appendChild(term(
      t('photos.rules.seconds').replace('{n}', String(vid.maxSeconds != null ? vid.maxSeconds : 60)),
      true
    ));
    two.appendChild(term(t('photos.rules.videosize').replace('{mb}', String(vid.maxFileSizeMb != null ? vid.maxFileSizeMb : 50))));
    strip.appendChild(two);
  }

  /* setFormState()'s shape, one for one. One attribute drives everything: CSS
     reads it, JS sets it, there is no class juggling and no second flag. Every
     branch of the upload path ends in a call to this, so no code path can
     leave the control locked.

     The label deliberately does not change while busy. The status line
     directly below already says what is happening, and swapping the label as
     well would be the same sentence twice.

     There is no validating state. A pass over five File objects is sub
     millisecond, so a distinct visible state would be a flash; validation
     folds into preparing and its results are rendered as row states, which is
     where a guest can actually act on them. */
  function setUploaderState(uploader, state) {
    if (UPLOADER_STATES.indexOf(state) === -1) state = 'idle';
    photoState = state;

    if (!uploader) return;
    uploader.setAttribute('data-state', state);

    var busy = (state === 'preparing' || state === 'uploading');

    /* The zone follows the button. A dashed target that still looks like a
       target while it refuses every drop is worse than no target at all, so
       the dash goes and the attribute CSS reads goes with it.

       It also leaves the tab order. role="button" with tabindex 0 is a stop
       for a keyboard guest, and a stop that does nothing when you press Enter
       is a dead end. -1 keeps it focusable programmatically without offering
       it as a destination. */
    var zone = $('.uploader__zone', uploader);
    if (zone) {
      if (busy) zone.setAttribute('data-busy', '1');
      else zone.removeAttribute('data-busy');
      zone.setAttribute('tabindex', busy ? '-1' : '0');
      zone.setAttribute('aria-disabled', busy ? 'true' : 'false');
      if (busy) zone.removeAttribute('data-over');
    }

    var btn = $('#photos-pick', uploader);
    if (!btn) return;

    btn.disabled = busy;
    btn.textContent = t('photos.cta');
    // A disabled button on its own tells a screen reader nothing about why.
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');

    /* One string for one intent. The zone is an outer target for exactly the
       action the button names, so it borrows the button's label rather than
       inventing a second sentence that has to be kept in step in three
       languages. */
    if (zone) zone.setAttribute('aria-label', btn.textContent);
  }

  /* The polite line. Progress and success, and nothing else: a counted
     progress sentence is not worth interrupting a screen reader for.

     It is never given the hidden attribute, and that is a deliberate
     departure from the contract's own wording, taken because two of the
     contract's rules cannot both hold literally. [hidden] is
     display:none !important in the Base block, so a hidden status line has no
     box at all, and the reserved box is what keeps the submit button and the
     album below it from moving when a batch starts and ends. An empty node
     that is in the layout also announces more reliably than one that was
     display:none at the instant its content arrived, which is the reason the
     contract wanted the node to exist early in the first place. So it exists
     from first render, empty, and holds its 24px box in every state. */
  function paintStatus() {
    var node = photoUploader && $('.uploader__status', photoUploader);
    if (!node) return;
    node.textContent = photoStatus ? phrase(photoStatus.key, photoStatus.vals) : '';
  }

  /* The assertive line. Refusals and failures only. A file that did not land
     is worth interrupting for; "Sending 2 of 3" is not. Hidden until it has
     something to say, and never created with its content already in it. */
  function paintAlert() {
    var node = photoUploader && $('.uploader__alert', photoUploader);
    if (!node) return;
    if (!photoAlert) { node.textContent = ''; node.hidden = true; return; }
    node.textContent = phrase(photoAlert.key, photoAlert.vals);
    node.hidden = false;
  }

  function setUploaderStatus(key, vals) {
    photoStatus = key ? { key: key, vals: vals || null } : null;
    paintStatus();
  }

  function setUploaderAlert(key, vals) {
    photoAlert = key ? { key: key, vals: vals || null } : null;
    paintAlert();
  }

  /* The sole writer of a row's state attribute, and the sole writer of the
     record's state, so the model and the markup cannot disagree.

     The reason is stored as a copy KEY on the record rather than as a
     rendered string, which is what lets a language switch re-render a refusal
     without re-running validation, and what keeps a Storage or PostgREST
     message string from ever reaching the page. */
  function setRowState(rec, state, reasonKey, reasonVals) {
    if (!rec) return;
    if (!ROW_STATE_KEY[state]) state = 'waiting';
    rec.state = state;

    if (arguments.length >= 3) {
      rec.reasonKey = reasonKey || null;
      rec.reasonVals = reasonVals || null;
    }

    var row = rec.node;
    if (!row) return;
    row.setAttribute('data-state', state);

    // Colour is never the only signal here: the state word names every state.
    if (rec.stateEl) rec.stateEl.textContent = t(ROW_STATE_KEY[state]);

    /* The reason node carries the hidden attribute in every other state, so a
       healthy row is two lines of mono and a rule rather than three. */
    var shown = (state === 'refused' || state === 'failed');
    if (rec.reasonEl) {
      if (shown && rec.reasonKey) {
        rec.reasonEl.textContent = phrase(rec.reasonKey, rec.reasonVals);
        rec.reasonEl.hidden = false;
      } else {
        rec.reasonEl.textContent = '';
        rec.reasonEl.hidden = true;
      }
    }

    /* Nothing was recorded, so no line is drawn. The track stays a plain
       hairline, which is the honest reading of a row that did not land. */
    if (shown) setRowProgress(rec, 0);
  }

  /* The progress honesty contract, and the 0.92 is the whole of it.

     The upload's progress event reports bytes handed to the socket, not bytes
     the archive has accepted. On a bad connection the bar completes and then
     nothing happens for several seconds, which is indistinguishable from a
     hang, and that is exactly the "is this broken?" moment PH-05 was written
     against, wearing a new costume. So the visible fill is capped until the
     response lands and the state word swaps to Recording: the dead wait
     becomes a named step rather than a stalled bar, and the bar never claims
     completion while the server has not answered.

     A fraction that is not a number is a browser that will not measure. The
     fill holds at the cap from the start rather than being drawn from a figure
     nobody has, because the site never draws a bar it cannot honestly fill,
     and the word stays Sending because that is the step the file is on. Such
     a row never shows Recording at all, which is the right answer: the cap is
     the honest part and the transition is the measured part.

     One transform, on one fill, and never a layout property. That is not
     pedantry: a width transition on a bar updated by every progress event
     triggers layout on every event, on a phone, while the same phone is
     decoding the next image. */
  function setRowProgress(rec, fraction) {
    if (!rec) return;

    var known = (typeof fraction === 'number' && isFinite(fraction));
    var f = known ? fraction : 0.92;
    if (f < 0) f = 0;
    if (f > 1) f = 1;

    if (f >= 0.92 && rec.state !== 'done') {
      f = 0.92;
      /* Holding the bar and advancing the word are two different claims, and
         only one of them is honest without a measurement. A browser that will
         not report lengthComputable is still sending bytes, so the bar holds
         at the cap and the row goes on saying Sending, which is what it is
         doing. It used to say Recording from the first progress event until
         the response landed, naming the wrong step for the whole of the
         longest step, and the state word is the row's only non colour signal.
         That is the same lie runNextFile() refuses forty lines earlier. */
      if (known && rec.state === 'uploading') setRowState(rec, 'recording');
    }

    rec.progress = f;
    if (rec.fillEl) rec.fillEl.style.transform = 'scaleX(' + f + ')';
  }

  /* One file, one numbered entry. Four cells and a bar, and the bar is also
     the row's separating rule: the institutional table rule under each log
     entry is the thing that fills up while that file moves. */
  function queueRow(rec) {
    var row = document.createElement('li');
    row.className = 'queue__row';

    /* Not decoration. iOS hands back identical names for several picks from
       some camera roll paths, so five rows can legitimately read the same, and
       the numeral is what makes the transcript, and D-15's refusal, actually
       identify a file. */
    var num = document.createElement('span');
    num.className = 'queue__n';
    num.textContent = String(rec.index);

    /* An operating system supplied string, so createElement plus textContent
       and never a markup string. An empty name is a real case on iOS and
       renders the named fallback rather than a blank cell. */
    var name = document.createElement('span');
    name.className = 'queue__name';
    name.textContent = (rec.file && rec.file.name) ? rec.file.name : t('photos.queue.unnamed');

    var word = document.createElement('span');
    word.className = 'queue__state';

    var reason = document.createElement('p');
    reason.className = 'queue__reason';
    reason.hidden = true;

    var bar = document.createElement('span');
    bar.className = 'queue__bar';

    var fill = document.createElement('span');
    fill.className = 'queue__fill';
    bar.appendChild(fill);

    row.appendChild(num);
    row.appendChild(name);
    row.appendChild(word);
    row.appendChild(reason);
    row.appendChild(bar);

    rec.node = row;
    rec.stateEl = word;
    rec.reasonEl = reason;
    rec.fillEl = fill;

    /* Painted from the record and never from the previous markup, so a rebuild
       in a new language re-renders the reason from its stored copy key rather
       than by re-running validation, and the bar comes back where it was. */
    setRowState(rec, rec.state);
    setRowProgress(rec, rec.progress);

    return row;
  }

  /* The transcript, rendered from photoBatch and from nothing else. It is
     never read back out of the DOM: a queue that is its own record is a queue
     a language switch destroys. */
  function renderQueue() {
    var list = photoQueueEl;
    if (!list) return;

    list.textContent = '';

    if (!photoBatch.length) { list.hidden = true; return; }

    for (var i = 0; i < photoBatch.length; i++) list.appendChild(queueRow(photoBatch[i]));

    list.hidden = false;
  }

  /* refreshEnrollmentState()'s shape: the single fan out a recorded
     photograph owes, called from one place rather than three calls from four.
     Three things change together when the register accepts a file. The figure
     the guest reads. The control's own state, re-seated rather than changed,
     because the driver owns which state it is in and this only re-applies it
     so the disabled property cannot drift from the attribute CSS reads. And
     the album, which is read back because a status code is not proof (D-27).

     The album read is 8000ms and non blocking, so a refetch per recorded file
     costs the batch nothing and puts the guest's own photograph directly
     below the control while the next file is still decoding. */
  function refreshPhotosState() {
    if (photoUploader) {
      writeAllowance(photoUploader);
      setUploaderState(photoUploader, photoState);
    }

    /* This line used to read renderAlbum($('#photos-album')) and had been dead
       since the album was split out of this section: #photos-album stopped
       existing, renderAlbum null-guards its host, and so every recorded
       photograph fanned out to precisely nothing. The count moved and neither
       the strip nor the album did, which is why a guest had to reload before
       they could see, or remove, the thing they had just submitted.

       The strip is rebuilt from storage rather than appended to, so the tile,
       its removal control and the counted head are all one function of the
       same list and cannot drift from it. It runs per recorded file rather
       than once at settle, so a photograph appears under the control while the
       next one is still uploading. */
    renderMine();
  }

  /* formatSchedule()'s shape, one for one: the same three way locale ternary,
     the same Europe/Copenhagen pin so the moment reads in the party's own
     timezone rather than the reader's, and the same try and fall back. No
     second locale map is declared here, because this file has never held one
     and this is not the phase that starts one. */
  function formatOpensAt() {
    var locale = lang === 'it' ? 'it-IT' : (lang === 'da' ? 'da-DK' : 'en-GB');
    var opts = {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Copenhagen'
    };
    try {
      return new Intl.DateTimeFormat(locale, opts).format(new Date(photosOpenMs));
    } catch (e) {
      return new Date(photosOpenMs).toLocaleString();
    }
  }

  /* The closed body reuses the existing pending title rather than adding a
     second one. "Submission portal opens later" already says exactly the right
     thing for both placeholder bodies, and one fewer key across three
     languages is one fewer parity risk. Only the body differs, because only
     the closed body knows a date.

     The panel states the moment as text and does not tick. The hero owns the
     ticking and there is one clock per page.

     {when} is substituted after pendingBlock() returns, by writing the
     paragraph's textContent. That builder writes text directly and adds no
     translation attribute, so there is no applyLanguage() sweep to fight and
     the substituted moment survives a language tap by being rebuilt with it. */
  function closedPanel() {
    var box = pendingBlock('photos.pending.title', 'photos.closed.body');
    var body = $('.pending__b', box);
    if (body) body.textContent = phrase('photos.closed.body', { when: formatOpensAt() });
    return box;
  }

  function buildGatePanel() {
    var panel = document.createElement('div');
    panel.className = 'panel';

    var h = document.createElement('h3');
    h.className = 'sub-h';
    h.textContent = t('photos.gate.title');

    var lede = document.createElement('p');
    lede.className = 'panel__lede';
    lede.textContent = t('photos.gate.body');

    /* Reuses hero.cta.enrol verbatim. "Go and register" is one intent, so it
       carries one label everywhere on the page, and there is never a name
       field here: D-18 forbids a second name prompt anywhere on the site. */
    var cta = document.createElement('a');
    cta.className = 'btn btn--primary';
    cta.href = '#enrol';
    cta.textContent = t('hero.cta.enrol');

    panel.appendChild(h);
    panel.appendChild(lede);
    panel.appendChild(cta);
    return panel;
  }

  /* The quota body, and it is the phase. The roadmap's done-when sentence ends
     here: the sixth photograph is refused with a joke rather than an error.

     A sub-heading and a lede, in the existing panel grammar. No button, no
     line inviting the guest to contact the host, and above all no remaining
     count reading zero, because a zero would be a number where the joke goes.
     It is a course requirement satisfied rather than a wall hit, and the
     register is the whole difference between the joke landing and an error
     message wearing a costume (D-23).

     It is reached two ways and it is not the same panel both times.

     At page load, and after a batch where every file landed, it ends at the
     lede. There is nothing the lede does not already say: five on record is
     five on record, and the album directly below is the proof of it.

     After a batch that spent the last of the allowance AND lost something, it
     arrives carrying that batch's answer: settleBatch hands over the counted
     sentence, the line naming what did not land, and the transcript, because
     the swap happens in the same task those three were written in and there is
     no frame in which the control could show them. PH-05 is the reason. A
     guest who picked five files, had two recorded and three refused as
     overflow, must not be left reading a punchline about being documented with
     no word anywhere about the other three. So the transcript is under the
     joke rather than destroyed by it.

     It never takes focus, either way. A focus move on the quota body would
     announce the same fact the alert line below is already announcing, and
     read as a stutter.

     It is a .panel, so it mounts at zero opacity and the ladder's data-show
     line is what makes it visible. That line is deliberately in the ladder
     rather than in the builders, so this body could not ship with the defect
     the registration gate shipped with and had repaired. */
  function quotaPanel(summary) {
    var panel = document.createElement('div');
    panel.className = 'panel';

    var h = document.createElement('h3');
    h.className = 'sub-h';
    h.textContent = t('photos.full.title');

    var lede = document.createElement('p');
    lede.className = 'panel__lede';
    lede.textContent = t('photos.full.body');

    panel.appendChild(h);
    panel.appendChild(lede);

    /* Reached at page load with nothing to carry, which is the ordinary case
       and the one the paragraphs above were written for. */
    if (!summary) return panel;

    /* Reached the other way: the batch that just filled the allowance settled
       into this body. Its two sentences and its transcript come with it, in
       the control's own classes so they read as the same three lines the guest
       was already looking at rather than as a new component. The joke stays
       first, because the register being full is the headline and what did not
       land is the footnote to it. */
    if (summary.status) {
      var status = document.createElement('p');
      status.className = 'uploader__status';
      status.textContent = phrase(summary.status.key, summary.status.vals);
      panel.appendChild(status);
    }

    if (summary.alert) {
      var alertLine = document.createElement('p');
      alertLine.className = 'uploader__alert';
      alertLine.setAttribute('role', 'alert');
      panel.appendChild(alertLine);

      var text = phrase(summary.alert.key, summary.alert.vals);
      /* Empty first and filled after, exactly as buildUploader() does it: many
         screen readers will not announce a region that arrives with its
         content already in it, and this line is the only assertive answer the
         guest gets for files that did not land. Announced once per batch. A
         language tap re-renders this body and would otherwise interrupt the
         reader again with a fact they were already told. */
      if (summary.announced) alertLine.textContent = text;
      else {
        summary.announced = true;
        requestAnimationFrame(function () { alertLine.textContent = text; });
      }
    }

    if (summary.batch && summary.batch.length) {
      var queue = document.createElement('ol');
      queue.className = 'queue';
      for (var i = 0; i < summary.batch.length; i++) {
        queue.appendChild(queueRow(summary.batch[i]));
      }
      panel.appendChild(queue);
    }

    return panel;
  }

  function buildUploader() {
    var box = document.createElement('div');
    box.className = 'uploader';

    /* The remaining count is a labelled data field in the receipt's own
       grammar. Not a chip, which would be the only chip on the page, and not
       folded into the button label, which would change the label's length on
       every upload and reflow a full width button under a thumb.

       recordRow() is deliberately not reused for it. That builder writes a
       translation attribute, and this phase writes none anywhere: the sweep
       would then re-translate half the control on a language tap whose render
       was skipped mid batch, which is exactly the half translated state the
       skip exists to prevent. */
    /* The allowance. It was a facts--record definition list, which is to say a
       spreadsheet row, and .facts--record draws a hairline above and below its
       row. Loose on the page that read as the fact table it borrowed from; the
       moment .uploader became a card those two rules were two lines drawn
       across the inside of it for no reason.

       So the list goes and the same two pieces of information stay: the label
       and the number. Both keep their existing class names deliberately, because
       four separate call sites write .uploader__count and syncUploaderLanguage()
       writes .uploader__label, and renaming them here would be a rename with
       four chances to miss one.

       What is added is the pip row, which is the actual answer to "how many do
       I have left". A digit is read; five blocks are seen. */
    var allow = document.createElement('div');
    allow.className = 'allow';

    var head = document.createElement('div');
    head.className = 'allow__head';

    var label = document.createElement('span');
    label.className = 'uploader__label';

    // Mono with tabular figures, because the number changes as files land and
    // a proportional face would shift the value cell sideways every time.
    var fig = document.createElement('span');
    fig.className = 'mono uploader__count';

    head.appendChild(label);
    head.appendChild(fig);
    allow.appendChild(head);

    /* aria-hidden, and not negotiable. The label and the number directly above
       already say the same thing in a sentence a screen reader can read in one
       breath. Five unlabelled spans announced one at a time is the same fact
       delivered five times worse. */
    var pips = document.createElement('div');
    pips.className = 'allow__pips';
    pips.setAttribute('aria-hidden', 'true');
    allow.appendChild(pips);

    box.appendChild(allow);

    /* The limits, immediately under the meter and above everything that acts.
       Built empty and filled by writeRules(), which is also what
       syncUploaderLanguage() calls, so there is one builder for one strip. */
    var rules = document.createElement('div');
    rules.className = 'uploader__rules';
    box.appendChild(rules);

    /* Above the button rather than below it. It is information a guest needs
       in order to decide, so it has to be read before the picker opens, and it
       is the pre-commitment substitute for a destructive confirmation this
       phase deliberately does not have. */
    var note = document.createElement('p');
    note.className = 'uploader__note';
    box.appendChild(note);

    /* THE ZONE.

       The picker used to be a full width red button and nothing else. It is
       now a target with the button inside it, which is both softer and
       strictly more capable: a desktop guest can drag files onto it.

       The zone is an ADDITION and never a replacement. A dashed rectangle is
       not an obvious button to everyone, the button has to survive on its own,
       and the file input underneath is untouched. On a phone the zone is
       simply a larger tap target for the same picker.

       It is a div with role="button" rather than a real <button>, because a
       button wrapping another button is invalid HTML and browsers reparent it.
       That trade buys the outer target and owes three things back by hand:
       tabindex, the Enter and Space keys, and an accessible name. All three
       are paid below, and the name is written by writeZoneLabel() from the
       same copy key the inner button uses, so there is one string for one
       intent. */
    var zone = document.createElement('div');
    zone.className = 'uploader__zone';
    zone.setAttribute('role', 'button');
    zone.setAttribute('tabindex', '0');

    var acts = document.createElement('div');
    acts.className = 'uploader__acts';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--primary';
    btn.id = 'photos-pick';
    acts.appendChild(btn);

    /* Exactly one retry control, however many rows failed. Five per row
       buttons would be five targets for one intent, and the intent is one:
       send again whatever did not land.

       The ghost variant rather than the primary one, because the accent fill
       in this section is reserved for exactly one filled button at a time and
       the submit control owns it.

       It is built once, here, and its presence is decided in the stylesheet by
       the control's own state attribute. JavaScript writes one attribute and
       CSS owns what is on the page, which is the same division setFormState()
       set for the form and the queue rows kept. */
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn--ghost uploader__retry';
    retry.id = 'photos-retry';
    acts.appendChild(retry);

    zone.appendChild(acts);

    /* Why the box is dashed, said once, and only where it is true.

       A dashed rectangle with a button in it is not self explanatory: at
       desktop widths it is a large empty target and nothing on screen says
       what it is for. This is the sentence that says it.

       It is hidden on a coarse pointer by the stylesheet rather than by a
       branch here, because there is nothing to drag on a phone and an
       instruction a guest cannot follow is worse than no instruction. Built
       unconditionally so the language re-seat has one thing to find. */
    var hint = document.createElement('span');
    hint.className = 'uploader__hint';
    hint.setAttribute('aria-hidden', 'true');
    zone.appendChild(hint);

    box.appendChild(zone);

    /* A separate sibling carrying the hidden attribute, never a label wrapping
       the input. A native file input renders its own button label in the
       BROWSER's language rather than the site's, which breaks LNG-06 the first
       time a Danish guest with an English browser opens the section, and a
       label cannot be disabled while bytes are in flight. */
    var input = document.createElement('input');
    input.type = 'file';
    input.id = 'photos-input';
    input.multiple = true;
    /* THE IMAGE HALF IS image/* AND IS NEVER EXTENDED. Adding image/heic,
       .heic or .heif makes Safari 17 and later hand back an actual HEIC file,
       where image/* alone receives an operating system converted JPEG, and
       Android Chrome then cannot decode it. This looks like an omission and it
       is the opposite.

       video/* is added beside it, not into it. The same wildcard reasoning
       applies for the same reason: naming containers here invites the picker
       to hand back exactly the exotic one that was named. What comes back is
       then judged by storedExtFor(), which accepts mp4 and quicktime and
       refuses the rest with a sentence rather than by being unpickable.

       Written from config so the attribute cannot claim to accept video while
       the rest of the feature is switched off. A picker that opens the video
       library and then refuses everything in it is the worst of both. */
    input.setAttribute('accept', photoVideoOn() ? 'image/*,video/*' : 'image/*');
    input.hidden = true;
    box.appendChild(input);

    /* Two live regions with two urgencies, both in the document from first
       render and both empty. Many screen readers will not announce a region
       that arrives with its content already in it, so nothing in this section
       creates a node and fills it in the same breath. */
    var status = document.createElement('p');
    status.className = 'uploader__status';
    status.setAttribute('role', 'status');
    box.appendChild(status);

    var alertLine = document.createElement('p');
    alertLine.className = 'uploader__alert';
    alertLine.setAttribute('role', 'alert');
    alertLine.hidden = true;
    box.appendChild(alertLine);

    var queue = document.createElement('ol');
    queue.className = 'queue';
    queue.hidden = true;
    box.appendChild(queue);

    // Held rather than queried. Exactly one uploader stands at a time.
    photoUploader = box;
    photoQueueEl = queue;

    // The button calls the input from inside its own click handler, which is a
    // user gesture and is the supported pattern on both platforms.
    btn.addEventListener('click', function () { input.click(); });
    retry.addEventListener('click', function () { retryFailedFiles(); });

    /* THE ZONE'S BEHAVIOUR.

       Everything below funnels into runBatch(), the same and only entry point
       the picker uses. Two entry points for one intent is how a validation
       rule ends up enforced on one route and not the other.

       The click handler tests the target. Without that test a tap on the
       button bubbles to the zone, the zone calls input.click() a second time,
       and the picker opens twice on one tap. Two nested things that both open
       the same picker is exactly the bug this shape invites, so it is guarded
       rather than hoped about. */
    zone.addEventListener('click', function (e) {
      if (photoZoneBusy()) return;
      if (e.target !== zone) return;      // the button and the retry own their own clicks
      input.click();
    });

    /* role="button" bought the outer target and owes the keyboard back. A real
       button answers Enter and Space; a div answers neither until it is told
       to, and preventDefault on Space stops the page scrolling underneath. */
    zone.addEventListener('keydown', function (e) {
      if (photoZoneBusy()) return;
      var k = e.key;
      if (k !== 'Enter' && k !== ' ' && k !== 'Spacebar') return;
      e.preventDefault();
      input.click();
    });

    /* Drag and drop, desktop sugar, never the only route.

       preventDefault on dragover is not optional and is the single most common
       way this feature ships broken: without it the browser takes the default
       action for a dropped file, which is to NAVIGATE AWAY from the page and
       display the file. A guest dragging a photograph onto the uploader would
       lose the page and everything on it.

       It is registered on the document as well as the zone, for the same
       reason and a worse one: a file dropped slightly outside the zone hits
       the document, and the default action there is the same navigation. So
       the document refuses the default and does nothing, and only the zone
       acts. */
    function overNoop(e) { e.preventDefault(); }
    document.addEventListener('dragover', overNoop);
    document.addEventListener('drop', overNoop);

    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (photoZoneBusy()) return;
      zone.setAttribute('data-over', '1');
    });

    /* dragleave fires when the pointer crosses onto a CHILD of the zone as
       well as when it truly leaves, so a naive handler flickers the highlight
       every time the cursor passes over the button. relatedTarget is where the
       pointer went; if that is still inside the zone, nothing has left. */
    zone.addEventListener('dragleave', function (e) {
      if (e.relatedTarget && zone.contains(e.relatedTarget)) return;
      zone.removeAttribute('data-over');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.removeAttribute('data-over');
      if (photoZoneBusy()) return;

      var dt = e.dataTransfer;
      if (!dt) return;
      var files = Array.prototype.slice.call(dt.files || []);
      /* A drag that carried no file, a URL or selected text, changes nothing.
         Same silence the picker gives when it is dismissed with no selection. */
      if (files.length) runBatch(files);
    });
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      // The value is cleared so picking the same file twice still fires change.
      input.value = '';
      /* A picker dismissed with no selection changes nothing: no state
         transition, no queue, no status line. */
      if (files.length) runBatch(files);
    });

    return box;
  }

  /* syncFormLanguage()'s job, for a control that carries no translation
     attribute at all, which is a deliberate departure from phase 3's form.
     The applyLanguage() sweep cannot help here by design, so every string in
     the control is re-seated from the model: the two labels from their keys,
     the button from its state, the two live regions from the { key, vals }
     they hold, and every queue row from the copy key its record stored when it
     was refused, never by re-running validation. */
  function syncUploaderLanguage(uploader) {
    if (!uploader) return;

    var label = $('.uploader__label', uploader);
    if (label) label.textContent = t('photos.remaining.label');

    writeAllowance(uploader);
    writeRules(uploader);

    var hint = $('.uploader__hint', uploader);
    if (hint) hint.textContent = t('photos.zone.hint');

    var note = $('.uploader__note', uploader);
    if (note) note.textContent = t('photos.permanent');

    /* The one place the retry's label is written, so there is exactly one
       string for one intent in this section. A verb plus an object, never a
       bare Retry, which reads as nothing out of context. */
    var retry = $('.uploader__retry', uploader);
    if (retry) retry.textContent = t('photos.retry.failed');

    setUploaderState(uploader, photoState);

    paintStatus();
    paintAlert();
    renderQueue();
  }

  /* A guest with five photographs picks five once (D-15), and every one of
     them becomes a numbered row from the instant of selection, before any work
     begins. Silently dropping a file somebody chose is the failure PH-05
     forbids, wearing a quieter costume.

     Picking a new batch replaces the array wholly and discards any un-retried
     failed records. The guest was told by name what did not land and was
     offered a retry before they chose to move on, and a queue that accumulates
     across batches grows without bound during exactly the hours the phone is
     busiest. */
  function runBatch(files) {
    var uploader = photoUploader;
    var maxBytes = maxFileBytes();
    var room = photosRemaining();
    var i, rec;

    photoIdent = identity.get();

    /* The second half of the identity guarantee, and it is deliberately not
       the same half as the render fan out above. A control on the screen is
       evidence of an identity that existed when it was painted; this is the
       only place that reads the identity the bytes will actually be filed
       under. If the two have drifted the batch is refused before a single file
       is decoded, and the ladder is asked again so the guest lands on the gate
       rather than watching five files be uploaded and then rejected by a not
       null column. No row state is written and no queue is drawn, because
       nothing was accepted: this is not a batch that failed, it is a batch
       that never began. */
    if (!photoIdent || !photoIdent.guest_id || !photoIdent.name) {
      photoBatch = [];
      renderPhotos();
      return;
    }

    photoBatch = [];
    setUploaderStatus(null);
    setUploaderAlert(null);

    for (i = 0; i < files.length; i++) {
      photoBatch.push({
        file: files[i],
        index: i + 1,
        slot: 0,
        state: 'waiting',
        reasonKey: null,
        reasonVals: null,
        path: null,
        progress: 0,
        node: null,
        stateEl: null,
        reasonEl: null,
        fillEl: null
      });
    }

    // The transcript exists before any work begins, which is the point of it.
    renderQueue();

    /* Validation folds into preparing rather than getting a state of its own,
       and it runs across the WHOLE picked list before any decode (D-21), so a
       file too large to decode is refused before it can exhaust the phone. */
    setUploaderState(uploader, 'preparing');

    var accepted = 0;
    var extra = [];

    /* How many videos this guest already holds, counted from the paths on the
       device rather than from a column, because the client has never been told
       what kind each recorded row is and does not need to be: the extension IS
       the kind, and that is the same fact the renderer reads.

       The database enforces this rule and is the authority. This count exists
       so a second video is refused HERE, with a sentence that says the
       allowance is one, instead of being uploaded in full over party wifi and
       then declined by the row insert. Fifty megabytes is a long time to spend
       finding out. */
    var videosHeld = 0;
    var held = identity.photoPaths();
    for (i = 0; i < held.length; i++) {
      if (pathIsVideo(held[i])) videosHeld++;
    }

    for (i = 0; i < photoBatch.length; i++) {
      rec = photoBatch[i];

      var bad = validateFile(rec.file, maxBytes);
      if (bad) {
        setRowState(rec, 'refused', bad, photoRefusalVals(bad));
        continue;
      }

      rec.kind = fileKind(rec.file);

      /* The second video, refused by name. Counted across what the guest holds
         AND what is in this batch, so picking two videos at once is caught on
         the second one rather than on neither. */
      if (rec.kind === 'video') {
        if (videosHeld >= 1) {
          setRowState(rec, 'refused', 'photos.err.video.only', null);
          continue;
        }
        videosHeld++;
      }

      /* Overflow (D-15): the first N are accepted and the rest are refused by
         name and by number in their own rows, which is more readable than
         cramming three file names into one sentence. */
      if (accepted >= room) { extra.push(rec); continue; }

      rec.slot = ++accepted;
    }

    photoBatchTotal = accepted;

    if (extra.length) {
      for (i = 0; i < extra.length; i++) {
        setRowState(extra[i], 'refused', 'photos.refuse.extra', { n: extra.length });
      }
      setUploaderAlert('photos.refuse.extra', { n: extra.length });
    }

    if (!accepted) return settleBatch();
    runNextFile();
  }

  /* Sequential, one file at a time (D-18), so a failure at file four leaves
     files one to three genuinely recorded rather than in an ambiguous partial
     state, and so exactly one decoded bitmap is alive at a time on a phone.
     At any instant at most one request is in flight and at most one row is in
     a moving state.

     Every branch below terminates in a row state and re-enters here, and the
     walk terminates in settleBatch(), which terminates in a control state. No
     path can leave the control locked.

     Writes go to the model first and to the record's node second. If a render
     has replaced that node the write is a harmless no-op, because the next
     render paints from the model rather than from the orphan. */
  function runNextFile() {
    var uploader = photoUploader;
    var rec = null;

    for (var i = 0; i < photoBatch.length; i++) {
      if (photoBatch[i].state === 'waiting') { rec = photoBatch[i]; break; }
    }

    if (!rec) return settleBatch();

    /* Preparing and uploading are distinct states with distinct copy, because
       the decode of a twelve megapixel photograph is a real second and a
       control that says Sending while it is decoding is lying about which step
       it is on. The counted sentence is the aggregate, and it is never
       suppressed at one: a missing sentence at one file would be a second
       layout. There is no aggregate bar, because two bars for one operation
       are two claims and the second one always lies. */
    setUploaderState(uploader, 'preparing');
    setUploaderStatus('photos.status.preparing', { i: rec.slot, n: photoBatchTotal });
    setRowState(rec, 'preparing');

    /* TWO PREPARE PATHS, ONE CONTINUATION.

       A photograph is decoded, drawn and re-encoded to jpeg. A video is not
       touched at all: there is no canvas path for video, and re-encoding one
       in the browser was costed and refused (D-5, no build step, ffmpeg.wasm
       is a thirty megabyte dependency). So the video path does exactly one
       thing the photograph path does not need, reads its duration, and then
       hands the ORIGINAL File through as the body.

       Both converge on prepared(), so everything after this point, the key,
       the upload, the row, the retry and every failure branch, is written once
       and behaves identically for both kinds. */
    if (rec.kind === 'video') {
      probeVideoDuration(rec.file, function (errKey) {
        if (errKey) {
          /* Refused rather than failed, because nothing was sent. Same
             classification a photograph that will not decode receives, for the
             same reason: there is nothing on the wire to retry. */
          setRowState(rec, 'refused', errKey, photoRefusalVals(errKey));
          return runNextFile();
        }
        /* The File itself, unmodified. A File IS a Blob, so it travels through
           uploadObject unchanged and the bytes that reach the bucket are the
           bytes the camera wrote. */
        prepared(rec.file);
      });
      return;
    }

    downscaleToJpeg(rec.file, maxEdgePx(), jpegQuality(), function (blob, errKey) {
      /* Terminal for this file and never retried: each retry re-decodes the
         full resolution source and the third attempt is where a phone gives
         up. It is a refusal rather than a failure, because nothing was sent. */
      if (errKey || !blob) {
        setRowState(rec, 'refused', errKey || 'photos.err.decode', null);
        return runNextFile();
      }
      prepared(blob);
    });

    function prepared(blob) {

      /* Minted once per RECORD and never once per attempt, and that is the
         whole of the insert's idempotency. sbRequest answers NETWORK after
         twelve seconds whether or not PostgREST received the row, so a row
         written at second thirteen is indistinguishable here from one that
         never arrived. With the key held on the record, the retry's insert
         collides on storage_path unique and is read as already recorded; with
         a fresh key per attempt it wrote a second row, put a second copy of
         the same photograph in everyone's album and spent a second slot of an
         allowance the copy says cannot be taken back.

         No source of randomness at all, so the file cannot be given a safe
         name. The same branch enrollment takes at the identical moment. */
      /* The stored extension is decided from the ORIGINAL file and the kind,
         never from what the blob turned out to be: a photograph is always jpg
         because it has just been re-encoded, and a video keeps its container.
         An unrecognised one returns null and the path is refused rather than
         defaulted, because a video written to a .jpg key uploads, inserts, and
         then never renders. */
      var ext = storedExtFor(rec.file, rec.kind);
      var path = rec.path || storagePath(ext);
      if (!path) {
        setRowState(rec, 'failed', 'photos.err.server', null);
        return runNextFile();
      }
      rec.path = path;

      setUploaderState(uploader, 'uploading');
      setUploaderStatus('photos.status.uploading', { i: rec.slot, n: photoBatchTotal });
      setRowState(rec, 'uploading');
      setRowProgress(rec, 0);

      // The per-file fraction reaches exactly one row's fill, as a scale.
      uploadObject(path, blob, contentTypeFor(ext), function (fraction) { setRowProgress(rec, fraction); }, function (out) {
        /* The row names what happened to it and the batch carries on to the
           next file rather than aborting: a dropped connection on file two is
           not a verdict on files three, four and five. */
        if (!out.ok) {
          setRowState(rec, 'failed', classifyStorage(out), null);
          return runNextFile();
        }

        // Storage first, then the row (D-19).
        insertPhotoRow(photoIdent, path, rec.kind, function (result) {
          if (result === 'ok') {
            // The archive has answered, so and only so does the bar reach the end.
            setRowState(rec, 'done', null, null);
            setRowProgress(rec, 1);
            identity.setPhotoCount(identity.photoCount() + 1);
            /* Recorded beside the count and on the same branch, because the
               two answer the same question and a device where they disagree
               shows a guest a tally that does not match their own strip. Only
               here: the row landing is what makes this photograph part of the
               album, and the orphan branch below deliberately creates an
               object that is in no view and therefore in nobody's album. */
            identity.addPhotoPath(path);
            refreshPhotosState();
          } else if (result === 'limit') {
            /* The bytes went up, so this is not a failure and the copy must
               not call it one: the submission was declined. The local count
               was wrong and the register was right, so it self-heals to the
               maximum (D-19) instead of the path being retried. */
            hitQuota(rec, 'photos.refuse.server');
          } else if (result === 'videolimit') {
            /* The OTHER ceiling, and deliberately not routed through
               hitQuota(). That function self-heals the photograph count to the
               maximum and closes the control, which is right when the register
               says five and wrong here: this guest may have four slots free and
               only their one video spent. Closing the uploader would refuse
               four photographs the register would happily take.

               So the row alone is refused, by name, and the control stays open.
               The bytes went up, so this is a declined submission rather than a
               failure, exactly as the branch above. */
            setRowState(rec, 'refused', 'photos.refuse.video', null);
          } else {
            /* The object is up and the row is not, so this branch is where the
               accepted orphan of D-19 is created. It is left exactly where it
               is: nothing in the browser can remove it, it appears in no view,
               no page and no URL anyone holds, and it is the cheaper of the
               two asymmetric failures. A written accepted consequence, not a
               defect to be repaired here. */
            setRowState(rec, 'failed', result, null);
          }
          runNextFile();
        });
      });
    }
  }

  /* The single self-healing response to the register being full, and the only
     one of the three routes to five that arrives from the wire.

     The local count is the affordance and the database trigger is the floor.
     When the two disagree the floor is right, so the count is set to the
     configured maximum rather than incremented, and the ladder's quota branch
     takes over when the batch settles. Self-healing rather than a dead end
     (D-19).

     It never re-enters the driver and never mints a second object key for the
     same record. The trigger is BEFORE INSERT, so it fires ahead of the unique
     constraint and a guest at the maximum sees the same code for a path
     collision too: a retry with a fresh path would upload bytes forever.

     The copy it is handed must never say the upload failed, because it did
     not. The bytes were accepted and the submission was declined, and saying
     otherwise makes the site lie about work the guest's phone actually did. */
  function hitQuota(rec, reasonKey) {
    // The configured photos.maxPerGuest, through the one reader of it and
    // never a literal, because two parses of one value drift apart on a typo.
    identity.setPhotoCount(photosMaxPerGuest());

    if (rec) setRowState(rec, 'refused', reasonKey, null);

    /* Every file still waiting is refused here rather than sent one at a time
       and declined one at a time. The register is full and is not going to
       become less full inside this batch, so at most one upload is wasted per
       storage reset. They are refused by name in their own rows, which is
       where D-15's requirement that the extras are named is honoured. */
    var waiting = [], i;
    for (i = 0; i < photoBatch.length; i++) {
      if (photoBatch[i].state === 'waiting') waiting.push(photoBatch[i]);
    }
    for (i = 0; i < waiting.length; i++) {
      setRowState(waiting[i], 'refused', 'photos.refuse.extra', { n: waiting.length });
    }

    /* The figure and nothing else. Deliberately not refreshPhotosState(),
       which also refetches the album: D-12 gives the album exactly one
       trigger, a photograph landing, and nothing landed here. */
    writeAllowance();
  }

  /* The batch settles. The terminal control state is computed from the
     records, never from a counter kept alongside them, so it cannot disagree
     with the transcript the guest is reading.

     The polite line carries the success, the assertive line carries what did
     not land, and where every refusal shares one reason that reason is named
     rather than summarised. No message string from either Supabase service is
     ever rendered: every sentence here is a copy key. */
  function settleBatch() {
    var uploader = photoUploader;
    var ok = 0, refused = 0, failed = 0, i, rec;
    var oneKey = null, oneVals = null, mixed = false;

    for (i = 0; i < photoBatch.length; i++) {
      rec = photoBatch[i];
      if (rec.state === 'done') { ok++; continue; }
      if (rec.state === 'refused') refused++;
      else if (rec.state === 'failed') failed++;
      else continue;

      if (!oneKey) { oneKey = rec.reasonKey; oneVals = rec.reasonVals; }
      else if (oneKey !== rec.reasonKey) mixed = true;
    }

    var bad = refused + failed;
    var state = 'idle';
    if (ok && bad) state = 'partial';
    else if (ok) state = 'success';
    else if (failed) state = 'failed';
    else if (refused) state = 'refused';

    setUploaderState(uploader, state);

    /* THE SUCCESS SENTENCE HAS TO KNOW WHAT LANDED.

       It said "One photograph is on record" for a video, which is the copy
       lying about the thing the guest just watched upload. Caught by sending a
       real video through the whole path with the wire stubbed.

       Three cases rather than two, because "1 photograph and 1 video" is a
       real batch and calling it "2 photographs" is the same lie counted
       differently:

         only videos      the video sentence
         any video at all the neutral submissions sentence
         no video         the photograph sentence, unchanged

       The neutral one is deliberately not used everywhere. "Submissions" is
       correct and colourless, and the photograph sentence is the one this
       section has always said for the case that is still overwhelmingly the
       common one. */
    if (state === 'success') {
      var vids = 0;
      for (i = 0; i < photoBatch.length; i++) {
        if (photoBatch[i].state === 'done' && photoBatch[i].kind === 'video') vids++;
      }

      var doneKey;
      if (vids && vids === ok) doneKey = ok === 1 ? 'photos.status.done.video.one' : 'photos.status.done.video.many';
      else if (vids)           doneKey = 'photos.status.done.mixed';
      else                     doneKey = ok === 1 ? 'photos.status.done.one' : 'photos.status.done.many';

      setUploaderStatus(doneKey, { n: ok });
    }
    else if (state === 'partial') setUploaderStatus('photos.status.partial', { ok: ok, bad: bad });
    else setUploaderStatus(null);

    /* One reason shared by every unlanded row is named. Several reasons do not
       stack: three sentences in an assertive region is three interruptions for
       one event, and each row already carries its own reason in writing.

       On partial the counted sentence is already in the polite line, so the
       assertive line stays silent rather than repeating it. The same sentence
       announced twice, once politely and once assertively, is a stutter, and
       it is the defect this control is most likely to produce because both
       regions can honestly claim that sentence. Where nothing landed the
       polite line is empty, so the assertive line has to carry the count. */
    if (!bad) setUploaderAlert(null);
    else if (!mixed && oneKey) setUploaderAlert(oneKey, oneVals);
    else if (state === 'partial') setUploaderAlert(null);
    else setUploaderAlert('photos.status.partial', { ok: ok, bad: bad });

    /* Two of the three routes to five land here, and they land the same way.
       An overflow batch that filled the allowance and a server refusal that
       healed the count both leave the stored count at the maximum, so the
       ladder is asked again rather than a state being written by hand. The
       third route needs nothing at all: at page load the quota body is simply
       what the ladder finds.

       The flip happens at settle rather than the instant the count reaches the
       maximum, so the guest sees the transcript of the batch they just
       submitted finish before the file closes over it. That sentence used to
       be false: the flip runs synchronously, in this same task, so no frame
       was ever painted between the three writes above and the ladder clearing
       them. The batch's answer is therefore handed to the quota body rather
       than left in a control that is about to be discarded, and the quota body
       renders it underneath the punchline. Nothing a guest picked is disposed
       of without a sentence naming what happened to it (PH-05). */
    if (identity.photoCount() >= photosMaxPerGuest()) {
      photoBatchPending = false;
      /* Only when something did not land, which is the whole of what PH-05
         asks for. A batch where every file recorded has already been answered
         by the quota body's own lede, and better than the transcript would
         answer it: "Five photographs are on record in your name" is the same
         fact in the section's own voice, and the album directly below is the
         proof. Carrying a transcript of five successes under the punchline
         would be a receipt for a receipt. */
      photoQuotaSummary = bad
        ? { status: photoStatus, alert: photoAlert, batch: photoBatch, announced: false }
        : null;
      return renderPhotos();
    }

    /* The language render that was skipped mid batch happens once, here, and
       this is the only place the flag is cleared. */
    if (photoBatchPending) {
      photoBatchPending = false;
      renderPhotos();
    }
  }

  /* One tap, and exactly the files that did not land are sent again.

     The batch model is what makes this possible at all: failed and refused
     never clear the selection, so the File objects are still alive and the
     guest does not have to find the same three photographs in their camera
     roll a second time.

     Three record states and three different answers, and the difference
     between them is the whole function:

       done      left exactly as it is. A recorded row has a row in the
                 register behind it, and re-sending it would upload a second
                 object and count a second time against the limit. This is the
                 double count the retry exists to not cause.
       refused   left exactly as it is. A refusal is a decision rather than a
                 transient fault: a decode failure is terminal for that file,
                 and a quota refusal is terminal for the whole guest.
       failed    reset to waiting, its reason cleared, its bar returned to the
                 start, and re-driven.

     The slots are renumbered across the retried rows only, so the counted
     sentence reads "Sending 1 of 2" for a retry of two rather than continuing
     a numbering the guest can no longer see. */
  function retryFailedFiles() {
    var uploader = photoUploader;
    var again = 0, i, rec;

    /* The driver is sequential by contract: at any instant at most one request
       is in flight and at most one row is in a moving state. runBatch's entry
       point is held to that by a real DOM property, btn.disabled. This one was
       held to it by a stylesheet rule and nothing else, and a stylesheet is
       not a guarantee on the bad network this section is written for. A tap
       that arrived mid batch reset already failed rows to waiting, overwrote
       the running driver's total so its counted sentence began to lie, and
       started a second concurrent driver walking the same array into a second
       settle. The model is the only thing that knows, so the model is what
       enforces it. */
    if (photoState === 'preparing' || photoState === 'uploading') return;

    for (i = 0; i < photoBatch.length; i++) {
      rec = photoBatch[i];
      if (rec.state === 'done') continue;
      if (rec.state === 'refused') continue;
      if (rec.state !== 'failed') continue;

      /* The object key is deliberately NOT cleared. It is what makes this
         control safe to press: a retry under the same key either re-uploads
         over bytes that are already there or collides on storage_path unique,
         and either way the guest ends with one object and one row for one
         photograph. Clearing it turned the retry into the double count this
         function exists to prevent. */
      rec.slot = ++again;
      setRowState(rec, 'waiting', null, null);
      setRowProgress(rec, 0);
    }

    /* Nothing to retry means nothing happens, including no state change. The
       control is gated on partial and failed in CSS, so this is unreachable
       from a tap, and it is written anyway because a control that can be
       called from anywhere owes a terminal answer for every input. */
    if (!again) return;

    photoBatchTotal = again;
    setUploaderStatus(null);
    setUploaderAlert(null);
    setUploaderState(uploader, 'preparing');
    runNextFile();
  }

  /* renderEnrollment()'s shape exactly: null-guard the host, compute one body
     string through an ordered ladder, discard the static markup, write
     data-body.

     This plan ships three of the five branches and each is final. Plans 03 and
     04 insert the closed and quota branches into this same ladder. */
  /* ======================================================================
     FINDING YOUR OWN PHOTOGRAPHS AGAIN

     The strip under the uploader is drawn from photo_paths in this browser,
     and addPhotoPath() did not exist until the removal feature shipped on
     2026-08-18. Every photograph uploaded before that day left a count on the
     device and no path, so those guests watch the count go up, see an empty
     strip, and cannot take their own photographs back out. Five of the rows in
     the live table are in exactly that state, which is how this was found.

     It also covers the general case that will keep happening: a photo_paths
     list lost, truncated, or written by an older version of this file, while
     the guest_id survives.

     THE SERVER IS ASKED ONCE PER PAGE LOAD AND ONLY WHEN IT CAN HELP. If the
     device already holds as many paths as the count says it has, there is
     nothing to recover and no request is made, which is the overwhelmingly
     common case and must not pay for the rare one.

     public.my_photos takes the guest_id and hands back that guest's own paths.
     It is strictly weaker than delete_own_photo, which already lets a holder of
     a guest_id destroy those same rows.
     ====================================================================== */

  var photosReconciled = false;

  function reconcileMyPhotos() {
    if (photosReconciled) return;
    if (!sbConfigured() || !IDENTITY_OK) return;

    var ident = identity.get();
    if (!ident.guest_id || !ident.enrolled) return;

    /* Nothing to recover. The device knows about at least as many photographs
       as it has been told it holds, so asking would cost a request and change
       nothing. */
    if (identity.photoPaths().length >= identity.photoCount()) return;

    photosReconciled = true;

    sbRequest('POST', '/rest/v1/rpc/my_photos', { p_guest_id: ident.guest_id })
      .then(function (res) {
        if (!res || !res.ok || !Array.isArray(res.body)) return;

        var paths = [];
        for (var i = 0; i < res.body.length; i++) {
          var row = res.body[i];
          if (row && typeof row.storage_path === 'string') paths.push(row.storage_path);
        }

        /* THE SERVER IS THE AUTHORITY ON BOTH VALUES, and they are written
           together or not at all. Writing paths without the count would leave a
           device showing four frames and claiming three submissions remain out
           of five, which is a worse state than the one being repaired.

           setPhotoPaths re-validates every string, because these arrived from
           the network and are about to become image URLs. The count is taken
           from what SURVIVED that validation rather than from the row count, so
           the number and the strip cannot disagree. */
        identity.setPhotoPaths(paths);
        identity.setPhotoCount(identity.photoPaths().length);

        /* Only if it changed anything. A re-render costs the guest a flicker
           and this runs on every load. */
        if (identity.photoPaths().length) renderPhotos();
      });
  }

  function renderPhotos() {
    var host = $('#photos-body');
    if (!host) return;

    /* renderPhotos() joins the applyLanguage() chain, so a guest tapping DA
       mid upload would otherwise get the control rebuilt underneath in-flight
       requests. The rebuild is skipped while the control is preparing or
       uploading and a flag is set; the batch renders once from the model when
       it settles. Skipping is simpler than restoring, and because this phase
       writes no translation attribute anywhere, a skipped render leaves the
       control wholly in the previous language rather than half translated.

       The presence of the control is read from the DOM. Its state is not:
       that comes from the model, which is the only thing that knows. */
    if (photoUploader && $('.uploader', host) &&
        (photoState === 'preparing' || photoState === 'uploading')) {
      photoBatchPending = true;
      return;
    }

    var ident = identity.get();
    var body;

    /* Either credential blank, or a browser that cannot mint an identity at
       all. Both get the inherited pending block and no album below it. */
    if (!sbConfigured() || !IDENTITY_OK) body = 'pending';
    /* Second, and before the registration gate: three hours before the party
       there is nothing to register for yet either. It renders no album below
       it, because there is nothing to show before the evening has happened and
       half a section is worse than a whole placeholder (D-06). */
    else if (!photosOpen(Date.now())) body = 'closed';
    /* Storage holding a guest_id but no name is not a registration. The album
       renders the first token of name, and a guest with no name cannot be
       attributed, so this is the gate rather than the control (D-01). */
    else if (!ident.name || !ident.guest_id) body = 'gate';
    /* Fourth, and above the control rather than inside it: at the maximum
       there is no control to be in a state, so the whole of it is replaced
       rather than disabled. A disabled primary button sitting under a joke is
       a broken control; an absent one is a closed file. The album stays below
       it, so a guest can still look at the evening they simply cannot add to.
       The ladder's order is the contract: unconfigured, closed, not
       registered, quota, upload. */
    else if (identity.photoCount() >= photosMaxPerGuest()) body = 'full';
    else body = 'upload';

    host.textContent = '';          // discards the static pending markup
    host.setAttribute('data-body', body);

    /* The body swap, and the container owns it rather than each of the five
       bodies owning one: 220ms, opacity only, and no height animation anywhere
       because height is neither a transform nor an opacity. mountPanel()'s
       idiom, applied one level up, so a single fade covers whichever of the
       five bodies lands.

       The attribute is inverted against .panel's, deliberately. Absent it the
       container is fully opaque, which is what keeps the static .pending
       markup index.html ships visible if this script never runs at all. */
    host.setAttribute('data-show', '0');
    requestAnimationFrame(function () { host.setAttribute('data-show', '1'); });

    /* The standing control is about to be discarded, so the references to it
       go with it rather than being left to point at detached nodes. */
    photoUploader = null;
    photoQueueEl = null;

    if (body !== 'upload') {
      /* No control means no batch. The model is cleared with it, so a guest
         who withdraws mid session does not come back to a transcript of an
         evening the control can no longer act on. */
      photoBatch = [];
      photoBatchTotal = 0;
      photoBatchPending = false;
      photoStatus = null;
      photoAlert = null;
      photoState = 'idle';
    }

    /* The carried answer belongs to the quota body and to nothing else. It
       survives a language tap, because the batch it describes is stored as
       copy keys and a guest who switches language has not stopped being owed
       the sentence; it does not survive leaving this body, because a guest
       whose identity changed or whose portal closed is looking at a different
       question. Cleared here rather than after rendering, so the transcript is
       not lost the first time a guest reads it in Danish. */
    if (body !== 'full') photoQuotaSummary = null;

    if (body === 'pending') {
      host.appendChild(pendingBlock('photos.pending.title', 'photos.pending.body'));
      return;
    }

    /* Returns above the album, deliberately. D-06: no album under the closed
       body. */
    if (body === 'closed') {
      host.appendChild(closedPanel());
      return;
    }

    if (body === 'gate') {
      host.appendChild(buildGatePanel());
    } else if (body === 'full') {
      // Falls through to the album below, deliberately, unlike the closed body.
      host.appendChild(quotaPanel(photoQuotaSummary));
    } else {
      var box = buildUploader();
      host.appendChild(box);
      /* Every string in the control is written after it is in the document
         and never before, which is what the two live regions need: a region
         that arrives with its content already in it is not announced. */
      syncUploaderLanguage(box);
    }

    /* Every .panel in this file mounts at opacity 0 and waits for its
       data-show attribute (styles.css:1541). The gate body is a .panel, and so
       is the quota body plan 04-04 adds, so without this line they render
       invisible: the enrollment section reaches its panels through
       mountPanel() and this ladder does not.

       Written synchronously, before the inserted node has been painted once,
       rather than on the next frame. #photos-body owns the 220ms body swap
       above and one fade per swap is the contract; a panel fading a second
       time inside a fading container is two fades multiplied together. */
    var panel = $('.panel', host);
    if (panel) panel.setAttribute('data-show', '1');

    /* Under the uploader: this guest's own submissions and nothing else.

       The shared album used to hang here and it was the wrong thing in the
       wrong place. A guest who has just uploaded wants to see what they
       uploaded, and instead got everybody's photographs with their own three
       somewhere inside them. The whole album now has its own section below,
       where looking at it is the actual intention rather than a side effect of
       submitting.

       Costs no request. The paths are on the device, so this renders on first
       paint even on a connection that never reaches the album.

       Nothing is rendered under the gate body any more. The old argument for
       it was that seeing the evening happen makes the registration prompt
       persuasive, and that argument still holds, but it now belongs to the
       gallery section, which an unregistered guest can read in full. */
    var mine = buildMine();
    if (mine) {
      var mineHost = document.createElement('div');
      mineHost.id = 'photos-mine';
      mineHost.appendChild(mine);
      host.appendChild(mineHost);
    }

    /* The way through to the whole album, from the place a guest has just
       finished adding to it.

       A page rather than an anchor since the album moved off this page. It
       stays a plain link to a real URL, so a middle click, a long press and
       "open in new tab" all work through the browser rather than through
       anything written here. */
    if (sbConfigured()) {
      var more = document.createElement('a');
      more.className = 'btn btn--ghost photos__toalbum';
      more.href = 'album.html';
      more.setAttribute('data-i18n', 'photos.seealbum');
      more.textContent = t('photos.seealbum');
      host.appendChild(more);
    }
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
    wireSaveDate();
    wireNav();
    wireLightboxKeys();
    wireBackGesture();
    foldObjectivesOnPhone();
    scheduleAwakening();
    applyLanguage();
    startClock();

    /* After applyLanguage, which is what first renders the photos section, so
       a recovery that finds something re-renders a control that already
       exists rather than racing the one that builds it. */
    reconcileMyPhotos();

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
