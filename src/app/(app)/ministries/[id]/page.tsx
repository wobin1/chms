"use client";

import { NamedGroupDetailPage } from "@/features/groups/named-group-screens";

export default function MinistryDetailPage() {
  return (
    <NamedGroupDetailPage
      singular="ministry"
      apiPath="/api/v1/ministries"
      queryKey="ministries"
      hrefBase="/ministries"
    />
  );
}
