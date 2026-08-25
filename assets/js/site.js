/* ==========================================================================
   The Botanical Oak — interactions
   All motion is transform/opacity only, rAF-batched, and disabled wholesale
   under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------
     1. Preloader — lift once assets are in, with a hard fallback so a
        slow font or video can never trap the page behind the curtain.
     --------------------------------------------------------------- */
  var MIN_SHOW = reduced ? 0 : 700;
  var start = Date.now();
  var lifted = false;

  function lift() {
    if (lifted) return;
    lifted = true;
    var wait = Math.max(0, MIN_SHOW - (Date.now() - start));
    setTimeout(function () {
      document.body.classList.add('is-loaded');
      splitHero();
    }, wait);
  }
  window.addEventListener('load', lift);
  setTimeout(lift, 3500);

  /* ---------------------------------------------------------------
     2. Split text
     --------------------------------------------------------------- */
  function splitHero() {
    var t = $('[data-split]');
    if (t && !t.dataset.done) {
      t.dataset.done = '1';
      var words = t.textContent.trim().split(/\s+/);
      t.textContent = '';
      var i = 0;
      words.forEach(function (w, wi) {
        var ln = document.createElement('span');
        ln.className = 'ln';
        w.split('').forEach(function (c) {
          var ch = document.createElement('span');
          ch.className = 'ch';
          ch.textContent = c;
          ch.style.transitionDelay = (i * 0.032) + 's';
          ln.appendChild(ch);
          i++;
        });
        t.appendChild(ln);
        if (wi < words.length - 1) t.appendChild(document.createTextNode(' '));
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { t.classList.add('is-in'); });
      });
    }

    // reel headline: wrap each line so it can ride up out of its mask
    $$('[data-split-lines] > span').forEach(function (s, i) {
      if (s.dataset.done) return;
      s.dataset.done = '1';
      var inner = document.createElement('span');
      inner.className = 'li';
      inner.style.transitionDelay = (i * 0.09) + 's';
      while (s.firstChild) inner.appendChild(s.firstChild);
      s.appendChild(inner);
    });
  }
  splitHero();

  /* ---------------------------------------------------------------
     3. Reveal on scroll
     --------------------------------------------------------------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  $$('[data-reveal], [data-split-lines]').forEach(function (el) {
    revealIO.observe(el);
  });

  /* ---------------------------------------------------------------
     4. Nav — stuck state + mobile menu
     --------------------------------------------------------------- */
  var nav = $('#nav');
  var burger = $('#burger');
  var navLinks = $('#navLinks');

  // The home hero is full-height, so handing over at 72% of the viewport is
  // right there. Subpages have a shorter header and mark it [data-nav-trigger],
  // otherwise the transparent nav would sit invisibly on their pale content.
  var navTrigger = $('[data-nav-trigger]');

  function onNavScroll() {
    var threshold = navTrigger
      ? Math.max(0, navTrigger.offsetHeight - nav.offsetHeight)
      : window.innerHeight * 0.72;
    nav.classList.toggle('is-stuck', window.scrollY > threshold);
  }
  onNavScroll();

  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    navLinks.classList.remove('is-open');
    nav.classList.remove('is-menu-open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    if (open) { closeMenu(); return; }
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    navLinks.classList.add('is-open');
    nav.classList.add('is-menu-open');
    document.body.style.overflow = 'hidden';
  });

  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') closeMenu();
  });

  /* ---------------------------------------------------------------
     5. Statement — words light up as the block crosses the viewport
     --------------------------------------------------------------- */
  var stmt = $('[data-words]');
  var stmtWords = [];
  if (stmt) {
    var txt = stmt.textContent.trim().split(/\s+/);
    stmt.textContent = '';
    txt.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'wd';
      s.textContent = w;
      stmt.appendChild(s);
      if (i < txt.length - 1) stmt.appendChild(document.createTextNode(' '));
      stmtWords.push(s);
    });
  }

  function paintWords() {
    if (!stmt || !stmtWords.length) return;
    var r = stmt.getBoundingClientRect();
    var vh = window.innerHeight;
    // 0 when the block's top hits 78% of the viewport, 1 when it clears 26%
    var p = (vh * 0.78 - r.top) / (r.height + vh * 0.52);
    p = Math.max(0, Math.min(1, p));
    var lit = Math.round(p * stmtWords.length);
    for (var i = 0; i < stmtWords.length; i++) {
      stmtWords[i].classList.toggle('is-lit', i < lit);
    }
  }

  /* ---------------------------------------------------------------
     6. Sticky craft section — active step drives the pinned image
     --------------------------------------------------------------- */
  var steps = $$('.craft__step');
  var crafts = $$('.craft__img');
  var craftNum = $('#craftNum');

  if (steps.length && crafts.length) {
    var narrowMQ = window.matchMedia('(max-width:900px)');
    var stepIO = null;

    function buildStepIO() {
      if (stepIO) stepIO.disconnect();
      // Phones pin the image to the top of the viewport, so the activation band
      // sits lower down: a step takes over while its heading is still visible
      // below the image, rather than after it has slid underneath.
      var band = narrowMQ.matches ? '-55% 0px -35% 0px' : '-45% 0px -45% 0px';

      stepIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var n = +e.target.dataset.step;
          steps.forEach(function (s) { s.classList.toggle('is-on', +s.dataset.step === n); });
          crafts.forEach(function (img) { img.classList.toggle('is-active', +img.dataset.step === n); });
          if (craftNum) craftNum.textContent = ('0' + (n + 1)).slice(-2);
        });
      }, { rootMargin: band, threshold: 0 });

      steps.forEach(function (s) { stepIO.observe(s); });
    }

    buildStepIO();
    if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', buildStepIO);
    steps[0].classList.add('is-on');
  }

  /* ---------------------------------------------------------------
     7. Parallax
     --------------------------------------------------------------- */
  var paras = $$('[data-parallax]');

  function paintParallax() {
    if (reduced) return;
    var vh = window.innerHeight;
    paras.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var speed = parseFloat(el.dataset.parallax) || 0.08;
      // -1 above the fold .. +1 below it
      var mid = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translate3d(0,' + (mid * speed * 100).toFixed(2) + 'px,0)';
    });
  }

  /* ---------------------------------------------------------------
     8. Scroll loop — one rAF, all readers batched
     --------------------------------------------------------------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onNavScroll();
      paintWords();
      paintParallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------
     9. Video — play in view, pause out of view, tap for sound
     --------------------------------------------------------------- */
  var vids = $$('.js-inview-video, .js-story');

  var vidIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (v.preload === 'none') v.preload = 'auto';
        var p = v.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused; poster stands in */ });
      } else {
        v.pause();
        if (!v.muted) muteStory(v);
      }
    });
  }, { threshold: 0.4 });

  vids.forEach(function (v) {
    vidIO.observe(v);
    v.addEventListener('playing', function () {
      var ph = v.closest('.phone');
      if (ph) ph.classList.add('is-playing');
    });
  });

  function iconFor(btn, on) {
    var use = btn.querySelector('use');
    if (use) use.setAttribute('href', on ? '#i-sound-on' : '#i-sound-off');
    btn.setAttribute('aria-label', on ? 'Mute clip' : 'Unmute clip');
  }

  function muteStory(v) {
    v.muted = true;
    var ph = v.closest('.phone');
    var btn = ph && ph.querySelector('.phone__sound');
    if (btn) iconFor(btn, false);
  }

  $$('.phone--tap').forEach(function (ph) {
    var v = ph.querySelector('video');
    if (!v) return;

    function toggle(e) {
      e.preventDefault();
      var turningOn = v.muted;
      // only one clip talks at a time
      if (turningOn) {
        $$('.js-story').forEach(function (o) { if (o !== v && !o.muted) muteStory(o); });
      }
      v.muted = !turningOn;
      iconFor(ph.querySelector('.phone__sound'), turningOn);
      if (turningOn) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
    }

    // One listener only. The sound button lives inside the frame, so its
    // clicks (mouse or keyboard) bubble to here — binding it separately
    // fired the toggle twice and cancelled itself out.
    ph.addEventListener('click', toggle);
  });

  /* ---------------------------------------------------------------
     10. Small stuff
     --------------------------------------------------------------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

  var signup = $('#signup');
  if (signup) {
    signup.addEventListener('submit', function (e) {
      e.preventDefault();
      // TODO: point at a real list (Klaviyo / Mailchimp / Shopify) — see README
      signup.querySelector('.field').hidden = true;
      $('#signupOk').hidden = false;
    });
  }

})();
