(() => {
  'use strict';

  const BOSS_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbxwqpydnQSx2aPrQ8yJAN3P9Jkjic-8nNIlOHYFRyarrtTyb26sE_USzXNS7uk478wh8w/exec';
  const BOSS_API_URL = BOSS_WEB_APP_URL + '?mode=boss';

  const text = value => String(value ?? '').trim();

  function normalizeBoss(result) {
    const source = result?.boss || result?.data?.boss || result?.data || result || {};

    if (Array.isArray(source)) {
      const byLabel = {};
      source.forEach(row => {
        if (Array.isArray(row)) byLabel[text(row[0])] = text(row[1]);
        else if (row && typeof row === 'object') {
          byLabel[text(row.label || row.key || row.item || row['รายการ'])] =
            text(row.value || row.url || row.text || row['ระบุ']);
        }
      });
      return {
        image: byLabel['รูป'] || byLabel['รูปภาพ'] || '',
        name: byLabel['ชื่อ'] || '',
        position: byLabel['ตำแหน่ง'] || '',
        popupImage: byLabel['รูปป๊อปอัป'] || byLabel['รูป Pop-up'] || '',
        popupUrl: byLabel['ลิงก์อ่านเพิ่มเติม'] || '',
        popupMode: text(byLabel['เปิด/ปิด']).toLowerCase()
      };
    }

    return {
      image: text(source.image || source.photo || source.url || source['รูป'] || source['รูปภาพ']),
      name: text(source.name || source.fullName || source['ชื่อ']),
      position: text(source.position || source.title || source['ตำแหน่ง']),
      popupImage: text(source.popupImage || source.popup_image || source['รูปป๊อปอัป'] || source['รูป Pop-up']),
      popupUrl: text(source.popupUrl || source.popup_url || source.detailUrl || source['ลิงก์อ่านเพิ่มเติม']),
      popupMode: text(source.popupMode || source.popup_mode || source.mode || source['เปิด/ปิด']).toLowerCase()
    };
  }

  function hideBossBox() {
    document.getElementById('bossBox')?.setAttribute('hidden', '');
    document.getElementById('leftInfoStack')?.classList.add('boss-is-hidden');
  }

  function renderBoss(boss) {
    // ไม่แสดง Box เมื่อข้อมูลคอลัมน์ B ว่างทั้งหมด
    if (!boss.image && !boss.name && !boss.position) {
      hideBossBox();
      return;
    }

    const box = document.getElementById('bossBox');
    const photo = document.getElementById('bossPhoto');
    const name = document.getElementById('bossName');
    const position = document.getElementById('bossPosition');
    if (!box || !photo || !name || !position) return;

    if (boss.image) {
      photo.src = boss.image;
      photo.hidden = false;
    } else {
      photo.removeAttribute('src');
      photo.hidden = true;
    }

    name.textContent = boss.name;
    name.hidden = !boss.name;
    position.textContent = boss.position;
    position.hidden = !boss.position;

    document.getElementById('leftInfoStack')?.classList.remove('boss-is-hidden');
    box.removeAttribute('hidden');
  }


  function closeBossPopup() {
    const popup = document.getElementById('bossPopup');
    if (!popup) return;
    popup.setAttribute('hidden', '');
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('boss-popup-open');
  }

  function renderBossPopup(boss) {
    const popup = document.getElementById('bossPopup');
    const image = document.getElementById('bossPopupImage');
    const actions = document.getElementById('bossPopupActions');
    const detail = document.getElementById('bossPopupDetail');
    if (!popup || !image || !actions || !detail) return;

    if (boss.popupMode !== 'block' || !boss.popupImage) {
      closeBossPopup();
      return;
    }

    image.src = boss.popupImage;

    if (boss.popupUrl) {
      detail.href = boss.popupUrl;
      actions.removeAttribute('hidden');
    } else {
      detail.removeAttribute('href');
      actions.setAttribute('hidden', '');
    }

    popup.removeAttribute('hidden');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('boss-popup-open');
  }

  function bindBossPopupEvents() {
    document.getElementById('bossPopupClose')?.addEventListener('click', closeBossPopup);
    document.getElementById('bossPopup')?.addEventListener('click', event => {
      if (event.target.id === 'bossPopup') closeBossPopup();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeBossPopup();
    });
  }

  async function loadBoss() {
    try {
      let result;

      if (window.SiteFast) {
        result = { success: true, boss: await window.SiteFast.homePart('boss') };
      } else {
        const response = await fetch(BOSS_API_URL, { method: 'GET', cache: 'default' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        result = await response.json();
      }
      if (result.success === false) throw new Error(result.message || 'โหลดข้อมูลผู้บริหารไม่สำเร็จ');

      const boss = normalizeBoss(result);
      renderBoss(boss);
      renderBossPopup(boss);
    } catch (error) {
      console.error('โหลดข้อมูลผู้บริหารไม่สำเร็จ:', error);
      hideBossBox();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindBossPopupEvents();
    loadBoss();
  });
})();

