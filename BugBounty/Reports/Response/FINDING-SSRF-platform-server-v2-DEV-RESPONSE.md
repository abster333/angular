# Dev Team Response — FINDING-SSRF-platform-server-v2

Hi! Thanks for the review. Short answers to your questions:

1) How could this be exploited against other users?
This is a server‑side issue: the attacker only needs to hit the SSR endpoint. If the app uses relative SSR HttpClient calls, the attacker can steer those server‑side requests to internal hosts and receive the rendered HTML with internal data in their response. No victim browser compromise is required.

2) Who controls those headers, and how?
Attackers can set Host directly on HTTP requests. For X‑Forwarded‑*, this becomes attacker‑controlled when proxies/load balancers forward these headers without validation/allow‑listing. Angular’s own templates/adapter use these headers to build the SSR URL by default.

3) What is the concrete security impact?
SSRF from the SSR server to internal services (127.0.0.1/10.x/169.254.169.254, etc.). If SSR code fetches data (common), the internal response can be rendered into HTML (exfiltration) or inferred via timing.

4) Can you demonstrate it on an Angular SSR app?
Yes. Two local repros:
- BugBounty/Repros/ssrf-ssr-app: curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4400/ → SSR HTML includes INTERNAL_SECRET_123.
- Stock ngmodule SSR example (integration/platform-server/projects/ngmodule): curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4206/http-transferstate-lazy → SSR HTML includes INTERNAL_SECRET_123 from /api-2.
