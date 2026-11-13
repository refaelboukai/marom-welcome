import { describe, expect, it } from "vitest";
import { parseParentLogin } from "../../supabase/functions/parent-coach/login-input";

describe("parent practice name-only entry", () => {
  it("accepts names and selected genders without code 100", () => {
    expect(parseParentLogin({ name: "דנה", child_name: "נועה", parent_role: "mother", child_gender: "daughter" }))
      .toEqual({ name: "דנה", child_name: "נועה", parent_role: "mother", child_gender: "daughter" });
  });
  it("still requires both names", () => {
    expect(() => parseParentLogin({ name: "", child_name: "נועה" })).toThrow();
    expect(() => parseParentLogin({ name: "דנה", child_name: "" })).toThrow();
  });
});