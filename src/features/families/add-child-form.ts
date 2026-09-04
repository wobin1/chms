export type FamilyAddChildGuardianInput = {
  memberId: string;
  relationship: string;
};

/** Build guardian payload for POST /api/v1/children — omit empty member picks. */
export function buildFamilyChildGuardians(
  entries: FamilyAddChildGuardianInput[],
): FamilyAddChildGuardianInput[] {
  return entries.filter((row) => Boolean(row.memberId.trim()));
}

export function familyAddChildFormReady(firstName: string, lastName: string): boolean {
  return Boolean(firstName.trim() && lastName.trim());
}
