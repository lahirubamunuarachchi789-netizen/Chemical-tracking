const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function numericValue(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateParts(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(year, month - 1, day + 4 - weekday));
  const isoYear = thursday.getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((thursday.getTime() - jan1) / DAY_MS + 1) / 7);

  return { year, isoYear, week };
}

function isoWeekRange(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const offsetToMonday = (jan4.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, 0, 4 - offsetToMonday + (week - 1) * 7));
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return { start, end };
}

function weeksInIsoYear(year) {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getDateParts(dec28.toISOString()).week;
}

function increment(map, key, amount) {
  map.set(key, (map.get(key) || 0) + amount);
}

async function fetchRows({ supabaseUrl, anonKey, table, columns, timestampColumn, from, to }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    url.searchParams.set('select', columns.join(','));
    url.searchParams.append(timestampColumn, `gte.${from}`);
    url.searchParams.append(timestampColumn, `lte.${to}`);

    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Range-Unit': 'items',
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        Prefer: 'count=exact'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${table} query failed (${response.status}): ${body}`);
    }

    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`${table} returned an invalid response.`);
    rows.push(...page);

    const contentRange = response.headers.get('content-range');
    const total = contentRange?.match(/\/(\d+)$/);
    if (total) {
      offset += page.length;
      if (offset >= Number(total[1]) || page.length === 0) break;
    } else {
      if (page.length < PAGE_SIZE) break;
      offset += page.length;
    }
  }

  return rows;
}

async function buildSavingReport(year, supabaseUrl, anonKey) {
  const weekCount = weeksInIsoYear(year);
  const firstWeek = isoWeekRange(year, 1);
  const lastWeek = isoWeekRange(year, weekCount);
  const from = new Date(firstWeek.start.getTime() - DAY_MS).toISOString();
  const to = new Date(lastWeek.end.getTime() + 2 * DAY_MS).toISOString();

  const [mrnRows, loadingRows] = await Promise.all([
    fetchRows({
      supabaseUrl,
      anonKey,
      table: 'MRNRecords',
      columns: ['Chemical', 'Poly', 'week', 'created_at'],
      timestampColumn: 'created_at',
      from,
      to
    }),
    fetchRows({
      supabaseUrl,
      anonKey,
      table: 'ChemicalLoadingRecords',
      columns: ['Chemical', 'StartWeight', 'BeforeWeight', 'AfterWeight', 'EndWeight', 'CreatedAt'],
      timestampColumn: 'CreatedAt',
      from,
      to
    })
  ]);

  const polyByWeek = new Map();
  const usageByWeek = new Map();
  const chemicals = new Set();

  for (const row of mrnRows) {
    const parts = getDateParts(row.created_at);
    const chemical = row.Chemical?.trim();
    const week = Number(row.week);
    if (!parts || parts.isoYear !== year || parts.week !== week || !chemical) continue;

    chemicals.add(chemical);
    if (!polyByWeek.has(week)) polyByWeek.set(week, new Map());
    increment(polyByWeek.get(week), chemical, numericValue(row.Poly));
  }

  for (const row of loadingRows) {
    const parts = getDateParts(row.CreatedAt);
    const chemical = row.Chemical?.trim();
    if (
      !parts ||
      parts.year !== year ||
      parts.isoYear !== year ||
      parts.week > weekCount ||
      !chemical
    ) continue;

    chemicals.add(chemical);
    if (!usageByWeek.has(parts.week)) usageByWeek.set(parts.week, new Map());
    const usage =
      numericValue(row.AfterWeight) -
      numericValue(row.BeforeWeight) +
      numericValue(row.StartWeight) -
      numericValue(row.EndWeight);
    increment(usageByWeek.get(parts.week), chemical, usage);
  }

  const chemicalNames = [...chemicals].sort((a, b) => a.localeCompare(b));
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const week = index + 1;
    const poly = polyByWeek.get(week) || new Map();
    const usage = usageByWeek.get(week) || new Map();
    const balances = {};

    let totalBalance = 0;
    for (const chemical of chemicalNames) {
      const balance = round((poly.get(chemical) || 0) - (usage.get(chemical) || 0));
      balances[chemical] = balance;
      totalBalance += balance;
    }

    return { week, balances, totalBalance: round(totalBalance) };
  });

  const annualBalances = {};
  for (const chemical of chemicalNames) {
    annualBalances[chemical] = round(
      weeks.reduce((total, week) => total + week.balances[chemical], 0)
    );
  }

  return {
    year,
    weeks,
    chemicals: chemicalNames,
    annualBalances,
    annualTotalBalance: round(
      weeks.reduce((total, week) => total + week.totalBalance, 0)
    )
  };
}

module.exports = async function savingReport(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const year = Number(req.query?.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ success: false, error: 'Select a valid year.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({
      success: false,
      error: 'Saving Report is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'
    });
  }

  try {
    const data = await buildSavingReport(year, supabaseUrl, anonKey);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : 'Saving Report database request failed.'
    });
  }
};
