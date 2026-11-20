/* Garden Table — small behaviours on top of Bootstrap 5.3 (no other libraries) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TZ = 'Europe/Bucharest';
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ---------- Navigation ---------- */
  var nav = document.getElementById('mainNav');
  var navMenu = document.getElementById('navMenu');

  // Close the mobile menu after a link is chosen
  navMenu.addEventListener('click', function (event) {
    if (event.target.closest('a') && navMenu.classList.contains('show')) {
      bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
    }
  });

  // Underline the section currently on screen
  var navLinks = {};
  nav.querySelectorAll('.nav-link[href^="#"]').forEach(function (link) {
    navLinks[link.getAttribute('href').slice(1)] = link;
  });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = navLinks[entry.target.id];
        if (!link) { return; }
        link.classList.toggle('active', entry.isIntersecting);
        if (entry.isIntersecting) { link.setAttribute('aria-current', 'true'); }
        else { link.removeAttribute('aria-current'); }
      });
    }, { rootMargin: '-45% 0px -55% 0px', threshold: 0 });
    Object.keys(navLinks).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) { spy.observe(section); }
    });
  }

  /* ---------- Clock: always Cluj time, whatever the visitor's time zone ---------- */
  function clujNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, hourCycle: 'h23', weekday: 'short',
      hour: 'numeric', minute: 'numeric'
    }).formatToParts(new Date());
    var p = {};
    parts.forEach(function (part) { p[part.type] = part.value; });
    var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[p.weekday], minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10) };
  }

  // What the kitchen is doing at a given minute of the day
  function servingAt(minutes) {
    var h = function (hh, mm) { return hh * 60 + (mm || 0); };
    if (minutes < h(8) || minutes >= h(22)) {
      return { meal: 'breakfast', closed: true, label: 'Closed now', title: 'Back at 8:00', until: 'with breakfast', pill: 'Next' };
    }
    if (minutes < h(11, 30)) { return { meal: 'breakfast', label: 'Now serving', title: 'Breakfast', until: 'until 11:30', pill: 'Now' }; }
    if (minutes < h(12)) { return { meal: 'dessert', label: 'Now serving', title: 'Coffee &amp; cake', until: 'lunch from 12:00', pill: 'Now' }; }
    if (minutes < h(16)) { return { meal: 'lunch', label: 'Now serving', title: 'Lunch', until: 'until 16:00', pill: 'Now' }; }
    if (minutes < h(17)) { return { meal: 'dessert', label: 'Now serving', title: 'Coffee &amp; cake', until: 'dinner from 17:00', pill: 'Now' }; }
    return { meal: 'dinner', label: 'Now serving', title: 'Dinner', until: 'last orders 21:30', pill: 'Now' };
  }

  var now = null;
  try { now = clujNow(); } catch (e) { now = null; }

  /* ---------- "Now serving" stamp and the menu tab that opens first ---------- */
  var tabStrip = document.getElementById('mealTabs');
  function showMealTab(meal) {
    var tab = document.getElementById('tab-' + meal);
    if (!tab) { return; }
    bootstrap.Tab.getOrCreateInstance(tab).show();
    // On phones the tabs scroll sideways: bring the chosen one into view
    if (tabStrip && tabStrip.scrollWidth > tabStrip.clientWidth) {
      tabStrip.scrollLeft = Math.max(0, tab.parentElement.offsetLeft - 20);
    }
  }

  if (now) {
    var serving = servingAt(now.minutes);
    var stamp = document.getElementById('nowStamp');
    document.getElementById('nowLabel').textContent = serving.label;
    document.getElementById('nowMeal').innerHTML = serving.title;
    document.getElementById('nowUntil').textContent = serving.until;
    stamp.setAttribute('aria-label', serving.label + ': ' + stamp.querySelector('.now-meal').textContent + ', ' + serving.until + '. See the menu.');
    stamp.addEventListener('click', function () { showMealTab(serving.meal); });

    // Open the menu on what is being served now and mark that tab
    var currentTab = document.getElementById('tab-' + serving.meal);
    if (currentTab) {
      var pill = document.createElement('span');
      pill.className = 'now-pill';
      pill.textContent = serving.pill;
      currentTab.appendChild(pill);
      if (serving.meal !== 'breakfast') { showMealTab(serving.meal); }
    }
  }

  /* ---------- Lunch of the day carousel: start on today ---------- */
  var carouselEl = document.getElementById('lunchCarousel');
  var lunchNote = document.getElementById('lunchNote');
  if (carouselEl) {
    var startIndex = 0;
    if (now) {
      var weekday = now.day >= 1 && now.day <= 5;
      startIndex = weekday ? now.day - 1 : 0;
      var items = carouselEl.querySelectorAll('.carousel-item');
      var dots = carouselEl.querySelectorAll('.day-tabs [data-bs-slide-to]');
      items.forEach(function (item, i) { item.classList.toggle('active', i === startIndex); });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === startIndex);
        if (i === startIndex) { dot.setAttribute('aria-current', 'true'); } else { dot.removeAttribute('aria-current'); }
        if (weekday && i === startIndex) { dot.classList.add('is-today'); dot.setAttribute('aria-label', DAY_NAMES[now.day] + ', today'); }
      });
      lunchNote.textContent = weekday
        ? 'Today is ' + DAY_NAMES[now.day] + '. The lunch of the day is served from 12:00 until it runs out.'
        : 'It’s the weekend, so we’re cooking from the full menu. This is what’s coming on Monday.';
    }
    new bootstrap.Carousel(carouselEl, { interval: false, ride: false, touch: true, wrap: true });
  }

  /* ---------- Counters: count up once when they scroll into view ---------- */
  var counters = document.querySelectorAll('.counter-value[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window && counters.length) {
    counters.forEach(function (el) { el.textContent = '0'; });
    var counterObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10);
        var start = null;
        var duration = 1200;
        function step(time) {
          if (start === null) { start = time; }
          var progress = Math.min((time - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased);
          if (progress < 1) { window.requestAnimationFrame(step); }
        }
        window.requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ---------- Gallery lightbox (Bootstrap modal) ---------- */
  var lightboxEl = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCaption = document.getElementById('lightboxCaption');
  var BLANK = lightboxImg ? lightboxImg.src : '';

  document.querySelectorAll('.gallery-item').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var thumb = link.querySelector('img');
      lightboxImg.src = link.href;
      lightboxImg.alt = thumb ? thumb.alt : '';
      lightboxCaption.textContent = link.getAttribute('data-caption') || '';
      bootstrap.Modal.getOrCreateInstance(lightboxEl).show();
    });
  });
  if (lightboxEl) {
    lightboxEl.addEventListener('hidden.bs.modal', function () { lightboxImg.src = BLANK; });
  }

  /* ---------- Google Map: only requested when the visitor gets near it ---------- */
  var mapFrame = document.getElementById('mapFrame');
  function loadMap() {
    if (!mapFrame || mapFrame.querySelector('iframe')) { return; }
    var iframe = document.createElement('iframe');
    iframe.src = mapFrame.getAttribute('data-src');
    iframe.title = 'Map showing Garden Table on Strada Moților, Cluj-Napoca';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    mapFrame.appendChild(iframe);
  }
  if (mapFrame) {
    if ('IntersectionObserver' in window) {
      var mapObserver = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          loadMap();
          mapObserver.disconnect();
        }
      }, { rootMargin: '600px 0px' });
      mapObserver.observe(mapFrame);
    } else {
      loadMap();
    }
  }

  /* ---------- Small details ---------- */
  var year = document.getElementById('year');
  if (year) { year.textContent = new Date().getFullYear(); }

  // If a photo ever fails to load, hide the broken-image icon
  document.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'IMG') {
      event.target.classList.add('is-missing');
    }
  }, true);
})();
