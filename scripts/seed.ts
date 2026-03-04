import { addMinutes, startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

async function main() {
  const base = startOfDay(subDays(new Date(), 1));

  const rows = Array.from({ length: 288 }, (_, i) => {
    const timestamp = addMinutes(base, i * 5);
    const glucose = Math.round(110 + 28 * Math.sin(i / 14) + (i % 9));

    return prisma.cgmReading.upsert({
      where: {
        source_timestamp: {
          source: "glooko",
          timestamp
        }
      },
      create: {
        source: "glooko",
        timestamp,
        glucose
      },
      update: {
        glucose
      }
    });
  });

  await prisma.$transaction(rows);
  console.log(`Seeded ${rows.length} readings`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
