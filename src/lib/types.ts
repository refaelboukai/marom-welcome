export type IntakeStatus =
  | "not_started"
  | "student_started"
  | "student_completed"
  | "parent_started"
  | "parent_completed"
  | "under_review"
  | "completed";

export type QuestionnaireSection =
  | "quality_of_life"
  | "self_efficacy"
  | "locus_of_control"
  | "cognitive_flexibility";

export interface QuestionnaireItem {
  id: string;
  section: QuestionnaireSection;
  studentText: string;
  parentText: string;
  isReverse: boolean;
  subdomain?: string;
}

export interface IntakeSession {
  id: string;
  studentName: string;
  studentIdNumber: string;
  grade: string;
  intakeDate: string;
  parentName: string;
  parentPhone: string;
  secondParentName?: string;
  notes?: string;
  studentCode: string;
  parentCode: string;
  staffCode?: string;
  classGroup?: string;
  status: IntakeStatus;
  studentResponses: Record<string, number>;
  studentOpenResponses: Record<string, string>;
  parentResponses: Record<string, number>;
  parentOpenResponse?: string;
  staffResponses: Record<string, number>;
  staffOpenResponses: Record<string, string>;
  scores?: ScoreResults;
  riskFlags?: RiskFlag[];
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  reassessmentStatus?: string;
  reassessmentStudentResponses?: Record<string, number>;
  reassessmentParentResponses?: Record<string, number>;
  reassessmentDate?: string;
}

export interface DomainScore {
  raw: number;
  normalized: number;
  completionRate: number;
  studentNormalized: number;
  parentNormalized: number;
}

export interface ScoreResults {
  qualityOfLife: DomainScore;
  selfEfficacy: DomainScore;
  locusOfControl: DomainScore;
  cognitiveFlexibility: DomainScore;
}

export interface RiskFlag {
  domain: string;
  severity: "attention" | "concern" | "urgent";
  message: string;
}

export interface GASGoal {
  id: string;
  area: string;
  current: string;
  level0: string;
  level1: string;
  level2: string;
}

export interface InsightResult {
  summary: string;
  strengths: string[];
  areasForSupport: string[];
  discrepancies: string[];
  recommendations: string[];
  interpretation: string;
}

export const STATUS_LABELS: Record<IntakeStatus, string> = {
  not_started: "טרם החל",
  student_started: "התלמיד התחיל",
  student_completed: "התלמיד השלים",
  parent_started: "ההורה התחיל",
  parent_completed: "ההורה השלים",
  under_review: "בבדיקה",
  completed: "הושלם",
};

export const SECTION_LABELS: Record<QuestionnaireSection, string> = {
  quality_of_life: "איכות חיים",
  self_efficacy: "מסוגלות עצמית",
  locus_of_control: "מיקוד שליטה",
  cognitive_flexibility: "גמישות קוגניטיבית",
};

export const QOL_SUBDOMAIN_LABELS: Record<string, string> = {
  general_wellbeing: "רווחה כללית",
  social: "חברתי",
  emotional: "רגשי",
  independence: "עצמאות",
  academic: "לימודי",
  health_lifestyle: "בריאות ואורח חיים",
  family_support: "משפחה ותמיכה",
  self_view: "תפיסה עצמית",
};

export const OPEN_QUESTION_KEYS = [
  "significant_figure",
  "interests",
  "dream",
  "want_to_change",
  "areas_to_advance",
] as const;

export const OPEN_QUESTION_LABELS: Record<string, string> = {
  significant_figure: "דמות משמעותית בחיי",
  interests: "תחומי עניין",
  dream: "החלום שלי",
  want_to_change: "מה הייתי רוצה לשנות",
  areas_to_advance: "שלושה תחומים שאני רוצה לקדם",
};

export const STAFF_QUESTION_KEYS = [
  "staff_behavioral",
  "staff_social",
  "staff_academic",
  "staff_emotional",
  "staff_recommendations",
] as const;

export const STAFF_QUESTION_LABELS: Record<string, string> = {
  staff_behavioral: "תפקוד התנהגותי",
  staff_social: "תפקוד חברתי",
  staff_academic: "תפקוד לימודי",
  staff_emotional: "תפקוד רגשי",
  staff_recommendations: "המלצות הצוות",
};
