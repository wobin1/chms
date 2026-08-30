"use client";

import { NamedGroupDetailPage } from "@/features/groups/named-group-screens";

export default function DepartmentDetailPage() {
  return (
    <NamedGroupDetailPage
      singular="department"
      apiPath="/api/v1/departments"
      queryKey="departments"
      hrefBase="/departments"
    />
  );
}
