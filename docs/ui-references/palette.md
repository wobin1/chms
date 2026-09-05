# Brand palette (ours)

Reference screenshots show **layout**. Their green is **not** our brand. We use **navy + teal** in both light and dark mode.

Implement as CSS variables on `:root` and `.dark` (or `html.dark`). Tailwind maps to these tokens. Never hard-code the reference app’s green (`#00A86B` or similar).

## Light

| Token | Hex | Used for |
|---|---|---|
| accent | `#0D9488` | Primary buttons, active sidebar pill, links, focus ring |
| accent-hover | `#0F766E` | Button / pill hover |
| accent-soft | `#CCFBF1` | Icon-button wash, selected tab wash, sparkline fill |
| accent-muted | `#5EEAD4` | Charts, secondary highlights |
| canvas | `#F0F7F7` | Page background (cool teal-tinted) |
| surface | `#FFFFFF` | Sidebar, cards, table shell |
| text | `#0A1628` | Headings and body (navy) |
| text-muted | `#475569` | Labels, placeholders (AA vs canvas/surface) |
| border | `#E2E8F0` | Dividers, inputs |
| danger | `#DC2626` | Delete, errors |
| danger-soft | `#FEE2E2` | Delete icon button wash |
| warning | `#D97706` | Pending / caution chips |
| warning-soft | `#FEF3C7` | Warning chip wash |
| success | `#0D9488` | Prefer teal for “positive” counts; use `#16A34A` only for true success toasts |

## Dark

| Token | Hex | Used for |
|---|---|---|
| accent | `#2DD4BF` | Primary buttons, active nav (brighter on dark) |
| accent-hover | `#5EEAD4` | Hover |
| accent-soft | `#134E4A` | Icon wash, subtle fills |
| accent-muted | `#5EEAD4` | Charts |
| canvas | `#0A1628` | Page background (navy) |
| surface | `#132337` | Sidebar, cards, table |
| text | `#F8FAFC` | Headings and body |
| text-muted | `#94A3B8` | Labels (AA vs surface) |
| border | `#1E3A4C` | Dividers, inputs |
| danger | `#F87171` | Delete, errors |
| danger-soft | `#7F1D1D` | Delete wash |
| warning | `#FBBF24` | Pending |
| warning-soft | `#78350F` | Warning wash |
| success | `#2DD4BF` | Positive metrics stay in the teal family |

Row action icons (view / edit / delete): **soft teal / stronger teal / danger-soft** — not green for edit.

Theme toggle lives in the header (next to notifications / profile). Persist with `next-themes` (`class` on `html`). Default: system preference, user override remembered.
