export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  grade: string;
  address: string;
  city: string;
  motherName: string;
  fatherName: string;
  motherPhone: string;
  fatherPhone: string;
  motherEmail: string;
  fatherEmail: string;
  gender: string;
  code?: string;
  group?: string;
}

export const ADMIN_CODE = "9020";

export const studentCodes: { name: string; code: string; group: string }[] = [
  // קבוצה ראשונה
  { name: "אוריאן שיקלי", code: "3MWANYDP", group: "1" },
  { name: "רון מרש", code: "4KD6DSCL", group: "1" },
  { name: "הודיה אלחרר", code: "2NYLMKY5", group: "1" },
  { name: "יובל אורטס", code: "4WVZJ6C5", group: "1" },
  { name: "ענהאל שמיאן דהן", code: "2QAPD446", group: "1" },
  { name: "להב נהוראי", code: "4K63KH4F", group: "1" },
  { name: "ליאן עמאר", code: "2ES4CVZ9", group: "1" },
  // קבוצה שנייה
  { name: "תאיר שקיר", code: "2FMZ95WF", group: "2" },
  { name: "אריאל עוז עזרא", code: "2WHMZBQW", group: "2" },
  { name: "נעם יחיאב", code: "3JCKN2HT", group: "2" },
  { name: "אלה בן דוד", code: "3PV9ADF8", group: "2" },
  { name: "איתמר דכינגר", code: "5CQM2KMB", group: "2" },
  { name: "אוריאן קדוש", code: "5GW3XBN5", group: "2" },
  { name: "ליה קרמר", code: "5U7SZXQ3", group: "2" },
  { name: "נעם טובי קרלן", code: "6DDFP7Y2", group: "2" },
  { name: "נחמן דרור", code: "6SMMR6UD", group: "2" },
  { name: "אילון שוורץ", code: "6ZP6SNHT", group: "2" },
  { name: "איתמר דהן", code: "72Z96TWV", group: "2" },
  { name: "עופר יוסף בכר", code: "7CJRQ33K", group: "2" },
  { name: "ליה פקנהיים", code: "7E7BQBST", group: "2" },
];

