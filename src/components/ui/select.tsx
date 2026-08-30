"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  computeSelectPanelPosition,
  SELECT_PANEL_MAX_HEIGHT,
  type SelectPanelPlacement,
} from "./select-position";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export const selectClassName =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text";

/** @deprecated Use `<Select>` instead. */
export const SELECT_CLASS = selectClassName;

export function parseSelectOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (element.type === Fragment) {
      options.push(...parseSelectOptions(element.props.children));
      return;
    }

    if (element.type !== "option") return;

    const label =
      typeof element.props.children === "string"
        ? element.props.children
        : Children.toArray(element.props.children).join("");

    options.push({
      value: String(element.props.value ?? ""),
      label,
      disabled: element.props.disabled,
    });
  });

  return options;
}

type SelectProps = {
  id?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
  compact?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  children?: ReactNode;
  options?: SelectOption[];
};

function emitChange(
  onChange: SelectProps["onChange"],
  value: string,
) {
  if (!onChange) return;
  const event = {
    target: { value },
    currentTarget: { value },
  } as ChangeEvent<HTMLSelectElement>;
  onChange(event);
}

export function Select({
  id,
  value,
  defaultValue,
  onChange,
  disabled = false,
  required = false,
  compact = false,
  className,
  placeholder = "Select…",
  "aria-label": ariaLabel,
  children,
  options: optionsProp,
}: SelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: SelectPanelPlacement;
  } | null>(null);

  const options = useMemo(
    () => optionsProp ?? parseSelectOptions(children),
    [children, optionsProp],
  );

  const stringValue =
    value !== undefined
      ? String(value)
      : defaultValue !== undefined
        ? String(defaultValue)
        : "";

  const selectedIndex = options.findIndex((option) => option.value === stringValue);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const displayLabel = selected?.label || placeholder;

  const updatePanelPosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = listRef.current?.scrollHeight ?? SELECT_PANEL_MAX_HEIGHT;
    setPanelStyle(
      computeSelectPanelPosition({
        triggerRect: rect,
        panelHeight,
        viewportHeight: window.innerHeight,
      }),
    );
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const openList = useCallback(() => {
    if (disabled) return;
    updatePanelPosition();
    setOpen(true);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, selectedIndex, updatePanelPosition]);

  const selectOption = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      emitChange(onChange, option.value);
      close();
    },
    [close, onChange],
  );

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, options.length, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        const panel = document.getElementById(listboxId);
        if (panel?.contains(event.target as Node)) return;
        close();
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function onReposition() {
      updatePanelPosition();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [close, listboxId, open, updatePanelPosition]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    const item = listRef.current?.children.item(highlightedIndex) as
      | HTMLElement
      | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
    }

    if (!open) {
      if (event.key === "Enter") {
        event.preventDefault();
        openList();
      }
      return;
    }

    const enabledIndexes = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const current = enabledIndexes.indexOf(highlightedIndex);
      const next =
        current < 0
          ? enabledIndexes[0]
          : enabledIndexes[(current + 1) % enabledIndexes.length];
      setHighlightedIndex(next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const current = enabledIndexes.indexOf(highlightedIndex);
      const next =
        current < 0
          ? enabledIndexes[enabledIndexes.length - 1]
          : enabledIndexes[
              (current - 1 + enabledIndexes.length) % enabledIndexes.length
            ];
      setHighlightedIndex(next);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(enabledIndexes[0] ?? -1);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(enabledIndexes[enabledIndexes.length - 1] ?? -1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlightedIndex];
      if (option) selectOption(option);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  const panel =
    open && panelStyle
      ? createPortal(
          <ul
            id={listboxId}
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className={cn(
              "motion-dropdown fixed z-[100] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg",
              panelStyle.placement === "top" && "origin-bottom",
            )}
            style={{
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
              maxHeight: panelStyle.maxHeight,
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === stringValue;
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={`${option.value}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                    option.disabled && "cursor-not-allowed opacity-50",
                    isHighlighted && !option.disabled && "bg-accent-soft text-accent",
                    isSelected && !isHighlighted && "font-medium text-text",
                    !isSelected && !isHighlighted && "text-text",
                    !option.disabled &&
                      !isHighlighted &&
                      "hover:bg-canvas",
                  )}
                  onMouseEnter={() => {
                    if (!option.disabled) setHighlightedIndex(index);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", compact ? "w-auto" : "w-full")}>
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
          selectClassName,
          "inline-flex items-center justify-between gap-2 text-left",
          compact && "h-10 w-auto min-w-[10rem]",
          disabled && "cursor-not-allowed opacity-60",
          !selected && "text-text-muted",
          open && "border-accent shadow-[0_0_0_2px_var(--accent-soft)]",
          className,
        )}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={stringValue}
          required
          onChange={() => {}}
        />
      ) : null}
      {panel}
    </div>
  );
}
