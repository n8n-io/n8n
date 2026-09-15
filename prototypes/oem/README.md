# API / OEM prototype hub

Scratch space for small API and OEM mocks. This folder is not part of the
pnpm workspace. Do not import it from product packages.

## Run

```bash
node prototypes/oem/server.mjs
```

Open http://127.0.0.1:3847

Default port is `3847`. Override with `PORT`.

## Cards in this hub

- [API-317](https://linear.app/n8n/issue/API-317/display-n8n-logo-on-canvas-when-n8n-canvas-only-is-enabled#comment-d290240d): display n8n logo on canvas when N8N_CANVAS_ONLY is enabled → real editor at `/n8n-embed.html`
- [API-305](https://linear.app/n8n/issue/API-305/add-mechanism-to-enforce-airgapped-usage-reporting-via-license-feature#comment-3207db55): add mechanism to enforce airgapped usage reporting via license feature flag → real editor at `/n8n-embed.html?ticket=API-305&title=Add+mechanism+to+enforce+airgapped+usage+reporting+via+license+feature+flag`

Card titles open the prototype. Ticket ids open Linear in a new tab.

## n8n proxy

The hub serves its own files from `public/` and its mock API from `/api/v1/`.
It proxies editor pages, assets, REST, API, webhook, and push routes from
`http://127.0.0.1:5678` (override with `N8N_ORIGIN`). Websocket upgrades use
the same server.

The proxy rewrites backend origins to the hub origin. The editor, API, auth
cookie, and `n8n-browserId` therefore use one origin. The shared
`/n8n-embed.html` scaffold can also read and style the iframe DOM. Query
parameters set the ticket and title in its embed bar.

Sign in once through the hub after you switch from a direct backend URL. Do not
sign in on port 5678 for the prototype.

## Hiding n8n chrome

There are two override layers. Both only change what the prototype serves. No
product code is patched.

1. The proxy adds `public/oem-overrides.css` to every proxied HTML page, so it
   also applies when a page is opened directly instead of in the frame. It
   hides the non-production license banner
   (`[data-test-id='banners-NON_PRODUCTION_LICENSE']`). Add a rule there to
   hide more chrome, and name the chrome the rule hides.
2. `/n8n-embed.html` injects a stylesheet into the frame from the parent page,
   for overrides that need hub state (theme, toggles).

`/n8n-embed.html` injects a small stylesheet into the frame to hide the left
side menu (`aside#sidebar` / `#side-menu`). The embed bar has a light/dark
control that sets `data-theme` on the hub page and on the framed editor, and
writes the editor's `N8N_THEME` key so a frame reload keeps the theme. The bar
uses inverted colors: black in light mode, white in dark mode.
