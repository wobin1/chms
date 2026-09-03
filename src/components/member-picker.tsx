"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  formatMemberLabel,
  memberPickerSearchUrl,
  mergeMemberOptions,
  toggleMemberId,
  type MemberOption,
} from "@/features/members/member-option";
import {
  computeSelectPanelPosition,
  SELECT_PANEL_MAX_HEIGHT,
  type SelectPanelPlacement,
} from "@/components/ui/select-position";

type MemberPickerBase = {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  excludeIds?: string[];
  selectedOptions?: MemberOption[];
  emptyLabel?: string;
  "aria-label"?: string;
};

export type MemberPickerProps =
  | (MemberPickerBase & {
      multiple?: false;
      value: string;
      onChange: (memberId: string) => void;
    })
  | (MemberPickerBase & {
      multiple: true;
      value: string[];
      onChange: (memberIds: string[]) => void;
    });

const PANEL_MAX_HEIGHT = Math.max(SELECT_PANEL_MAX_HEIGHT, 280);

function selectedIdsFromProps(props: MemberPickerProps): string[] {
  return props.multiple ? props.value : props.value ? [props.value] : [];
}

export function MemberPicker(props: MemberPickerProps) {
  const {
    id,
    disabled = false,
    required = false,
    placeholder = "Search members",
    excludeIds = [],
    selectedOptions = [],
    emptyLabel,
    "aria-label": ariaLabel,
  } = props;
  const multiple = props.multiple === true;
  const listboxId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, MemberOption>>(new Map());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [hydrateTick, setHydrateTick] = useState(0);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: SelectPanelPlacement;
  } | null>(null);

  const selectedIds = selectedIdsFromProps(props);
  const selectedKey = selectedIds.join("|");

  for (const row of selectedOptions) {
    cacheRef.current.set(row.id, row);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const missing = (selectedKey ? selectedKey.split("|") : []).filter(
      (memberId) => !cacheRef.current.has(memberId),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const memberId of missing) {
        const response = await fetch(`/api/v1/members/${memberId}`);
        if (!response.ok || cancelled) continue;
        const body = (await response.json()) as MemberOption;
        cacheRef.current.set(body.id, {
          id: body.id,
          firstName: body.firstName,
          lastName: body.lastName,
          membershipNumber: body.membershipNumber,
        });
      }
      if (!cancelled) setHydrateTick((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedKey]);

  const results = useQuery({
    queryKey: ["members", "picker", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(memberPickerSearchUrl(debouncedQuery));
      if (!response.ok) return { items: [] as MemberOption[] };
      return (await response.json()) as { items: MemberOption[] };
    },
    enabled: open,
  });

  for (const row of results.data?.items ?? []) {
    cacheRef.current.set(row.id, row);
  }

  const selectedMembers = selectedIds
    .map((memberId) => cacheRef.current.get(memberId))
    .filter((row): row is MemberOption => Boolean(row));

  const options = useMemo(() => {
    const merged = mergeMemberOptions(results.data?.items ?? [], selectedMembers);
    return merged.filter((row) => !excludeIds.includes(row.id));
  }, [excludeIds, results.data?.items, selectedMembers]);

  const updatePanelPosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = listRef.current?.scrollHeight ?? PANEL_MAX_HEIGHT;
    setPanelStyle(
      computeSelectPanelPosition({
        triggerRect: rect,
        panelHeight: panelHeight + 52,
        viewportHeight: window.innerHeight,
        maxHeight: PANEL_MAX_HEIGHT,
      }),
    );
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setHighlightedIndex(0);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    updatePanelPosition();
    setOpen(true);
  }, [disabled, updatePanelPosition]);

  const choose = useCallback(
    (memberId: string) => {
      if (props.multiple) {
        props.onChange(toggleMemberId(props.value, memberId));
        return;
      }
      props.onChange(memberId);
      close();
    },
    [close, props],
  );

  const clearEmpty = useCallback(() => {
    if (props.multiple) return;
    props.onChange("");
    close();
  }, [close, props]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    searchRef.current?.focus();
  }, [open, options.length, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const panel = document.getElementById(listboxId);
      if (panel?.contains(target)) return;
      close();
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    }

    function onReposition() {
      updatePanelPosition();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [close, listboxId, open, updatePanelPosition]);

  const emptyOptionOffset = emptyLabel && !multiple ? 1 : 0;
  const enabledCount = options.length + emptyOptionOffset;

  function moveHighlight(delta: number) {
    if (enabledCount === 0) return;
    setHighlightedIndex((current) => {
      const next = (current + delta + enabledCount) % enabledCount;
      return next;
    });
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (emptyLabel && !multiple && highlightedIndex === 0) {
        clearEmpty();
        return;
      }
      const option = options[highlightedIndex - emptyOptionOffset];
      if (option) choose(option.id);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  const triggerLabel = multiple
    ? selectedIds.length
      ? `${selectedIds.length} selected`
      : placeholder
    : selectedMembers[0]
      ? formatMemberLabel(selectedMembers[0])
      : emptyLabel && !selectedIds.length
        ? emptyLabel
        : placeholder;

  const panel =
    open && panelStyle
      ? createPortal(
          <div
            id={listboxId}
            className={cn(
              "motion-dropdown fixed z-[110] overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
              panelStyle.placement === "top" && "origin-bottom",
            )}
            style={{
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
              maxHeight: panelStyle.maxHeight,
            }}
          >
            <div className="border-b border-border p-2">
              <label className="relative block" htmlFor={searchId}>
                <span className="sr-only">Search members</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden
                />
                <input
                  id={searchId}
                  ref={searchRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Type a name or membership number"
                  className="h-10 w-full rounded-xl border border-border bg-canvas pr-3 pl-9 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </label>
            </div>
            <ul
              ref={listRef}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              aria-label={ariaLabel ?? "Church members"}
              className="max-h-52 overflow-y-auto p-1"
            >
              {emptyLabel && !multiple ? (
                <li
                  role="option"
                  aria-selected={!selectedIds.length}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                    highlightedIndex === 0 && "bg-accent-soft text-accent",
                    !selectedIds.length && highlightedIndex !== 0 && "font-medium",
                  )}
                  onMouseEnter={() => setHighlightedIndex(0)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearEmpty}
                >
                  <span className="truncate">{emptyLabel}</span>
                  {!selectedIds.length ? (
                    <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  ) : null}
                </li>
              ) : null}
              {options.map((option, index) => {
                const optionIndex = index + emptyOptionOffset;
                const isSelected = selectedIds.includes(option.id);
                const isHighlighted = optionIndex === highlightedIndex;
                return (
                  <li
                    key={option.id}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                      isHighlighted && "bg-accent-soft text-accent",
                      isSelected && !isHighlighted && "font-medium text-text",
                      !isSelected && !isHighlighted && "text-text hover:bg-canvas",
                    )}
                    onMouseEnter={() => setHighlightedIndex(optionIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option.id)}
                  >
                    <span className="truncate">{formatMemberLabel(option)}</span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    ) : null}
                  </li>
                );
              })}
              {results.isFetching && options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">Searching…</li>
              ) : null}
              {!results.isFetching && options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">
                  No members match that search.
                </li>
              ) : null}
            </ul>
          </div>,
          document.body,
        )
      : null;

  void hydrateTick;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-required={required || undefined}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-left text-sm text-text",
          disabled && "cursor-not-allowed opacity-60",
          !selectedIds.length && "text-text-muted",
          open && "border-accent shadow-[0_0_0_2px_var(--accent-soft)]",
        )}
        onClick={() => (open ? close() : openList())}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {multiple && selectedMembers.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <li
              key={member.id}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
            >
              <span className="truncate">{formatMemberLabel(member)}</span>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-accent/15"
                aria-label={`Remove ${formatMemberLabel(member)}`}
                onClick={() => choose(member.id)}
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={props.multiple ? selectedIds.join(",") : props.value}
          required
          onChange={() => {}}
        />
      ) : null}
      {panel}
    </div>
  );
}
