const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3000";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} :: ${name}${detail ? " :: " + detail : ""}`);
}

async function focusInfo(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    return {
      label: a && a.getAttribute("aria-label"),
      field: a && a.getAttribute("data-nav-field"),
      row: a && a.getAttribute("data-nav-row"),
      sel: a && a.selectionStart,
      len: a && a.value && a.value.length,
    };
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  // ---- register + login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  if (await page.locator('button:has-text("Register")').count()) {
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(400);
  }
  await page.fill('input[name="username"]', `nav${Date.now()}`);
  await page.locator('input[name="password"]').fill("Passw0rd!23");
  await page.locator('input[name="confirmPassword"]').fill("Passw0rd!23");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 20000 });

  await page.goto(`${BASE}/dashboard/chemical-usage-input`, {
    waitUntil: "networkidle",
  });
  check("page loads", page.url().includes("chemical-usage-input"));

  const total = await page.locator("input[data-nav-field]").count();
  check("weight cells have nav metadata", total === 24, `count=${total}`);

  const chemSelects = page.locator('select[aria-label^="Chemical for"]');
  check("6 chemical dropdowns", (await chemSelects.count()) === 6);

  const row1 = page.locator(
    'tr:has(select[aria-label="Chemical for RGE 01 A1"])',
  );
  const row1Cells = row1.locator("input[data-nav-field]");
  check("row1 has 4 weight cells", (await row1Cells.count()) === 4);

  // ---- TEST 1: "No Chemical" zeroes the four weight fields
  for (let i = 0; i < 4; i++) await row1Cells.nth(i).fill("12.5");
  await row1Cells.nth(0).click();
  await chemSelects.nth(0).selectOption("No Chemical");
  await page.waitForTimeout(300);

  const vals = [];
  for (let i = 0; i < 4; i++) vals.push(await row1Cells.nth(i).inputValue());
  check(
    "No Chemical zeroes all 4 weight fields",
    vals.every((v) => v === "0"),
    `values=${JSON.stringify(vals)}`,
  );

  // ---- TEST 2: switching to a real chemical clears the zeros
  await chemSelects.nth(0).selectOption("BASF Midsole");
  await page.waitForTimeout(300);
  const vals2 = [];
  for (let i = 0; i < 4; i++) vals2.push(await row1Cells.nth(i).inputValue());
  check(
    "switching chemical clears placeholder zeros",
    vals2.every((v) => v === ""),
    `values=${JSON.stringify(vals2)}`,
  );

  require("./verify-nav-2.cjs")(page, check, row1Cells, focusInfo)
    .then(() => {
      const failed = results.filter((r) => !r.pass);
      console.log(
        `\n=== ${results.length - failed.length}/${results.length} passed ===`,
      );
      return browser.close().then(() => process.exit(failed.length === 0 ? 0 : 1));
    })
    .catch((e) => {
      console.error("SCRIPT ERROR:", e);
      process.exit(2);
    });
})().catch((e) => {
  console.error("SCRIPT ERROR:", e);
  process.exit(2);
});
