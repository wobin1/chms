export type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};

export const MEMBER_PICKER_PAGE_SIZE = 20;

export function formatMemberLabel(member: MemberOption): string {
  return `${member.lastName}, ${member.firstName} (${member.membershipNumber})`;
}

export function memberPickerSearchUrl(query: string): string {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(MEMBER_PICKER_PAGE_SIZE),
  });
  const q = query.trim();
  if (q) params.set("q", q);
  return `/api/v1/members?${params.toString()}`;
}

export function toggleMemberId(selected: string[], id: string): string[] {
  return selected.includes(id)
    ? selected.filter((row) => row !== id)
    : [...selected, id];
}

export function mergeMemberOptions(
  results: MemberOption[],
  selected: MemberOption[],
): MemberOption[] {
  const byId = new Map<string, MemberOption>();
  for (const row of results) byId.set(row.id, row);
  for (const row of selected) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}
