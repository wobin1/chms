import Link from "next/link";

export const FAMILIES_OF_THE_WEEK_GRID_CLASS =
  "mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4";

export type FamilyOfTheWeekCard = {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
};

export function FamiliesOfTheWeekGrid({
  families,
}: {
  families: FamilyOfTheWeekCard[];
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-text">Family of the week</h2>
      {families.length === 0 ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm text-text-muted">
            No family of the week is selected yet.
          </p>
        </div>
      ) : (
        <div className={FAMILIES_OF_THE_WEEK_GRID_CLASS}>
          {families.map((family) => (
            <article
              key={family.id}
              className="rounded-xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-text-muted">{family.zoneName}</p>
                <Link
                  href={`/families/${family.id}`}
                  className="shrink-0 text-xs font-medium text-accent"
                >
                  View family
                </Link>
              </div>
              <p className="mt-2 text-lg font-semibold text-text">
                <Link
                  href={`/families/${family.id}`}
                  className="hover:text-accent"
                >
                  {family.name}
                </Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
