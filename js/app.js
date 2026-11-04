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

  // ------------------------------------------------------------------
  // Saving Report
  // ------------------------------------------------------------------
  const savingPanel = document.getElementById('saving-detail');
  const savingCard = document.querySelector('[data-report="saving"]');
  const savingBackdrop = document.getElementById('saving-backdrop');
  const savingClose = document.getElementById('close-saving');
  const savingForm = document.getElementById('saving-search');
  const savingYear = document.getElementById('saving-year');
  const savingSearchButton = document.getElementById('saving-search-button');
  const savingStatus = document.getElementById('saving-status');
  const savingTableWrap = document.getElementById('saving-table-wrap');
  const savingHead = document.getElementById('saving-head');
  const savingBody = document.getElementById('saving-body');
  const savingFoot = document.getElementById('saving-foot');
  const savingCaption = document.getElementById('saving-caption');
  const savingExport = document.getElementById('export-saving');

  if (
    savingPanel && savingCard && savingBackdrop && savingClose && savingForm &&
    savingYear && savingSearchButton && savingStatus && savingTableWrap &&
    savingHead && savingBody && savingFoot && savingCaption && savingExport
  ) {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear + 1; year >= currentYear - 2; year -= 1) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      if (year === currentYear) option.selected = true;
      savingYear.append(option);
    }

    function openSavingReport() {
      savingPanel.hidden = false;
      savingPanel.style.opacity = '1';
      savingPanel.style.pointerEvents = 'auto';
      savingPanel.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
      savingClose.focus();
    }

    function closeSavingReport() {
      savingPanel.style.opacity = '0';
      savingPanel.style.pointerEvents = 'none';
      savingPanel.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (savingPanel.style.opacity === '0') savingPanel.hidden = true;
      }, 250);
      savingCard.focus();
    }

    function setSavingStatus(message, state) {
      savingStatus.textContent = message;
      if (state) savingStatus.dataset.state = state;
      else delete savingStatus.dataset.state;
    }

    function formatBalance(value) {
      return `${Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} kg`;
    }

    function renderSavingReport(data) {
      const chemicals = data.chemicals;
      savingHead.replaceChildren();
      savingBody.replaceChildren();
      savingFoot.replaceChildren();
      savingTableWrap.hidden = chemicals.length === 0;
      savingCaption.textContent = `Weekly chemical balances for ${data.year}. Balance = MRN Poly − total usage.`;
      savingExport.disabled = chemicals.length === 0;

      if (chemicals.length === 0) {
        setSavingStatus(`No MRN or loading records were found for ${data.year}.`);
        return;
      }

      const headerRow = document.createElement('tr');
      const weekHeading = document.createElement('th');
      weekHeading.scope = 'col';
      weekHeading.textContent = 'Week';
      headerRow.append(weekHeading);
      chemicals.forEach((chemical) => {
        const heading = document.createElement('th');
        heading.scope = 'col';
        heading.className = 'numeric-cell';
        heading.textContent = chemical;
        headerRow.append(heading);
      });
      const totalHeading = document.createElement('th');
      totalHeading.scope = 'col';
      totalHeading.className = 'numeric-cell';
      totalHeading.textContent = 'Total Balance';
      headerRow.append(totalHeading);
      savingHead.append(headerRow);

      data.weeks.forEach((week) => {
        const row = document.createElement('tr');
        const weekCell = document.createElement('th');
        weekCell.scope = 'row';
        weekCell.textContent = `Week ${week.week}`;
        row.append(weekCell);
        chemicals.forEach((chemical) => {
          const cell = document.createElement('td');
          cell.className = 'numeric-cell';
          cell.textContent = formatBalance(week.balances[chemical] || 0);
          row.append(cell);
        });
        const totalCell = document.createElement('td');
        totalCell.className = 'numeric-cell';
        totalCell.textContent = formatBalance(week.totalBalance);
        row.append(totalCell);
        savingBody.append(row);
      });

      const totalsRow = document.createElement('tr');
      const totalsHeading = document.createElement('th');
      totalsHeading.scope = 'row';
      totalsHeading.textContent = 'Year Total';
      totalsRow.append(totalsHeading);
      chemicals.forEach((chemical) => {
        const cell = document.createElement('td');
        cell.className = 'numeric-cell';
        cell.textContent = formatBalance(data.annualBalances[chemical] || 0);
        totalsRow.append(cell);
      });
      const annualTotalCell = document.createElement('td');
      annualTotalCell.className = 'numeric-cell';
      annualTotalCell.textContent = formatBalance(data.annualTotalBalance);
      totalsRow.append(annualTotalCell);
      savingFoot.append(totalsRow);
      const weekLabel = data.weeks.length === 1 ? 'week' : 'weeks';
      const chemicalLabel = chemicals.length === 1 ? 'chemical' : 'chemicals';
      setSavingStatus(`${data.weeks.length} ${weekLabel} · ${chemicals.length} ${chemicalLabel} · ${data.year}`);
    }

    savingCard.addEventListener('click', openSavingReport);
    savingCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSavingReport();
      }
    });
    savingCard.addEventListener('touchend', (event) => {
      event.preventDefault();
      openSavingReport();
    }, { passive: false });
    savingClose.addEventListener('click', closeSavingReport);
    savingBackdrop.addEventListener('click', closeSavingReport);

    savingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      savingSearchButton.disabled = true;
      savingExport.disabled = true;
      savingTableWrap.hidden = true;
      setSavingStatus('Loading weekly balances…');

      try {
        const response = await fetch(`/api/saving-report?year=${encodeURIComponent(savingYear.value)}`);
        const result = await response.json();
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || 'Unable to load the Saving Report.');
        }
        renderSavingReport(result.data);
      } catch (error) {
        savingTableWrap.hidden = true;
        setSavingStatus(error.message || 'Unable to load the Saving Report.', 'error');
      } finally {
        savingSearchButton.disabled = false;
      }
    });

    savingExport.addEventListener('click', () => {
      document.body.classList.add('print-saving-report');
      const afterPrint = () => {
        document.body.classList.remove('print-saving-report');
        window.removeEventListener('afterprint', afterPrint);
      };
      window.addEventListener('afterprint', afterPrint);
      window.print();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !savingPanel.hidden) closeSavingReport();
    });
  }
})();
