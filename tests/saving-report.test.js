const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');

const savingReport = require('../api/saving-report');

const originalFetch = global.fetch;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalAnonKey = process.env.SUPABASE_ANON_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalSupabaseUrl;
  if (originalAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
  else process.env.SUPABASE_ANON_KEY = originalAnonKey;
});

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('builds weekly and annual balances from MRN Poly and loading usage', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  const tables = {
    MRNRecords: [
      { Chemical: 'Foam A', Poly: 100, week: 1, created_at: '2026-01-04T10:00:00Z' },
      { Chemical: 'Foam A', Poly: 20, week: 2, created_at: '2026-01-11T10:00:00Z' }
    ],
    ChemicalLoadingRecords: [
      {
        Chemical: 'Foam A',
        StartWeight: 80,
        BeforeWeight: 30,
        AfterWeight: 40,
        EndWeight: 20,
        CreatedAt: '2026-01-04T10:00:00Z'
      },
      {
        Chemical: 'Foam B',
        StartWeight: 10,
        BeforeWeight: 0,
        AfterWeight: 0,
        EndWeight: 5,
        CreatedAt: '2026-01-04T10:00:00Z'
      },
      {
        Chemical: 'Foam A',
        StartWeight: 10,
        BeforeWeight: 0,
        AfterWeight: 0,
        EndWeight: 5,
        CreatedAt: '2026-01-11T10:00:00Z'
      }
    ]
  };

  global.fetch = async (url, options) => {
    const table = new URL(url).pathname.split('/').pop();
    assert.equal(options.headers.apikey, 'test-anon-key');
    const rows = tables[table];
    const [start, end] = options.headers.Range.split('-').map(Number);
    const page = rows.slice(start, end + 1);
    return new Response(JSON.stringify(page), {
      status: 200,
      headers: { 'content-range': `${start}-${start + page.length - 1}/${rows.length}` }
    });
  };

  const response = responseRecorder();
  await savingReport({ method: 'GET', query: { year: '2026' } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.weeks.length, 53);
  assert.deepEqual(response.body.data.chemicals, ['Foam A', 'Foam B']);
  assert.deepEqual(response.body.data.weeks[0].balances, { 'Foam A': 30, 'Foam B': -5 });
  assert.equal(response.body.data.weeks[0].totalBalance, 25);
  assert.deepEqual(response.body.data.weeks[1].balances, { 'Foam A': 15, 'Foam B': 0 });
  assert.deepEqual(response.body.data.annualBalances, { 'Foam A': 45, 'Foam B': -5 });
  assert.equal(response.body.data.annualTotalBalance, 40);
});

test('rejects invalid years and non-GET requests', async () => {
  const invalidYearResponse = responseRecorder();
  await savingReport({ method: 'GET', query: { year: '1800' } }, invalidYearResponse);
  assert.equal(invalidYearResponse.statusCode, 400);

  const methodResponse = responseRecorder();
  await savingReport({ method: 'POST', query: { year: '2026' } }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.Allow, 'GET');
});

test('does not place a next ISO year loading record into week 1 of the selected calendar year', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  const tables = {
    MRNRecords: [],
    ChemicalLoadingRecords: [{
      Chemical: 'Foam C',
      StartWeight: 10,
      BeforeWeight: 0,
      AfterWeight: 0,
      EndWeight: 0,
      CreatedAt: '2025-12-31T10:00:00Z'
    }]
  };
  global.fetch = async (url, options) => {
    const table = new URL(url).pathname.split('/').pop();
    const rows = tables[table];
    const [start, end] = options.headers.Range.split('-').map(Number);
    const page = rows.slice(start, end + 1);
    return new Response(JSON.stringify(page), {
      status: 200,
      headers: { 'content-range': `${start}-${start + page.length - 1}/${rows.length}` }
    });
  };

  const response = responseRecorder();
  await savingReport({ method: 'GET', query: { year: '2025' } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.weeks.length, 52);
  assert.deepEqual(response.body.data.chemicals, []);
});
