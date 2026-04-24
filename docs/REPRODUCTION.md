# Scenario Explorer: what changed, why, and how to reproduce on another machine

This guide describes the **scenario-explorer-addon** setup (paths like [`scenario-explorer/simulationTool/`](../scenario-explorer/simulationTool/)). It focuses on **build/runtime fixes** so Masterportal **v3.4.0** (Webpack 4) can compile the addon with **Vuetify 3** and **`@vueform/slider`** when the addon is bind-mounted into the container.

---

## 1. Problem this setup solves

### 1.1 Bind mount hides addon `node_modules`

[`docker-compose.yml`](../docker-compose.yml) mounts:

- `./scenario-explorer/` → `/masterportal/addons/`
- `./portalconfig/` → `/masterportal/portal/simulation/`

The Masterportal clone inside the image lives at `/masterportal`, but **your addon code on the host replaces** `/masterportal/addons/`. Any `node_modules` only present under the host’s `scenario-explorer/simulationTool/` may be missing or incomplete; webpack still needs packages such as `vuetify`, `@vueform/slider`, etc.

**Fix:** Install those dependencies at **Masterportal root** in the image: [`Dockerfile.dev`](../Dockerfile.dev) runs:

```dockerfile
RUN npm install @vueform/slider@^2.1.10 lodash@^4.17.21 plotly.js-dist@^2.35.2 vuetify@^3.7.0
```

So **`/masterportal/node_modules`** (not overwritten by compose) always contains the addon’s runtime deps. The entrypoint only starts webpack ([`scripts/docker-entrypoint-dev.sh`](../scripts/docker-entrypoint-dev.sh)); it does not `npm install` on each start.

**Reproduce rule:** After changing [`scenario-explorer/simulationTool/package.json`](../scenario-explorer/simulationTool/package.json), update the matching `RUN npm install ...` line in `Dockerfile.dev` (or align versions) and **rebuild** the image.

### 1.2 Webpack resolves addon packages from the wrong place

Requests originating under `/masterportal/addons/...` may not resolve hoisted packages the way you expect.

**Fix:** [`scripts/patch-webpack-vueform-alias.cjs`](../scripts/patch-webpack-vueform-alias.cjs) edits **`/masterportal/devtools/webpack.common.js`** at **image build time** to:

1. Prepend **`resolve.modules`** with `path.resolve(__dirname, "..", "node_modules")` so the **Masterportal root** `node_modules` is searched first.
2. Add **`resolve.alias["@vueform/slider"]`** → `/masterportal/node_modules/@vueform/slider`.

The script is **idempotent**: if it finds the marker `ScenarioExplorerAddonAliases`, it exits without re-applying (so repeated builds do not duplicate edits).

**Important:** There is **no** webpack alias for the whole `vuetify` package anymore. Vuetify is resolved like a normal dependency from root `node_modules` once paths/imports are correct (see below).

### 1.3 Vuetify 3 subpath imports and Webpack 4

Official Vuetify 3 examples use:

- `import ... from "vuetify/components"`
- `import ... from "vuetify/directives"`
- `import "vuetify/styles"`

Those entry points are defined in Vuetify’s **`package.json` `exports`**. **Webpack 4 in this Masterportal stack does not resolve those export subpaths** the way modern Node does, which led to errors like **Can’t resolve `vuetify/components`** (there is no physical `node_modules/vuetify/components` folder; only `lib/...` on disk).

**Fix:** Use **deep imports** to real files under `vuetify/lib/...` in [`scenario-explorer/simulationTool/vuetify/index.js`](../scenario-explorer/simulationTool/vuetify/index.js):

```javascript
import "vuetify/lib/styles/main.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/lib/components/index.js";
import * as directives from "vuetify/lib/directives/index.js";
```

**Why `.js`:** `vuetify@^3.7.0` in the image resolves to current 3.x (e.g. 3.12.x), which ships **`index.js`** under `lib/components` and `lib/directives`. Older tarballs sometimes used `.mjs`; if a future version changes filenames, adjust these two import paths after checking `node_modules/vuetify/lib/...` inside the container.

**Trade-off:** These paths track Vuetify’s published layout, not the short `vuetify/components` string from the docs. If Masterportal ever upgrades to a bundler that honors `exports`, you could switch back to subpath imports and drop the deep paths.

---

## 2. Other Docker/network pieces (for a full dev loop)

These are documented in [`README.md`](../README.md) but matter on a new machine:

- **API proxy:** [`devtools/proxyconf.json`](../devtools/proxyconf.json) forwards **`/api`** from the webpack dev server to **`http://host.docker.internal:5000`** (UMP on the host).
- **`host.docker.internal` on Linux:** `extra_hosts: host.docker.internal:host-gateway` in compose.
- **Webpack dev server:** `disableHostCheck: true`, HTTPS disabled via `sed` in `Dockerfile.dev` so nginx + HMR work as in this setup.
- **UMP:** Flask should listen on **`0.0.0.0`**, not only `127.0.0.1`, so the container can reach the API.
- **Keycloak / browser:** Web origins and redirect URIs must include your dev origin (see README).

---

## 3. Reproduce on a new machine (checklist)

1. **Install:** Docker + Docker Compose, Git.
2. **Clone** this repository (your fork or upstream with these changes).
3. **Urban Model Platform:** Run UMP (and Keycloak) per UMP docs; API reachable from Docker (e.g. port 5000 on the host, `FLASK_RUN_HOST=0.0.0.0`).
4. **From repo root:**
   - `docker compose build scenario-explorer`
   - `docker compose up` (starts nginx + scenario-explorer; nginx maps host **8080** → container 80 by default).
5. **Open:** `http://localhost:8080/portal/simulation/` (or `SCENARIO_EXPLORER_HTTP_PORT`).
6. **After changing addon deps or `patch-webpack-vueform-alias.cjs`:**  
   `docker compose build scenario-explorer`  
   If the webpack patch script changed but an old layer still has a stale `webpack.common.js`, use once:  
   `docker compose build --no-cache scenario-explorer`

### 3.1 Optional compile-only verification

```bash
docker compose run --rm --entrypoint "" scenario-explorer sh -c \
  'cd /masterportal && npx webpack --config devtools/webpack.prod.js --stats errors-warnings'
```

Exit code **0** and no **`Can't resolve 'vuetify`** / **`@vueform/slider`** errors indicates resolution is OK.

### 3.2 Optional IDE support on the host

```bash
cd scenario-explorer/simulationTool && npm install
```

This does not replace image root `node_modules`; it only helps local editors.

---

## 4. Summary table

| Area | Change | Why |
|------|--------|-----|
| `Dockerfile.dev` | Root `npm install` + addon packages | Bind mount overwrites `addons/`; root `node_modules` persists |
| `patch-webpack-vueform-alias.cjs` | `resolve.modules` + `@vueform/slider` alias | Webpack finds hoisted deps from addon paths |
| `simulationTool/vuetify/index.js` | Deep `vuetify/lib/...` imports | Webpack 4 + no `exports` resolution for `vuetify/components` |
| `simulationTool/package.json` | `vuetify` in dependencies | Explicit dependency for the addon |
| `docker-compose.yml` | Volumes + `host-gateway` | Live addon + portalconfig; UMP on host |
| `README.md` | Local UMP, ports, Vuetify note | Onboarding and upgrade hints |
