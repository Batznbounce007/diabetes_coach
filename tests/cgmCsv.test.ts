import { describe, expect, it } from "vitest";
import { parseGlookoCsv } from "@/lib/cgmIngest";

const csv = `Timestamp,Glucose mg/dL\n2026-02-28 08:00:00,105\n2026-02-28 08:05:00,112\n`;

describe("parseGlookoCsv", () => {
  it("parses CSV into normalized readings", async () => {
    const rows = await parseGlookoCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].glucose).toBe(105);
    expect(rows[0].timestamp.toISOString()).toBe("2026-02-28T08:00:00.000Z");
  });

  it("drops invalid rows", async () => {
    const rows = await parseGlookoCsv("Timestamp,Glucose mg/dL\nbad,abc\n");

    expect(rows).toHaveLength(0);
  });
});
