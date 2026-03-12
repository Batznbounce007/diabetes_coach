import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import AdmZip from "adm-zip";

const exportDir = path.resolve(process.cwd(), "exports");

const defaultLoginUrl = "https://de-fr.my.glooko.com/users/sign_in";

function isSignInUrl(url: string): boolean {
  return /\/users\/sign[_-]?in/i.test(url);
}

async function fillFirstAvailable(
  page: Page,
  selectors: string[],
  value: string
): Promise<boolean> {
  for (const selector of selectors) {
    const target = page.locator(selector).first();
    if ((await target.count()) > 0) {
      await target.fill(value);
      return true;
    }
  }

  return false;
}

async function clickFirstAvailable(
  page: Page,
  selectors: string[],
  options?: { force?: boolean }
): Promise<Locator> {
  for (const selector of selectors) {
    const target = page.locator(selector).first();
    if ((await target.count()) > 0) {
      await target.click({ force: options?.force ?? false });
      return target;
    }
  }

  throw new Error("Could not find any matching element to click.");
}

async function dismissCookieOverlay(page: Page): Promise<void> {
  const acceptSelectors = [
    "#onetrust-accept-btn-handler",
    "button:has-text('Accept All')",
    "button:has-text('Alle akzeptieren')",
    "button:has-text('Accept')"
  ];

  for (const selector of acceptSelectors) {
    const button = page.locator(selector).first();
    if ((await button.count()) > 0) {
      await button.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(150);
      break;
    }
  }

  // Fallback: remove known OneTrust blockers if still present.
  await page
    .evaluate(() => {
      const ids = [
        "onetrust-consent-sdk",
        "onetrust-banner-sdk",
        "onetrust-pc-sdk",
        "ot-sdk-cookie-policy"
      ];
      for (const id of ids) {
        const element = document.getElementById(id);
        if (element) element.remove();
      }
      document.body.style.overflow = "auto";
    })
    .catch(() => undefined);
}

async function selectFirstAvailable(
  page: Page,
  selectors: string[],
  value: string
): Promise<boolean> {
  for (const selector of selectors) {
    const target = page.locator(selector).first();
    if ((await target.count()) > 0) {
      await target.selectOption({ label: value }).catch(async () => {
        await target.selectOption(value);
      });
      return true;
    }
  }

  return false;
}

function buildExportRangeRegex(days: number): RegExp {
  if (days <= 1) return /1 day|1 Tag/i;
  return new RegExp(`${days}\\s*(days?|tage?)`, "i");
}

export function getExportRangeLabels(days: number): string[] {
  if (days <= 1) return ["1 Tag", "1 day"];
  return [`${days} Tage`, `${days} days`];
}

async function setExportRange(page: Page, days: number): Promise<void> {
  const dialog = page.locator("[data-testid='dialog-export-to-csv']").first();
  if ((await dialog.count()) === 0) return;

  const rangeRegex = buildExportRangeRegex(days);
  const alreadySelected = (await dialog.locator("span,div,button").filter({ hasText: rangeRegex }).count()) > 0;
  if (alreadySelected) return;

  const combo = dialog.locator("[role='combobox']").first();
  if ((await combo.count()) > 0) {
    await combo.click({ force: true });
    const oneDayOption = page
      .locator("[role='option'], .dropdown__option")
      .filter({ hasText: rangeRegex })
      .first();
    if ((await oneDayOption.count()) > 0) {
      await oneDayOption.click({ force: true });
    }
  }
}

async function waitForLoginTransition(page: Page, timeoutMs = 45_000): Promise<void> {
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);

  await page
    .waitForFunction(() => {
      const href = window.location.href;
      const onSignIn = /sign[_-]?in/i.test(href);
      const hasPasswordInput = Boolean(document.querySelector("input[type='password']"));
      return !onSignIn && !hasPasswordInput;
    }, { timeout: timeoutMs })
    .catch(() => undefined);
}

