import { describe, expect, it } from "vitest";
import { STAFF_QOL_DOMAINS, STAFF_QOL_ITEMS, computeStaffQolResults } from "./staff-qol";

describe("staff quality of life", () => {
  it("covers all eight dimensions from the supplied document", () => {
    expect(STAFF_QOL_DOMAINS.map((d) => d.key)).toEqual([
      "emotional", "interpersonal", "material", "development", "physical",
      "self_determination", "inclusion", "rights",
    ]);
    for (const domain of STAFF_QOL_DOMAINS) {
      expect(STAFF_QOL_ITEMS.filter((i) => i.domain === domain.key)).toHaveLength(4);
    }
  });

  it("calculates each domain on the 1–5 scale with reverse scoring", () => {
    const responses = Object.fromEntries(STAFF_QOL_ITEMS.map((item) => [item.id, item.isReverse ? 1 : 5]));
    const result = computeStaffQolResults(responses);
    expect(result.total).toBe(32);
    expect(result.answered).toBe(32);
    expect(result.overall).toBe(5);
    expect(result.domains.every((d) => d.score === 5 && d.percent === 100)).toBe(true);
    expect(computeStaffQolResults({ emotional_1: 4, emotional_2: 1 }).domains[0].score).toBe(2.5);
  });
});