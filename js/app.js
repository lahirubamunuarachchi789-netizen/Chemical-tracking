/* ==========================================================================
   Consumption Reports — Daily detail interaction
   ========================================================================== */

(function () {
  const detailPanel = document.getElementById('daily-detail');
  const backdrop = document.getElementById('detail-backdrop');
  const closeBtn = document.getElementById('close-detail');
  const dailyCard = document.querySelector('[data-report="daily"]');

  if (!detailPanel || !backdrop || !closeBtn || !dailyCard) {
    return;
  }

  // ------------------------------------------------------------------
  // Open / close the Daily detail panel
  // ------------------------------------------------------------------
  function openDetail() {
    detailPanel.hidden = false;
    detailPanel.removeAttribute('aria-hidden');
    detailPanel.setAttribute('aria-modal', 'true');
    // Force reflow then enable the fade-in transition
    requestAnimationFrame(() => {
      detailPanel.style.opacity = '1';
      detailPanel.style.pointerEvents = 'auto';
    });
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeDetail() {
    detailPanel.style.opacity = '0';
    detailPanel.style.pointerEvents = 'none';
    detailPanel.setAttribute('aria-hidden', 'true');
    detailPanel.removeAttribute('aria-modal');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (detailPanel.style.opacity === '0') {
        detailPanel.hidden = true;
      }
    }, 250);
    dailyCard.focus();
  }

  // Card click / keyboard activation (Enter / Space)
  dailyCard.addEventListener('click', (e) => {
    e.preventDefault();
    openDetail();
  });

  dailyCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  });

  // Support touch taps on mobile
  dailyCard.addEventListener('touchend', (e) => {
    e.preventDefault();
    openDetail();
  }, { passive: false });

  closeBtn.addEventListener('click', closeDetail);
  backdrop.addEventListener('click', closeDetail);

  // ESC closes the panel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !detailPanel.hidden) {
      closeDetail();
    }
  });

  // ------------------------------------------------------------------
  // Computed values
  // ------------------------------------------------------------------
  function toNumber(el) {
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : 0;
  }

  function recompute() {
    const start = toNumber(document.querySelector('.cell-input[data-field="start"]'));
    const before = toNumber(document.querySelector('.cell-input[data-field="before"]'));
    const after = toNumber(document.querySelector('.cell-input[data-field="after"]'));

    const loaded = after - before;
    const starting = start + loaded;
    const end = starting;

    const loadedText = document.getElementById('txt-loaded');
    const startingText = document.getElementById('txt-starting');
    const endValue = document.getElementById('val-end');

    if (loadedText)  loadedText.textContent = loaded;
    if (startingText) startingText.textContent = starting;
    if (endValue)    endValue.textContent = end;
  }

  const inputs = document.querySelectorAll('.cell-input');
  inputs.forEach((input) => {
    input.addEventListener('input', recompute);
  });

  // Initial compute
  recompute();

  // ------------------------------------------------------------------
  // Export (placeholder – prints a CSV to console)
  // ------------------------------------------------------------------
  document.getElementById('export-detail').addEventListener('click', () => {
    const rows = [];
    document.querySelectorAll('.report-table tbody tr').forEach((tr) => {
      const th = tr.querySelector('th');
      const td = tr.querySelector('td');
      if (th && td) rows.push(`${th.textContent.trim()},${td.textContent.trim().replace(/\s+/g, ' ')}`);
    });
    const csv = ['Metric,Value', ...rows].join('\n');
    console.log('Exported CSV:\n' + csv);
    alert('Report data copied to console (CSV). Open DevTools to view.');
  });
})();
