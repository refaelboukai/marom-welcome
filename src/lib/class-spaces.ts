import { Sprout, TreePine, TreeDeciduous, Palmtree, Cherry, Folder, LucideIcon } from "lucide-react";

export interface ClassSpaceTheme {
  name: string;      // "ניצן"
  motto: string;     // "התחלה של דרך"
  teachers: string;  // "חווה + מור"
  hue: string;       // css variable name
  icon: LucideIcon;
}

const BY_NAME: Record<string, { motto: string; hue: string; icon: LucideIcon }> = {
  "ניצן": { motto: "התחלה של דרך", hue: "--class-sprout", icon: Sprout },
  "ארז": { motto: "לצמוח לגובה", hue: "--class-pine", icon: TreePine },
  "אלון": { motto: "חוסן, יציבות וצמיחה", hue: "--class-oak", icon: TreeDeciduous },
  "תמר": { motto: "סבלנות, מתיקות ותנועה", hue: "--class-palm", icon: Palmtree },
  "רימון": { motto: "בלב — כוח וצמיחה", hue: "--class-pomegranate", icon: Cherry },
};

const FALLBACK_HUES = ["--class-pine", "--class-sprout", "--class-palm", "--class-oak", "--class-pomegranate"];

/** Parses a stored class label such as "רימון (עדן + ריטה)" into a themed class space. */
export function getClassSpace(label: string, index = 0): ClassSpaceTheme {
  const match = label.match(/^\s*([^(]+?)\s*(?:\(([^)]*)\))?\s*$/);
  const name = (match?.[1] || label).trim();
  const teachers = (match?.[2] || "").trim();
  const preset = BY_NAME[name];
  return {
    name,
    teachers,
    motto: preset?.motto || "",
    hue: preset?.hue || FALLBACK_HUES[index % FALLBACK_HUES.length],
    icon: preset?.icon || Folder,
  };
}