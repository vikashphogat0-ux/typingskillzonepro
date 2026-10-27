
/**
 * Centralized pricing and entitlements catalog.
 *
 * IMPORTANT:
 * - All monetary amounts are in paise.
 * - Checkout APIs must use this catalog for server-side amount validation.
 * - Do not trust client-submitted prices.
 * - The enterprise institute plan is intentionally not defined until its
 *   approved price and entitlements are supplied.
 */

export type StudentPlanId =
  | "free"
  | "seven_day"
  | "student_pro_monthly"
  | "student_pro_quarterly"
  | "student_pro_half_yearly"
  | "student_pro_annual";

export type InstitutePlanId =
  | "institute_basic"
  | "institute_growth"
  | "institute_enterprise";

export type AddOnId =
  | "additional_50_seats"
  | "additional_branch"
  | "custom_branding"
  | "white_label"
  | "setup_training";

export type BillingInterval = "one_time" | "recurring" | "ongoing";

export interface StudentFeatureEntitlements {
  accessPremiumPassages: boolean;
  accessEnglishTyping: boolean;
  accessHindiTyping: boolean;
  accessMockTests: boolean;
  unlimitedTests: boolean;
  historyRows: number;
  aiFeedback: boolean;
  detailedAnalytics: boolean;
  progressTracking: boolean;
  downloadReports: boolean;
  certificates: boolean;
  weakKeyAnalysis: boolean;
  practiceStreaks: boolean;
  achievements: boolean;
  leaderboardAccess: boolean;
  competitionsAccess: boolean;
}

export interface StudentPlanDef {
  id: StudentPlanId;
  displayName: string;
  displayOrder: number;
  currency: "INR";
  amountPaise: number;
  billingInterval: BillingInterval;
  durationDays: number | null;
  seatLimit: number;
  featureEntitlements: StudentFeatureEntitlements;
  addOns: AddOnId[];
}

export interface InstituteFeatureEntitlements {
  ownerAccount: boolean;
  instituteProfile: boolean;
  logoUpload: boolean;
  studentEnrollment: boolean;
  batchCreation: boolean;
  englishHindiPractice: boolean;
  mockTestsAccess: boolean;
  basicReports: boolean;
  attendanceTracking: boolean;
  basicReportsOnly: boolean;
  multipleTeachers: boolean;
  multipleBatches: boolean;
  batchWiseAnalytics: boolean;
  customPracticeAssignments: boolean;
  scheduledMockTests: boolean;
  leaderboardCompetitions: boolean;
  csvExport: boolean;
  brandedDashboard: boolean;
  teacherPermissions: boolean;
  multipleBranches: boolean;
  branchLevelReporting: boolean;
  instituteWideReporting: boolean;
  advancedTeacherPermissions: boolean;
  bulkEnrollment: boolean;
  instituteWideMockExams: boolean;
  enhancedAnalytics: boolean;
  prioritySupport: boolean;
}

export interface InstitutePlanDef {
  id: InstitutePlanId;
  displayName: string;
  displayOrder: number;
  currency: "INR";
  monthlyAmountPaise: number;
  annualAmountPaise: number;
  billingInterval: "monthly" | "annual";
  durationDays: number | null;
  maxStudentSeats: number;
  featureEntitlements: InstituteFeatureEntitlements;
  addOns: AddOnId[];
}

export interface AddOnDef {
  id: AddOnId;
  displayName: string;
  description: string;
  currency: "INR";
  amountPaise: number;
  billingInterval: BillingInterval;
  durationDays: number | null;
  maxQuantity: number | null;
  eligiblePlans: InstitutePlanId[];
  featureEntitlements: Record<string, boolean | number>;
}

export interface PromotionDef {
  code: string;
  discountType: "fixed_paise" | "percentage";
  discountValue: number;
  eligiblePlanIds: StudentPlanId[];
  eligibleInstitutePlanIds: InstitutePlanId[];
  startDate: Date;
  expiryDate: Date;
  maxRedemptions: number | null;
  perUserLimit: number;
  minimumPurchasePaise: number;
  active: boolean;
}

