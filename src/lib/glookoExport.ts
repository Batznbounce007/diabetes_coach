import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";
import AdmZip from "adm-zip";

const exportDir = path.resolve(process.cwd(), "exports");

const defaultLoginUrl = "https://de-fr.my.glooko.com/users/sign_in";

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

async function setOneDayExportRange(page: Page): Promise<void> {
  const dialog = page.locator("[data-testid='dialog-export-to-csv']").first();
  if ((await dialog.count()) === 0) return;

  const oneDayAlreadySelected =
    (await dialog.locator("text=1 day").count()) > 0 ||
    (await dialog.locator("text=1 Tag").count()) > 0;
  if (oneDayAlreadySelected) return;

  const combo = dialog.locator("[role='combobox']").first();
  if ((await combo.count()) > 0) {
    await combo.click({ force: true });
    const oneDayOption = page
      .locator("[role='option'], .dropdown__option")
      .filter({ hasText: /1 day|1 Tag/i })
      .first();
    if ((await oneDayOption.count()) > 0) {
      await oneDayOption.click({ force: true });
    }
  }
}

export async function exportGlookoCsvForDay(day: string): Promise<string> {
  const email = process.env.GLOOKO_EMAIL;
  const password = process.env.GLOOKO_PASSWORD;
  const loginUrl = process.env.GLOOKO_LOGIN_URL ?? defaultLoginUrl;
  const exportUrl = process.env.GLOOKO_EXPORT_URL;

  if (!email || !password) {
    throw new Error("Missing GLOOKO_EMAIL or GLOOKO_PASSWORD");
  }

  await fs.mkdir(exportDir, { recursive: true });
  const csvPath = path.join(exportDir, `${day}.csv`);

  const browser = await chromium.launch({
    headless: process.env.GLOOKO_HEADLESS !== "false"
  });

  let page: Page | null = null;
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    page = await context.newPage();

    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
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

    await clickFirstAvailable(page, [
      "button[type='submit']",
      "input[type='submit']",
      "button:has-text('Sign in')",
      "button:has-text('Log in')",
      "button:has-text('Anmelden')",
      "input[value*='Anmelden']"
    ], { force: true });

    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    if (page.url().includes("sign_in")) {
      throw new Error(`Glooko login appears to have failed. Current URL: ${page.url()}`);
    }

    await page.goto("https://de-fr.my.glooko.com/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => null);

    if (exportUrl) {
      await page.goto(exportUrl, { waitUntil: "domcontentloaded" });
    }

    await clickFirstAvailable(page, [
      "a:has-text('Als CSV exportieren')",
      "button:has-text('Als CSV exportieren')",
      "text=Als CSV exportieren",
      "xpath=//*[contains(normalize-space(.), 'Als CSV exportieren')]",
      "a:has-text('Export CSV')",
      "button:has-text('Export CSV')",
      "text=CSV"
    ]);

    await page.waitForTimeout(500);
    await selectFirstAvailable(
      page,
      [
        "div[role='dialog'] select",
        "select[aria-label*='Zeitraum']",
        "select[name*='period']",
        "select"
      ],
      "1 Tag"
    ).catch(() => false);
    await setOneDayExportRange(page).catch(() => undefined);
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
