"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { ListPageHeader } from "@/components/detail/layout";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatBirthdayDay, shiftCelebrantOn } from "@/lib/celebrant-rules";

type Period = "month" | "week" | "day";

type Celebrant = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  photoUrl: string | null;
  zone: { id: string; name: string } | null;
  socialCaption: string;
};

type CelebrantsResponse = {
  period: Period;
  on: string;
  from: string;
  to: string;
  churchName: string;
  listCaption: string;
  items: Celebrant[];
};

const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function monthValue(isoDate: string) {
  return isoDate.slice(5, 7);
}

function withMonth(isoDate: string, month: string) {
  const year = isoDate.slice(0, 4);
  return `${year}-${month}-01`;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

async function shareText(title: string, text: string) {
  const share = navigator.share?.bind(navigator);
  if (!share) {
    await copyText(text);
    return "copied";
  }
  try {
    await share({ title, text });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "aborted";
    }
    await copyText(text);
    return "copied";
  }
}

export default function CelebrantsPage() {
  const router = useRouter();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>("month");
  const [on, setOn] = useState(todayIso);
  const [draft, setDraft] = useState<string | null>(null);

  const celebrants = useQuery({
    queryKey: ["celebrants", period, on],
    queryFn: async () => {
      const params = new URLSearchParams({ period, on });
      const response = await fetch(`/api/v1/celebrants?${params}`);
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as CelebrantsResponse;
    },
  });

  const columns = useMemo<ColumnDef<Celebrant>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.photoUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
                {row.original.firstName.slice(0, 1)}
                {row.original.lastName.slice(0, 1)}
              </span>
            )}
            <span className="font-medium">
              {row.original.lastName}, {row.original.firstName}
            </span>
          </div>
        ),
      },
      {
        id: "birthday",
        header: "Birthday",
        cell: ({ row }) => formatBirthdayDay(row.original.dateOfBirth),
      },
      {
        id: "age",
        header: "Turning",
        cell: ({ row }) => row.original.age,
      },
      {
        id: "zone",
        header: "Zone",
        cell: ({ row }) => row.original.zone?.name ?? "Unassigned",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <IconButton
              label="View member"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/members/${row.original.id}`)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(row.original.socialCaption)}
            >
              Social post
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  const rangeLabel =
    celebrants.data?.from && celebrants.data.to
      ? celebrants.data.from === celebrants.data.to
        ? formatBirthdayDay(celebrants.data.from)
        : `${formatBirthdayDay(celebrants.data.from)} – ${formatBirthdayDay(celebrants.data.to)}`
      : null;

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Monthly celebrants"
        description="Members celebrating birthdays. Copy a post to share on social media."
        action={
          celebrants.data && celebrants.data.items.length > 0 ? (
            <Button
              type="button"
              onClick={() => setDraft(celebrants.data.listCaption)}
            >
              Post this list
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Birthday period">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={period === item.id}
            className={
              period === item.id
                ? "rounded-full bg-text px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-accent-soft"
            }
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ListToolbar
        filters={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
            {period === "month" ? (
              <div className="min-w-40 flex-1">
                <Label htmlFor="celebrantMonth">Month</Label>
                <Select
                  id="celebrantMonth"
                  value={monthValue(on)}
                  onChange={(event) => setOn(withMonth(on, event.target.value))}
                >
                  {MONTHS.map((label, index) => {
                    const value = String(index + 1).padStart(2, "0");
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </Select>
              </div>
            ) : null}
            <div className="min-w-40 flex-1">
              <Label htmlFor="celebrantOn">
                {period === "month" ? "Date" : period === "week" ? "Week of" : "Day"}
              </Label>
              <Input
                id="celebrantOn"
                type="date"
                value={on}
                onChange={(event) => setOn(event.target.value || todayIso())}
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label={`Previous ${period}`}
                onClick={() => setOn(shiftCelebrantOn(period, on, -1))}
              >
                Previous {period}
              </Button>
              <Button
                type="button"
                variant="secondary"
                aria-label={`Next ${period}`}
                onClick={() => setOn(shiftCelebrantOn(period, on, 1))}
              >
                Next {period}
              </Button>
            </div>
          </div>
        }
      />
      <QueryState
        isLoading={celebrants.isLoading}
        isError={celebrants.isError}
        isFetching={celebrants.isFetching && !celebrants.isLoading}
      >
        <p className="text-sm text-text-muted">
          {rangeLabel
            ? `${celebrants.data?.items.length ?? 0} celebrant${
                celebrants.data?.items.length === 1 ? "" : "s"
              } for ${rangeLabel}.`
            : null}
        </p>
        <DataTable
          columns={columns}
          data={celebrants.data?.items ?? []}
          emptyTitle="No celebrants in this period"
          emptyDescription="Members need a date of birth on their profile to appear here."
          getRowHref={(row) => `/members/${row.id}`}
        />
      </QueryState>
      <FormDialog
        title="Birthday social post"
        description="Copy or share this text. It does not include phone, email, or year of birth."
        open={draft !== null}
        submitLabel="Copy post"
        onCancel={() => setDraft(null)}
        onSubmit={() => {
          if (!draft) return;
          void copyText(draft).then(
            () => {
              toast("success", "Post copied.");
              setDraft(null);
            },
            () => toast("error", "Unable to copy post."),
          );
        }}
      >
        <div>
          <Label htmlFor="socialPost">Post</Label>
          <textarea
            id="socialPost"
            value={draft ?? ""}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!draft) return;
            void shareText("Birthday celebration", draft).then((result) => {
              if (result === "shared") {
                toast("success", "Opened share sheet.");
                setDraft(null);
              } else if (result === "copied") {
                toast("success", "Post copied.");
                setDraft(null);
              }
            });
          }}
        >
          Share
        </Button>
      </FormDialog>
    </div>
  );
}
