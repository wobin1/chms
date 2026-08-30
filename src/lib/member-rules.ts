import { NotFoundError } from "./errors";

export function assertZoneBelongsToChurch(
  zone: { id: string; churchId: string } | null,
  churchId: string,
): asserts zone is { id: string; churchId: string } {
  if (!zone || zone.churchId !== churchId) {
    throw new NotFoundError();
  }
}

export function assertMemberBelongsToChurch(
  member: { id: string; churchId: string } | null,
  churchId: string,
): asserts member is { id: string; churchId: string } {
  if (!member || member.churchId !== churchId) {
    throw new NotFoundError();
  }
}
