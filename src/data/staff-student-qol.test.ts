import { describe, expect, it } from "vitest";
import { STAFF_STUDENT_QOL_DOMAINS, STAFF_STUDENT_QOL_ITEMS, computeStaffStudentQolResults } from "./staff-student-qol";

describe("staff observer quality of life", () => {
  it("has exactly 32 items in eight groups of four", () => {
    expect(STAFF_STUDENT_QOL_ITEMS).toHaveLength(32);
    expect(STAFF_STUDENT_QOL_DOMAINS).toHaveLength(8);
    expect(new Set(STAFF_STUDENT_QOL_ITEMS.map((item) => item.id)).size).toBe(32);
    for (const domain of STAFF_STUDENT_QOL_DOMAINS) {
      expect(STAFF_STUDENT_QOL_ITEMS.filter((item) => item.domain === domain.key)).toHaveLength(4);
    }
  });
  it("scores observer responses on 1–5 including reverse scoring", () => {
    const responses = Object.fromEntries(STAFF_STUDENT_QOL_ITEMS.map((item) => [item.id, item.isReverse ? 1 : 5]));
    expect(computeStaffStudentQolResults(responses).overall).toBe(5);
    expect(computeStaffStudentQolResults({ emotional_1: 4, emotional_2: 1 }).domains[0].score).toBe(2.5);
    expect(computeStaffStudentQolResults({ emotional_4: 5 }).domains[0].score).toBe(1);
  });
  it("never treats unknown answers as low scores", () => {
    const result = computeStaffStudentQolResults({ emotional_1: 5, emotional_2: 0, emotional_3: 0, emotional_4: 0 });
    expect(result.domains[0].score).toBe(5);
    expect(result.answered).toBe(1);
    expect(result.domains[1].level).toBe("אין מידע");
    expect(computeStaffStudentQolResults({ emotional_1: 9 }).answered).toBe(0);
  });
});