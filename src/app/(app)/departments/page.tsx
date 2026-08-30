"use client";

import { NamedGroupListPage } from "@/features/groups/named-group-screens";

export default function DepartmentsPage() {
  return (
    <NamedGroupListPage
      title="Departments"
      singular="department"
      apiPath="/api/v1/departments"
      queryKey="departments"
      hrefBase="/departments"
      placeholder="Choir"
    />
  );
}
