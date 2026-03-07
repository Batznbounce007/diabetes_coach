import { describe, expect, it } from "vitest";
import { getExportRangeLabels } from "@/lib/glookoExport";

describe("getExportRangeLabels", () => {
  it("returns 1-day labels", () => {
    expect(getExportRangeLabels(1)).toEqual(["1 Tag", "1 day"]);
  });

  it("returns multi-day labels", () => {
    expect(getExportRangeLabels(14)).toEqual(["14 Tage", "14 days"]);
  });
});