const FREE_FEATURES: StudentFeatureEntitlements = {
  accessPremiumPassages: false,
  accessEnglishTyping: true,
  accessHindiTyping: true,
  accessMockTests: false,
  unlimitedTests: false,
  historyRows: 10,
  aiFeedback: false,
  detailedAnalytics: false,
  progressTracking: true,
  downloadReports: false,
  certificates: false,
  weakKeyAnalysis: false,
  practiceStreaks: false,
  achievements: false,
  leaderboardAccess: false,
  competitionsAccess: false,
};

const PRO_FEATURES: StudentFeatureEntitlements = {
  accessPremiumPassages: true,
  accessEnglishTyping: true,
  accessHindiTyping: true,
  accessMockTests: true,
  unlimitedTests: true,
  historyRows: 100,
  aiFeedback: false,
  detailedAnalytics: true,
  progressTracking: true,
  downloadReports: true,
  certificates: true,
  weakKeyAnalysis: true,
  practiceStreaks: true,
  achievements: true,
  leaderboardAccess: true,
  competitionsAccess: true,
};

export const STUDENT_PLANS: Record<StudentPlanId, StudentPlanDef> = {
  free: {
    id: "free",
    displayName: "Free",
    displayOrder: 0,
    currency: "INR",
    amountPaise: 0,
    billingInterval: "ongoing",
    durationDays: null,
    seatLimit: 0,
    featureEntitlements: { ...FREE_FEATURES },
    addOns: [],
  },

  seven_day: {
    id: "seven_day",
    displayName: "7-Day Pass",
    displayOrder: 1,
    currency: "INR",
    amountPaise: 2900,
    billingInterval: "one_time",
    durationDays: 7,
    seatLimit: 0,
    featureEntitlements: { ...PRO_FEATURES },
    addOns: [],
  },

  student_pro_monthly: {
    id: "student_pro_monthly",
    displayName: "Student Pro Monthly",
    displayOrder: 2,
    currency: "INR",
    amountPaise: 9900,
    billingInterval: "recurring",
    durationDays: 30,
    seatLimit: 0,
    featureEntitlements: { ...PRO_FEATURES },
    addOns: [],
  },

  student_pro_quarterly: {
    id: "student_pro_quarterly",
    displayName: "Student Pro Quarterly",
    displayOrder: 3,
    currency: "INR",
    amountPaise: 24900,
    billingInterval: "recurring",
    durationDays: 90,
    seatLimit: 0,
    featureEntitlements: { ...PRO_FEATURES },
    addOns: [],
  },

  student_pro_half_yearly: {
    id: "student_pro_half_yearly",
    displayName: "Student Pro Half-Yearly",
    displayOrder: 4,
    currency: "INR",
    amountPaise: 44900,
    billingInterval: "recurring",
    durationDays: 180,
    seatLimit: 0,
    featureEntitlements: { ...PRO_FEATURES },
    addOns: [],
  },

  student_pro_annual: {
    id: "student_pro_annual",
    displayName: "Student Pro Annual",
    displayOrder: 5,
    currency: "INR",
    amountPaise: 79900,
    billingInterval: "recurring",
    durationDays: 365,
    seatLimit: 0,
    featureEntitlements: { ...PRO_FEATURES },
    addOns: [],
  },
};

