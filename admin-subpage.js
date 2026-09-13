(() => {
  'use strict';

  const API_URL = 'https://script.google.com/macros/s/AKfycbxwqpydnQSx2aPrQ8yJAN3P9Jkjic-8nNIlOHYFRyarrtTyb26sE_USzXNS7uk478wh8w/exec';
  const token = sessionStorage.getItem('mysiteAdminToken');
  const buttons = Array.from(document.querySelectorAll('.admin-manage-data-button'));

  function setAdminMode(enabled) {
    document.body.classList.toggle('admin-subpage-mode', enabled);
    buttons.forEach(button => {
      button.hidden = !enabled;
    });
  }

  async function validateAdminToken() {
    if (!token || !buttons.length) {
      setAdminMode(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ mode: 'editwebsite', editor: 'text', token })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Invalid admin session');
      setAdminMode(true);
    } catch (error) {
      sessionStorage.removeItem('mysiteAdminToken');
      sessionStorage.removeItem('mysiteAdminName');
      setAdminMode(false);
    }
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      button.dispatchEvent(new CustomEvent('admin:manage-data', {
        bubbles: true,
        detail: { page: button.dataset.adminPage || '' }
      }));
    });
  });

  setAdminMode(false);
  validateAdminToken();
})();
