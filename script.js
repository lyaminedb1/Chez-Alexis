/* ============================================
   CHEZ ALEXIS — Interactions
   ============================================ */

// Nav scroll behavior
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('nav--scrolled', window.scrollY > 40);
}, { passive: true });

// Mobile burger menu
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
burger.addEventListener('click', () => {
  mobileMenu.classList.toggle('is-open');
});
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('is-open'));
});

// Smooth reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.product-card, .review-card, .about__stat, .press-badge, .visit__detail').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s`;
  observer.observe(el);
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.is-visible, [style*="opacity"]').forEach(el => {
    el.addEventListener('transitionend', () => {
      el.style.willChange = 'auto';
    }, { once: true });
  });
});

// IntersectionObserver visible callback
const visibleObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.product-card, .review-card, .about__stat, .press-badge, .visit__detail').forEach(el => {
  visibleObserver.observe(el);
});

// Map iframe fallback (show fallback div if iframe fails)
const iframe = document.querySelector('.visit__map iframe');
const fallback = document.querySelector('.visit__map-fallback');
if (iframe && fallback) {
  iframe.addEventListener('error', () => {
    iframe.style.display = 'none';
    fallback.style.display = 'flex';
  });
  // Check if iframe loaded properly after timeout
  setTimeout(() => {
    try {
      if (!iframe.contentDocument && !iframe.contentWindow) {
        iframe.style.display = 'none';
        fallback.style.display = 'flex';
      }
    } catch (e) {
      // Cross-origin — iframe loaded fine, keep it
    }
  }, 3000);
  // Hide fallback initially
  fallback.style.display = 'none';
}
