export const PASTORAL_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  CLOSED: "Closed",
} as const;

export const PASTORAL_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export const PRAYER_STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  ANSWERED: "Answered",
  CLOSED: "Closed",
} as const;

export const PASTORAL_CASE_TYPE_SUGGESTIONS = [
  "Counselling",
  "Hospital Visit",
  "Bereavement",
  "Marriage",
  "Financial Assistance",
  "Prayer",
  "Follow-up",
] as const;
