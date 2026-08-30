import { BackLink } from "@/components/back-link";
import { MemberForm } from "@/features/members/components/member-form";

export default function NewMemberPage() {
  return (
    <div className="space-y-6">
      <BackLink href="/members">Back to members</BackLink>
      <h1 className="text-2xl font-bold text-text">Add member</h1>
      <MemberForm />
    </div>
  );
}
