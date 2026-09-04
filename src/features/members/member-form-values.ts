import { GENDER_LABELS } from "@/features/services/labels";
import { toDateInputValue } from "@/lib/ui";

export type MemberGenderValue = keyof typeof GENDER_LABELS;

export type MemberFormValue = {
  membershipNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: MemberGenderValue;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  occupation: string;
  maritalStatus: string;
  dateJoined: string;
  membershipStatusId: string;
  zoneId: string;
  photoUrl: string;
  photoPublicId: string;
  notes: string;
};

export function emptyMemberForm(): MemberFormValue {
  return {
    membershipNumber: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "UNSPECIFIED",
    dateOfBirth: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    occupation: "",
    maritalStatus: "",
    dateJoined: "",
    membershipStatusId: "",
    zoneId: "",
    photoUrl: "",
    photoPublicId: "",
    notes: "",
  };
}

export function memberFormFromRecord(record: {
  membershipNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: MemberGenderValue;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  dateJoined: string | null;
  membershipStatusId: string;
  zoneId: string | null;
  photoUrl: string | null;
  photoPublicId: string | null;
  notes: string | null;
}): MemberFormValue {
  return {
    membershipNumber: record.membershipNumber,
    firstName: record.firstName,
    middleName: record.middleName ?? "",
    lastName: record.lastName,
    gender: record.gender,
    dateOfBirth: toDateInputValue(record.dateOfBirth),
    phone: record.phone ?? "",
    email: record.email ?? "",
    address: record.address ?? "",
    city: record.city ?? "",
    state: record.state ?? "",
    occupation: record.occupation ?? "",
    maritalStatus: record.maritalStatus ?? "",
    dateJoined: toDateInputValue(record.dateJoined),
    membershipStatusId: record.membershipStatusId,
    zoneId: record.zoneId ?? "",
    photoUrl: record.photoUrl ?? "",
    photoPublicId: record.photoPublicId ?? "",
    notes: record.notes ?? "",
  };
}

export function memberFormPayload(values: MemberFormValue) {
  return {
    membershipNumber: values.membershipNumber,
    firstName: values.firstName,
    middleName: values.middleName.trim() || null,
    lastName: values.lastName,
    gender: values.gender,
    dateOfBirth: values.dateOfBirth || null,
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    address: values.address.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim() || null,
    occupation: values.occupation.trim() || null,
    maritalStatus: values.maritalStatus.trim() || null,
    dateJoined: values.dateJoined || null,
    membershipStatusId: values.membershipStatusId,
    zoneId: values.zoneId || null,
    photoUrl: values.photoUrl || null,
    photoPublicId: values.photoPublicId || null,
    notes: values.notes.trim() || null,
  };
}
