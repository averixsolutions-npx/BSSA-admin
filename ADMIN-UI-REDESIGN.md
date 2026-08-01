# BSSA Admin — UI redesign guide

> **For Claude Code working in `bssa-admin/admin`.** This is the method we used to
> rework the public/member app (`bssa-web/web`), written so the same result can be
> reached here. Read §1–§3 before touching a file; §4 is the task list in order.
>
> **This is not "copy the web components over."** The two apps are deliberately
> different stacks. The *patterns* transfer; the *implementations* must be built
> from what this repo already has.

---

## 0. What is actually wrong today

The admin app isn't ugly — it's **undifferentiated and unpaced**. Every screen
presents all of its complexity at once, at one visual weight, so the operator has
to read everything to find the one thing they came for.

The clearest case is `app/(app)/events/event-form.tsx` (243 lines, one `<form>`):

- Nine top-level fields, then a Registration block that unfolds into date pickers,
  a role picker, a standard-fields editor, a custom-fields editor, a preset row,
  and a live preview — **all in one uninterrupted scroll**.
- Everything is `FormField` + `Input`. Title, venue, discipline tag, and "which
  standard fields are required" all look equally important. Nothing signals *"these
  four are the event; the rest is configuration you may never touch."*
- No grouping, no icons, no colour, no progressive disclosure. The only visual
  break is one `rounded-lg border p-4`.

The same shape repeats in the document review grids and the profile screens.

**The fix is not decoration.** It's: group into cards, put required first, hide the
optional behind a disclosure, and give each group a small colour+icon identity so
the eye can jump to a section instead of reading top to bottom.

---

## 1. Stack facts — read before writing code

This repo is **not** the web app. Verify against `package.json`; don't assume.

| | `bssa-web/web` (done) | `bssa-admin/admin` (this) |
|---|---|---|
| Next / React | 16 / 19 | **14.2 / 18** |
| Styling tokens | `ink`, `muted`, `ice`, `hairline`, `surface`, `accent`, `saffron`, `green` | **shadcn**: `background`, `foreground`, `muted-foreground`, `primary`, `border`, `card`, `destructive` |
| Components | hand-rolled, ~5 deps total | **shadcn/ui + Radix** — already installed |
| Icons | inline SVG (no icon dep) | **`lucide-react`** — use it, don't hand-roll |
| Toasts | custom `useToast()` | **`sonner`** — already used in 4+ files |
| Forms | local `useState` + save-on-blur | **`react-hook-form` + `zod`** |
| Animation | hand-written `@keyframes` | **`tailwindcss-animate`** — use its utilities |

**Consequences:**

- ❌ Do **not** copy `components/ui/toast.tsx`, `modal.tsx`, `section-card.tsx`,
  `date-field.tsx`, or `search-toggle.tsx` from the web repo. Equivalents exist
  here (`sonner`, `dialog.tsx`, `card.tsx`, `date-picker.tsx`).
- ❌ Do **not** introduce web tokens (`text-ink`, `border-hairline`, `bg-surface`).
  They don't exist here and will render unstyled.
- ✅ React 18 — the React 19 lint rules that constrained the web app
  (`react-hooks/purity`, `set-state-in-effect`) do **not** apply. Don't import
  those workarounds.
- ✅ `Collapsible` and `Accordion` are **not** installed. Add
  `@radix-ui/react-collapsible` (and generate the shadcn wrapper) or use a
  conditional render with `animate-in`. Adding the Radix primitive is preferred —
  it handles height animation and ARIA.

---

## 2. The five patterns

These are the whole method. Each is stated as a rule, why it exists, and the
admin-side implementation.

### P1 — One card per job, with a tinted icon tile

**Rule:** every logical group is a `Card`, headed by a 40px rounded tile holding a
16–18px lucide icon, tinted per section.

**Why:** a page of identical grey panels forces linear reading. A colour + glyph
gives each section a landmark, so "where do I set the closing date" becomes a
glance instead of a scan. Tints are *identity*, not decoration — keep them stable
per concept across screens (events always the same colour, registration always
another).

