const revealDelays = new Map([
  ['003dfcb6-da56-d4f7-cabc-2b826a877f7a', 300],
  ['0171c50e-0dfe-01ef-06c5-a7814906c812', 400],
  ['51787f33-974c-bc1b-8f17-2cbb6a9e2367', 400],
  ['c7e0ae54-40a1-e85f-77eb-b1103b5535d5', 300],
  ['c7d28f30-bafe-cc25-a2af-156337f2c9af', 300],
  ['27418933-bfcc-2b36-4993-7d092c364c1a', 200],
  ['2636640e-810b-f2ff-beaf-482801759116', 200],
  ['45611473-6b22-820b-cfce-1e9e21e50586', 400],
  ['9a756953-d035-63d2-d032-cec57e3554be', 200],
  ['ad911a02-2396-4560-b15c-82c9b3edd87a', 400],
  ['ad911a02-2396-4560-b15c-82c9b3edd87f', 200],
  ['08540b35-714a-23ae-ec0b-868a1c7e9bde', 400],
  ['73f2cd2d-7a36-b3a5-263c-bb32c41c2399', 300],
  ['25017604-f606-5192-8fe9-1d7b4f6098ac', 300],
  ['30fbcbab-8ebc-0e4b-1cc4-ce8798bf5122', 200],
  ['9d99cffc-acb4-4a4a-780d-0087ee5de6c8', 400],
  ['610009ed-9609-79c8-3546-bef105562826', 200],
  ['46ca9630-b2c3-07ae-fc12-59b77a8f2c6b', 300],
  ['61beaf07-c109-0ba8-f099-bcbdb74f2842', 200],
  ['db728a8e-874c-0600-775d-ff629493368b', 300],
  ['b4aa9c36-f65e-89c0-93b3-75ed6177cc61', 300],
  ['8baba7fb-6379-6175-7d38-dc045eeaa379', 200],
  ['82f3b60c-bad3-6190-5776-f68c4109d955', 400],
  ['371a8dc3-b424-9e18-eb3c-5a0632f5083e', 400],
  ['6456cc98-ab6a-5ab4-57c3-4687cd56cd0a', 400],
  ['b1ee3b8c-4c59-774e-9627-7233cd444abe', 300],
  ['b1ee3b8c-4c59-774e-9627-7233cd444ac3', 500],
  ['d0abe76d-9b61-45d0-595d-dd98e4b355db', 300],
  ['d0abe76d-9b61-45d0-595d-dd98e4b355e0', 500],
  ['a09321d0-7e1e-80f7-fffd-7c07eddabfc3', 300],
  ['a09321d0-7e1e-80f7-fffd-7c07eddabfc8', 500],
  ['ef8073b6-03fe-ecfa-633d-03efd28d0544', 300],
  ['ef8073b6-03fe-ecfa-633d-03efd28d0549', 200],
  ['763cdf93-279d-26c5-fb74-f30a3fe3486f', 400],
  ['4ff0eb4e-7d63-95bb-e933-bbf1852386f3', 400],
  ['bcf98495-1e87-146a-2807-cfe0fa379770', 300],
  ['e855650e-fa8c-0c3b-0e5d-6c724f4a9454', 200],
  ['737a9685-00b9-8979-14a1-ab96ce334d1b', 300],
  ['737a9685-00b9-8979-14a1-ab96ce334d20', 500],
  ['737a9685-00b9-8979-14a1-ab96ce334d25', 300],
  ['737a9685-00b9-8979-14a1-ab96ce334d29', 200],
  ['737a9685-00b9-8979-14a1-ab96ce334d2e', 400],
  ['737a9685-00b9-8979-14a1-ab96ce334d36', 300],
]);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function initializeReveals() {
  const items = [...document.querySelectorAll('[data-motion="reveal"]:not(.page-track)')];

  items.forEach((item) => {
    const id = item.getAttribute('data-motion-id');
    item.style.setProperty('--reveal-delay', `${revealDelays.get(id) ?? 0}ms`);
  });

  if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.setAttribute('data-visible', 'true'));
    return;
  }

  const revealVisibleItems = () => {
    items.forEach((item) => {
      if (item.getAttribute('data-visible') === 'true') return;
      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        item.setAttribute('data-visible', 'true');
      }
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-visible', 'true');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px', threshold: 0.1 });

  items.forEach((item) => observer.observe(item));
  window.addEventListener('scroll', revealVisibleItems, { passive: true });
  revealVisibleItems();
}