export const studentsData: Omit<Student, "code" | "group">[] = [
  { id: "220875173", firstName: "ליאן", lastName: "עמאר", birthDate: "01.08.2012", grade: "ז", address: "ויצמן 13", city: "קרית מלאכי", motherName: "עמית", fatherName: "", motherPhone: "", fatherPhone: "", motherEmail: "", fatherEmail: "", gender: "נ" },
  { id: "338910508", firstName: "תאיר", lastName: "שקיר", birthDate: "25.10.2013", grade: "ז", address: "חרמון 16/1", city: "יבנה", motherName: "הילה", fatherName: "ירון", motherPhone: "050-4253375", fatherPhone: "050-2840220", motherEmail: "hila130683@gmail.com", fatherEmail: "yaronshakir@gmail.com", gender: "נ" },
  { id: "221711583", firstName: "אגם", lastName: "סובייב", birthDate: "04.04.2013", grade: "ז", address: "", city: "נס ציונה", motherName: "עמית", fatherName: "", motherPhone: "052-3372093", fatherPhone: "", motherEmail: "", fatherEmail: "", gender: "נ" },
  { id: "338533714", firstName: "הודיה", lastName: "אלחרר", birthDate: "18.06.2013", grade: "ז", address: "יערה 84", city: "קרית עקרון", motherName: "נורית", fatherName: "יהודה", motherPhone: "052-4804044", fatherPhone: "052-7077354", motherEmail: "", fatherEmail: "", gender: "נ" },
  { id: "336737879", firstName: "ענהאל", lastName: "שמיאן דהן", birthDate: "25.09.2012", grade: "ז", address: "פנימיית אורנים", city: "ראשון לציון", motherName: "פנינה", fatherName: "", motherPhone: "050-5809011", fatherPhone: "", motherEmail: "", fatherEmail: "", gender: "נ" },
  { id: "338544315", firstName: "אריאל עוז", lastName: "עזרא", birthDate: "06.01.2013", grade: "ז", address: "נופר 20, ב'", city: "מזכרת בתיה", motherName: "ורדית", fatherName: "יוחאי", motherPhone: "050-2669697", fatherPhone: "", motherEmail: "vardits22@gmail.com", fatherEmail: "", gender: "ז" },
  { id: "220569461", firstName: "נעם", lastName: "יחיאב", birthDate: "29.08.2012", grade: "ז", address: "היוגבים 7/9", city: "ראשון לציון", motherName: "עמית", fatherName: "אוהד", motherPhone: "052-2325271", fatherPhone: "050-8787034", motherEmail: "amit.yehiav@ppd.com", fatherEmail: "ohad.yhv@gmail.com", gender: "" },
  { id: "336633144", firstName: "אוריאן", lastName: "שיקלי", birthDate: "16.07.2012", grade: "ח", address: "השיריון 16 א", city: "נס ציונה", motherName: "מירב", fatherName: "ניסים", motherPhone: "050-8710737", fatherPhone: "050-7792157", motherEmail: "", fatherEmail: "nisim6574@gmail.com", gender: "נ" },
  { id: "221014160", firstName: "אלה", lastName: "בן דוד", birthDate: "18.05.2012", grade: "ח", address: "התורן 8/19", city: "יבנה", motherName: "קרן", fatherName: "תומר", motherPhone: "050-9011255", fatherPhone: "054-5844618", motherEmail: "amram.k@gmail.com", fatherEmail: "tomerbd1@gmail.com", gender: "נ" },
  { id: "221088404", firstName: "להב", lastName: "נהוראי", birthDate: "13.12.2012", grade: "ח", address: "התורן 7", city: "יבנה", motherName: "אריאלה", fatherName: "איתן", motherPhone: "054-6432441", fatherPhone: "054-6969503", motherEmail: "", fatherEmail: "", gender: "ז" },
  { id: "337179972", firstName: "רון", lastName: "מרש", birthDate: "26.02.2012", grade: "ח", address: "המפרש 6", city: "יבנה", motherName: "שרונה", fatherName: "", motherPhone: "054-7928881", fatherPhone: "", motherEmail: "sharonamarsh69@gmail.com", fatherEmail: "", gender: "ז" },
  { id: "220086573", firstName: "נעם", lastName: "נחמיאס", birthDate: "23.07.2011", grade: "ח", address: "הרצל 26", city: "יבנה", motherName: "סימה", fatherName: "רפי", motherPhone: "053-5236969", fatherPhone: "053-9877510", motherEmail: "", fatherEmail: "nachmias.rafi@gmail.com", gender: "ז" },
  { id: "219875960", firstName: "יובל", lastName: "אורטס", birthDate: "05.07.2011", grade: "ט", address: "הסירה 5", city: "יבנה", motherName: "מרסל", fatherName: "אשר", motherPhone: "054-9599962", fatherPhone: "052-4846335", motherEmail: "marselortas@gmail.com", fatherEmail: "", gender: "ז" },
  { id: "334883121", firstName: "איתמר", lastName: "דכינגר", birthDate: "10.11.2010", grade: "ט", address: "הדרור 8/7", city: "יבנה", motherName: "ליאת", fatherName: "שחר", motherPhone: "052-3400317", fatherPhone: "054-5234443", motherEmail: "lilidach@gmail.com", fatherEmail: "", gender: "ז" },
  { id: "334442019", firstName: "אוריאן", lastName: "קדוש", birthDate: "12.04.2011", grade: "ט", address: "דוגית 29", city: "יבנה", motherName: "רותם", fatherName: "שלומי", motherPhone: "050-3448999", fatherPhone: "050-6447999", motherEmail: "rotemb2311@gmail.com", fatherEmail: "", gender: "נ" },
  { id: "220270474", firstName: "ליה", lastName: "קרמר", birthDate: "12.03.2011", grade: "ט", address: "הסירה 9", city: "יבנה", motherName: "רעות", fatherName: "עמית", motherPhone: "050-2227161", fatherPhone: "052-2387493", motherEmail: "reut.ere@gmail.com", fatherEmail: "", gender: "נ" },
  { id: "220087241", firstName: "נעם", lastName: "טובי קרלן", birthDate: "25.07.2011", grade: "ט", address: "האמהות 20", city: "נס ציונה", motherName: "שרון", fatherName: "אסף צבי", motherPhone: "052-5282922", fatherPhone: "054-3333356", motherEmail: "", fatherEmail: "asitubi@gmail.com", gender: "נ" },
  { id: "335205126", firstName: "נחמן", lastName: "דרור", birthDate: "22.04.2011", grade: "ט", address: "הרצל 196", city: "קרית עקרון", motherName: "אורלי", fatherName: "", motherPhone: "050-5240177", fatherPhone: "", motherEmail: "", fatherEmail: "", gender: "ז" },
  { id: "220998827", firstName: "אילון", lastName: "שוורץ", birthDate: "29.12.2011", grade: "ט", address: "בוסתן 4/26", city: "רחובות", motherName: "צפנת", fatherName: "גיא", motherPhone: "052-6626112", fatherPhone: "052-2626112", motherEmail: "tsaf74@gmail.com", fatherEmail: "schvontz@gmail.com", gender: "ז" },
];