const BASIC_INSTITUTE_FEATURES: InstituteFeatureEntitlements = {
  ownerAccount: true,
  instituteProfile: true,
  logoUpload: true,
  studentEnrollment: true,
  batchCreation: true,
  englishHindiPractice: true,
  mockTestsAccess: true,
  basicReports: true,
  attendanceTracking: false,
  basicReportsOnly: true,
  multipleTeachers: false,
  multipleBatches: false,
  batchWiseAnalytics: false,
  customPracticeAssignments: false,
  scheduledMockTests: false,
  leaderboardCompetitions: false,
  csvExport: false,
  brandedDashboard: false,
  teacherPermissions: false,
  multipleBranches: false,
  branchLevelReporting: false,
  instituteWideReporting: false,
  advancedTeacherPermissions: false,
  bulkEnrollment: false,
  instituteWideMockExams: false,
  enhancedAnalytics: false,
  prioritySupport: false,
};

const GROWTH_INSTITUTE_FEATURES: InstituteFeatureEntitlements = {
  ...BASIC_INSTITUTE_FEATURES,
  basicReportsOnly: false,
  multipleTeachers: true,
  multipleBatches: true,
  batchWiseAnalytics: true,
  customPracticeAssignments: true,
  scheduledMockTests: true,
  leaderboardCompetitions: true,
  csvExport: true,
  brandedDashboard: true,
  teacherPermissions: true,
};

export const INSTITUTE_PLANS: Partial<
  Record<InstitutePlanId, InstitutePlanDef>
> = {
  institute_basic: {
    id: "institute_basic",
    displayName: "Institute Basic",
    displayOrder: 0,
    currency: "INR",
    monthlyAmountPaise: 149900,
    annualAmountPaise: 149999,
    billingInterval: "monthly",
    durationDays: null,
    maxStudentSeats: 30,
    featureEntitlements: { ...BASIC_INSTITUTE_FEATURES },
    addOns: [
      "additional_50_seats",
      "additional_branch",
      "custom_branding",
      "setup_training",
    ],
  },

  institute_growth: {
    id: "institute_growth",
    displayName: "Institute Growth",
    displayOrder: 1,
    currency: "INR",
    monthlyAmountPaise: 299900,
    annualAmountPaise: 299999,
    billingInterval: "monthly",
    durationDays: null,
    maxStudentSeats: 100,
    featureEntitlements: { ...GROWTH_INSTITUTE_FEATURES },
    addOns: [
      "additional_50_seats",
      "additional_branch",
      "custom_branding",
      "white_label",
      "setup_training",
    ],
  },

  // Enterprise is intentionally unavailable until its approved pricing,
  // limits, and entitlements are supplied. Do not charge for an undefined plan.
};

export const ADD_ONS: Record<AddOnId, AddOnDef> = {
  additional_50_seats: {
    id: "additional_50_seats",
    displayName: "Additional 50 student seats",
    description:
      "Increases the purchased plan's seat allowance by 50 active student accounts per pack.",
    currency: "INR",
    amountPaise: 99900,
    billingInterval: "recurring",
    durationDays: 30,
    maxQuantity: null,
    eligiblePlans: [
      "institute_basic",
      "institute_growth",
      "institute_enterprise",
    ],
    featureEntitlements: { increasesSeatAllowanceBy: 50 },
  },

  additional_branch: {
    id: "additional_branch",
    displayName: "Additional institute branch",
    description:
      "Adds a branch only where branch-management functionality is implemented and enabled.",
    currency: "INR",
    amountPaise: 149900,
    billingInterval: "recurring",
    durationDays: 30,
    maxQuantity: null,
    eligiblePlans: ["institute_growth", "institute_enterprise"],
    featureEntitlements: { addsBranch: true },
  },

  custom_branding: {
    id: "custom_branding",
    displayName: "Custom institute branding",
    description:
      "One-time purchase for supported institute branding settings.",
    currency: "INR",
    amountPaise: 499900,
    billingInterval: "one_time",
    durationDays: null,
    maxQuantity: 1,
    eligiblePlans: [
      "institute_basic",
      "institute_growth",
      "institute_enterprise",
    ],
    featureEntitlements: { customBranding: true },
  },

  white_label: {
    id: "white_label",
    displayName: "White-label platform",
    description:
      "Not an operational entitlement until custom domains, branding, tenant isolation, and required operational features are implemented.",
    currency: "INR",
    amountPaise: 1499000,
    billingInterval: "recurring",
    durationDays: 30,
    maxQuantity: null,
    eligiblePlans: ["institute_enterprise"],
    featureEntitlements: { whiteLabelNotYetImplemented: true },
  },

  setup_training: {
    id: "setup_training",
    displayName: "Assisted setup and training",
    description:
      "One-time assisted setup service with three training sessions. This is not an automatic software entitlement.",
    currency: "INR",
    amountPaise: 299900,
    billingInterval: "one_time",
    durationDays: null,
    maxQuantity: 1,
    eligiblePlans: [
      "institute_basic",
      "institute_growth",
      "institute_enterprise",
    ],
    featureEntitlements: {
      assistedSetup: true,
      trainingSessions: 3,
    },
  },
};

