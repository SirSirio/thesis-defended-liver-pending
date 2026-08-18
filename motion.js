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

  /* "Text occasionally corrects itself."

     That line is in DESIGN-BRIEF.md as the behaviour of the slipping zone and
     it was never built. What was built instead was a small rotation on each
     section, and the owner's verdict on it was the correct one: a degree and a
     half is the worst of both worlds, too small to read as a decision and
     large enough to read as a rendering fault. Every rotation on the site is
     gone, headings and footer alike, and this is what carries the arc instead.

     A heading resolving out of noise is never mistaken for a bug, which is the
     whole problem with a subtle skew. It also costs no new copy: the real
     string is already in the element, it is only briefly obscured.

     Known limit, stated rather than hidden: this writes textContent directly,
     so a guest who switches language during the ~700ms a heading is resolving
     would freeze that one heading in the previous language until they switch
     again. One heading, once, in a sub second window, and the alternative was
     a second copy of the i18n machinery in this file. */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/()=?*+<>[]{}';

  function correctItself(el) {
    if (el.getAttribute('data-corrected') === '1') return;
    el.setAttribute('data-corrected', '1');

    var finalText = el.textContent;
    var chars = finalText.split('');
    var n = chars.length;
    if (!n) return;

    /* Each character settles at its own moment, left to right, so the string
       resolves like a readout coming up rather than all snapping at once.
       Spaces are never scrambled: a word count that changes mid animation
       reads as broken text rather than as noisy text. */
    var settleAt = [];
    for (var i = 0; i < n; i++) settleAt.push(0.22 + (i / n) * 0.6 + Math.random() * 0.16);

    var p = { t: 0 };
    gsap.to(p, {
      t: 1,
      duration: 0.72,
      ease: 'none',
      onUpdate: function () {
        var out = '';
        for (var i = 0; i < n; i++) {
          if (chars[i] === ' ' || p.t >= settleAt[i]) out += chars[i];
          else out += GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
        }
        el.textContent = out;
      },
      onComplete: function () { el.textContent = finalText; }
    });
  }

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

    /* The composure goes in the LABELS, never in the content.

       This used to rotate whole sections, and on the album that was plainly
       wrong: a gallery is a grid of rectangles, and rotating rectangles does
       not read as a page losing its nerve, it reads as broken alignment. The
       one section that most needs to look deliberate was the one being pushed
       out of true. It also made every tilted section wider than the viewport,
       which is where the sideways scroll came from.

       Type can lean and still be read; a photograph cannot. So the heading of
       an unhinged section drifts off its baseline while everything underneath
       it stays exactly where it was put. The institution loses its composure,
       the information does not. That is DSG-04's actual claim, and rotating
       the content was never a good reading of it. */
    $$('[data-zone="unhinged"] .section__h, [data-zone="slipping"] .section__h')
      .filter(function (h) {
        // Location and Building access are never touched. They are the two
        // sections read outdoors in the dark.
        var sec = h.closest('.section');
        return !(sec && SPARED[sec.id]);
      })
      .forEach(function (h) {
        ScrollTrigger.create({
          trigger: h.closest('.section') || h,
          start: 'top 76%',
          once: true,
          onEnter: function () { correctItself(h); }
        });
      });
  }

  /* Slipping: the objectives arrive slightly out of true and straighten as
     they land. The institution is still standing, but not quite upright. */
  function objectivesLean() {
    var items = $$('#objectives .objectives li');
    if (!items.length) return;

    /* No rotation. A slight lean on a list of sentences is the same uncanny
       amount that made the section skew read as a fault: too small to be a
       decision, large enough to look wrong. They arrive out of order instead,
       which is a thing only a deliberate animation does. */
    gsap.from(items, {
      opacity: 0,
      y: 22,
      duration: 0.5,
      ease: 'power3.out',
      stagger: { each: 0.09, from: 'random' },
      scrollTrigger: { trigger: '#objectives', start: 'top 78%', once: true }
    });
  }

  /* Collapsed: the mask comes off. The two footer lines visibly slump as the
     page runs out, which is the zone doing on screen what the brief describes
     in words. */
  function footerSlump() {
    var footer = $('.footer');
    if (!footer) return;

    /* The footer used to physically slump, and it was the same mistake at the
       bottom of the page as the section skew was in the middle of it. The mask
       comes off in the type instead: the disclaimer fades toward the colour of
       something nobody is meant to finish reading. No geometry moves. */
    $$('p', footer).forEach(function (p, i) {
      gsap.fromTo(p,
        { opacity: 1 },
        {
          opacity: i === 0 ? 0.85 : 0.42,
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
     The living background

     Two masses drifting on their own, and a third that walks toward wherever
     the guest last touched the screen. This is the "responds to you" part, and
     it is deliberately built on pointer events rather than on the gyroscope:
     iOS has required an explicit permission prompt for device orientation
     since 13, and a party invitation that opens with a permission dialog has
     already lost.

     Everything moves by transform on an element that is fixed,
     pointer-events:none and behind the content, so none of it can cost a
     layout or intercept a tap.
     ---------------------------------------------------------------------- */

  function livingBackground() {
    var a = $('.aura__a');
    var b = $('.aura__b');
    var touch = $('#aura-touch');
    if (!a || !b || !touch) return;

    // Slow, out of phase, and never landing on the same beat twice.
    gsap.to(a, {
      xPercent: 14, yPercent: 10,
      duration: 19, ease: 'sine.inOut', repeat: -1, yoyo: true
    });
    gsap.to(b, {
      xPercent: -12, yPercent: -14,
      duration: 24, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 2
    });

    /* quickTo keeps one interpolator alive and re-aims it, instead of building
       a tween per pointer event. On a drag across a phone screen that is the
       difference between one tween and several hundred. */
    var toX = gsap.quickTo(touch, 'x', { duration: 1.1, ease: 'power3.out' });
    var toY = gsap.quickTo(touch, 'y', { duration: 1.1, ease: 'power3.out' });

    var cx = 0, cy = 0;

    function aim(px, py) {
      // Relative to the middle, and damped, so the mass leans toward the
      // finger rather than sitting under it. Sitting under it reads as a
      // cursor; leaning reads as light.
      toX((px - window.innerWidth / 2) * 0.55);
      toY((py - window.innerHeight / 2) * 0.55);
    }

    document.addEventListener('pointermove', function (e) {
      cx = e.clientX; cy = e.clientY;
      aim(cx, cy);
    }, { passive: true });

    /* Touch is handled separately rather than left to pointermove, because a
       phone only emits pointermove while a finger is down. Without this the
       background would only ever react to a drag, and the commonest gesture on
       this page is a tap. */
    document.addEventListener('touchstart', function (e) {
      var p = e.touches && e.touches[0];
      if (p) aim(p.clientX, p.clientY);
    }, { passive: true });
  }

  /* ----------------------------------------------------------------------
     THE DISPENSE

     The morph is announced by a droplet being dispensed from a needle, and
     the page transforms on impact.

     The host's thesis is modular automated liquid dispensing for point of
     care diagnostics: peristaltic pumps, nozzles, volumes from 5 to 1000
     microlitres. So the thing that transforms this page is the thing the
     party is celebrating, which is a better reason for an animation to exist
     than that it looked good.

     app.js owns both clocks. This runs when it says to, and the drop is in the
     air for exactly the lead time it allows, so impact and morph are the same
     instant rather than two things that happen near each other.
     ---------------------------------------------------------------------- */

  var LEAD = 1.7;        // seconds, and it must match DISPENSE_LEAD_MS

  function svg(name, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  function dispense() {
    /* Aimed at the save the date block, which is the thing the page is
       actually about. Falling into the middle of nowhere would be decoration;
       landing on the date is the announcement hitting its subject. */
    var target = $('.savedate__num') || $('.hero__title');
    var tbox = target ? target.getBoundingClientRect() : null;
    var vw = window.innerWidth || 390;

    /* WHERE THE DROP FALLS, and this is the constraint the whole rig is built
       around rather than an afterthought.

       The instrument hangs in a narrow column at the right edge, and the
       needle hangs in that same column. It does NOT reach across to the middle
       of the date, and that is the fix for a defect this file has now produced
       twice: a tube routed from a pump on the right to a needle over the
       centre has to cross the headline to get there, and it laid a lit red
       line straight through the two words the page is named after.

       Tubing hangs, it does not traverse. So the needle stays under the head,
       the drop falls straight down, and it lands on the right hand end of the
       date instead of its middle. Still on the subject, and nothing crosses a
       word on the way. The clamp keeps it on the number on any layout where
       the date is narrower than the column is far in. */
    var colX = vw - 66;
    var landX = colX;
    if (tbox) {
      landX = Math.max(tbox.left + 24, Math.min(colX, tbox.right - 24));
    }

    // Low on the date rather than through its middle, which buys the drop
    // another 40px of visible fall on a phone where every pixel is spoken for.
    var landY = tbox ? tbox.top + tbox.height * 0.86 : (window.innerHeight || 800) * 0.45;

    /* The rig's geometry. A pump up and to one side, a tube running from it to
       a needle above the date, and the needle short: it is the last few
       millimetres of a system, not a spike hanging from the ceiling.

       The pump is placed away from the headline so that a blurred object never
       sits on top of a word anybody is reading. */
    /* Laid out downward from the top bar, then checked against the target,
       rather than measured upward from the target and clamped.

       Two builds got this wrong in two different ways. The first pinned the
       needle at a fixed y whatever the layout did, so on any viewport where
       the date sat higher the drop travelled UPWARDS to reach it. The second
       anchored to the target and clamped, and on a phone the clamps collapsed
       the pump and the needle to within two pixels of each other, which turned
       the tube into a horizontal line across the headline.

       Top down cannot collapse: the pump gets its space first, the tube gets a
       fixed run below it, and only the fall absorbs what is left over. */
    var COL_W = 32;                     // the reservoir's width, and the column's
    var HOUSING_R = 33;                 // pump casing, outer radius
    var OCC_R = HOUSING_R - 9;          // the radius the tube is pinched at
    var ROLLER_R = 7;
    var BOTTLE_H = 50;
    var HUB_H = 12;                     // the luer fitting
    var CANNULA = 18;                   // the steel, and no more than that

    /* The column axis is computed above, with the landing, because the two are
       the same decision: everything hangs on it, including the needle. */
    var bottleY = 68;
    var bottleBottom = bottleY + BOTTLE_H;

    var pumpX = colX;
    var pumpY = bottleBottom + 12 + HOUSING_R;
    var needleY = pumpY + HOUSING_R + 56;      // top of the luer hub
    var tipY = needleY + HUB_H + CANNULA;

    /* If the target sits above the tip on some layout, drop onto the hero
       instead of flying upward into the date. Physics before aim. */
    if (landY < tipY + 60) landY = tipY + 60;

    var rig = document.createElement('div');
    rig.className = 'rig';
    rig.setAttribute('aria-hidden', 'true');

    var sheet = svg('svg', {
      class: 'rig__svg',
      width: vw, height: 380,
      viewBox: '0 0 ' + vw + ' 380',
      fill: 'none'
    });

    /* THE RESERVOIR

       Added because the owner's note was exactly right: a pump head on its own
       is a wheel with dots in it. A pump reads as a pump only when you can see
       what it is moving and where that is coming from, so the liquid now has
       somewhere to come FROM. A capped bottle, part full, with the tube leaving
       the bottom and running round to the head.

       Part full rather than brimming, deliberately. A full bottle reads as a
       drawing of a bottle; one with a level in it reads as one being drawn
       down, which is the claim the whole animation is making. */
    var bx = colX + 6;                   // the bottle sits a little off the axis
    var bw = COL_W;
    var res = svg('g', { class: 'rig__res' });

    res.appendChild(svg('rect', {
      x: bx - 9, y: bottleY - 7, width: 18, height: 7, rx: 2, class: 'rig__cap'
    }));
    res.appendChild(svg('rect', {
      x: bx - bw / 2, y: bottleY, width: bw, height: BOTTLE_H, rx: 5,
      class: 'rig__bottle'
    }));

    /* The level, inset by the wall thickness so it sits inside the bottle
       rather than on top of its outline. Its own element because it drops as
       the run proceeds. */
    var LIQ_TOP = bottleY + BOTTLE_H * 0.34;
    var liqRect = svg('rect', {
      x: bx - bw / 2 + 2.5, y: LIQ_TOP,
      width: bw - 5, height: bottleBottom - LIQ_TOP - 2.5,
      rx: 3.5, class: 'rig__bottleliq'
    });
    res.appendChild(liqRect);
    sheet.appendChild(res);

    /* THE PUMP HEAD

       A casing, a tube wrapped around the inside of it, and a rotor carrying
       three rollers that pinch that tube against the casing. Three is the low
       end of the range the thesis analyses and it is the count that still reads
       as peristaltic at this size.

       The casing is an open C with the gap at the bottom, because that gap is
       most of what separates a pump head from a logo: a closed ring with dots
       in it is a badge, an open one with tube entering one side and leaving the
       other is a machine. The tube enters at the lower right from the reservoir
       and leaves at the lower left toward the needle. */
    var pump = svg('g', { class: 'rig__pump' });

    var A_IN = 0.75;                     // lower right, where the tube enters
    var A_OUT = 2.39;                    // lower left, where it leaves

    var hx1 = pumpX + Math.cos(A_IN) * HOUSING_R, hy1 = pumpY + Math.sin(A_IN) * HOUSING_R;
    var hx2 = pumpX + Math.cos(A_OUT) * HOUSING_R, hy2 = pumpY + Math.sin(A_OUT) * HOUSING_R;
    pump.appendChild(svg('path', {
      d: 'M ' + hx1 + ' ' + hy1 + ' A ' + HOUSING_R + ' ' + HOUSING_R +
         ' 0 1 0 ' + hx2 + ' ' + hy2,
      class: 'rig__housing'
    }));

    // The tube in the race, full of what is being moved.
    var inX = pumpX + Math.cos(A_IN) * OCC_R, inY = pumpY + Math.sin(A_IN) * OCC_R;
    var outX = pumpX + Math.cos(A_OUT) * OCC_R, outY = pumpY + Math.sin(A_OUT) * OCC_R;
    pump.appendChild(svg('path', {
      d: 'M ' + inX + ' ' + inY + ' A ' + OCC_R + ' ' + OCC_R + ' 0 1 0 ' + outX + ' ' + outY,
      class: 'rig__race'
    }));

    /* The rotor: a plate carrying three rollers, rather than three dots on
       spokes. The plate is what makes the spin legible, because a roller
       passing in front of a solid body is unmistakable movement where three
       thin lines at this size mostly disappear. The rollers sit exactly on the
       race radius, so each is drawn ON the tube and reads as occluding it. */
    var rotor = svg('g', { class: 'rig__rotor' });
    rotor.appendChild(svg('circle', {
      cx: pumpX, cy: pumpY, r: OCC_R - 8, class: 'rig__plate'
    }));

    for (var i = 0; i < 3; i++) {
      var a = (i / 3) * Math.PI * 2;
      var rx = pumpX + Math.cos(a) * OCC_R;
      var ry = pumpY + Math.sin(a) * OCC_R;
      rotor.appendChild(svg('line', {
        x1: pumpX, y1: pumpY, x2: rx, y2: ry, class: 'rig__spoke'
      }));
      rotor.appendChild(svg('circle', { cx: rx, cy: ry, r: ROLLER_R, class: 'rig__roller' }));
      // The bright edge that says this is a cylinder being turned, not a dot.
      rotor.appendChild(svg('circle', {
        cx: rx - 1.4, cy: ry - 1.4, r: ROLLER_R * 0.42, class: 'rig__rollerlit'
      }));
    }
    pump.appendChild(rotor);
    pump.appendChild(svg('circle', { cx: pumpX, cy: pumpY, r: 4.5, class: 'rig__hub' }));

    /* THE FEED. Reservoir to head, routed round the outside of the casing
       rather than cutting across it, which is how tubing actually lies. */
    var feed = 'M ' + bx + ' ' + bottleBottom +
               ' C ' + bx + ' ' + (bottleBottom + 18) + ', ' +
                       (pumpX + HOUSING_R + 7) + ' ' + (pumpY - 10) + ', ' +
                       inX + ' ' + inY;
    pump.appendChild(svg('path', { d: feed, class: 'rig__tube rig__tube--wall' }));
    pump.appendChild(svg('path', { d: feed, class: 'rig__tube rig__tube--liquid' }));

    sheet.appendChild(pump);

    /* THE DELIVERY TUBE. One path drawn three times: a soft wide pass that is
       the out of focus tube, the wall, and the liquid inside it. The liquid is
       a dashed stroke whose offset is animated, which is how a fluid front
       moves along a path without a plugin.

       A real tube leaves a fitting along that fitting's axis and arrives along
       the next one's; it does not cut a diagonal between two points. So this
       leaves the head heading down and arrives at the needle heading down, with
       both control points vertical, giving one smooth sag and no kink. */
    var sag = (needleY - outY) * 0.62;

    var d = 'M ' + outX + ' ' + outY +
            ' C ' + outX + ' ' + (outY + sag) + ', ' +
                    landX + ' ' + (needleY - sag) + ', ' +
                    landX + ' ' + needleY;

    sheet.appendChild(svg('path', { d: d, class: 'rig__tube rig__tube--halo' }));

    /* Everything that racks into focus, in one group, so the focus pull is one
       animated filter on one element rather than three that can drift apart. */
    var near = svg('g', { class: 'rig__near' });
    near.appendChild(svg('path', { d: d, class: 'rig__tube rig__tube--wall' }));
    var liquid = svg('path', { d: d, class: 'rig__tube rig__tube--liquid' });
    near.appendChild(liquid);

    /* THE NEEDLE. A blunt dispensing needle, which is a luer hub with a short
       length of steel in it, and that is all.

       The previous one was a bare line, which is a scratch rather than an
       instrument: nothing said where the tube ended and the needle began. The
       hub is what fixes that. It is the tapered collar every dispensing tip
       actually has, it gives the tube something to terminate INTO, and it makes
       the steel below it read as short, because there is finally something to
       read it as short against. */
    var hubTop = needleY, hubBot = needleY + HUB_H;
    near.appendChild(svg('rect', {
      x: landX - 7.5, y: hubTop - 3.5, width: 15, height: 4, rx: 1.2,
      class: 'rig__collar'
    }));
    near.appendChild(svg('path', {
      d: 'M ' + (landX - 6.5) + ' ' + hubTop +
         ' L ' + (landX + 6.5) + ' ' + hubTop +
         ' L ' + (landX + 3.2) + ' ' + hubBot +
         ' L ' + (landX - 3.2) + ' ' + hubBot + ' Z',
      class: 'rig__luer'
    }));

    var needle = svg('line', {
      x1: landX, y1: hubBot, x2: landX, y2: tipY, class: 'rig__needle'
    });
    near.appendChild(needle);
    sheet.appendChild(near);

    rig.appendChild(sheet);

    var bead = document.createElement('span');
    bead.className = 'rig__bead';
    rig.appendChild(bead);

    document.body.appendChild(rig);

    // The dash cycle the liquid travels along.
    var len = 0;
    try { len = liquid.getTotalLength(); } catch (e) { len = 420; }
    gsap.set(liquid, { attr: { 'stroke-dasharray': len, 'stroke-dashoffset': len } });

    gsap.set(bead, { x: landX, y: tipY, scale: 0, opacity: 0, transformOrigin: '50% 0%' });
    gsap.set(needle, { attr: { 'stroke-dashoffset': 0 } });

    /* The focus pull. The whole rig starts soft, as though the camera were
       focused on the page rather than on the instrument, and the near end
       sharpens as the liquid arrives at it. The pump never fully sharpens: it
       is the far end of the shot and it stays there. */
    /* The instrument fades, the drop does not. Only the drawing is faded in
       and out; the bead is a sibling of it and keeps its own opacity, so the
       drop stays lit the whole way down after the rig has withdrawn. */
    gsap.set(sheet, { opacity: 0 });
    gsap.set(pump, { transformOrigin: pumpX + 'px ' + pumpY + 'px' });

    var tl = gsap.timeline();

    tl.to(sheet, { opacity: 1, duration: 0.3, ease: 'power2.out' });

    /* The rotor turns for the whole of the run up and keeps turning while the
       liquid is in the tube. A peristaltic head does not coast.

       Faster than the first build, which took 1.9s per revolution. At three
       rollers that is a roller passing a given point every 630ms, which on a
       58px head is slow enough to read as drift rather than as drive. At 1.15s
       a roller passes every 380ms and the thing is unmistakably being turned,
       which was the owner's actual objection. */
    gsap.to(rotor, {
      rotation: 360,
      transformOrigin: pumpX + 'px ' + pumpY + 'px',
      duration: 1.15,
      ease: 'none',
      repeat: -1
    });

    /* The level falls while the head is running. Small, and it is most of what
       makes the reservoir a reservoir rather than a drawing of one: a bottle
       that never empties is scenery, and one that visibly gives something up is
       the source of what is about to land on the date. */
    tl.to(liqRect, {
      attr: {
        y: LIQ_TOP + 7,
        height: Math.max(4, bottleBottom - LIQ_TOP - 2.5 - 7)
      },
      duration: LEAD,
      ease: 'none'
    }, 0.2);

    // The liquid front runs down the tube toward the needle.
    tl.to(liquid, {
      attr: { 'stroke-dashoffset': 0 },
      duration: 0.62,
      ease: 'power1.inOut'
    }, 0.16);

    /* ...and the near end of the shot comes into focus as it gets there.

       Driven through a proxy number and written as an inline filter, rather
       than by tweening the --near-blur custom property on the group. Animating
       a custom property on an SVG element is the sort of thing that works in
       one engine and quietly does nothing in another; a plain number and an
       onUpdate work everywhere. The CSS var remains as the declared default,
       so the group is correctly soft before this ever runs. */
    var focus = { b: 5 };
    tl.to(focus, {
      b: 0,
      duration: 0.55,
      ease: 'power2.out',
      onUpdate: function () {
        near.style.filter = 'blur(' + focus.b.toFixed(2) + 'px)';
      }
    }, 0.3);

    /* The bead swells at the tip and hangs. This is the part that makes it
       read as dispensing rather than as rain: a drop that is extruded, holds,
       and then lets go under its own weight. */
    tl.to(bead, { scale: 1, opacity: 1, duration: 0.34, ease: 'power2.out' }, 0.62);
    tl.to(bead, { scaleY: 1.24, scaleX: 0.88, duration: 0.16, ease: 'power2.in' });

    // Detach and fall, accelerating and stretching as it goes.
    tl.to(bead, {
      y: landY,
      scaleY: 1.5, scaleX: 0.82,
      duration: LEAD - 1.12,
      ease: 'power2.in'
    });

    // The instrument withdraws while the drop is still in the air.
    tl.to(sheet, { opacity: 0, duration: 0.55, ease: 'power2.in' }, '-=' + (LEAD - 1.2));

    var landed = false;
    function land() {
      if (landed) return;
      landed = true;
      splash(landX, landY);
      if (rig.parentNode) rig.parentNode.removeChild(rig);
    }

    tl.call(land);

    /* A belt to go with the timeline's braces. A decorative overlay that never
       leaves is far worse than one that never arrives, and this one is drawn
       over the whole hero, so it gets a second, independent way out. land() is
       idempotent, so whichever fires first wins and the other is a no op. */
    gsap.delayedCall(LEAD + 1.4, land);
  }

  /* The impact: a ring spreading from where the drop landed, and a handful of
     satellites thrown off it. Both are removed when they finish. */
  function splash(x, y) {
    var ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ripple);

    gsap.set(ripple, { x: x, y: y, scale: 0, opacity: 0.9 });
    gsap.to(ripple, {
      scale: 1, opacity: 0,
      duration: 1.5, ease: 'power2.out',
      onComplete: function () { if (ripple.parentNode) ripple.parentNode.removeChild(ripple); }
    });

    var host = document.createElement('div');
    host.className = 'motes';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);

    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      var d = 3 + Math.random() * 4;
      s.style.width = d + 'px';
      s.style.height = d + 'px';
      host.appendChild(s);

      // Thrown up and out, then pulled back down. A splash, not a firework.
      var ang = -Math.PI * (0.12 + Math.random() * 0.76);
      var sp = 60 + Math.random() * 130;

      gsap.set(s, { x: x, y: y, opacity: 1 });
      gsap.timeline()
        .to(s, {
          x: x + Math.cos(ang) * sp,
          y: y + Math.sin(ang) * sp,
          duration: 0.42, ease: 'power2.out'
        })
        .to(s, {
          y: '+=' + (90 + Math.random() * 130),
          opacity: 0,
          duration: 0.75, ease: 'power1.in'
        });
    }

    gsap.delayedCall(2.2, function () {
      if (host.parentNode) host.parentNode.removeChild(host);
    });
  }

  /* ----------------------------------------------------------------------
     Motes

     The extra moving parts, and they exist only after the page wakes up. Built
     on the event rather than sitting in the markup, so a page that never wakes
     never pays for them and there is nothing drifting behind a course table
     that is still pretending to be a course table.

     Fourteen of them. Enough to read as air and few enough that fourteen
     concurrent transform tweens are the whole cost.
     ---------------------------------------------------------------------- */

  /* Three nozzles across the top, each dispensing on its own irregular
     schedule for the rest of the visit. Same idea as the announcement and the
     same subject, at a fraction of the volume: the page keeps quietly doing
     the thing the thesis is about.

     One droplet in three leaves a ring where it fades, which is what stops the
     loop reading as rain. Nothing is ever visible for more than about three
     seconds and at most a handful exist at once, so the standing cost of this
     is a few concurrent transform tweens. */
  /* Six nozzles, six liquids, fired in sequence.

     Six because the host's system has six, and sequenced rather than random
     because that is what the system does: one of the thesis tools is a
     dispense choreography and throughput simulator, so a protocol running
     head to head across the row is the honest depiction and a scatter is not.

     The colours are the DTU secondary palette, which DESIGN-BRIEF.md permits
     in transient motion and nowhere else. A droplet that exists for two
     seconds and is never a UI surface is exactly that case, and six distinct
     reagents in six channels is what the palette is doing here rather than
     decoration. Violet and blue are lifted off DTU's published values because
     the published ones disappear against a near black page; the hue is kept,
     the luminance is not. */
  var LIQUIDS = [
    '#E83F48',   // DTU red, the site's own accent
    '#FC7634',   // orange
    '#F6D04D',   // yellow
    '#1FD082',   // green
    '#5A67F2',   // blue, lifted from 2F3EEA
    '#B061C9'    // violet, lifted from 79238E
  ];

  function dispensing() {
    var host = document.createElement('div');
    host.className = 'motes';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);

    var N = 6;
    var STEP = 0.62;        // seconds between one nozzle firing and the next
    var REST = 2.8;         // pause after the row has run before it runs again

    function tinyRing(x, y, colour) {
      var r = document.createElement('div');
      r.className = 'ripple ripple--small';
      r.setAttribute('aria-hidden', 'true');
      r.style.borderColor = colour;
      document.body.appendChild(r);
      gsap.set(r, { x: x, y: y, scale: 0, opacity: 0.42 });
      gsap.to(r, {
        scale: 1, opacity: 0, duration: 1.25, ease: 'power2.out',
        onComplete: function () { if (r.parentNode) r.parentNode.removeChild(r); }
      });
    }

    /* Every channel dispenses the same way. The owner's word was that they
       should all be the same, so the only thing that differs between them is
       which nozzle it left and what is in it: same size, same fall, same
       timing. Nothing is randomised except the depth it fades at, which stops
       six identical columns ending on one line. */
    function drop(i) {
      var vw = window.innerWidth || 390;
      var vh = window.innerHeight || 800;
      var colour = LIQUIDS[i % LIQUIDS.length];

      var s = document.createElement('span');
      s.style.width = '7px';
      s.style.height = '9px';
      s.style.background = colour;
      s.style.boxShadow = '0 0 9px ' + colour;
      host.appendChild(s);

      // Evenly spaced across the width, inset half a step at each end so no
      // channel sits under the viewport edge.
      var x = ((i + 0.5) / N) * vw;
      var fall = vh * (0.46 + (i % 3) * 0.13);

      gsap.set(s, { x: x, y: -16, opacity: 0, scaleY: 1 });

      gsap.timeline({
        onComplete: function () { if (s.parentNode) s.parentNode.removeChild(s); }
      })
        .to(s, { opacity: 0.55, duration: 0.28 })
        .to(s, {
          y: fall,
          scaleY: 1.45, scaleX: 0.85,
          duration: 2.4,
          ease: 'power1.in'
        }, 0)
        .to(s, { opacity: 0, duration: 0.5 }, '-=0.5')
        .call(function () { tinyRing(x, fall, colour); });
    }

    /* One clock for the whole row, not six independent ones. The head to head
       order is the point, and six self re-arming timers would drift out of
       sequence within a minute. */
    function sweep() {
      for (var i = 0; i < N; i++) gsap.delayedCall(i * STEP, drop, [i]);
      gsap.delayedCall(N * STEP + REST, sweep);
    }
    gsap.delayedCall(1.1, sweep);
  }

  /* The reveal itself. app.js owns the morph, which is CSS; this is the part
     that makes it impossible to miss. */
  function wireAwakening() {
    document.addEventListener('c03102:awake', function () {

      var badge = $('#course-mark');

      // The lights coming on: the aura overshoots and settles rather than
      // fading politely up to its resting brightness.
      var aura = $('.aura');
      if (aura) {
        gsap.fromTo(aura,
          { scale: 1.14 },
          { scale: 1, duration: 1.6, ease: 'power3.out' });
      }
      $$('.aura span').forEach(function (blob, i) {
        gsap.fromTo(blob,
          { filter: 'brightness(2.1)' },
          { filter: 'brightness(1)', duration: 1.1, delay: i * 0.06, ease: 'power2.out' });
      });

      if (badge) {
        gsap.fromTo(badge,
          { scale: 1 },
          { scale: 1.22, duration: 0.26, ease: 'back.out(4)', yoyo: true, repeat: 1 });
      }

      /* The hero settling into its new shape. A short lift with a stagger, so
         the change reads as the page rearranging itself rather than as a
         stylesheet being swapped. y only, and small: this is the one moment a
         guest is most likely to be reading. */
      var settle = [
        $('.eyebrow'), $('.hero__title'), $('.savedate'), $('#countdown'), $('.hero__actions')
      ].filter(Boolean);

      gsap.fromTo(settle,
        { y: 9 },
        { y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.055 });

      var num = $('.savedate__num');
      if (num) {
        gsap.fromTo(num,
          { scale: 0.965 },
          { scale: 1, duration: 0.8, ease: 'back.out(2.2)' });
      }

      // The nozzles keep working for the rest of the visit, from here on.
      dispensing();

      /* And only now does the page start to come apart. Held back a further
         half second so the impact, the ring and the settle read as one event
         before anything else begins moving; firing them in the same frame put
         two unrelated things on screen at once and neither landed.

         setTimeout rather than gsap.delayedCall on purpose. This schedules the
         creation of the arc rather than a step inside an animation, so it must
         not depend on the animation ticker: on a throttled or backgrounded tab
         GSAP's clock crawls, and the arc would then simply never be built. */
      setTimeout(startDegradation, 500);
    });

    // The announcement, on app.js's clock. The morph lands on the impact.
    document.addEventListener('c03102:dispensing', dispense);
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

  /* WHAT RUNS WHEN, AND WHY THE SPLIT EXISTS

     For the first five seconds this is a DTU course page, and that has to be
     true of its behaviour and not only of its corners. The degradation arc
     used to be wired up at load, so headings drifted and zones deepened while
     the page was still supposed to be keeping a straight face. The owner read
     that as the site being broken, and it was: the page was contradicting its
     own premise, and no amount of tuning the amount of skew would have fixed
     a thing that was wrong about WHEN.

     So nothing that misbehaves is even created until the drop lands. Before
     the morph the page is institutional and quietly well made: a progress
     rule, sections arriving cleanly, the date. After it, the arc exists. */
  function start() {
    // Composed, and true of a real course page. Nothing here misbehaves.
    scrollRule();
    revealSections();
    saveDateEntrance();
    livingBackground();
    wireConfetti();
    wireAwakening();
    refreshLater();
  }

  /* Everything that expresses the page falling apart. Built on the awakening,
     never before it. Sections the guest has already scrolled past get their
     triggers evaluated on creation, so the arc catches up rather than skipping
     the part of the page that is already behind them. */
  function startDegradation() {
    degradationArc();
    objectivesLean();
    footerSlump();
    badgeGlitch();
    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
