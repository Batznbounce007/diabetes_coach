import { spawnSync } from "node:child_process";

function getBerlinTimeParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(map.hour ?? "0");
  const minute = Number(map.minute ?? "0");
  const dateKey = `${map.year}-${map.month}-${map.day}`;
  return { hour, minute, dateKey };
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function shouldRunNews(hour, minute) {
  return hour === 8 && minute >= 0 && minute <= 14;
}

function shouldRunMorning(hour, minute) {
  return hour === 9 && minute >= 0 && minute <= 14;
}

function shouldRunAnalysis(hour, minute) {
  return hour === 23 && minute >= 50 && minute <= 59;
}

function resolveTasks(forceJob, hour, minute) {
  if (forceJob === "news") return ["news"];
  if (forceJob === "morning") return ["morning"];
  if (forceJob === "analysis") return ["analysis"];
  if (forceJob === "all") return ["news", "morning", "analysis"];

  const tasks = [];
  if (shouldRunNews(hour, minute)) tasks.push("news");
  if (shouldRunMorning(hour, minute)) tasks.push("morning");
  if (shouldRunAnalysis(hour, minute)) tasks.push("analysis");
  return tasks;
}

function main() {
  const forceJob = process.env.FORCE_JOB ?? "auto";
  const { hour, minute, dateKey } = getBerlinTimeParts();
  console.log(
    `[scheduler] berlin_time=${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} date=${dateKey} force=${forceJob}`
  );

  const tasks = resolveTasks(forceJob, hour, minute);
  if (tasks.length === 0) {
    console.log("[scheduler] No matching task in this run window.");
    return;
  }

  for (const task of tasks) {
    if (task === "news") {
      console.log("[scheduler] Running news refresh...");
      runCommand("npm", ["run", "job:scheduler", "--", "--run-news-now"]);
      continue;
    }

    if (task === "morning") {
      console.log("[scheduler] Running morning Telegram message...");
      runCommand("npm", ["run", "job:scheduler", "--", "--run-morning-now"]);
      continue;
    }

    if (task === "analysis") {
      console.log("[scheduler] Installing Playwright Chromium for Glooko export...");
      runCommand("npx", ["playwright", "install", "chromium"]);
      console.log("[scheduler] Running nightly export + ingest + analysis...");
      runCommand("npm", ["run", "job:scheduler", "--", "--run-analysis-now"]);
    }
  }
}

main();