**Admin implementation** — build once as `components/section-card.tsx`:

```tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const TONES = {
  blue:   "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400",
  green:  "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400",
  amber:  "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400",
} as const;

export function SectionCard({
  title, description, icon: Icon, tone = "blue", action, children,
}: {
  title: string; description?: string; icon: LucideIcon;
  tone?: keyof typeof TONES; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", TONES[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}
```

Verify both themes — `next-themes` is installed and admin has a dark mode. A tint
that reads well on white can vanish on `--background` in dark.

### P2 — Required first, optional behind a disclosure

**Rule:** a screen shows what is **required or already filled in**. Everything
else collapses behind a labelled toggle that states how much is hidden —
`Add optional documents (4)`, not `Show more`.

**Why:** this was the single biggest reduction in perceived complexity on the web
side. The athlete document checklist went from ten always-visible rows to three
required ones plus a disclosure. Same information, a third of the height, and the
operator is no longer deciding which rows matter.

**Where it applies in admin:** the entire Registration block of the event form;
optional event metadata (address, discipline tag, results PDF); advanced filters
on list pages.

**Do not hide anything that is required, invalid, or already has a value.** A
collapsed section must never conceal a validation error — if a field inside has an
error, force it open and say so on the header.

### P3 — List + "Add" dialog, never a permanently open form

**Rule:** a collection shows its rows and an **Add** button. The creation form
lives in a `Dialog`. Long lists show ~3 rows behind a "Show N more".

**Why:** an always-visible empty form is dead space that scrolls forever. The
account page shrank by more than half from this change alone.

**Where it applies:** `CustomFieldsEditor` (the biggest win — each field's editor
becomes a row plus an edit dialog), rejection templates, state associations,
committee members.

**Admin implementation:** `components/ui/dialog.tsx` already exists.

> ⚠️ **The bug we hit, so you don't:** if a dialog's mount effect lists `onClose`
> in its dependency array and callers pass an inline arrow, **every keystroke
> re-runs the effect** — its cleanup restores focus to the trigger and you can
> type exactly one character per click. Radix's `Dialog` handles this correctly,
> so just use it. If you write any custom effect keyed on a callback prop, hold
> the callback in a ref and depend on the open flag alone.

### P4 — Long forms become steps or tabs

**Rule:** past roughly 8–10 fields, split. Either a stepper (creation, where
order matters) or `Tabs` (editing, where the operator wants to jump).

**Why:** the event form asks for four different kinds of thing — what the event
*is*, when it *runs*, what it *shows publicly*, and how *registration* behaves.
Presenting them as one list implies they're one decision.

**Admin implementation:** `@radix-ui/react-tabs` is already a dependency. Generate
the shadcn `tabs.tsx` wrapper (it's missing from `components/ui/`).

Proposed event form split:

| Tab | Contains |
|---|---|
| **Details** | title, venue, address, discipline tag, description |
| **Schedule** | start/end date-time |
| **Publishing** | status, results PDF |
| **Registration** | the whole registration block, gated by the existing switch |

Put an error dot on any tab containing a `formState.errors` entry — otherwise a
validation failure on a hidden tab looks like a dead Save button. This is
mandatory, not optional polish.

### P5 — Feedback is a toast; context is an inline alert

**Rule:** something *happened* → `sonner` toast. Something is *true about what
you're looking at* → inline alert in place.

**Why:** admin already imports `toast` in a few files but most mutations still
fail silently or with an ad-hoc red paragraph. One rule removes the guesswork.

```tsx
import { toast } from "sonner";
toast.success("Event published");
toast.error("Couldn't save", { description: err.message });
```

Errors should carry the server's message — never swallow it into "Something went
wrong". Where an error is actionable, give it the action:
`toast.error("Phone required", { action: { label: "Open profile", onClick } })`.

**Check `<Toaster />` is mounted** in `app/layout.tsx`. Several files import
`toast` — if the Toaster isn't rendered, those calls are already no-ops today.

---

## 3. Conventions to hold to

**Icons** — `lucide-react` only, one size per context (16px inline, 18px in
section tiles), default stroke. Don't mix emoji in with them. (We removed emoji
program icons from the web app for exactly this reason.)

