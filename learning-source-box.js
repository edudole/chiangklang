(() => {
  'use strict';

const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxwqpydnQSx2aPrQ8yJAN3P9Jkjic-8nNIlOHYFRyarrtTyb26sE_USzXNS7uk478wh8w/exec';

  const INITIAL_ITEMS = 8;
  const $ = id => document.getElementById(id);
  let allLearningAreas = [];

const esc = value =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumber = value =>
    num(value).toLocaleString('th-TH');

  const ratingNumber = area => {
    const raw = area?.rating ??
      area?.Rating ??
      area?.score ??
      area?.satisfactionRating ??
      area?.satisfaction_score ??
      area?.[4] ??
      0;

    const parsed = parseFloat(
      String(raw ?? 0).replaceAll(',', '').trim()
    );

    return Number.isFinite(parsed) ? parsed : 0;
  };

  function bindAreaCards(grid) {
    const openArea = card => {
      const areaName = card.dataset.areaName;
      if (!areaName) return;

      const url = new URL('learning.html', window.location.href);
      url.searchParams.set('area', areaName);
      window.open(url.href, '_blank', 'noopener,noreferrer');
    };

    grid.querySelectorAll('[data-area-sheet]').forEach(card => {
      card.addEventListener('click', () => openArea(card));
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openArea(card);
      });
    });
  }

  function renderLearningAreas(showAll) {
    const grid = $('lsbAreaGrid');
    const wrap = $('lsbShowAllWrap');
    if (!grid) return;

    const displayAreas = showAll
      ? allLearningAreas
      : allLearningAreas.slice(0, INITIAL_ITEMS);

    grid.innerHTML = displayAreas.map(area => areaCard(area)).join('');
    bindAreaCards(grid);

    if (wrap) {
      wrap.hidden = showAll || allLearningAreas.length <= INITIAL_ITEMS;
    }
  }


  /* ============================
     รับข้อมูลจาก Apps Script
  ============================ */

  window.receiveLearningAreas = function(result) {

    clearTimeout(window.lsbLoadTimer);

    const grid = $('lsbAreaGrid');

    if (!grid) return;

    if (!result || result.success !== true) {

      console.error(
        'Learning areas:',
        result
      );

      grid.innerHTML = `
        <div class="lsb-loading">
          ไม่สามารถโหลดข้อมูลได้
        </div>
      `;

      return;
    }


    const areas =
      Array.isArray(result.areas)
        ? result.areas
        : [];


    if (!areas.length) {

      grid.innerHTML = `
        <div class="lsb-loading">
          ยังไม่มีรายการแหล่งเรียนรู้
        </div>
      `;

      return;
    }


    // เรียง rating (คอลัมน์ E) จากมากไปน้อย และคงลำดับเดิมเมื่อคะแนนเท่ากัน
    allLearningAreas = areas
      .map((area, index) => ({ area, index }))
      .sort((a, b) =>
        ratingNumber(b.area) - ratingNumber(a.area) || a.index - b.index
      )
      .map(item => item.area);

    renderLearningAreas(false);

  };


  /* ============================
     สร้างการ์ดตำบล
  ============================ */

function areaCard(area) {

  const name =
    area.name || '-';

  const spreadsheetId =
    area.spreadsheetId || '';

  const mapImage =
    area.mapImage || '';

  const sourceCount =
    num(area.sourceCount);

  const rating =
    ratingNumber(area);


  return `
    <article
      class="lsb-area-card"
      data-area-sheet="${esc(spreadsheetId)}"
      data-area-name="${esc(name)}"
      tabindex="0"
      role="button"
    >

      <div class="lsb-area-image">

        ${
          mapImage
            ? `
              <img
                src="${esc(mapImage)}"
                alt="${esc(name)}"
                loading="lazy"
              >
            `
            : `
              <div class="lsb-no-map">
                ไม่มีภาพแผนที่
              </div>
            `
        }

      </div>

      <div class="lsb-area-info">

        <div class="lsb-area-title-row">
          <h3>
            ${esc(name)}
          </h3>

          <div class="lsb-area-rating" aria-label="คะแนนความพึงพอใจ ${formatNumber(rating)}">
            <span aria-hidden="true">★</span>
            <strong>${formatNumber(rating)}</strong>
          </div>
        </div>

        <div class="lsb-area-stat">
          จำนวนแหล่งเรียนรู้
          <strong>
            ${formatNumber(sourceCount)}
          </strong>
        </div>

      </div>

    </article>
  `;
}


  /* ============================
     โหลดข้อมูล
  ============================ */

  function loadLearningAreas() {

    const grid =
      $('lsbAreaGrid');

    if (!grid) {
      console.error(
        'ไม่พบ element #lsbAreaGrid'
      );
      return;
    }

    if (window.SiteFast) {
      grid.innerHTML = '<div class="lsb-loading">กำลังโหลดแหล่งเรียนรู้...</div>';
      window.SiteFast.fetchMode('learningAreas', {}, { key: 'learning-areas-v1', ttl: 300000 })
        .then(window.receiveLearningAreas)
        .catch(error => {
          console.error('Learning Areas API:', error);
          grid.innerHTML = '<div class="lsb-loading">ไม่สามารถเชื่อมต่อข้อมูลได้</div>';
        });
      return;
    }


    document
      .getElementById('lsbAreaJsonp')
      ?.remove();


    clearTimeout(
      window.lsbLoadTimer
    );


    window.lsbLoadTimer =
      setTimeout(() => {

        grid.innerHTML = `
          <div class="lsb-loading">
            หมดเวลารอข้อมูล
          </div>
        `;

      }, 30000);


    const script =
      document.createElement('script');


    script.id =
      'lsbAreaJsonp';

    script.async = true;


    script.src =
      WEB_APP_URL +
      '?mode=learningAreas' +
      '&callback=window.receiveLearningAreas' +
      '&_=' +
      Date.now();


    console.log(
      'Learning Areas URL:',
      script.src
    );


    script.onerror = () => {

      clearTimeout(
        window.lsbLoadTimer
      );

      console.error(
        'โหลด Learning Areas API ไม่สำเร็จ:',
        script.src
      );

      grid.innerHTML = `
        <div class="lsb-loading">
          ไม่สามารถเชื่อมต่อข้อมูลได้
        </div>
      `;

      script.remove();

    };


    document.body.appendChild(script);
  }

  $('lsbShowAllBtn')?.addEventListener('click', () => {
    renderLearningAreas(true);
  });


  if (window.SiteFast) {
    window.SiteFast.whenNear('learningSourceBox', loadLearningAreas);
  } else if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      loadLearningAreas
    );

  } else {

    loadLearningAreas();

  }

})();
