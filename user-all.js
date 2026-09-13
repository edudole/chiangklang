(() => {
  'use strict';

  const WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbxwqpydnQSx2aPrQ8yJAN3P9Jkjic-8nNIlOHYFRyarrtTyb26sE_USzXNS7uk478wh8w/exec';
  const API_URL = WEB_APP_URL + '?mode=usercards';
  let allUsers = [];

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const safeUrl = value => /^https?:\/\//i.test(String(value || '').trim())
    ? String(value).trim().replace(/^http:\/\//i, 'https://')
    : '';

  function progressRow(label, value, className) {
    const number = Math.max(0, Math.min(100, Number(value || 0)));
    const text = number === 0 ? 'ไม่มีนักศึกษา' : `${number}%`;
    return `<p>${label} ${text}</p>${number > 0
      ? `<progress class="${className}" value="${number}" max="100"></progress>`
      : ''}`;
  }

  function renderUsers(users) {
    const grid = document.getElementById('usersGrid');
    const count = document.getElementById('userCount');
    if (!grid || !count) return;
    count.textContent = `จำนวน ${users.length} user`;

    if (!users.length) {
      grid.innerHTML = '<div class="users-empty">ไม่พบรายการ User</div>';
      return;
    }

    grid.innerHTML = users.map(user => {
      const photo = safeUrl(user.photo);
      const loginUrl = safeUrl(user.loginUrl);
      return `<article class="user-card">
        <div class="user-card-inner">
          <div class="user-card-photo" style="background-image:url('${escapeHtml(photo)}')">
            <div class="user-login-count">เข้าใช้ ${Number(user.loginCount || 0)} ครั้ง</div>
            <div class="user-code">${escapeHtml(user.username || '')}</div>
          </div>
          <div class="user-card-content">
            <h2 class="user-org">${escapeHtml(user.organization || '')}</h2>
            <p class="user-position">${escapeHtml(user.position || '')}</p>
            <div class="user-count-pills">
              <span class="user-pill primary">ประถม ${Number(user.primaryCount || 0)}</span>
              <span class="user-pill middle">ม.ต้น ${Number(user.middleCount || 0)}</span>
              <span class="user-pill high">ม.ปลาย ${Number(user.highCount || 0)}</span>
            </div>
            <p class="user-complete-title">ความสมบูรณ์ของข้อมูลนักศึกษา</p>
            <div class="user-progress">
              ${progressRow('ประถม', user.primaryComplete, 'progress-primary')}
              ${progressRow('ม.ต้น', user.middleComplete, 'progress-middle')}
              ${progressRow('ม.ปลาย', user.highComplete, 'progress-high')}
            </div>
            ${loginUrl ? `<a class="user-login" href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer">Login</a>` : ''}
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function filterUsers() {
    const keyword = String(document.getElementById('userSearch')?.value || '').trim().toLowerCase();
    const filtered = !keyword ? allUsers : allUsers.filter(user =>
      Object.values(user).some(value => String(value || '').toLowerCase().includes(keyword))
    );
    renderUsers(filtered);
  }

  async function loadUsers() {
    const status = document.getElementById('usersStatus');
    const grid = document.getElementById('usersGrid');
    if (!status || !grid) return;
    status.hidden = false;
    grid.innerHTML = '';

    try {
      const response = await fetch(API_URL + '&_t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success === false) throw new Error(result.message || 'โหลดข้อมูลไม่สำเร็จ');
      allUsers = Array.isArray(result.users) ? result.users : [];
      status.hidden = true;
      filterUsers();
    } catch (error) {
      status.hidden = true;
      document.getElementById('userCount').textContent = 'จำนวน 0 user';
      grid.innerHTML = `<div class="users-error">โหลดรายการ User ไม่สำเร็จ<br>${escapeHtml(error.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userSearch')?.addEventListener('input', filterUsers);
    document.getElementById('userRefresh')?.addEventListener('click', loadUsers);
    document.getElementById('userPrint')?.addEventListener('click', () => window.print());
    loadUsers();
  });
})();
