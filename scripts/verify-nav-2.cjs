module.exports = async function run(page, check, row1Cells, focusInfo) {
  // ---- ArrowRight moves to next cell in row
  await row1Cells.nth(0).click();
  await page.keyboard.press("ArrowRight");
  let f = await focusInfo(page);
  check(
    "ArrowRight moves to next cell in row",
    f.field === "before",
    JSON.stringify(f),
  );
  check(
    "focused cell content is selected",
    f.sel === 0,
    JSON.stringify(f),
  );

  // ---- ArrowLeft goes back
  await page.keyboard.press("ArrowLeft");
  f = await focusInfo(page);
  check(
    "ArrowLeft moves back",
    f.field === "startWeight",
    JSON.stringify(f),
  );

  // ---- ArrowDown moves to same column, next row
  await page.keyboard.press("ArrowDown");
  f = await focusInfo(page);
  check(
    "ArrowDown moves to same column in next row",
    f.field === "startWeight" &&
      f.label === "Start weight for RGE 01 B1",
    JSON.stringify(f),
  );

  // ---- ArrowUp moves back up
  await page.keyboard.press("ArrowUp");
  f = await focusInfo(page);
  check(
    "ArrowUp moves back up",
    f.label === "Start weight for RGE 01 A1",
    JSON.stringify(f),
  );

  // ---- boundary: ArrowLeft on first cell stays put
  await page.keyboard.press("ArrowLeft");
  f = await focusInfo(page);
  check(
    "ArrowLeft at first cell stays put",
    f.field === "startWeight",
    JSON.stringify(f),
  );

  // ---- typing after navigation replaces the content
  await row1Cells.nth(0).fill("99");
  await row1Cells.nth(0).click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("5");
  const typed = await row1Cells.nth(1).inputValue();
  check("typing after arrow move replaces cell", typed === "5", `got "${typed}"`);

  // ---- boundary: last row of the table
  const lastRow = page.locator(
    'tr:has(select[aria-label="Chemical for RGE 02 B1"])',
  );
  const lastCells = lastRow.locator("input[data-nav-field]");
  await lastCells.nth(3).click();
  await page.keyboard.press("ArrowDown");
  f = await focusInfo(page);
  check(
    "ArrowDown on last row stays put",
    f.label === "End weight for RGE 02 B1",
    JSON.stringify(f),
  );

  await page.keyboard.press("ArrowRight");
  f = await focusInfo(page);
  check(
    "ArrowRight on last column stays put",
    f.label === "End weight for RGE 02 B1",
    JSON.stringify(f),
  );

  // ---- no "Text Box" hints remain
  const html = await page.content();
  check("no 'Text Box' placeholder text", !html.includes("Text Box"));

  // ---- Shift+Arrow stays inside the cell (text selection)
  await row1Cells.nth(0).fill("1234");
  await row1Cells.nth(0).click();
  await page.keyboard.press("Shift+ArrowRight");
  f = await focusInfo(page);
  check(
    "Shift+ArrowRight selects text instead of moving",
    f.field === "startWeight" && f.label === "Start weight for RGE 01 A1",
    JSON.stringify(f),
  );
};
