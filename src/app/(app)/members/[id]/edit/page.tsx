"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { MemberForm } from "@/features/members/components/member-form";
import { QueryState } from "@/components/query-state";

type Member = {
  id: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  dateJoined: string | null;
  photoUrl: string | null;
  photoPublicId: string | null;
  zoneId: string | null;
  membershipStatusId: string;
};

export default function EditMemberPage() {
  const params = useParams<{ id: string }>();
  const member = useQuery({
    queryKey: ["members", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/members/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Member;
    },
  });

  return (
    <div className="space-y-6">
      <BackLink href={`/members/${params.id}`}>Back to member</BackLink>
      <h1 className="text-2xl font-bold text-text">Edit member</h1>
      <QueryState
        variant="form"
        isLoading={member.isLoading}
        isError={member.isError}
        isFetching={member.isFetching && !member.isLoading}
      >
        {member.data ? (
          <MemberForm
            memberId={member.data.id}
            initial={{
              membershipNumber: member.data.membershipNumber,
              firstName: member.data.firstName,
              lastName: member.data.lastName,
              phone: member.data.phone ?? "",
              email: member.data.email ?? "",
              address: member.data.address ?? "",
              city: member.data.city ?? "",
              dateJoined: member.data.dateJoined ?? "",
              membershipStatusId: member.data.membershipStatusId,
              zoneId: member.data.zoneId ?? "",
              photoUrl: member.data.photoUrl ?? "",
              photoPublicId: member.data.photoPublicId ?? "",
            }}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
