import { studentCodes, studentsData } from "@/data/students";

export type Gender = "male" | "female" | "unknown";

/**
 * Look up gender from studentsData by student name.
 * Matches by checking if the full name contains both firstName and lastName.
 */
export function getStudentGender(studentName: string): Gender {
  // Try matching via studentCodes → studentsData
  const codeEntry = studentCodes.find(sc => sc.name === studentName);
  if (codeEntry) {
    // Find in studentsData by matching name parts
    const parts = codeEntry.name.split(" ");
    const student = studentsData.find(s => {
      const fullName = `${s.firstName} ${s.lastName}`;
      return fullName === codeEntry.name || codeEntry.name.includes(s.firstName);
    });
    if (student?.gender === "נ") return "female";
    if (student?.gender === "ז") return "male";
  }

  // Direct search in studentsData
  for (const s of studentsData) {
    const fullName = `${s.firstName} ${s.lastName}`;
    if (studentName.includes(s.firstName) && studentName.includes(s.lastName)) {
      if (s.gender === "נ") return "female";
      if (s.gender === "ז") return "male";
    }
  }

  return "unknown";
}

/**
 * Gendered text helper — returns the appropriate form based on gender.
 * Usage: g("אתה", "את") → returns correct form
 */
export function createGenderedText(gender: Gender) {
  return (male: string, female: string, neutral?: string): string => {
    if (gender === "female") return female;
    if (gender === "male") return male;
    return neutral || `${male}/${female}`;
  };
}
