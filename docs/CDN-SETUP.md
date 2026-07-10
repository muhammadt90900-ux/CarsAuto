# CDN Setup — CarsAuto

PROMPT 5. Puts Cloudflare in front of `carsauto.iq` / `api.carsauto.iq`:
aggressive edge caching for static assets, dynamic API/HTML traffic passed
through correctly, WebSocket chat kept alive, no accidental caching of
authenticated responses.

## Status as of this writing

**`carsauto.iq` is not yet a registered domain.** Everything below is
written against the domain/paths already assumed throughout
`apps/k8s/ingress.yaml`, so it's ready to execute the moment the domain is
registered — but the DNS cutover steps themselves haven't happened yet and
can't be verified against a live zone from this pass. `CDN_ENABLED` in
`.github/workflows/ci.yml`'s `deploy` job (see that file) stays unset until
you've completed the "DNS cutover" section below, so CI doesn't fail
deploys against a Cloudflare zone that doesn't exist yet.

**Provider**: Cloudflare, per this prompt's own suggested default — no
existing DNS/CDN provider was found for `carsauto.iq` (confirmed no
existing DNS provider to migrate from, since the domain isn't registered).
If the team later decides on a different provider, everything below is
Cloudflare-specific: the cache-purge API call in `ci.yml`, the dashboard
steps, and the WebSocket-support confirmation would all need re-verifying
against that provider's equivalents.

## 1. DNS cutover: proxying through Cloudflare

Once `carsauto.iq` is registered and you've added it as a Cloudflare zone
(Cloudflare dashboard → Add a Site → point your registrar's nameservers at
the two Cloudflare-assigned ones):

1. Create an `A` (or `CNAME`, if your ingress controller sits behind a
   provider-managed load balancer hostname rather than a static IP) record
   for `carsauto.iq` pointing at the cluster's ingress IP/hostname.
2. Same for `api.carsauto.iq`.
3. **Set both records to Proxied (orange cloud)**, not "DNS only" (grey
   cloud). This is the entire mechanism that makes CDN caching, WAF, and
   the cache-purge step below work at all — a grey-cloud record just
   resolves DNS and sends traffic straight to origin, bypassing Cloudflare
   entirely.

### WebSocket support — verified, not assumed

Checked Cloudflare's own docs directly rather than assuming: **Cloudflare
proxies WebSocket connections automatically on every plan, including
Free, with zero extra configuration** — enabling the proxy (orange cloud)
on a DNS record is the only requirement. No separate "enable WebSockets"
toggle exists or is needed.

**One real interaction worth knowing about**: Free and Pro Cloudflare
plans close a WebSocket connection after **100 seconds of idle time** (no
data in either direction) — shorter than `apps/k8s/ingress.yaml`'s
`proxy-read-timeout: 3600` at the nginx-ingress layer. This does NOT
actually affect this app: `apps/api/src/modules/chat/chat.gateway.ts`
already configures Socket.IO's own protocol-level heartbeat
(`pingInterval: 25_000`, i.e. every 25s) — well under Cloudflare's 100s
idle threshold — so the connection never actually goes idle from
Cloudflare's point of view, regardless of how long a user goes without
sending an actual chat message. **Confirmed compatible, not just
assumed** — verify this holds if `chat.gateway.ts`'s `pingInterval` is
ever changed to something above ~90s.

## 2. Static asset caching — confirmed already correct

`apps/web/next.config.js`'s `headers()` function already sets:
- `/_next/static/:path*` → `public, max-age=31536000, immutable` — Next.js's
  own hashed build output (JS/CSS bundles). This is what makes CDN caching
  actually effective; confirmed intact, nothing overrides it.
- `/_next/image` → `public, max-age=86400, stale-while-revalidate=604800`.
- `/fonts/:path*` → `public, max-age=31536000, immutable`.
- Every image extension under `public/` (`.jpg/.jpeg/.png/.gif/.webp/.avif/.ico`)
  → `public, max-age=86400, stale-while-revalidate=3600`.

**Checked `apps/web/public/`'s actual contents against requirement 3's
"long+immutable for hashed, short+revalidate for non-hashed" rule**: every
file currently in `public/` (`favicon.ico`, `apple-touch-icon.png`, the
`icons/` PWA icon set, `placeholder-car.jpg`, etc.) has a plain,
non-content-hashed filename — so the existing blanket
`max-age=86400, stale-while-revalidate=3600` rule is already the CORRECT
category for all of them, not a gap. If a future asset under `public/`
starts being filename-hashed at build time (a hashed placeholder image,
for example), give it its own `headers()` entry with
`immutable, max-age=31536000` rather than relying on the blanket rule.

No changes were needed to `next.config.js` for this prompt — confirmed
correct, not modified.

## 3. Cache Rule: bypass `/api/` and `/socket.io/`

**Manual dashboard steps** (this repo doesn't use Terraform anywhere else,
so a Cloudflare Terraform provider config isn't added here — see this
prompt's own instruction on when Terraform is warranted):

1. Cloudflare dashboard → your zone → **Caching → Cache Rules** → Create rule.
2. Rule name: `Bypass cache — API and WebSocket`.
3. **When incoming requests match**: `(http.host eq "api.carsauto.iq")` —
   since `api.carsauto.iq` is a dedicated hostname serving nothing but
   `/api/` and `/socket.io/` (see `apps/k8s/ingress.yaml`'s two path rules
   for that host), matching the whole hostname is simpler and safer than
   matching individual path prefixes, and can't accidentally miss a route
   added later under that host.
4. **Then**: Cache eligibility → **Bypass cache**.
5. Save and deploy.

**Be explicit about why this matters**: `api.carsauto.iq` serves
authenticated, per-user responses (listings a specific dealer owns, chat
messages, session-scoped data). If this host were left on Cloudflare's
default caching behavior instead of an explicit bypass rule, a cacheable-
looking response (wrong `Cache-Control` header from a future code change,
or Cloudflare's own heuristics) could serve **one user's authenticated
response to a different user** requesting the same URL. The Cache Rule
above makes this impossible regardless of what headers the origin sends —
whole-hostname bypass, not a per-response opt-out.

Also confirm the **Browser Cache TTL** setting isn't overriding this at a
different layer (Caching → Configuration) — it defaults to "Respect
Existing Headers", which is correct; only change this if you have a
specific reason to.

## 4. Deploy-time cache purge

`.github/workflows/ci.yml`'s `deploy` job purges the CDN cache for `/`
after a successful web rollout (see that job's "Purge Cloudflare cache"
step) — the HTML shell references `/_next/static/` asset URLs baked in at
build time by their content hash, so a stale cached `/` after a deploy
would keep pointing browsers at the PREVIOUS deploy's now-nonexistent
asset hashes. Purging `/` alone is sufficient: the hashed static assets
themselves never need purging (immutable, 1-year cache — a new deploy
produces new hashes, the old cached ones simply become unreferenced and
age out naturally rather than needing active invalidation).

Required GitHub Actions secrets (documented in `ci.yml`'s `deploy` job
header too):
- `CLOUDFLARE_API_TOKEN` — scope this as narrowly as Cloudflare's API
  Token system allows: **Zone → Cache Purge → Purge**, for the
  `carsauto.iq` zone only. Does not need DNS or Zone Settings write access.
- `CLOUDFLARE_ZONE_ID` — from the zone's Overview page, right sidebar.

And a repo **variable** (not secret): `CDN_ENABLED=true`, set once the DNS
cutover above is actually complete — see `ci.yml`'s comment for why this
gate exists (avoids every deploy failing against a not-yet-existent zone
while `carsauto.iq` remains unregistered).

## 5. TLS mode

Implementing Cloudflare's **Full (strict)** SSL/TLS mode — see
`apps/k8s/ingress.yaml`'s header comment for the full reasoning. Short
version: Full (strict) validates the origin's certificate against a
publicly-trusted CA, which the existing cert-manager + Let's Encrypt setup
already provides — Cloudflare terminates TLS at its edge with its own
(automatic, free) edge certificate, then re-encrypts to origin and
validates against the Let's Encrypt cert already there. **Nothing about
`apps/k8s/ingress.yaml`'s existing cert-manager configuration needs to
change** — this is purely a Cloudflare dashboard setting
(SSL/TLS → Overview → Full (strict)).

Do NOT use "Flexible" mode — it terminates TLS at Cloudflare and sends
**unencrypted** HTTP to origin, which would defeat the point of TLS for
the Cloudflare-to-origin hop entirely (and this app carries auth tokens
and payment-adjacent data — see `docs/ERROR-TRACKING.md`'s PII-scrubbing
notes for why that data is treated carefully elsewhere in this stack too).

## Verification checklist (run after DNS cutover, not before)

- `curl -I https://carsauto.iq/_next/static/<any-hashed-chunk>.js` twice —
  second request should show `cf-cache-status: HIT`.
- `curl -I https://api.carsauto.iq/api/<any-endpoint>` and the WebSocket
  handshake to `/socket.io/` — both should show `cf-cache-status: BYPASS`
  or `DYNAMIC`, never `HIT`.
- Open the chat feature and leave it idle for longer than 100 seconds
  (Cloudflare Free/Pro's idle timeout) — confirm it's still connected,
  proving the Socket.IO `pingInterval` heartbeat is actually reaching
  Cloudflare and resetting its idle clock as expected.
- Trigger a deploy and confirm the "Purge Cloudflare cache" step in
  `ci.yml` succeeds and a subsequent `curl -I https://carsauto.iq/` shows
  `cf-cache-status: MISS` (or `EXPIRED`) immediately after, then `HIT` on
  the next request.