export const PROMOTIONS: PromotionDef[] = [];

export const LIMITS = {
  // These are application-level defaults. Confirm them against the
  // existing student-access and test-enforcement implementation.
  free: {
    testsPerDay: 3,
    historyRows: 10,
  },
  pro: {
    testsPerDay: null,
    historyRows: 100,
  },
} as const;

export function rupeesFromPaise(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0";

  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export function effectiveMonthlyPrice(
  annualPaise: number,
  _monthlyPaise?: number
): number {
  return Math.round(annualPaise / 12);
}

export function annualSavingsPercentage(
  annualPaise: number,
  monthlyPaise: number
): number {
  const normalAnnualPrice = monthlyPaise * 12;

  if (normalAnnualPrice <= 0 || annualPaise >= normalAnnualPrice) {
    return 0;
  }

  return Math.round(
    ((normalAnnualPrice - annualPaise) / normalAnnualPrice) * 100
  );
}

export function getStudentPlan(
  id: StudentPlanId
): StudentPlanDef | undefined {
  return STUDENT_PLANS[id];
}

export function getInstitutePlan(
  id: InstitutePlanId
): InstitutePlanDef | undefined {
  return INSTITUTE_PLANS[id];
}

export function getAddOn(id: AddOnId): AddOnDef | undefined {
  return ADD_ONS[id];
}

export function validateAmount(
  amountPaise: number,
  expectedPaise: number
): { valid: boolean; diff: number } {
  const validInputs =
    Number.isSafeInteger(amountPaise) &&
    Number.isSafeInteger(expectedPaise) &&
    amountPaise >= 0 &&
    expectedPaise >= 0;

  if (!validInputs) {
    return { valid: false, diff: Number.NaN };
  }

  return {
    valid: amountPaise === expectedPaise,
    diff: amountPaise - expectedPaise,
  };
}

export function toPaise(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined || value === "") return 0;

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) return 0;

  return Math.round(amount * 100);
}

export function billingIntervalLabel(
  interval: BillingInterval
): string {
  switch (interval) {
    case "one_time":
      return "One-time payment";
    case "recurring":
      return "Subscription";
    case "ongoing":
      return "Ongoing";
    default: {
      const exhaustiveCheck: never = interval;
      return exhaustiveCheck;
    }
  }
}

export function durationLabel(days: number | null): string {
  if (days === null) return "Ongoing";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function offerText(plan: StudentPlanDef): string {
  if (plan.id === "free") return "Free access";

  if (plan.billingInterval === "one_time") {
    return `${durationLabel(plan.durationDays)} of access`;
  }

  return `${durationLabel(plan.durationDays)} subscription`;
}

export function instituteSavingsText(plan: InstitutePlanDef): string {
  const monthlyForYear = plan.monthlyAmountPaise * 12;
  const savings = monthlyForYear - plan.annualAmountPaise;

  if (savings <= 0 || monthlyForYear <= 0) return "";

  return `Save ${rupeesFromPaise(savings)} per year`;
}
