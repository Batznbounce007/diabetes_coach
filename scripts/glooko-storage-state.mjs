import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { chromium } from "playwright";

const exportDir = path.resolve(process.cwd(), "exports");
const preferredHost = (process.env.GLOOKO_BASE_URL ?? "https://de-fr.my.glooko.com").replace(/\/+$/, "");
const loginUrl = process.env.GLOOKO_LOGIN_URL ?? `${preferredHost}/users/sign_in?locale=de`;

const email = process.env.GLOOKO_EMAIL;
const password = process.env.GLOOKO_PASSWORD;

if (!email || !password) {
  throw new Error("Missing GLOOKO_EMAIL or GLOOKO_PASSWORD.");
}

await fs.mkdir(exportDir, { recursive: true });

console.log("Launching browser...");
const browser = await chromium.launch({
  headless: process.env.GLOOKO_HEADLESS === "true",
  slowMo: 50
});

const context = await browser.newContext({
  locale: "de-DE",
  timezoneId: "Europe/Berlin"
});

const page = await context.newPage();
page.on("pageerror", (err) => console.error("Page error:", err));
page.on("console", (msg) => console.log("Browser console:", msg.type(), msg.text()));
await page.bringToFront().catch(() => undefined);
console.log("Navigating to login:", loginUrl);
await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
console.log("Login page loaded:", page.url());

await page.fill("input[type='email'], input[name='email'], input[name='user[email]'], #email", email);
await page.fill("input[type='password'], input[name='password'], input[name='user[password]'], #password", password);

await page.click("button[type='submit'], input[type='submit'], button:has-text('Anmelden'), button:has-text('Sign in')", { force: true });
console.log("Login submitted. Complete any prompts, then press Enter here.");

const waitForEnter = async () =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Once you are fully logged in, press Enter to save the session state. ", () => {
      rl.close();
      resolve();
    });
  });

if (process.stdin.isTTY) {
  await waitForEnter();
} else {
  await page.waitForTimeout(45_000);
}

const currentUrl = page.url();
if (/sign[_-]?in/i.test(currentUrl)) {
  throw new Error(`Still on sign-in (${currentUrl}). Complete login in the browser, then rerun.`);
}

const state = await context.storageState();
const statePath = path.join(exportDir, "glooko-storage-state.json");
await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

const base64 = Buffer.from(JSON.stringify(state)).toString("base64");
const base64Path = path.join(exportDir, "glooko-storage-state.base64.txt");
await fs.writeFile(base64Path, base64, "utf8");

console.log(`Saved storage state to ${statePath}`);
console.log(`Saved base64 to ${base64Path}`);
console.log("Set GLOOKO_STORAGE_STATE_BASE64 in GitHub secrets to the base64 value.");

await browser.close();
