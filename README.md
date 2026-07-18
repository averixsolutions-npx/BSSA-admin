# NWSF Admin Panel

Internal admin panel for the National Winter Sports Federation (Bhartiya Ski & Snowboard Association) platform. Built with Next.js 14 (App Router), TypeScript, Tailwind + shadcn/ui, TanStack Query, and Zustand. Talks to the NWSF backend API.

## Stack

- **Next.js 14** App Router, strict TypeScript
- **Tailwind CSS** + **shadcn/ui** (vendored components in `components/ui`)
- **TanStack Query** for server state, **TanStack Table** for data grids
- **React Hook Form** + **Zod** for forms/validation
- **Zustand** auth store with in-memory access token + httpOnly refresh cookie
- **TipTap** rich text editor, **dnd-kit** drag-to-reorder
- **Sonner** toasts, **lucide-react** icons

## Getting started

```bash
npm install
cp .env.example .env.local   # adjust NEXT_PUBLIC_API_URL if needed
npm run dev                  # http://localhost:3001
```

The backend must be running on `http://localhost:4000` (see the backend repo). Its `ALLOWED_ORIGINS` must include `http://localhost:3001`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve production build on port 3001 |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright E2E suite (needs `ADMIN_PASSWORD`) |
| `npm run test:e2e:headed` | E2E with a visible browser |
| `npm run test:e2e:ui` | Playwright interactive UI |

## Environment variables

Only two, both public (client-side):

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

See `.env.example` (dev) and `.env.production.example` (prod). All secrets live on the backend VPS.

## Structure

```
app/
  (app)/            authenticated area (sidebar + auth guard)
    dashboard/  hero/  news/  events/  disciplines/  programs/
    media/  committee/  state-associations/  about/  stats/
    athletes/  associations/  enquiries/  newsletter/
  login/            public login route
components/
  ui/               shadcn base components
  <blocks>          DataTable, FileDropzone, RichTextEditor, ConfirmDialog,
                    ReorderableList, StatusBadge, PageHeader, FormField, sidebar, topbar
lib/
  api-client.ts     typed fetch wrapper with auto token-refresh
  auth-store.ts     Zustand auth store
  types.ts          API contract types
  services/         per-module API service files
e2e/                Playwright tests
```

## Deployment

Deployed to Vercel at `admin.<domain>`. Root directory is `.` (standalone project). Set the two `NEXT_PUBLIC_*` env vars in the Vercel dashboard and add the admin domain to the backend's `ALLOWED_ORIGINS`. See `DEPLOYMENT-CHECKLIST.md`.