function initializeSlider(slider) {
  if (slider.dataset.astroSliderInitialized === 'true') return;

  const track = slider.querySelector('.content-slider__viewport');
  const slides = [...slider.querySelectorAll('.content-slider__slide')];
  if (!track || slides.length < 2) return;

  slider.dataset.astroSliderInitialized = 'true';
  const duration = Number(slider.getAttribute('data-slider-duration') ?? 500);
  const delay = Number(slider.getAttribute('data-slider-delay') ?? 4000);
  const infinite = slider.getAttribute('data-infinite') !== 'false';
  const arrowPrevious = slider.querySelector('.content-slider__arrow--previous');
  const arrowNext = slider.querySelector('.content-slider__arrow--next');
  const nav = slider.querySelector('.content-slider__pagination');
  let current = 0;
  let autoplay = 0;
  let pointerStart = null;

  track.style.display = 'flex';
  track.style.overflow = 'hidden';
  track.style.transition = `transform ${duration}ms ease`;
  slides.forEach((slide) => {
    slide.style.flex = '0 0 100%';
    slide.style.width = '100%';
  });

  const dots = slides.map((_, index) => {
    if (!nav) return null;
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'content-slider__dot';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    dot.addEventListener('click', () => goTo(index));
    nav.append(dot);
    return dot;
  });

  function goTo(next) {
    current = infinite ? (next + slides.length) % slides.length : Math.max(0, Math.min(next, slides.length - 1));
    track.style.transform = `translate3d(${-current * 100}%, 0, 0)`;
    slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== current)));
    dots.forEach((dot, index) => {
      if (!dot) return;
      dot.setAttribute('aria-current', String(index === current));
    });
  }

  function moveBy(amount) { goTo(current + amount); }

  function setArrowBehavior(arrow, amount, label) {
    if (!arrow) return;
    arrow.setAttribute('role', 'button');
    arrow.setAttribute('tabindex', '0');
    arrow.setAttribute('aria-label', label);
    arrow.addEventListener('click', () => moveBy(amount));
    arrow.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        moveBy(amount);
      }
    });
  }

  setArrowBehavior(arrowPrevious, -1, 'Previous slide');
  setArrowBehavior(arrowNext, 1, 'Next slide');

  function stopAutoplay() {
    if (autoplay) window.clearInterval(autoplay);
    autoplay = 0;
  }

  function startAutoplay() {
    if (prefersReducedMotion.matches || slider.getAttribute('data-autoplay') !== 'true') return;
    stopAutoplay();
    autoplay = window.setInterval(() => moveBy(1), delay);
  }

  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  slider.addEventListener('focusin', stopAutoplay);
  slider.addEventListener('focusout', startAutoplay);
  track.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
  track.addEventListener('pointerup', (event) => {
    if (pointerStart === null) return;
    const delta = event.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(delta) > 40) moveBy(delta < 0 ? 1 : -1);
  });

  goTo(0);
  startAutoplay();
}

function initializeForms() {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', () => form.classList.add('is-submitted'));
  });
}

function initializePageFrameScroll() {
  const track = document.querySelector('.page-track');
  const camera = track?.querySelector('.page-camera');
  const frame = track?.querySelector('.page-frame');
  if (!(track instanceof HTMLElement) || !(camera instanceof HTMLElement) || !(frame instanceof HTMLElement)) return;

  let frameAnimation = 0;

  const updateFrame = () => {
    frameAnimation = 0;
    if (window.matchMedia('(max-width: 991px)').matches) {
      frame.style.transform = 'none';
      return;
    }

    const trackRect = track.getBoundingClientRect();
    const scrollRange = Math.max(track.offsetHeight - camera.offsetHeight, 1);
    const progress = Math.min(Math.max(-trackRect.top / scrollRange, 0), 1);
    const horizontalProgress = Math.min(progress / 0.6, 1);
    frame.style.transform = `translate3d(${-window.innerWidth * 1.2 * horizontalProgress}px, 0, 0)`;
  };

  const requestFrameUpdate = () => {
    if (frameAnimation) return;
    frameAnimation = window.requestAnimationFrame(updateFrame);
  };

  window.addEventListener('scroll', requestFrameUpdate, { passive: true });
  window.addEventListener('resize', requestFrameUpdate);
  updateFrame();
}

function initializeSite() {
  initializeReveals();
  document.querySelectorAll('.content-slider').forEach(initializeSlider);
  initializeForms();
  initializePageFrameScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSite, { once: true });
} else {
  initializeSite();
}
