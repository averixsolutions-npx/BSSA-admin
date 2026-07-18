# NWSF Admin — Deployment & Production Checklist

Deployment target: Vercel at `admin.<domain>`, talking to the backend API at `https://api.<domain>/api/v1`.

## 1. Vercel project setup

1. Import the `admin` repo at [vercel.com/new](https://vercel.com/new).
2. Confirm settings:
   - Framework Preset: **Next.js**
   - Root Directory: `.` (standalone project)
   - Build Command: `next build` · Output: `.next` · Install: `npm install`
   - Node.js Version: **20.x**
3. Production branch: `main` (Settings → Git). Every push to `main` = production deploy; every PR = preview deploy.

## 2. Environment variables (Vercel dashboard)

Set for **Production** (and **Preview**):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.<domain>/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` |

Redeploy after setting them (first deploy fails without env vars — expected).

## 3. Backend CORS

On the VPS, add the admin domain to `apps/api/.env`:

```bash
ALLOWED_ORIGINS=https://<domain>,https://www.<domain>,https://admin.<domain>
```

Restart: `pm2 reload nwsf-api`. Verify:

```bash
curl -I -X OPTIONS https://api.<domain>/api/v1/health \
  -H "Origin: https://admin.<domain>" \
  -H "Access-Control-Request-Method: POST"
# expect: access-control-allow-origin: https://admin.<domain>
```

## 4. DNS & domain

Vercel → Project Settings → Domains → add `admin.<domain>`. Create the DNS record at your registrar:

```
Type: CNAME   Name: admin   Value: cname.vercel-dns.com.   TTL: 300
```

Verify: `dig admin.<domain> CNAME +short`. SSL is provisioned automatically once DNS resolves.

## 5. Production checklist (all must pass)

### Infrastructure
- [ ] `curl https://api.<domain>/health` returns 200
- [ ] `https://admin.<domain>` loads the login page
- [ ] SSL lock icon, no mixed-content warnings
- [ ] `dig admin.<domain>` shows CNAME to Vercel
- [ ] Login from admin domain succeeds (no CORS console errors)

### Authentication
- [ ] Admin can log in → dashboard loads
- [ ] Wrong password → error toast, no redirect
- [ ] Session persists across refresh
- [ ] Logout clears session; `/dashboard` then bounces to `/login`
- [ ] Direct `/news` access without login → redirected to `/login`

### Content management
- [ ] Create news article (title + body) → saved as draft
- [ ] Publish → status changes to Published
- [ ] Article appears on public site
- [ ] Create event with 2 result rows → saved correctly
- [ ] FileDropzone uploads image to R2 → preview shows
- [ ] Rich text: bold, headings, lists, links all format
- [ ] Drag hero slides → refresh → order persists

### Registration management
- [ ] Athletes list loads
- [ ] Publish toggle → athlete appears on public roster
- [ ] Unpublish toggle → athlete disappears from public roster

### Utility
- [ ] Enquiry submitted on public site appears in inbox
- [ ] Newsletter "Download CSV" downloads emails

### Performance & security
- [ ] No tokens in localStorage/sessionStorage
- [ ] `document.cookie` in console returns empty (refresh cookie is httpOnly)
- [ ] Admin panel loads in < 3s
- [ ] No console errors navigating all sections

## 6. Deploying updates

Frontend: `git push origin main` → Vercel auto-deploys. PRs get preview URLs.

## 7. Common post-launch issues

| Issue | Likely cause | Fix |
|---|---|---|
| API calls fail after backend redeploy | CORS misconfigured | Check `ALLOWED_ORIGINS`, `pm2 reload nwsf-api` |
| Dashboard shows "—" everywhere | Backend returned empty results | Create content or check backend |
| File upload 403 | R2 credentials/bucket policy | Regenerate R2 token, update backend `.env` |
| Stale data after backend update | Browser cache | Hard refresh (Ctrl+Shift+R) |
| "Unexpected error" toast | Backend 500 | `pm2 logs nwsf-api --lines 50` |
