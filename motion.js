/* ==========================================================================
   MOTION
   --------------------------------------------------------------------------
   Everything in this file is optional.

   DESIGN-BRIEF.md declares MOTION_INTENSITY 9 and the stylesheet shipped two
   keyframes, so the brief was writing cheques the page did not cash. This is
   the file that cashes them, and it is a separate file rather than more of
   app.js precisely so that it can fail to arrive without taking anything with
   it. Two guards at the top, and nothing below them runs if either trips:

     - GSAP is vendored in assets/vendor/ and loaded deferred. If it 404s, is
       blocked, or is still in flight, this file returns and the page is
       exactly the page it was before. Nothing here is load bearing. No text
       is hidden waiting for an animation to reveal it.
     - prefers-reduced-motion collapses the whole thing. The brief says the
       degradation arc becomes a static tonal shift under that setting, and a
       static tonal shift is precisely what the data-zone backgrounds in
       styles.css already are on their own.

   The hard constraint the whole file is written around: a guest standing
   outside a building in the dark reads the countdown, the address and the
   door video in under three seconds. So the address and the door never move.
   See the note by SPARED.

   House style matches app.js: ES5, var, function, no template literals.
   ========================================================================== */

(function () {
  'use strict';

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;

  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduced = false; }
  if (reduced) return;

  gsap.registerPlugin(ScrollTrigger);

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* The two sections that are never allowed to misbehave, whatever zone they
     are labelled with. Both carry data-zone="unhinged", and the brief's own
     wording is that practical information lives in the sober and the
     unhinged-but-anchored zones and never behind an animation gate. Location
     is the address. Access is the clip showing which door opens. Tilting
     either of them to make a scroll effect look good would trade the single
     thing this site exists to do for a visual flourish. */
  var SPARED = { location: 1, access: 1 };

  /* The DTU secondary palette. DESIGN-BRIEF.md permits these five in transient
     motion only, never as a UI accent and never as a section theme, which is
     exactly what confetti is. The sixth is the site's own lit red, so the
     burst still reads as belonging to this page. */
  var CONFETTI = ['#2F3EEA', '#1FD082', '#F6D04D', '#FC7634', '#79238E', '#E83F48'];

  /* ----------------------------------------------------------------------
     The scroll rule
     A progress indicator on a course page, which is both in character and
     genuinely useful: this is one long document and the bar is the only thing
     telling a guest how much of it is left.
     ---------------------------------------------------------------------- */

  function scrollRule() {
    var bar = $('#scrollrule span');
    if (!bar) return;

    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3
      }
    });
  }

  /* ----------------------------------------------------------------------
     Reveal on enter
     ---------------------------------------------------------------------- */

  function revealSections() {
    var vh = window.innerHeight || 800;

    $$('.section').forEach(function (sec) {
      // Objectives has its own staggered treatment below and would fight this.
      if (sec.id === 'objectives') return;

      var wrap = $('.wrap', sec);
      if (!wrap) return;

      /* Only what is still below the fold. A section already on screen has
         already been read, and hiding it in order to fade it back in is worse
         than leaving it alone. It also means that if anything in this file
         throws halfway through, nothing a guest can currently see has been
         left sitting at opacity zero. */
      if (sec.getBoundingClientRect().top < vh * 0.9) return;

      gsap.from(wrap, {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: sec, start: 'top 82%', once: true }
      });
    });
  }

  /* ----------------------------------------------------------------------
     The degradation arc, driven by scroll instead of declared by a gradient

     --chaos runs 0 to 1 across the document. styles.css uses it to deepen the
     unhinged and collapsed backgrounds, and it defaults to 0 in :root, so a
     page without this file is the page as it was.
     ---------------------------------------------------------------------- */

  function degradationArc() {
    var root = document.documentElement;
    var chaos = { v: 0 };

    gsap.to(chaos, {
      v: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4
      },
      onUpdate: function () {
        root.style.setProperty('--chaos', chaos.v.toFixed(3));
      }
    });

    // The composure going, section by section. Half a degree, alternating.
    // Small enough to feel wrong rather than to look broken.
    $$('[data-zone="unhinged"]').forEach(function (sec, i) {
      if (SPARED[sec.id]) return;

      gsap.fromTo(sec,
        { rotate: -0.35 * (i % 2 ? -1 : 1) },
        {
          rotate: 0.7 * (i % 2 ? -1 : 1),
          ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
        });
    });
  }

  /* Slipping: the objectives arrive slightly out of true and straighten as
     they land. The institution is still standing, but not quite upright. */
  function objectivesLean() {
    var items = $$('#objectives .objectives li');
    if (!items.length) return;

    gsap.from(items, {
      opacity: 0,
      y: 18,
      rotate: -1.2,
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.07,
      scrollTrigger: { trigger: '#objectives', start: 'top 78%', once: true }
    });
  }

  /* Collapsed: the mask comes off. The two footer lines visibly slump as the
     page runs out, which is the zone doing on screen what the brief describes
     in words. */
  function footerSlump() {
    var footer = $('.footer');
    if (!footer) return;

    $$('p', footer).forEach(function (p, i) {
      gsap.fromTo(p,
        { rotate: 0, y: 0 },
        {
          rotate: 0.9 * (i + 1),
          y: 4 * (i + 1),
          ease: 'none',
          scrollTrigger: { trigger: footer, start: 'top 92%', end: 'bottom bottom', scrub: 0.5 }
        });
    });
  }

  /* ----------------------------------------------------------------------
     The save the date entrance

     The date is the most important thing on the page and the motion says so.
     The digits count up before settling, which is the one flourish here that
     is neither transform nor opacity, and it is free: the number is set in
     tabular figures, so every intermediate value occupies exactly the width
     of the final one and nothing reflows while it runs.
     ---------------------------------------------------------------------- */

  function rollTo(el, target, duration) {
    var n = parseInt(target, 10);
    if (isNaN(n)) return;

    var o = { v: 0 };
    gsap.to(o, {
      v: n,
      duration: duration,
      ease: 'power2.out',
      onUpdate: function () {
        var r = Math.round(o.v);
        el.textContent = r < 10 ? '0' + r : String(r);
      },
      onComplete: function () { el.textContent = target; }
    });
  }

  function saveDateEntrance() {
    var day = $('.savedate__d');
    var dot = $('.savedate__dot');
    var mon = $('.savedate__m');
    if (!day || !mon) return;

    var dayText = day.textContent;
    var monText = mon.textContent;

    gsap.from([day, mon], {
      yPercent: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power4.out',
      stagger: 0.08
    });

    if (dot) {
      gsap.from(dot, {
        scale: 0.2,
        opacity: 0,
        duration: 0.5,
        delay: 0.45,
        ease: 'back.out(3)'
      });
    }

    rollTo(day, dayText, 0.9);
    rollTo(mon, monText, 1.05);
  }

  /* ----------------------------------------------------------------------
     The badge glitch

     Once the guest is far enough down that the page has stopped pretending,
     the course number in the bar develops a twitch. One frame each way, every
     few seconds. An institutional glitch, which is the entire joke of the
     degradation arc compressed into 44 by 30 pixels.
     ---------------------------------------------------------------------- */

  function badgeGlitch() {
    var badge = $('#course-mark');
    var firstUnhinged = $('[data-zone="unhinged"]');
    if (!badge || !firstUnhinged) return;

    var tl = gsap.timeline({ repeat: -1, repeatDelay: 4.5, paused: true });
    tl.to(badge, { x: -2, duration: 0.05 })
      .to(badge, { x: 2, y: -1, duration: 0.05 })
      .to(badge, { x: 0, y: 0, duration: 0.05 });

    ScrollTrigger.create({
      trigger: firstUnhinged,
      start: 'top center',
      onEnter: function () { tl.play(); },
      onLeaveBack: function () {
        tl.pause();
        gsap.set(badge, { x: 0, y: 0 });
      }
    });
  }

  /* ----------------------------------------------------------------------
     Confetti

     Feedback for the primary action, not decoration. It fires from the button
     the guest actually pressed, on the one event this page most wants to
     happen, and it is the only place on the site where the DTU secondary
     palette is allowed to appear.
     ---------------------------------------------------------------------- */

  function confetti(x, y) {
    var host = document.createElement('div');
    host.className = 'confetti';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);

    var vh = window.innerHeight || 800;
    var i;

    for (i = 0; i < 42; i++) {
      var piece = document.createElement('span');
      piece.style.background = CONFETTI[i % CONFETTI.length];
      host.appendChild(piece);

      // Upper half of the circle, so the burst goes up before gravity wins.
      var angle = -Math.PI * (0.15 + Math.random() * 0.7);
      var speed = 110 + Math.random() * 230;

      gsap.set(piece, { x: x, y: y, rotation: Math.random() * 360 });

      gsap.timeline()
        .to(piece, {
          x: x + Math.cos(angle) * speed,
          y: y + Math.sin(angle) * speed,
          duration: 0.5,
          ease: 'power2.out'
        })
        .to(piece, {
          x: '+=' + ((Math.random() - 0.5) * 110),
          y: vh + 80,
          rotation: '+=' + ((Math.random() - 0.5) * 720),
          duration: 1.1 + Math.random() * 0.8,
          ease: 'power1.in'
        }, '>-0.08')
        .to(piece, { opacity: 0, duration: 0.4 }, '-=0.4');
    }

    // One removal for the whole burst rather than a callback per piece.
    gsap.delayedCall(3.2, function () {
      if (host.parentNode) host.parentNode.removeChild(host);
    });
  }

  function wireConfetti() {
    document.addEventListener('c03102:saved', function () {
      var btn = $('#savedate-add');
      var box = btn && btn.getBoundingClientRect();
      confetti(
        box ? box.left + box.width / 2 : (window.innerWidth || 400) / 2,
        box ? box.top + box.height / 2 : (window.innerHeight || 800) / 3
      );
    });
  }

  /* ----------------------------------------------------------------------
     Start

     app.js registers its DOMContentLoaded listener while the parser is still
     running, and this file is deferred, so its listener is registered second
     and therefore runs second. That ordering is what lets saveDateEntrance
     read digits that renderSaveDate has already written.
     ---------------------------------------------------------------------- */

  function refreshLater() {
    /* The enrollment panel, the map, the access notes and the photo album all
       mount after their own fetches land, and every one of them changes the
       height of the document underneath triggers that have already measured
       it. ResizeObserver catches all of them without this file needing to know
       any of their names, and the trailing call covers browsers without it. */
    if (window.ResizeObserver) {
      var pending = null;
      var ro = new ResizeObserver(function () {
        if (pending !== null) clearTimeout(pending);
        pending = setTimeout(function () {
          pending = null;
          ScrollTrigger.refresh();
        }, 220);
      });
      ro.observe(document.body);
    }
    setTimeout(function () { ScrollTrigger.refresh(); }, 2500);
  }

  function start() {
    scrollRule();
    revealSections();
    degradationArc();
    objectivesLean();
    footerSlump();
    saveDateEntrance();
    badgeGlitch();
    wireConfetti();
    refreshLater();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
