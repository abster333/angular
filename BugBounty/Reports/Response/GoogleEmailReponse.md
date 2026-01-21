Hi Google Bug Hunter Team,

Thanks for the follow-up. Below is a concise repro using a freshly generated ng new --ssr app with the default server template unchanged, plus links to the templates and a note on the one-line change needed to run SSR at request time.

Repro (fresh app, default server.ts untouched)
1) Generate: ng new ssr-hostheader-poc --ssr
2) Add a single SSR relative HttpClient call to /secret in AppComponent and render the result.
3) Run a local internal API on 127.0.0.1:4401 that returns INTERNAL_SECRET_123.
4) Switch server rendering mode to runtime SSR (one-line change): in src/app/app.routes.server.ts change RenderMode.Prerender -> RenderMode.Server.
   - This does NOT create the issue; it only avoids build-time prerender (which has no attacker request context) so the SSR pipeline runs per request.
5) Build and run the generated SSR server bundle (the one produced from server.ts).
6) Request with attacker-controlled Host:
   curl -H 'Host: 127.0.0.1:4401' http://127.0.0.1:4000/
Expected: SSR HTML includes INTERNAL_SECRET_123.

Why this is default behavior:
The CLI-generated server.ts builds the SSR URL from headers.host (url: `${protocol}://${headers.host}${originalUrl}`), so the Host header controls the base for relative SSR HttpClient requests. This is the default server template output for the server-builder path.

Template links (published @schematics/angular package; repo path: packages/schematics/angular/ssr/files/server-builder/server.ts.template and packages/schematics/angular/ssr/files/application-builder/server.ts.template). These templates ship with the Host-derived URL construction shown above:
- server-builder: https://unpkg.com/@schematics/angular/ssr/files/server-builder/server.ts.template
- application-builder: https://unpkg.com/@schematics/angular/ssr/files/application-builder/server.ts.template

If you'd like, I can attach a zip of the exact fresh ng new --ssr project (only changes: AppComponent and the internal API server).

Best,
