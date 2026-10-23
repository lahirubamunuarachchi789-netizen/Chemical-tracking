/* ==========================================================================
   Consumption Reports — Daily detail interaction
   ========================================================================== */

(function () {
  const detailPanel = document.getElementById('daily-detail');
  const backdrop = document.getElementById('detail-backdrop');
  const closeBtn = document.getElementById('close-detail');
  const dailyCard = document.querySelector('[data-report="daily"]');

  // Computed-value field ids
  const LOADED_TEXT = document.getElementById('txt-loaded');
  const STARTING_TEXT = document.getElementById('txt-starting');
  const END_VALUE = document.getElementById('val-end');

  // Open the Daily detail panel
  function openDetail() {
    detailPanel.hidden = false;
    // Reflow to enable the CSS transition
    requestAnimationFrame(() => {
      detailPanel.style.opacity = '1';
      detailPanel.style.pointerEvents = 'auto';
    });
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  // Close the Daily detail panel
  function closeDetail() {
    detailPanel.style.opacity = '0';
    detailPanel.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    // Keep `hidden` off until transition ends so the fade plays on close too
    setTimeout(() => {
      if (detailPanel.style.opacity === '0') {
        detailPanel.hidden = true;
      }
    }, 250);
    dailyCard.focus();
  }

  // Card click / keyboard activation
  dailyCard.addEventListener('click', openDetail);
  dailyCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  });

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

    LOADED_TEXT.textContent = loaded;
    STARTING_TEXT.textContent = starting;
    END_VALUE.textContent = end;
  }

  const inputs = document.querySelectorAll('.cell-input');
  inputs.forEach((input) => {
    input.addEventListener('input', recompute);
  });

  // Initial compute
  recompute();

  // ------------------------------------------------------------------
  // Export (placeholder – prints a CSV to console; hook up a real export as needed)
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