**Motion** — use `tailwindcss-animate`: `animate-in fade-in-0 zoom-in-95` for
dialogs, `slide-in-from-top-1` for disclosures, `duration-200`/`300`. Animate
`transform` and `opacity` only — never height/width/top, which force layout.
Chevrons rotate 180° on `duration-200`. Keep it under ~300ms; admin is a tool
people use all day, and slow transitions become friction.

**Empty states** — every list needs one: icon, one line of what goes here, and the
primary action. Never render a bare empty table.

**Destructive and locked states** — a verified/approved record must not offer an
edit control that would silently undo the verification. Show a lock affordance
instead, and remember **the UI lock is only the visible half** — the server must
reject it too.

**Density** — this is an internal tool, not a marketing page. Prefer `text-sm`,
`gap-4`, `p-4`–`p-6`. Don't inflate to the web app's spacing.

**Tables** — `@tanstack/react-table` and `data-table.tsx` already exist. Extend
them; don't hand-roll another table.

---

## 4. Task order

Do these one at a time. **Build after each** — don't batch four screens and then
discover which one broke.

1. **Foundations.**
   `components/section-card.tsx` (P1); generate `components/ui/tabs.tsx`; add
   `@radix-ui/react-collapsible` + `components/ui/collapsible.tsx`; confirm
   `<Toaster />` is mounted in `app/layout.tsx`.
   *No screen changes yet — this commit should be additive and safe.*

2. **Event form** — the worst offender, and the one that proves the method.
   Split `event-form.tsx` into tabs (P4); wrap each group in a `SectionCard` (P1);
   collapse optional metadata (P2); add per-tab error indicators. Then rework
   `CustomFieldsEditor` to list + Add-dialog (P3) — it is the densest part of the
   screen.

3. **Document review grids** — `documents-review-grid.tsx`,
   `association-documents-grid.tsx`. Required documents first, optional behind a
   disclosure, verified rows locked (P2), verdicts via toast (P5).

4. **Profile screens** — athlete/association detail. Group into section cards,
   fold rarely-used blocks (P1, P2).

5. **List pages** — empty states, consistent filter row, search as a compact
   control rather than a full-width panel.

6. **Sweep** — every mutation gets a toast; every empty list gets an empty state;
   remove any leftover ad-hoc error paragraphs.

Suggested commit boundaries: one per numbered item. Message describes the
behaviour change and *why*, not the file list.

---

## 5. Verification

Run after **every** task, not at the end:

```bash
npm run build      # must pass
npm run lint
npx playwright test   # e2e specs exist in this repo — don't leave them red
```

Then click through in `npm run dev` (port 3001):

- Create an event with registration enabled → every tab reachable, validation
  errors visible on their tab, save works.
- Edit an event that already has registrations → locked field keys still locked.
- **Type a full sentence into a dialog field** (guards the focus bug in P3).
- Toggle dark mode on every screen touched — tinted tiles are the usual casualty.
- Review a document: approve, reject with a reason, confirm the toast and that an
  approved row can't be silently replaced.

---

## 6. Out of scope

Don't do these as part of a UI pass:

- Changing API payloads or backend contracts (`bssa-server`).
- Renaming routes or files without a reason — it makes the diff unreviewable.
- Swapping libraries. `sonner`, `react-hook-form`, `tanstack/*`, `tiptap`,
  `dnd-kit` all stay.
- Adding a component library on top of shadcn.
- Reformatting untouched code. Keep the diff to what the redesign needs.

---

## 7. The one-line version

**Group into cards with a colour and an icon; show what's required and hide what
isn't behind a labelled disclosure; put creation forms in dialogs; split long
forms into tabs; and make every action say what happened.**
