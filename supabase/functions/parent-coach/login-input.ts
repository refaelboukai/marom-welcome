export function parseParentLogin(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const child_name = typeof body.child_name === "string" ? body.child_name.trim().slice(0, 60) : "";
  if (name.length < 2) throw new Error("יש להזין שם הורה");
  if (child_name.length < 2) throw new Error("יש להזין את שם הילד/ה");
  return {
    name,
    child_name,
    parent_role: body.parent_role === "mother" ? "mother" : "father",
    child_gender: body.child_gender === "daughter" ? "daughter" : "son",
  };
}