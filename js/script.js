/* ==========================================================================
   DAKSH KUMAWAT · PORTFOLIO
   js/script.js

   01 INITIALIZATION        11 HERO PARALLAX
   02 DOM REFERENCES        12 HERO 3D OBJECT
   03 DEVICE / MOTION       13 3D SKILL EXPERIENCE
   04 PAGE LOADER           14 PROJECT FILTERS
   05 NAVIGATION            15 PROJECT INTERACTIONS
   06 MOBILE MENU           16 MOUSE / POINTER
   07 THEME TOGGLE          17 RESIZE HANDLING
   08 SCROLL PROGRESS       18 REDUCED MOTION
   09 ACTIVE NAVIGATION     19 PERFORMANCE
   10 SCROLL REVEAL         20 FINAL INITIALIZATION

   The page is fully readable before this file runs. <body class="no-js">
   becomes "js-enabled" here, which is the only switch that lets the CSS
   enable the loader, sticky skill stage and cursor. Every module is
   isolated so one failure never affects another, and nothing hides content.
   ========================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     01 INITIALIZATION
     ====================================================================== */

  const root = document.documentElement;
  const body = document.body;
  if (!body) { return; }

  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const pad = (n) => (n < 10 ? '0' + n : String(n));
  const pad3 = (n) => (n < 10 ? '00' + n : n < 100 ? '0' + n : String(n));
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());
  const raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (cb) => window.setTimeout(() => cb(now()), 16);

  const supportsIO = 'IntersectionObserver' in window;
  const supportsSmoothScroll = 'scrollBehavior' in root.style;

  const setVar = (el, name, value) => { if (el) { el.style.setProperty(name, value); } };
  const scrollTop = () => window.pageYOffset || root.scrollTop || 0;
  const docTop = (el) => el.getBoundingClientRect().top + scrollTop();

  const safe = (label, fn) => {
    try { fn(); } catch (error) {
      if (window.console && console.warn) { console.warn('[portfolio] "' + label + '" skipped:', error); }
    }
  };

  const registry = {
    measurers: [], scrollUpdaters: [], pointerUpdaters: [],
    motionHandlers: [], visibilityHandlers: [], anchorResolvers: []
  };
  const onMeasure = (fn) => registry.measurers.push(fn);
  const onScroll = (fn) => registry.scrollUpdaters.push(fn);
  const onPointer = (fn) => registry.pointerUpdaters.push(fn);
  const onMotionChange = (fn) => registry.motionHandlers.push(fn);
  const onVisibility = (fn) => registry.visibilityHandlers.push(fn);
  const addAnchorResolver = (fn) => registry.anchorResolvers.push(fn);

  /* A registry function that throws is removed so it cannot fail every frame. */
  const runRegistry = (list, a, b) => {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      try { list[i](a, b); } catch (error) {
        list.splice(i, 1);
        if (window.console && console.warn) { console.warn('[portfolio] updater disabled:', error); }
      }
    }
  };

  /* ======================================================================
     02 DOM REFERENCES
     ====================================================================== */

  const dom = {
    intro: $('.intro, .page-loader'),
    introCounter: $('[data-intro-counter]'),
    introSkip: $('[data-intro-skip]'),
    header: $('.site-header'),
    navToggle: $('.nav__toggle, .menu-toggle'),
    navToggleText: $('.nav__toggle-text'),
    navMenu: $('.nav__menu, .nav-wrapper'),
    navLinks: $$('.nav__link, .nav-link'),
    progressBar: $('[data-scroll-progress], .scroll-progress'),
    themeToggle: $('.theme-toggle, [data-theme-toggle]'),
    themeMeta: $('meta[name="theme-color"]'),
    sections: $$('[data-section], main section[id]'),
    reveals: $$('[data-reveal], .reveal'),
    counters: $$('[data-count]'),
    timeline: $('.timeline'),
    hero: $('#hero, .hero'),
    heroContent: $('[data-hero-content], .hero__content'),
    heroStage: $('.hero-3d-stage'),
    heroObject: $('.hero-3d-object'),
    readoutRotation: $('[data-readout="rotation"]'),
    readoutDepth: $('[data-readout="depth"]'),
    skillTrack: $('.skill-track'),
    skillStage: $('.skill-stage'),
    skillCamera: $('.skill-camera'),
    skillScenes: $$('.skill-scene'),
    skillDots: $$('[data-skill-dot]'),
    skillIndexItems: $$('[data-skill-index-item]'),
    skillCurrent: $('[data-skill-current]'),
    filterButtons: $$('.filter__button, .filter-button'),
    filterStatus: $('[data-filter-status]'),
    projects: $$('.project, .project-card'),
    cursor: $('.cursor')
  };

  /* ======================================================================
     03 DEVICE / MOTION DETECTION  +  central scroll engine
     ====================================================================== */

  const viewport = { width: 0, height: 0, docHeight: 0, isMobile: false, isTablet: false, finePointer: true, depthScale: 1 };
  const motion = { reduced: false };
  const scrollState = { y: 0, lastY: 0, direction: 1, ticking: false };
  const pageState = { hidden: false };

  function readViewport() {
    viewport.width = window.innerWidth || root.clientWidth || 0;
    viewport.height = window.innerHeight || root.clientHeight || 0;
    viewport.docHeight = Math.max(root.scrollHeight || 0, body.scrollHeight || 0);
    viewport.isMobile = viewport.width <= 768;
    viewport.isTablet = viewport.width > 768 && viewport.width <= 1024;
    viewport.finePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;
    viewport.depthScale = viewport.isMobile ? 0.45 : viewport.isTablet ? 0.7 : 1;
  }

  const isReducedMotion = () => motion.reduced;
  const allowsPointerEffects = () => !motion.reduced && viewport.finePointer && !viewport.isMobile;

  function runScrollUpdaters() {
    scrollState.ticking = false;
    scrollState.y = scrollTop();
    if (scrollState.y !== scrollState.lastY) {
      scrollState.direction = scrollState.y > scrollState.lastY ? 1 : -1;
    }
    runRegistry(registry.scrollUpdaters, scrollState.y);
    scrollState.lastY = scrollState.y;
  }

  function requestTick() {
    if (!scrollState.ticking) {
      scrollState.ticking = true;
      raf(runScrollUpdaters);
    }
  }

  function measureAll() {
    readViewport();
    runRegistry(registry.measurers);
    requestTick();
  }

  /* ======================================================================
     04 PAGE LOADER
     ====================================================================== */

  function initLoader() {
    body.classList.remove('no-js');
    body.classList.add('js-enabled');

    const loader = dom.intro;
    if (!loader) { return; }

    let finished = false;
    const finish = () => {
      if (finished) { return; }
      finished = true;
      loader.classList.add('is-done', 'loaded');
      loader.setAttribute('aria-hidden', 'true');
      body.classList.add('is-loaded');
      window.setTimeout(() => { loader.style.display = 'none'; }, 1000);
    };

    if (dom.introSkip) { dom.introSkip.addEventListener('click', finish); }
    if (isReducedMotion()) { finish(); return; }

    const duration = 900;
    const start = now();
    const step = (time) => {
      if (finished) { return; }
      const p = clamp((time - start) / duration, 0, 1);
      const eased = easeOutCubic(p);
      setVar(loader, '--intro-progress', eased.toFixed(3));
      if (dom.introCounter) { dom.introCounter.textContent = pad(Math.round(eased * 100)); }
      if (p < 1) { raf(step); } else { finish(); }
    };
    raf(step);
    window.setTimeout(finish, 1400); /* hard ceiling */
  }

  /* ======================================================================
     05 NAVIGATION · smooth in-page scrolling
     ====================================================================== */

  function initNavigation() {
    const TOP_HASHES = { '#top': true, '#hero': true, '#home': true };
    const headerOffset = () => (dom.header ? dom.header.offsetHeight : 0) + 8;

    function resolveHash(hash) {
      if (!hash || hash.length < 2) { return null; }
      const element = document.getElementById(hash.slice(1));
      if (TOP_HASHES[hash]) { return { top: 0, element }; }
      for (let i = 0; i < registry.anchorResolvers.length; i += 1) {
        const resolved = registry.anchorResolvers[i](hash);
        if (typeof resolved === 'number') { return { top: Math.max(0, resolved), element }; }
      }
      if (!element) { return null; }
      return { top: Math.max(0, docTop(element) - headerOffset()), element };
    }

    function scrollToPosition(top) {
      const behavior = isReducedMotion() || !supportsSmoothScroll ? 'auto' : 'smooth';
      try { window.scrollTo({ top, behavior }); } catch (error) { window.scrollTo(0, top); }
    }

    function focusTarget(element) {
      if (!element) { return; }
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
        element.addEventListener('blur', function onBlur() {
          element.removeAttribute('tabindex');
          element.removeEventListener('blur', onBlur);
        });
      }
      try { element.focus({ preventScroll: true }); } catch (error) { /* optional */ }
    }

    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }
      const link = event.target && event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (!link) { return; }
      const hash = link.getAttribute('href');
      const target = resolveHash(hash);
      if (!target) { return; }
      event.preventDefault();
      scrollToPosition(target.top);
      try { history.pushState(null, '', hash); } catch (error) { /* optional */ }
      focusTarget(target.element);
    });

    /* Deep links into the sticky skill stage need a computed position. */
    window.addEventListener('load', () => {
      const hash = window.location.hash;
      if (!hash) { return; }
      for (let i = 0; i < registry.anchorResolvers.length; i += 1) {
        const resolved = registry.anchorResolvers[i](hash);
        if (typeof resolved === 'number') { window.scrollTo(0, Math.max(0, resolved)); return; }
      }
    });
  }

  /* ======================================================================
     06 MOBILE MENU
     ====================================================================== */

  function initMobileMenu() {
    const toggle = dom.navToggle;
    const menu = dom.navMenu;
    if (!toggle || !menu) { return; }

    let isOpen = false;
    const setMenu = (open) => {
      isOpen = open;
      menu.classList.toggle('is-open', open);
      menu.classList.toggle('open', open);
      body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (dom.navToggleText) { dom.navToggleText.textContent = open ? 'Close' : 'Menu'; }
    };

    toggle.addEventListener('click', () => setMenu(!isOpen));
    menu.addEventListener('click', (event) => {
      if (isOpen && event.target && event.target.closest && event.target.closest('a')) { setMenu(false); }
    });
    document.addEventListener('keydown', (event) => {
      if ((event.key === 'Escape' || event.key === 'Esc') && isOpen) { setMenu(false); toggle.focus(); }
    });
    document.addEventListener('click', (event) => {
      if (isOpen && !menu.contains(event.target) && !toggle.contains(event.target)) { setMenu(false); }
    });
    onMeasure(() => { if (isOpen && viewport.width > 768) { setMenu(false); } });
  }

  /* ======================================================================
     07 THEME TOGGLE
     ====================================================================== */

  function initTheme() {
    const KEY = 'dk-portfolio-theme';
    const toggle = dom.themeToggle;
    const read = () => { try { return window.localStorage.getItem(KEY); } catch (error) { return null; } };
    const write = (v) => { try { window.localStorage.setItem(KEY, v); } catch (error) { /* optional */ } };

    const apply = (theme) => {
      root.setAttribute('data-theme', theme);
      if (toggle) { toggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false'); }
      if (dom.themeMeta) { dom.themeMeta.setAttribute('content', theme === 'light' ? '#f3eee5' : '#0c0b0a'); }
    };

    const stored = read();
    apply(stored === 'light' || stored === 'dark' ? stored : root.getAttribute('data-theme') || 'dark');
    if (!toggle) { return; }
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next);
      write(next);
    });
  }

  /* ======================================================================
     08 SCROLL PROGRESS  +  header state
     ====================================================================== */

  function initScrollProgress() {
    const bar = dom.progressBar;
    const usesWidth = bar && !bar.hasAttribute('data-scroll-progress');
    let last = -1;
    onScroll((y) => {
      const p = clamp(y / Math.max(1, viewport.docHeight - viewport.height), 0, 1);
      if (Math.abs(p - last) < 0.0005) { return; }
      last = p;
      setVar(root, '--scroll-progress', p.toFixed(4));
      if (usesWidth) { bar.style.width = (p * 100).toFixed(2) + '%'; }
    });
  }

  function initHeaderState() {
    const header = dom.header;
    if (!header) { return; }
    let scrolled = false;
    onScroll((y) => {
      const next = y > 24;
      if (next === scrolled) { return; }
      scrolled = next;
      header.classList.toggle('is-scrolled', scrolled);
      header.classList.toggle('scrolled', scrolled);
    });
  }

  /* ======================================================================
     09 ACTIVE NAVIGATION
     ====================================================================== */

  function initActiveNavigation() {
    const links = dom.navLinks;
    if (!links.length) { return; }

    const MAP = {
      hero: 'hero', home: 'hero', top: 'hero', about: 'about', skills: 'skills',
      'skill-experience': 'skills', projects: 'projects', proof: 'proof',
      education: 'education', direction: 'education', contact: 'contact'
    };
    const keyOf = (raw) => (raw ? MAP[String(raw).replace('#', '').trim()] || null : null);

    const linkMap = {};
    links.forEach((link) => {
      const key = keyOf(link.getAttribute('data-nav-link') || link.getAttribute('href'));
      if (key) { (linkMap[key] = linkMap[key] || []).push(link); }
    });

    const sections = dom.sections.filter((s) => keyOf(s.getAttribute('data-section') || s.id));
    if (!sections.length) { return; }

    let current = null;
    const setActive = (key) => {
      if (!key || key === current) { return; }
      current = key;
      links.forEach((l) => { l.classList.remove('is-active', 'active'); l.removeAttribute('aria-current'); });
      (linkMap[key] || []).forEach((l) => { l.classList.add('is-active', 'active'); l.setAttribute('aria-current', 'true'); });
    };

    if (supportsIO) {
      try {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) { setActive(keyOf(entry.target.getAttribute('data-section') || entry.target.id)); }
          });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        sections.forEach((s) => io.observe(s));
        return;
      } catch (error) { /* fall through */ }
    }

    let positions = [];
    onMeasure(() => {
      positions = sections.map((s) => ({ key: keyOf(s.getAttribute('data-section') || s.id), top: docTop(s) }));
    });
    onScroll((y) => {
      const line = y + viewport.height * 0.45;
      let key = positions.length ? positions[0].key : null;
      positions.forEach((p) => { if (p.top <= line) { key = p.key; } });
      setActive(key);
    });
  }

  /* ======================================================================
     10 SCROLL REVEAL  (+ counters, timeline rail)
     Elements are visible by default; this only adds .is-visible.
     ====================================================================== */

  function initReveal() {
    const items = dom.reveals;
    if (!items.length) { return; }
    const revealAll = () => items.forEach((el) => el.classList.add('is-visible'));

    if (isReducedMotion() || !supportsIO) { revealAll(); return; }
    onMotionChange((reduced) => { if (reduced) { revealAll(); } });

    try {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      items.forEach((el) => io.observe(el));

      /* Safety net: anything near the viewport is revealed after 4s regardless. */
      window.setTimeout(() => {
        const limit = viewport.height * 1.5;
        items.forEach((el) => {
          if (!el.classList.contains('is-visible') && el.getBoundingClientRect().top < limit) { el.classList.add('is-visible'); }
        });
      }, 4000);
    } catch (error) { revealAll(); }
  }

  function initCounters() {
    const items = dom.counters;
    if (!items.length || isReducedMotion() || !supportsIO) { return; }

    const animate = (el) => {
      const target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) { return; }
      const suffix = el.getAttribute('data-suffix') || '';
      const padded = el.getAttribute('data-format') === 'pad';
      const start = now();
      const step = (time) => {
        const p = clamp((time - start) / 1100, 0, 1);
        const v = Math.round(easeOutCubic(p) * target);
        el.textContent = (padded ? pad(v) : String(v)) + suffix;
        if (p < 1) { raf(step); }
      };
      raf(step);
    };

    try {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => { if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); } });
      }, { threshold: 0.4 });
      items.forEach((el) => io.observe(el));
    } catch (error) { /* static values remain */ }
  }

  function initTimelineProgress() {
    const timeline = dom.timeline;
    if (!timeline) { return; }
    let top = 0, height = 1, last = -1;
    onMeasure(() => { top = docTop(timeline); height = Math.max(1, timeline.offsetHeight); });
    onScroll((y) => {
      const p = isReducedMotion() ? 1 : clamp((y + viewport.height * 0.72 - top) / height, 0, 1);
      const value = Math.round(p * 1000) / 10;
      if (value === last) { return; }
      last = value;
      setVar(timeline, '--timeline-progress', value + '%');
    });
  }

  /* ======================================================================
     11 HERO PARALLAX  +  12 HERO 3D OBJECT
     Pointer, scroll and a slow deterministic sway merge into one render
     that writes only the CSS variables the stylesheet consumes.
     ====================================================================== */

  function initHero() {
    const hero = dom.hero;
    const object = dom.heroObject;
    if (!hero || !object) { return; }
    const stage = dom.heroStage;
    const content = dom.heroContent;

    const BASE_RX = -18, BASE_RY = 32;
    const VARS = ['--rotate-x', '--rotate-y', '--rotate-z', '--translate-x', '--translate-y', '--translate-z', '--object-scale'];
    const state = { progress: 0, px: 0, py: 0, sway: 0, height: 1, inView: true, swaying: false, lastRot: null, lastDepth: null };

    onMeasure(() => { state.height = Math.max(1, hero.offsetHeight); });

    function render() {
      if (isReducedMotion()) { return; }
      const depth = viewport.depthScale;
      const eased = smoothstep(state.progress);
      const px = allowsPointerEffects() ? state.px : 0;
      const py = allowsPointerEffects() ? state.py : 0;

      /* Scroll: the object rotates, drifts down, recedes in Z and zooms out. */
      const rx = BASE_RX + py * -8 * depth + eased * 14 + Math.sin(state.sway * 0.7) * 2;
      const ry = BASE_RY + px * 12 * depth + eased * 62 + Math.sin(state.sway) * 4;
      const rz = eased * -6;
      const tx = px * 18 * depth;
      const ty = py * 12 * depth + eased * 90 * depth;
      const tz = eased * -460 * depth;
      const scale = 1 - eased * 0.2;

      const s = object.style;
      s.setProperty('--rotate-x', rx.toFixed(2) + 'deg');
      s.setProperty('--rotate-y', ry.toFixed(2) + 'deg');
      s.setProperty('--rotate-z', rz.toFixed(2) + 'deg');
      s.setProperty('--translate-x', tx.toFixed(1) + 'px');
      s.setProperty('--translate-y', ty.toFixed(1) + 'px');
      s.setProperty('--translate-z', tz.toFixed(1) + 'px');
      s.setProperty('--object-scale', scale.toFixed(3));

      if (stage) { stage.style.opacity = clamp(1 - eased * 1.15, 0, 1).toFixed(3); }
      if (content) {
        content.style.transform = 'translate3d(0, ' + (-eased * 90).toFixed(1) + 'px, 0)';
        content.style.opacity = clamp(1 - eased * 1.25, 0, 1).toFixed(3);
      }
      setVar(hero, '--parallax-x', (px * 20).toFixed(2));
      setVar(hero, '--parallax-y', (py * 20).toFixed(2));

      const rot = pad3(Math.round(((ry % 360) + 360) % 360));
      if (dom.readoutRotation && rot !== state.lastRot) { state.lastRot = rot; dom.readoutRotation.textContent = rot + '°'; }
      const dep = state.progress.toFixed(2);
      if (dom.readoutDepth && dep !== state.lastDepth) { state.lastDepth = dep; dom.readoutDepth.textContent = dep; }
    }

    /* Slow sway loop · only while the hero is on screen and the tab is visible. */
    function swayFrame() {
      if (!state.inView || pageState.hidden || isReducedMotion()) { state.swaying = false; return; }
      state.sway += 0.008;
      render();
      raf(swayFrame);
    }
    function startSway() {
      if (state.swaying) { return; }
      state.swaying = true;
      raf(swayFrame);
    }

    onScroll((y) => {
      const inView = y < state.height * 1.1;
      if (!inView && !state.inView) { return; }
      state.inView = inView;
      state.progress = clamp(y / (state.height * 0.85), 0, 1);
      render();
      if (inView) { startSway(); }
    });

    onPointer((x, y) => { if (state.inView) { state.px = x; state.py = y; render(); } });
    onVisibility((visible) => { if (visible) { startSway(); } });
    onMotionChange((reduced) => {
      if (reduced) {
        VARS.forEach((v) => object.style.removeProperty(v));
        if (stage) { stage.style.opacity = ''; }
        if (content) { content.style.transform = ''; content.style.opacity = ''; }
      } else { render(); startSway(); }
    });

    render();
    startSway();
  }

  /* ======================================================================
     13 3D SKILL EXPERIENCE
     Scroll position → camera position. Each scene gets a signed distance d
     from the camera: d > 0 waits deep in Z, d = 0 is in focus (zoomed),
     d < 0 has flown past the viewer. Written as CSS variables only.
     ====================================================================== */

  function initSkillExperience() {
    const track = dom.skillTrack;
    const stage = dom.skillStage;
    const scenes = dom.skillScenes;
    if (!track || !stage || scenes.length < 2) { return; }

    const count = scenes.length;
    setVar(root, '--skill-count', String(count));

    const items = scenes.map((scene, index) => ({
      scene, index,
      active: scene.classList.contains('is-active'),
      past: false,
      lastOpacity: -1
    }));
    const geometry = { top: 0, height: 0, range: 1 };
    let currentIndex = -1, inRange = false, everRendered = false;

    onMeasure(() => {
      geometry.top = docTop(track);
      geometry.height = track.offsetHeight;
      geometry.range = Math.max(1, geometry.height - viewport.height);
    });

    function setCurrent(index) {
      if (index === currentIndex) { return; }
      currentIndex = index;
      if (dom.skillCurrent) { dom.skillCurrent.textContent = pad(index + 1); }
      dom.skillDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      dom.skillIndexItems.forEach((item, i) => item.classList.toggle('is-active', i === index));
    }

    function renderScene(item, d) {
      const depth = viewport.depthScale;
      const a = Math.abs(d);
      const upcoming = d > 0;
      const z = upcoming ? -1400 * Math.min(d, 2) * depth : 900 * Math.min(a, 2) * depth;
      const y = upcoming ? 30 * Math.min(d, 1.5) * depth : -60 * Math.min(a, 1.5) * depth;
      const scale = upcoming ? 1 - 0.08 * Math.min(d, 1.5) : 1 + 0.1 * Math.min(a, 1.5);
      const opacity = smoothstep(clamp(1 - a * 1.25, 0, 1));

      if (opacity === 0 && item.lastOpacity === 0) { return; }
      item.lastOpacity = opacity;

      const s = item.scene.style;
      s.setProperty('--scene-z', z.toFixed(1));
      s.setProperty('--scene-y', y.toFixed(1));
      s.setProperty('--scene-scale', scale.toFixed(3));
      s.setProperty('--scene-opacity', opacity.toFixed(3));
      s.setProperty('--skill-progress', clamp(0.5 - d * 0.5, 0, 1).toFixed(3));
      s.setProperty('--skill-z', z.toFixed(1));
      s.setProperty('--skill-scale', scale.toFixed(3));
      s.setProperty('--skill-opacity', opacity.toFixed(3));

      const active = a < 0.5;
      const past = d < -0.5;
      if (active !== item.active) { item.active = active; item.scene.classList.toggle('is-active', active); }
      if (past !== item.past) { item.past = past; item.scene.classList.toggle('is-past', past); }
    }

    onScroll((y) => {
      if (isReducedMotion()) { return; }
      const vh = viewport.height;
      const visible = y + vh >= geometry.top - vh * 0.5 && y <= geometry.top + geometry.height + vh * 0.5;
      if (!visible && !inRange && everRendered) { return; }
      inRange = visible;
      everRendered = true;

      const p = clamp((y - geometry.top) / geometry.range, 0, 1);
      const centered = clamp(p * count - 0.5, 0, count - 1);
      setVar(stage, '--scene-progress', p.toFixed(4));
      stage.classList.add('is-scrubbing');
      items.forEach((item) => renderScene(item, item.index - centered));
      setCurrent(Math.round(centered));
    });

    /* Pointer nudges the camera while the stage is on screen. */
    onPointer((x, y) => {
      if (!inRange || !dom.skillCamera) { return; }
      setVar(dom.skillCamera, '--rotation-y', (x * 2.5).toFixed(2));
      setVar(dom.skillCamera, '--rotation-x', (-y * 2).toFixed(2));
      setVar(dom.skillCamera, '--camera-x', (x * -14).toFixed(1));
      setVar(stage, '--parallax-x', (x * 20).toFixed(1));
      setVar(stage, '--parallax-y', (y * 20).toFixed(1));
    });

    /* Anchor links to #skill-* scroll to the position where that scene is in focus. */
    addAnchorResolver((hash) => {
      const id = hash.slice(1);
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].scene.id === id) {
          return geometry.top + ((i + 0.5) / count) * geometry.range;
        }
      }
      return null;
    });

    onMotionChange((reduced) => {
      if (reduced) {
        items.forEach((item) => { item.scene.style.cssText = ''; item.lastOpacity = -1; });
        stage.classList.remove('is-scrubbing');
      }
    });
  }

  /* ======================================================================
     14 PROJECT FILTERS
     ====================================================================== */

  function initProjectFilters() {
    const buttons = dom.filterButtons;
    const cards = dom.projects;
    if (!buttons.length || !cards.length) { return; }

    const timers = [];
    const duration = isReducedMotion() ? 0 : 340;
    const categoriesOf = (card) => (card.getAttribute('data-category') || '').toLowerCase().split(/[\s,]+/);

    function show(card, i) {
      window.clearTimeout(timers[i]);
      card.classList.remove('is-hidden');
      card.style.display = '';
      raf(() => raf(() => card.classList.remove('is-filtered')));
    }

    function hide(card, i) {
      window.clearTimeout(timers[i]);
      card.classList.add('is-filtered');
      timers[i] = window.setTimeout(() => {
        card.classList.add('is-hidden');
        card.style.display = 'none';
      }, duration);
    }

    function applyFilter(key) {
      let shown = 0;
      cards.forEach((card, i) => {
        const match = key === 'all' || categoriesOf(card).indexOf(key) !== -1;
        if (match) { shown += 1; show(card, i); } else { hide(card, i); }
      });
      buttons.forEach((button) => {
        const active = (button.getAttribute('data-filter') || 'all').toLowerCase() === key;
        button.classList.toggle('is-active', active);
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (dom.filterStatus) {
        dom.filterStatus.textContent = key === 'all'
          ? 'Showing all ' + cards.length + ' projects'
          : 'Showing ' + shown + ' of ' + cards.length + ' projects';
      }
      window.setTimeout(measureAll, duration + 50);
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => applyFilter((button.getAttribute('data-filter') || 'all').toLowerCase()));
    });
  }

  /* ======================================================================
     15 PROJECT INTERACTIONS
     Scroll drives --project-progress (cards rise out of depth); pointer
     drives --tilt-x / --tilt-y (subtle 3D tilt, desktop only).
     ====================================================================== */

  function initProjectInteractions() {
    const cards = dom.projects;
    if (!cards.length) { return; }

    const items = cards.map((card) => ({
      card,
      visual: $('.project-visual, [data-tilt]', card),
      featured: card.classList.contains('project--featured') || card.classList.contains('project-featured'),
      top: 0, height: 0, lastProgress: -1, rect: null, pending: false, tx: 0, ty: 0
    }));

    onMeasure(() => items.forEach((it) => { it.top = docTop(it.card); it.height = it.card.offsetHeight; }));

    onScroll((y) => {
      const vh = viewport.height;
      items.forEach((it) => {
        if (it.card.style.display === 'none') { return; }
        const rel = it.top - y;
        if (rel > vh * 1.5 && it.lastProgress === 0) { return; }
        const progress = isReducedMotion() ? 1 : smoothstep(clamp((vh * 0.92 - rel) / (vh * 0.45), 0, 1));
        const rounded = Math.round(progress * 200) / 200;
        if (rounded === it.lastProgress) { return; }
        it.lastProgress = rounded;
        setVar(it.card, '--project-progress', rounded.toFixed(3));
      });
    });

    items.forEach((it) => {
      if (!it.visual) { return; }
      const maxTilt = it.featured ? 5 : 6;

      const render = () => {
        it.pending = false;
        setVar(it.card, '--tilt-x', (it.tx * maxTilt).toFixed(2));
        setVar(it.card, '--tilt-y', (it.ty * maxTilt).toFixed(2));
      };

      it.card.addEventListener('pointerenter', () => {
        if (!allowsPointerEffects()) { return; }
        it.rect = it.visual.getBoundingClientRect();
      });

      it.card.addEventListener('pointermove', (event) => {
        if (!allowsPointerEffects() || event.pointerType === 'touch') { return; }
        if (!it.rect) { it.rect = it.visual.getBoundingClientRect(); }
        it.tx = clamp(((event.clientX - it.rect.left) / it.rect.width) * 2 - 1, -1, 1);
        it.ty = clamp(((event.clientY - it.rect.top) / it.rect.height) * 2 - 1, -1, 1);
        if (!it.pending) { it.pending = true; raf(render); }
      }, { passive: true });

      it.card.addEventListener('pointerleave', () => {
        it.rect = null;
        it.tx = 0;
        it.ty = 0;
        if (!it.pending) { it.pending = true; raf(render); }
      });
    });
  }

  /* ======================================================================
     16 MOUSE / POINTER INTERACTION · one eased loop feeds every subscriber
     ====================================================================== */

  function initPointer() {
    const state = { x: 0, y: 0, tx: 0, ty: 0, running: false };
    const cursor = dom.cursor;

    function frame() {
      state.x = lerp(state.x, state.tx, 0.08);
      state.y = lerp(state.y, state.ty, 0.08);
      const settled = Math.abs(state.tx - state.x) < 0.0005 && Math.abs(state.ty - state.y) < 0.0005;
      if (settled) { state.x = state.tx; state.y = state.ty; }
      runRegistry(registry.pointerUpdaters, state.x, state.y);
      if (settled || pageState.hidden) { state.running = false; return; }
      raf(frame);
    }

    function start() {
      if (state.running) { return; }
      state.running = true;
      raf(frame);
    }

    function onMove(event) {
      if (!allowsPointerEffects() || (event.pointerType && event.pointerType !== 'mouse')) { return; }
      state.tx = clamp((event.clientX / Math.max(1, viewport.width)) * 2 - 1, -1, 1);
      state.ty = clamp((event.clientY / Math.max(1, viewport.height)) * 2 - 1, -1, 1);
      if (cursor) {
        cursor.style.setProperty('--cursor-x', event.clientX + 'px');
        cursor.style.setProperty('--cursor-y', event.clientY + 'px');
        cursor.classList.add('is-visible');
      }
      start();
    }

    window.addEventListener('PointerEvent' in window ? 'pointermove' : 'mousemove', onMove, { passive: true });

    if (cursor) {
      document.addEventListener('pointerover', (event) => {
        const target = event.target && event.target.closest ? event.target.closest('a, button, [data-magnetic]') : null;
        cursor.classList.toggle('is-hover', Boolean(target));
      }, { passive: true });
      document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    }

    onMotionChange((reduced) => { if (reduced) { state.tx = 0; state.ty = 0; start(); } });
    onVisibility((visible) => { if (visible) { start(); } });
  }

  /* ======================================================================
     17 RESIZE HANDLING
     ====================================================================== */

  function initResizeHandling() {
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => raf(measureAll), 150);
    };
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule);
    window.addEventListener('load', () => { measureAll(); window.setTimeout(measureAll, 600); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureAll).catch(() => { /* optional */ });
    }
  }

  /* ======================================================================
     18 REDUCED MOTION
     ====================================================================== */

  function initMotionPreference() {
    if (!window.matchMedia) { return; }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    motion.reduced = query.matches;
    root.classList.toggle('reduced-motion', motion.reduced);

    const onChange = (event) => {
      motion.reduced = event.matches;
      root.classList.toggle('reduced-motion', motion.reduced);
      runRegistry(registry.motionHandlers, motion.reduced);
      measureAll();
    };
    if (query.addEventListener) { query.addEventListener('change', onChange); }
    else if (query.addListener) { query.addListener(onChange); }
  }

  /* ======================================================================
     19 PERFORMANCE · passive scroll listener, tab visibility
     ====================================================================== */

  function initScrollEngine() {
    window.addEventListener('scroll', requestTick, { passive: true });
  }

  function initVisibility() {
    document.addEventListener('visibilitychange', () => {
      pageState.hidden = document.hidden === true;
      if (!pageState.hidden) { measureAll(); }
      runRegistry(registry.visibilityHandlers, !pageState.hidden);
    });
  }

  /* ======================================================================
     20 FINAL INITIALIZATION
     ====================================================================== */

  function boot() {
    readViewport();
    safe('motion preference', initMotionPreference);
    safe('loader', initLoader);
    safe('navigation', initNavigation);
    safe('mobile menu', initMobileMenu);
    safe('theme', initTheme);
    safe('scroll progress', initScrollProgress);
    safe('header state', initHeaderState);
    safe('active navigation', initActiveNavigation);
    safe('reveal', initReveal);
    safe('counters', initCounters);
    safe('timeline', initTimelineProgress);
    safe('hero', initHero);
    safe('skill experience', initSkillExperience);
    safe('project filters', initProjectFilters);
    safe('project interactions', initProjectInteractions);
    safe('pointer', initPointer);
    safe('resize', initResizeHandling);
    safe('visibility', initVisibility);
    safe('scroll engine', initScrollEngine);
    measureAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
