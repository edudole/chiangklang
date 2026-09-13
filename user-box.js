(() => {
  'use strict';

  const WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbxwqpydnQSx2aPrQ8yJAN3P9Jkjic-8nNIlOHYFRyarrtTyb26sE_USzXNS7uk478wh8w/exec';
  const API_URL = WEB_APP_URL + '?mode=usercards';
  let users = [];
  let currentIndex = 0;
  let autoSlideTimer = null;
  let autoSlidePaused = false;
  const AUTO_SLIDE_DELAY = 3000;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function visibleCount() {
    if (window.innerWidth <= 460) return 1;
    if (window.innerWidth <= 720) return 2;
    if (window.innerWidth <= 1000) return 3;
    return 4;
  }

  function updateSlider() {
    const track = document.getElementById('userBoxTrack');
    const prev = document.getElementById('userBoxPrev');
    const next = document.getElementById('userBoxNext');
    if (!track || !prev || !next) return;

    const card = track.querySelector('.user-box-card');
    const maxIndex = Math.max(0, users.length - visibleCount());
    currentIndex = Math.min(currentIndex, maxIndex);
    const gap = 18;
    const step = card ? card.getBoundingClientRect().width + gap : 0;
    track.style.transform = `translateX(-${currentIndex * step}px)`;
    prev.disabled = currentIndex <= 0;
    next.disabled = currentIndex >= maxIndex;
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  function startAutoSlide() {
    stopAutoSlide();

    if (autoSlidePaused || document.hidden || users.length <= visibleCount()) return;

    autoSlideTimer = setInterval(() => {
      const maxIndex = Math.max(0, users.length - visibleCount());
      currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      updateSlider();
    }, AUTO_SLIDE_DELAY);
  }

  function restartAutoSlide() {
    startAutoSlide();
  }

  function renderUsers() {
    const track = document.getElementById('userBoxTrack');
    if (!track) return;

    if (!users.length) {
      track.innerHTML = '<div class="user-box-empty">ยังไม่มีรายการ User</div>';
      updateSlider();
      return;
    }

    track.innerHTML = users.map(user => `
      <a class="user-box-card" href="user_all.html" aria-label="ดูรายการ User ทั้งหมด">
        <div class="user-box-photo-wrap">
          <img class="user-box-photo" src="${escapeHtml(user.photo || '')}"
               alt="${escapeHtml(user.username || 'User')}" loading="lazy">
          <span class="user-box-login-count">เข้าใช้ ${Number(user.loginCount || 0)} ครั้ง</span>
        </div>
        <div class="user-box-body">
          <h3 class="user-box-name">${escapeHtml(user.organization || user.username || 'User')}</h3>
          <p class="user-box-position">${escapeHtml(user.position || '')}</p>
          <div class="user-box-pills">
            <span class="user-box-pill primary">ประถม ${Number(user.primaryCount || 0)}</span>
            <span class="user-box-pill middle">ม.ต้น ${Number(user.middleCount || 0)}</span>
            <span class="user-box-pill high">ม.ปลาย ${Number(user.highCount || 0)}</span>
          </div>
        </div>
      </a>`).join('');

    requestAnimationFrame(() => {
      updateSlider();
      startAutoSlide();
    });
  }

  async function loadUsers() {
    const track = document.getElementById('userBoxTrack');
    if (!track) return;

    try {
      let result;
      if (window.SiteFast) {
        result = await window.SiteFast.fetchMode('usercards', {}, { key: 'usercards-v1', ttl: 180000 });
      } else {
        const response = await fetch(API_URL, { cache: 'default' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        result = await response.json();
      }
      if (result.success === false) throw new Error(result.message || 'โหลดข้อมูลไม่สำเร็จ');
      users = Array.isArray(result.users) ? result.users : [];
      renderUsers();
    } catch (error) {
      console.error('โหลด User Box ไม่สำเร็จ:', error);
      track.innerHTML = '<div class="user-box-empty">โหลดรายการ User ไม่สำเร็จ</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('userBoxSlider');

    slider?.addEventListener('mouseenter', () => {
      autoSlidePaused = true;
      stopAutoSlide();
    });
    slider?.addEventListener('mouseleave', () => {
      autoSlidePaused = false;
      startAutoSlide();
    });
    slider?.addEventListener('touchstart', () => {
      autoSlidePaused = true;
      stopAutoSlide();
    }, { passive: true });
    slider?.addEventListener('touchend', () => {
      autoSlidePaused = false;
      startAutoSlide();
    }, { passive: true });

    document.getElementById('userBox')?.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      window.location.href = 'user_all.html';
    });
    document.getElementById('userBoxPrev')?.addEventListener('click', event => {
      event.stopPropagation();
      currentIndex = Math.max(0, currentIndex - 1);
      updateSlider();
      restartAutoSlide();
    });
    document.getElementById('userBoxNext')?.addEventListener('click', event => {
      event.stopPropagation();
      currentIndex = Math.min(Math.max(0, users.length - visibleCount()), currentIndex + 1);
      updateSlider();
      restartAutoSlide();
    });
    window.addEventListener('resize', () => {
      updateSlider();
      restartAutoSlide();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoSlide();
      else startAutoSlide();
    });
    if (window.SiteFast) window.SiteFast.whenNear('userBox', loadUsers);
    else loadUsers();
  });
})();