async function clickAnyExportLikeControl(page: Page): Promise<boolean> {
  const candidates = page
    .locator("a,button,[role='button'],[data-testid],[aria-label]")
    .filter({ hasText: /(csv|export|download|daten export|als csv exportieren)/i });
  if ((await candidates.count()) > 0) {
    await candidates.first().click({ force: true }).catch(() => undefined);
    return true;
  }
  return false;
}

async function openExportFromProfileCard(page: Page): Promise<boolean> {
  const candidates = [
    page.getByRole("link", { name: /als csv exportieren/i }).first(),
    page.getByRole("button", { name: /als csv exportieren/i }).first(),
    page.getByRole("link", { name: /export as csv|csv export|export csv/i }).first(),
    page.getByRole("button", { name: /export as csv|csv export|export csv/i }).first(),
    page.locator("a,button").filter({ hasText: /als csv exportieren/i }).first()
  ];

  for (const candidate of candidates) {
    if ((await candidate.count()) > 0) {
      await candidate.click({ force: true }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function clickTextInPageOrFrames(page: Page, regex: RegExp): Promise<boolean> {
  const targets = [page, ...page.frames()];
  for (const target of targets) {
    const byRoleButton = target.getByRole("button", { name: regex }).first();
    if ((await byRoleButton.count()) > 0) {
      await byRoleButton.click({ force: true }).catch(() => undefined);
      return true;
    }

    const byRoleLink = target.getByRole("link", { name: regex }).first();
    if ((await byRoleLink.count()) > 0) {
      await byRoleLink.click({ force: true }).catch(() => undefined);
      return true;
    }

    const textLocator = target.locator("a,button,[role='button']").filter({ hasText: regex }).first();
    if ((await textLocator.count()) > 0) {
      await textLocator.click({ force: true }).catch(() => undefined);
      return true;
    }
  }

  return false;
}

async function openCsvExportDialog(
  page: Page,
  day: string,
  baseOrigin: string,
  days: number,
  exportUrl?: string
): Promise<void> {
  const exportSelectors = [
    "[data-testid*='export'][data-testid*='csv']",
    "a:has-text('Als CSV exportieren')",
    "button:has-text('Als CSV exportieren')",
    "a:has-text('Export as CSV')",
    "button:has-text('Export as CSV')",
    "a:has-text('CSV export')",
    "button:has-text('CSV export')",
    "a:has-text('Export CSV')",
    "button:has-text('Export CSV')",
    "text=/CSV/i"
  ];

  const pagesToTry = Array.from(
    new Set(
      [
        exportUrl,
        page.url(),
        `${baseOrigin}/`,
        baseOrigin.includes("de-fr.my.glooko.com") ? "https://de-fr.my.glooko.com/" : "",
        baseOrigin.includes("my.glooko.com") ? "https://my.glooko.com/" : ""
      ].filter((value): value is string => typeof value === "string" && value.length > 0 && !isSignInUrl(value))
    )
  );

  for (const targetUrl of pagesToTry) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await dismissCookieOverlay(page);
    await page.waitForTimeout(500);

    if (isSignInUrl(page.url())) {
      continue;
    }

    // Some Glooko layouts require opening the summary/reports area first.
    await clickTextInPageOrFrames(page, /zusammenfassung|summary|reports?|diagramme|charts?/i).catch(
      () => false
    );
    await page.waitForTimeout(250);
    await dismissCookieOverlay(page);

    const profileFlowClicked = await openExportFromProfileCard(page);
    if (profileFlowClicked) return;

    try {
      await clickFirstAvailable(page, exportSelectors, { force: true });
      return;
    } catch {
      // keep trying
    }

    const clickedDeep = await clickTextInPageOrFrames(
      page,
      /als csv exportieren|export as csv|csv export|export csv|download csv|csv/i
    );
    if (clickedDeep) return;

    const clicked = await clickAnyExportLikeControl(page);
    if (clicked) return;
  }

  const debugPath = path.join(exportDir, `${day}-glooko-no-export-trigger-${days}d`);
  if (!page.isClosed()) {
    await page.screenshot({ path: `${debugPath}.png`, fullPage: true }).catch(() => undefined);
    await fs.writeFile(`${debugPath}.html`, await page.content(), "utf8").catch(() => undefined);
  }
  if (isSignInUrl(page.url())) {
    throw new Error(
      `Glooko session is not authenticated (redirected to sign-in at ${page.url()}). Check GLOOKO_EMAIL/GLOOKO_PASSWORD and whether Glooko prompts for additional verification. Debug saved to ${debugPath}.png/.html (if available).`
    );
  }
  throw new Error(
    `Could not find CSV export trigger at URL=${page.url()} title="${await page.title().catch(() => "")}". Debug saved to ${debugPath}.png/.html (if available).`
  );
}

export async function exportGlookoCsvForDay(day: string): Promise<string> {
  const email = process.env.GLOOKO_EMAIL;
  const password = process.env.GLOOKO_PASSWORD;
  const loginUrl = process.env.GLOOKO_LOGIN_URL ?? defaultLoginUrl;
  const preferredHomeUrl = process.env.GLOOKO_HOME_URL ?? "https://de-fr.my.glooko.com/";
  const exportUrl = process.env.GLOOKO_EXPORT_URL;

  if (!email || !password) {
    throw new Error("Missing GLOOKO_EMAIL or GLOOKO_PASSWORD");
  }

  await fs.mkdir(exportDir, { recursive: true });
  const csvPath = path.join(exportDir, `${day}.csv`);
  const baseOrigin = (() => {
    try {
      return new URL(loginUrl).origin;
    } catch {
      return "https://de-fr.my.glooko.com";
    }
  })();

  const exportPeriodDays = Number.parseInt(process.env.GLOOKO_EXPORT_DAYS ?? "14", 10);
  const days = Number.isNaN(exportPeriodDays) ? 14 : Math.max(1, exportPeriodDays);

  const browser = await chromium.launch({
    headless: process.env.GLOOKO_HEADLESS !== "false"
  });

  let page: Page | null = null;
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    page = await context.newPage();

    const performLogin = async (targetUrl: string): Promise<void> => {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      await dismissCookieOverlay(page);

      const emailFilled = await fillFirstAvailable(
        page,
        [
          "input[type='email']",
          "input[name='email']",
          "input[name='user[email]']",
          "#email"
        ],
        email
      );
      if (!emailFilled) {
        throw new Error("Could not locate Glooko email input.");
      }

      const passwordFilled = await fillFirstAvailable(
        page,
        [
          "input[type='password']",
          "input[name='password']",
          "input[name='user[password]']",
          "#password"
        ],
        password
      );
      if (!passwordFilled) {
        throw new Error("Could not locate Glooko password input.");
      }

      await clickFirstAvailable(
        page,
        [
          "button[type='submit']",
          "input[type='submit']",
          "button:has-text('Sign in')",
          "button:has-text('Log in')",
          "button:has-text('Anmelden')",
          "input[value*='Anmelden']"
        ],
        { force: true }
      );

      await waitForLoginTransition(page, 45_000);
    };

    await performLogin(loginUrl);

    if (isSignInUrl(page.url()) && page.url().includes("us.my.glooko.com")) {
      await performLogin(defaultLoginUrl);
    }

    if (isSignInUrl(page.url())) {
      throw new Error(`Glooko login appears to have failed. Current URL: ${page.url()}`);
    }

    if (!page.url().startsWith("https://de-fr.my.glooko.com")) {
      await page.goto(preferredHomeUrl, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    }

    await openCsvExportDialog(page, day, baseOrigin, days, exportUrl);

    await page.waitForTimeout(500);
    const rangeOptions = getExportRangeLabels(days);
    for (const option of rangeOptions) {
      const selected = await selectFirstAvailable(
        page,
        [
          "div[role='dialog'] select",
          "select[aria-label*='Zeitraum']",
          "select[aria-label*='period']",
          "select[name*='period']",
          "select"
        ],
        option
      ).catch(() => false);
      if (selected) break;
    }
    await setExportRange(page, days).catch(() => undefined);
    const activePage = page;

    const exportSelectors = [
      "[data-testid='button-export-to-csv-export']",
      "[data-testid='dialog-container-export-to-csv'] button:has-text('Exportieren')",
      "[data-testid='dialog-container-export-to-csv'] button[type='button']:has-text('Export')",
      "div[role='dialog'] button:has-text('Exportieren')",
      "button:has-text('Exportieren')",
      "button:has-text('Export CSV')",
      "a:has-text('Export CSV')",
      "button:has-text('Export')",
      "a:has-text('CSV')"
    ];
    const downloadEventPromise = new Promise<import("playwright").Download>(
      (resolve) => {
        activePage.once("download", (download) => resolve(download));
      }
    );
    const csvResponsePromise = new Promise<import("playwright").Response>(
      (resolve) => {
        const handler = (response: import("playwright").Response) => {
          const headers = response.headers();
          const contentType = headers["content-type"] ?? "";
          const disposition = headers["content-disposition"] ?? "";
          const isCsv =
            contentType.includes("text/csv") ||
            contentType.includes("application/csv") ||
            disposition.toLowerCase().includes("attachment") ||
            response.url().toLowerCase().includes(".csv");
          if (isCsv) {
            activePage.off("response", handler);
            resolve(response);
          }
        };
        activePage.on("response", handler);
      }
    );
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out waiting for CSV export result.")), 180_000);
    });
    await clickFirstAvailable(page, exportSelectors, { force: true });

    const csvResult = await Promise.race([
      downloadEventPromise.then((download) => ({ type: "download" as const, download })),
      csvResponsePromise.then((response) => ({ type: "response" as const, response })),
      timeoutPromise
    ]).catch(async (error) => {
      const debugPath = path.join(exportDir, `${day}-glooko-debug`);
      if (!activePage.isClosed()) {
        await activePage.screenshot({ path: `${debugPath}.png`, fullPage: true });
        await fs.writeFile(`${debugPath}.html`, await activePage.content(), "utf8");
      }
      throw new Error(
        `CSV download failed. ${activePage.isClosed() ? "Page closed unexpectedly (possible login redirect/2FA/captcha)." : `Debug saved to ${debugPath}.png/.html.`} Original error: ${String(
          error
        )}`
      );
    });
    if (csvResult.type === "download") {
      await csvResult.download.saveAs(csvPath);
    } else {
      await fs.writeFile(csvPath, await csvResult.response.body());
    }

    let rawFile = await fs.readFile(csvPath);
    if (rawFile.slice(0, 2).toString() === "PK") {
      const zip = new AdmZip(rawFile);
      const csvEntry = zip
        .getEntries()
        .find((entry) => entry.entryName.toLowerCase().endsWith(".csv"));
      if (!csvEntry) {
        throw new Error("Glooko ZIP export did not contain a CSV file.");
      }
      rawFile = Buffer.from(csvEntry.getData());
      await fs.writeFile(csvPath, rawFile);
    }

    const file = rawFile.toString("utf8");
    if (!file.includes(",") || file.length < 50) {
      throw new Error("Downloaded CSV content is invalid or empty.");
    }

    return file;
  } catch (error) {
    if (page && !page.isClosed()) {
      const screenshotPath = path.join(exportDir, `${day}-glooko-failure.png`);
      const htmlPath = path.join(exportDir, `${day}-glooko-failure.html`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await fs.writeFile(htmlPath, await page.content(), "utf8");
    }
    throw error;
  } finally {
    await browser.close();
  }
}
