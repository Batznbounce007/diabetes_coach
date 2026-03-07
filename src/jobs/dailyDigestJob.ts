import cron from "node-cron";
import { subDays } from "date-fns";
import { parseGlookoCsv, upsertReadings } from "@/lib/cgmIngest";
import { computeAndStoreDailySummary, sendDailySummaryMessage, runDailyDigest } from "@/lib/dailyDigest";
import { exportGlookoCsvForDay } from "@/lib/glookoExport";
import { refreshNewsCache } from "@/lib/news";

async function runAnalysisForDay(day: Date): Promise<void> {
  const dayString = day.toISOString().slice(0, 10);
  const csvContent = await exportGlookoCsvForDay(dayString);
  const readings = await parseGlookoCsv(csvContent);
  await upsertReadings(readings);
  for (let i = 13; i >= 0; i -= 1) {
    await computeAndStoreDailySummary(subDays(day, i));
  }
}

async function runMorningMessage(): Promise<void> {
  const previousDay = subDays(new Date(), 1);
  await sendDailySummaryMessage(previousDay);
}

async function runNewsRefresh(): Promise<void> {
  await refreshNewsCache(24);
}

export function startDailyJob(): void {
  // 23:59 Europe/Berlin: export + ingest + analysis for the day.
  cron.schedule(
    "59 23 * * *",
    async () => {
      try {
        await runAnalysisForDay(new Date());
      } catch (error) {
        console.error("Nightly analysis job failed", error);
      }
    },
    {
      timezone: "Europe/Berlin"
    }
  );

  // 09:00 Europe/Berlin: send Telegram message with previous day's summary.
  cron.schedule(
    "0 9 * * *",
    async () => {
      try {
        await runMorningMessage();
      } catch (error) {
        console.error("Morning Telegram job failed", error);
      }
    },
    {
      timezone: "Europe/Berlin"
    }
  );

  // 08:00 Europe/Berlin: refresh News & Research cache for dashboard.
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await runNewsRefresh();
      } catch (error) {
        console.error("Morning news refresh job failed", error);
      }
    },
    {
      timezone: "Europe/Berlin"
    }
  );
}

if (process.argv.includes("--run-now")) {
  runDailyDigest(new Date())
    .then(() => {
      console.log("Daily digest executed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else if (process.argv.includes("--run-analysis-now")) {
  runAnalysisForDay(new Date())
    .then(() => {
      console.log("Nightly analysis executed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else if (process.argv.includes("--run-morning-now")) {
  runMorningMessage()
    .then(() => {
      console.log("Morning message executed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else if (process.argv.includes("--run-news-now")) {
  runNewsRefresh()
    .then(() => {
      console.log("News refresh executed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
} else {
  startDailyJob();
  console.log(
    "Scheduler active: news at 08:00, analysis at 23:59 and Telegram at 09:00 (Europe/Berlin)."
  );
}
