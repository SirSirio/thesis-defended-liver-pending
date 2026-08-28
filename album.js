/* ==========================================================================
   THE ALBUM PAGE

   Its own script rather than app.js, and the reason is what this page is for.

   app.js is seven thousand lines that build a course page: a countdown, an
   enrollment form, a map, an upload driver, a dispense animation and a five
   second morph. None of it is needed to show photographs, all of it would be
   parsed before the first frame appeared, and this is the one page a guest
   opens on party wifi wanting exactly one thing.

   The price is about sixty lines that also exist in app.js: the request
   helper, the path validator, the public URL builder and the language
   resolver. That duplication is deliberate and it is bounded. What it must
   never become is a SECOND set of rules: the storage path contract, the
   English fallback and the localStorage key are copied exactly, and if any of
   them changes in app.js it has to change here in the same commit.

   config.js and copy.js are shared outright, so there is exactly one place
   where a credential lives and exactly one place where a string lives.
   ========================================================================== */

(function () {
  'use strict';

  var CFG  = window.PARTY_CONFIG || {};
  var COPY = window.PARTY_COPY || {};
  var SUPPORTED = ['en', 'it', 'da'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ----------------------------------------------------------------------
     STORAGE, LANGUAGE, COPY

     app.js's contracts, copied rather than reinvented. Same c03102. prefix,
     so a guest who picked Danish on the invitation arrives here in Danish,
     and same English fallback, so a missing key degrades to readable.
     ---------------------------------------------------------------------- */

  var store = {
    get: function (k) {
      try { return window.localStorage.getItem('c03102.' + k); }
      catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem('c03102.' + k, String(v)); }
      catch (e) { /* private mode, full quota */ }
    }
  };

  var lang = (function () {
    var saved = store.get('lang');
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;

    var configured = CFG.defaultLanguage;
    if (configured && configured !== 'auto' && SUPPORTED.indexOf(configured) !== -1) return configured;

    var nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    if (nav.indexOf('it') === 0) return 'it';
    if (nav.indexOf('da') === 0) return 'da';
    return 'en';
  }());

  function t(key) {
    var table = COPY[lang] || {};
    if (table[key] != null) return table[key];
    if (COPY.en && COPY.en[key] != null) return COPY.en[key];
    return '';
  }

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

  /* ----------------------------------------------------------------------
     THE WIRE

     One GET against one view. No client library on a page whose whole point
     is loading fast on bad mobile data.
     ---------------------------------------------------------------------- */

  function sbUrl() { return (CFG.photos || {}).supabaseUrl || ''; }

  function sbKey() {
    var p = CFG.photos || {};
    return p.supabaseKey || p.supabaseAnonKey || '';
  }

  function sbConfigured() { return !!(sbUrl() && sbKey()); }

  /* app.js's sbRequest, narrowed to the one call this page makes, and keeping
     the property that matters: it races its own timeout and settles either
     way, so no path here can wait forever on a connection that never answers. */
  function albumFetch(cb) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var settled = false;
    var timer = null;

    function done(ok, rows) {
      if (settled) return;
      settled = true;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      cb(ok, rows);
    }

    timer = setTimeout(function () {
      if (ctl) ctl.abort();
      done(false, null);
    }, 10000);

    var opts = { method: 'GET', headers: { apikey: sbKey() } };
    if (ctl) opts.signal = ctl.signal;

    fetch(sbUrl() + '/rest/v1/album?select=first_name,storage_path,created_at&order=created_at.desc', opts)
      .then(function (res) {
        return res.text().then(function (txt) {
          var parsed = null;
          if (txt) { try { parsed = JSON.parse(txt); } catch (e) { parsed = null; } }
          done(res.ok && Array.isArray(parsed), parsed);
        });
      })
      .catch(function () { done(false, null); });
  }

  /* The upload contract read backwards, character for character the same
     expression app.js validates against. These strings become media URLs and
     they arrive from a network response, so the shape is checked rather than
     trusted.

     Widened for video on 2026-08-28 in the same commit as app.js, which is the
     only way this duplication is survivable. A shape change landing in one
     file and not the other makes every new upload invisible on the page that
     was not changed, and there is no migration available from a static site. */
  var STORAGE_PATH_RE = /^\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|mp4|mov|3gp|webm)$/;

  /* Decided by the path rather than by the album view's kind column, so a row
     whose kind disagrees with its own extension still builds the element that
     can actually play what is at the other end of the URL. */
  function pathIsVideo(p) {
    return /\.(?:mp4|mov|3gp|webm)$/i.test(String(p || ''));
  }

  function photoPublicUrl(p) {
    return sbUrl() + '/storage/v1/object/public/' + (CFG.photos || {}).bucket + '/' + p;
  }

  /* ----------------------------------------------------------------------
     LANGUAGE ON THE PAGE
     ---------------------------------------------------------------------- */

  function applyLanguage() {
    document.documentElement.setAttribute('lang', lang);

    $$('[data-i18n]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n'));
      if (!val) return;
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });

    $$('.langswitch button').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    paintCount();
    paintLightboxChrome();
  }

  function wireLanguage() {
    $$('.langswitch button').forEach(function (b) {
      b.addEventListener('click', function () {
        var next = b.getAttribute('data-lang');
        if (!next || SUPPORTED.indexOf(next) === -1 || next === lang) return;
        lang = next;
        store.set('lang', next);
        applyLanguage();
        /* The grid is rebuilt rather than swept, because a tile's accessible
           name is a sentence with a number in it and there is no attribute on
           it for a sweep to find. Rebuilt from the rows already in hand, so a
           language tap costs no request and no reveal. */
        if (albumRows) paintGrid(albumRows, false);
      });
    });
  }

  /* ----------------------------------------------------------------------
     THE GRID
     ---------------------------------------------------------------------- */

  var host = null;
  var albumRows = null;     // the validated rows, held so a language tap is free
  var items = [];           // [{ path, name }] shared by every tile and the lightbox
  var shown = 0;            // frames still standing, after broken objects drop out

  function paintCount() {
    var el = $('#abar-count');
    if (!el) return;
    if (!albumRows) { el.textContent = ''; return; }
    el.textContent = shown === 1
      ? t('album.count.one')
      : phrase('album.count.many', { n: shown });
  }

  function stateLine(titleKey, bodyKey) {
    var p = document.createElement('p');
    p.className = 'astate';
    if (titleKey) {
      var strong = document.createElement('span');
      strong.className = 'astate__t';
      strong.textContent = t(titleKey);
      p.appendChild(strong);
    }
    p.appendChild(document.createTextNode(t(bodyKey)));
    return p;
  }

  /* One observer for the whole grid, disconnected the moment the last tile has
     resolved. A per tile observer, or a scroll listener, would keep the main
     thread busy for the life of the page for an effect that happens once. */
  var revealObserver = null;

  function armReveal(tiles) {
    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || !('IntersectionObserver' in window)) {
      /* Degrades to present, never to absent. A browser without the API shows
         every photograph immediately, which is the outcome the animation was
         decorating in the first place. */
      tiles.forEach(function (el) { el.removeAttribute('data-reveal'); });
      return;
    }

    var pending = tiles.length;

    revealObserver = new IntersectionObserver(function (entries) {
      /* Sorted by position so a screenful that crosses the threshold in one
         frame still resolves left to right, top to bottom. Observer callbacks
         arrive in no guaranteed order, and an unsorted stagger reads as a
         glitch rather than as a sequence. */
      entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          return (a.boundingClientRect.top - b.boundingClientRect.top) ||
                 (a.boundingClientRect.left - b.boundingClientRect.left);
        })
        .forEach(function (e, i) {
          var el = e.target;
          revealObserver.unobserve(el);
          // Capped, so a tall screen full of tiles never ends on a delay long
          // enough to read as the page having stalled.
          el.style.setProperty('--d', Math.min(i * 55, 420) + 'ms');
          el.removeAttribute('data-reveal');
          pending--;
          if (pending <= 0 && revealObserver) {
            revealObserver.disconnect();
            revealObserver = null;
          }
        });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

    tiles.forEach(function (el) { revealObserver.observe(el); });
  }

  /* A duration, as a badge reads it. Seconds only: nothing here is over a
     minute by rule, and "1:04" for a clip the guest was told could be sixty
     seconds invites the question the badge exists to answer. */
  function durationLabel(secs) {
    var n = Math.round(secs);
    if (!isFinite(n) || n < 0) return '';
    return n + 's';
  }

  /* THE MOSAIC'S THUMBNAIL, FOR EITHER KIND.

     app.js's mediaThumb() with one difference that matters on this page: the
     eager and lazy split. The first screenful loads eagerly because a lazy
     first row is a page that opens on an empty grid, and everything after it
     is lazy because eager everywhere is forty requests fired at once on a
     phone.

     NOTHING AUTOPLAYS. This is a grid, on the phone this page exists for, and
     six videos playing at once is a frame rate problem and a data bill in the
     same breath. preload="metadata" fetches a header, not a stream. Playback
     happens in the lightbox, on a tap, with controls.

     The #t=0.1 fragment asks for the first frame as a stand-in poster, so no
     second object is uploaded. The fallback panel is built rather than assumed
     because iOS Safari does not reliably paint it. */
  function albumThumb(path, index, onBroken) {
    var url = photoPublicUrl(path);
    var eager = index < 6;

    if (!pathIsVideo(path)) {
      var img = document.createElement('img');
      img.loading = eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.onerror = onBroken;
      img.src = url;
      return img;
    }

    var wrap = document.createElement('span');
    wrap.className = 'media media--video';
    wrap.setAttribute('data-poster', 'none');

    var vid = document.createElement('video');
    vid.className = 'media__v';
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('tabindex', '-1');
    vid.setAttribute('aria-hidden', 'true');

    var badge = document.createElement('span');
    badge.className = 'media__dur';

    vid.addEventListener('loadedmetadata', function () {
      var label = durationLabel(vid.duration);
      if (label) badge.textContent = label;
    });
    vid.addEventListener('loadeddata', function () {
      wrap.setAttribute('data-poster', 'ok');
    });
    /* Missing object, which is a different thing from a frame that did not
       paint: this one leaves the grid, that one keeps its designed panel. */
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

  function tileFor(row, index, animate) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'atile';
    if (animate) btn.setAttribute('data-reveal', '0');
    btn.setAttribute('aria-label',
      phrase('album.open', { name: row.first_name || t('gallery.by.you') }));

    function broken() {
      btn.setAttribute('data-broken', '1');
      shown--;
      paintCount();
      if (shown <= 0) renderEmpty();
    }

    btn.appendChild(albumThumb(row.storage_path, index, broken));

    if (row.first_name) {
      var by = document.createElement('p');
      by.className = 'atile__by';
      by.textContent = row.first_name;
      btn.appendChild(by);
    }

    btn.addEventListener('click', function () { lbOpen(index, btn); });
    return btn;
  }

  function paintGrid(rows, animate) {
    host.textContent = '';

    items = rows.map(function (r) {
      return { path: r.storage_path, name: String(r.first_name || '') };
    });

    var grid = document.createElement('div');
    grid.className = 'agrid';

    var tiles = [];
    rows.forEach(function (row, i) {
      var tile = tileFor(row, i, animate);
      tiles.push(tile);
      grid.appendChild(tile);
    });

    host.appendChild(grid);

    var shuffle = $('#album-shuffle');
    if (shuffle) shuffle.hidden = rows.length < 2;

    if (animate) armReveal(tiles);
    paintCount();
  }

  function renderEmpty() {
    host.textContent = '';
    host.appendChild(stateLine('album.empty.t', 'album.empty.b'));
    var shuffle = $('#album-shuffle');
    if (shuffle) shuffle.hidden = true;
  }

  function load() {
    if (!sbConfigured()) {
      host.textContent = '';
      host.appendChild(stateLine('album.empty.t', 'album.empty.b'));
      return;
    }

    albumFetch(function (ok, body) {
      if (!ok) {
        host.textContent = '';
        host.appendChild(stateLine('album.failed.t', 'album.failed.b'));
        return;
      }

      /* Filtered before anything is counted or built, so a row whose path does
         not match the shape is skipped AND excluded from the count. The two
         have to agree or the page lies about what it is holding. */
      var rows = [];
      for (var i = 0; i < body.length; i++) {
        var r = body[i];
        if (r && typeof r.storage_path === 'string' && STORAGE_PATH_RE.test(r.storage_path)) rows.push(r);
      }

      albumRows = rows;
      shown = rows.length;

      if (!rows.length) { renderEmpty(); return; }
      paintGrid(rows, true);
    });
  }

  /* ----------------------------------------------------------------------
     THE LIGHTBOX
     ---------------------------------------------------------------------- */

  var lbEl = null, lbIndex = 0, lbReturn = null, lbTouchX = null, lbPushed = false;

  function buildLightbox() {
    var el = document.createElement('div');
    el.className = 'alb';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');

    var stage = document.createElement('div');
    stage.className = 'alb__stage';

    var img = document.createElement('img');
    img.className = 'alb__img';
    img.alt = '';
    img.decoding = 'async';
    stage.appendChild(img);

    /* Built once beside the image rather than swapped in and out, so stepping
       between kinds does not create and destroy a media element each press.
       controls because this is where the guest drives it; no autoplay and no
       loop, because a clip that restarts forever in an overlay is something a
       guest has to close to escape. */
    var vid = document.createElement('video');
    vid.className = 'alb__vid';
    vid.setAttribute('controls', '');
    vid.setAttribute('playsinline', '');
    vid.playsInline = true;
    vid.preload = 'metadata';
    vid.hidden = true;
    stage.appendChild(vid);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'alb__close';
    close.setAttribute('data-i18n', 'gallery.close');
    close.setAttribute('data-i18n-attr', 'aria-label');
    close.appendChild(document.createTextNode('×'));
    close.addEventListener('click', function () { lbClose(); });

    function step(dir, cls, key, glyph) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'alb__step ' + cls;
      b.setAttribute('data-i18n', key);
      b.setAttribute('data-i18n-attr', 'aria-label');
      b.appendChild(document.createTextNode(glyph));
      b.addEventListener('click', function () { lbShow(lbIndex + dir); });
      return b;
    }

    var bar = document.createElement('div');
    bar.className = 'alb__bar';

    var by = document.createElement('p');
    by.className = 'alb__by';
    bar.appendChild(by);

    var count = document.createElement('p');
    count.className = 'alb__count mono';
    bar.appendChild(count);

    /* The escape hatch, kept explicitly: a real link to the full size object,
       so long press to save, share and open in a new tab all still work
       through the browser's own machinery rather than being reimplemented
       badly here. */
    var open = document.createElement('a');
    open.className = 'alb__open';
    open.target = '_blank';
    open.rel = 'noopener';
    open.setAttribute('data-i18n', 'gallery.original');
    bar.appendChild(open);

    el.appendChild(close);
    el.appendChild(step(-1, 'alb__step--prev', 'gallery.prev', '‹'));
    el.appendChild(stage);
    el.appendChild(step(1, 'alb__step--next', 'gallery.next', '›'));
    el.appendChild(bar);

    // The backdrop closes. The photograph does not, because that is where a
    // finger goes to pinch it.
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target === stage) lbClose();
    });

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
      if (Math.abs(dx) > 45) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });

    document.body.appendChild(el);
    return el;
  }

  function paintLightboxChrome() {
    if (!lbEl) return;
    $$('[data-i18n]', lbEl).forEach(function (node) {
      var val = t(node.getAttribute('data-i18n'));
      if (!val) return;
      var attr = node.getAttribute('data-i18n-attr');
      if (attr) node.setAttribute(attr, val);
      else node.textContent = val;
    });
    if (!lbEl.hidden) lbPaint();
  }

  function lbPaint() {
    var item = items[lbIndex];
    if (!item) return;

    var img = $('.alb__img', lbEl);
    var by = $('.alb__by', lbEl);
    var count = $('.alb__count', lbEl);
    var open = $('.alb__open', lbEl);

    if (by) by.textContent = item.name
      ? phrase('gallery.by', { name: item.name })
      : t('gallery.by.you');

    if (count) {
      count.textContent = phrase('gallery.count.of', { i: lbIndex + 1, n: items.length });
      count.hidden = items.length < 2;
    }

    if (open) open.href = photoPublicUrl(item.path);

    $$('.alb__step', lbEl).forEach(function (b) { b.hidden = items.length < 2; });

    var vid = $('.alb__vid', lbEl);
    var isVid = pathIsVideo(item.path);

    /* One kind on stage at a time, and THE OTHER IS ALWAYS TORN DOWN.

       Stepping off a video without clearing its source leaves it playing
       underneath the next photograph. The guest then hears a clip they cannot
       see and has no control to stop it, because the controls went away with
       the element that was hidden. */
    if (vid) {
      vid.hidden = !isVid;
      if (!isVid) {
        try { vid.pause(); } catch (e) { /* nothing playing */ }
        vid.removeAttribute('src');
        try { vid.load(); } catch (e) { /* older browser */ }
      }
    }
    if (img) img.hidden = isVid;

    if (isVid) {
      if (vid) {
        try { vid.pause(); } catch (e) { /* nothing playing */ }
        vid.src = photoPublicUrl(item.path);
        /* Deliberately not played. The guest opened a frame, they did not ask
           for sound, and a video that starts talking the instant it appears is
           the behaviour every site is disliked for. The controls are there. */
      }
      return;
    }

    if (img) {
      // Cleared before the new source, so the settle plays per photograph
      // rather than only on the first one.
      img.removeAttribute('data-in');
      img.onload = function () { img.setAttribute('data-in', '1'); };
      img.src = photoPublicUrl(item.path);
    }
  }

  function lbShow(i) {
    if (!items.length) return;
    // Wraps in both directions, so the last photograph steps to the first
    // rather than into a dead control.
    lbIndex = ((i % items.length) + items.length) % items.length;
    lbPaint();
  }

  function lbOpen(i, opener) {
    if (!items.length) return;
    if (!lbEl) { lbEl = buildLightbox(); paintLightboxChrome(); }

    lbReturn = opener || document.activeElement;
    lbEl.hidden = false;
    document.body.style.overflow = 'hidden';

    /* An overlay outside the history stack is invisible to the Android back
       gesture, so back would navigate the page underneath while the
       photograph stayed on top of it. */
    try { window.history.pushState({ c03102: 'alb' }, ''); lbPushed = true; }
    catch (e) { lbPushed = false; }

    lbShow(i);
    requestAnimationFrame(function () {
      if (lbEl) lbEl.setAttribute('data-show', '1');
    });

    var close = $('.alb__close', lbEl);
    if (close) close.focus();
  }

  function lbClose(fromPop) {
    if (!lbEl || lbEl.hidden) return;

    lbEl.removeAttribute('data-show');
    lbEl.hidden = true;
    document.body.style.overflow = '';

    // Stops a large photograph decoding into a closed overlay.
    var img = $('.alb__img', lbEl);
    if (img) { img.onload = null; img.removeAttribute('src'); }

    /* And stops a video PLAYING into one, which is the louder version of the
       same bug: the overlay is hidden, the guest believes they closed it, and
       the sound carries on with no visible control to stop it. */
    var vid = $('.alb__vid', lbEl);
    if (vid) {
      try { vid.pause(); } catch (e) { /* nothing playing */ }
      vid.removeAttribute('src');
      try { vid.load(); } catch (e) { /* older browser */ }
    }

    if (lbReturn && lbReturn.focus) {
      try { lbReturn.focus(); } catch (e) { /* detached */ }
    }
    lbReturn = null;

    /* Closed by a tap or Escape rather than by back, so the entry opening
       pushed is still on the stack and has to come off. Without this a guest
       would need one press of back per photograph they looked at before they
       could leave the page. */
    if (lbPushed && !fromPop) {
      lbPushed = false;
      try { window.history.back(); } catch (e) { /* nothing to unwind */ }
    } else {
      lbPushed = false;
    }
  }

  function wireKeys() {
    document.addEventListener('keydown', function (e) {
      if (!lbEl || lbEl.hidden) return;

      var k = e.key;
      if (k === 'Escape' || k === 'Esc') { e.preventDefault(); lbClose(); return; }
      if (k === 'ArrowRight') { e.preventDefault(); lbShow(lbIndex + 1); return; }
      if (k === 'ArrowLeft')  { e.preventDefault(); lbShow(lbIndex - 1); return; }

      if (k !== 'Tab') return;

      var focusable = $$('button, a[href]', lbEl).filter(function (n) { return !n.hidden; });
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.addEventListener('popstate', function () {
      if (lbEl && !lbEl.hidden) lbClose(true);
    });
  }

  /* One tap into a photograph nobody was looking for, which is the whole of
     what an album at a party is for. Never lands on the one already open, so
     the control always does something visible. */
  function wireShuffle() {
    var btn = $('#album-shuffle');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (items.length < 2) return;
      var next = Math.floor(Math.random() * items.length);
      if (lbEl && !lbEl.hidden && next === lbIndex) next = (next + 1) % items.length;
      if (lbEl && !lbEl.hidden) lbShow(next);
      else lbOpen(next, btn);
    });
  }

  /* The third aura mass leans toward wherever the guest last touched. Pointer
     events rather than the gyroscope: iOS has required an explicit permission
     prompt for device orientation since 13, and an album that opens with a
     permission dialog has already lost. */
  function wireAura() {
    var el = $('#aura-touch');
    if (!el) return;

    var reduce = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

    function frame() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) requestAnimationFrame(frame);
      else running = false;
    }

    function aim(x, y) {
      tx = (x - window.innerWidth / 2) * 0.16;
      ty = (y - window.innerHeight / 2) * 0.16;
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    window.addEventListener('pointermove', function (e) { aim(e.clientX, e.clientY); }, { passive: true });
    // A phone emits pointermove only while a finger is down, and the commonest
    // gesture on this page is a tap.
    window.addEventListener('touchstart', function (e) {
      var p = e.touches && e.touches[0];
      if (p) aim(p.clientX, p.clientY);
    }, { passive: true });
  }

  function init() {
    host = $('#grid');
    if (!host) return;

    applyLanguage();
    wireLanguage();
    wireKeys();
    wireShuffle();
    wireAura();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
