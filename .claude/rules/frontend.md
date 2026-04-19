---
paths:
  - "webapp/src/app/**/*.tsx"
  - "webapp/src/components/**/*.tsx"
  - "webapp/src/hooks/**/*.ts"
  - "webapp/src/contexts/**/*.tsx"
---

# Frontend Guidelines

## Components
- Functional components + hooks only (no class components)
- Keep components under ~150 lines; extract sub-components when larger
- Co-locate helper components in the same file when only used by one page
- Use `"use client"` only for components that need browser APIs or event handlers

## Styling
- Tailwind utility classes only — no inline `style={}` except for dynamic values
- Use `cn()` from `@/lib/utils` to merge conditional classes
- Dark-mode tokens: `bg-background`, `text-foreground`, `border-border/50`, `bg-muted/20`
- Primary color via `text-primary`, `bg-primary/10`, `border-primary/20`
- `bg-card` for panel/card surfaces; `bg-muted/30` for table headers

## shadcn/ui components available
`Button`, `Badge`, `Card`, `Dialog`, `Select`, `Tabs`, `Tooltip`, `Sheet`, `DropdownMenu`
For inputs: use native `<input>` / `<textarea>` styled with Tailwind (no `@/components/ui/input`)

## Forms
- Native `<input type="number" min="0">` for numeric fields
- Native `<textarea rows={N}>` for multi-line text
- Disable submit while `loading` state is true
- Guard submission with `if (!value.trim()) return`

## i18n
- Every user-visible string must use `t("key")` from `useT()` hook
- Check `src/lib/i18n.ts` for existing keys before adding new ones
- Keys format: `feature.subkey` (e.g. `campaigns.title`, `campaigns.empty`)

## Charts (Recharts)
- Always wrap in `<ResponsiveContainer width="100%" height={N}>`
- Use CSS variable colors: `fill="hsl(var(--primary))"`, `stroke="hsl(var(--border))"`
- Tooltip `contentStyle` with `backgroundColor: "hsl(var(--card))"` for dark mode

## Performance
- Wrap expensive computations in `useMemo`
- Avoid `useEffect` for derived state — compute directly in render or `useMemo`
- localStorage reads go in `useEffect` or lazy initial state — never in render
