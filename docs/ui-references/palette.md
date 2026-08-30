# Brand palette (ours)

Reference screenshots show **layout**. Their green is **not** our brand. We use **blue and its shades** in both light and dark mode.

Implement as CSS variables on `:root` and `.dark` (or `html.dark`). Tailwind maps to these tokens. Never hard-code the reference app’s green (`#00A86B` or similar).

## Light

| Token | Hex | Used for |
|---|---|---|
| accent | `#2563EB` | Primary buttons, active sidebar pill, links, focus ring |
| accent-hover | `#1D4ED8` | Button / pill hover |
| accent-soft | `#DBEAFE` | Icon-button wash, selected tab wash, sparkline fill |
| accent-muted | `#93C5FD` | Charts, secondary highlights |
| canvas | `#F1F5F9` | Page background (cool gray, slightly blue) |
| surface | `#FFFFFF` | Sidebar, cards, table shell |
| text | `#0F172A` | Headings and body |
| text-muted | `#475569` | Labels, placeholders (AA vs canvas/surface) |
| border | `#E2E8F0` | Dividers, inputs |
| danger | `#DC2626` | Delete, errors |
| danger-soft | `#FEE2E2` | Delete icon button wash |
| warning | `#D97706` | Pending / caution chips |
| warning-soft | `#FEF3C7` | Warning chip wash |
| success | `#2563EB` | Prefer blue for “positive” counts; use `#16A34A` only for true success toasts |

## Dark

| Token | Hex | Used for |
|---|---|---|
| accent | `#3B82F6` | Primary buttons, active nav (brighter on dark) |
| accent-hover | `#60A5FA` | Hover |
| accent-soft | `#1E3A8A` | Icon wash, subtle fills |
| accent-muted | `#60A5FA` | Charts |
| canvas | `#0B1220` | Page background (navy-black) |
| surface | `#1E293B` | Sidebar, cards, table |
| text | `#F8FAFC` | Headings and body |
| text-muted | `#94A3B8` | Labels (AA vs surface) |
| border | `#334155` | Dividers, inputs |
| danger | `#F87171` | Delete, errors |
| danger-soft | `#7F1D1D` | Delete wash |
| warning | `#FBBF24` | Pending |
| warning-soft | `#78350F` | Warning wash |
| success | `#3B82F6` | Positive metrics stay in the blue family |

Row action icons (view / edit / delete): **soft blue / stronger blue / danger-soft** — not green for edit.

Theme toggle lives in the header (next to notifications / profile). Persist with `next-themes` (`class` on `html`). Default: system preference, user override remembered.
