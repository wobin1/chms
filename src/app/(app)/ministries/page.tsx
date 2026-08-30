"use client";

import { NamedGroupListPage } from "@/features/groups/named-group-screens";

export default function MinistriesPage() {
  return (
    <NamedGroupListPage
      title="Ministries"
      singular="ministry"
      apiPath="/api/v1/ministries"
      queryKey="ministries"
      hrefBase="/ministries"
      placeholder="Youth"
    />
  );
}
