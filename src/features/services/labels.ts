export const SERVICE_STATUS_LABELS = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const VISITOR_STATUS_LABELS = {
  NEW: "New",
  FOLLOW_UP: "Follow-up",
  CONTACTED: "Contacted",
  RETURNING: "Returning",
  CONVERTED: "Converted",
  CLOSED: "Closed",
} as const;

export const FOLLOW_UP_LABELS = {
  NONE: "None",
  PENDING: "Pending",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
} as const;

export const GENDER_LABELS = {
  FEMALE: "Female",
  MALE: "Male",
  OTHER: "Other",
  UNSPECIFIED: "Unspecified",
} as const;

export { Select, SELECT_CLASS, selectClassName } from "@/components/ui/select";
