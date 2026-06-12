
![Scenario Explorer Kopie](https://github.com/user-attachments/assets/2a8dd17b-1cbd-40be-a067-9e5c901566fc)

# Scenario Explorer
This repository contains the code for the [Masterportal](https://bitbucket.org/geowerkstatt-hamburg/masterportal/src/v3.6.0/) Scenario Explorer AddOn. The AddOn is a dynamic interface to the [Urban Model Platform](https://github.com/citysciencelab/urban-model-platform) and enables users to run simulations and ensembles of various models, retrieve and share results, and visualize them as geo layers and charts. 

## Development Setup

**Detailed reproduction / build rationale:** [docs/REPRODUCTION.md](./docs/REPRODUCTION.md)

### Requirements
- A running instance of the [Urban Model Platform](https://github.com/citysciencelab/urban-model-platform)
- Docker

### Configuration
Most configuration of the AddOn and takes place in the [portalconfig](./portalconfig) folder. In the [config.js](./portalconfig/config.js) file, the following elements need to be specified:

| Configuration Variable       | Description                                                                                     | Example                                      |
|------------------------------|-------------------------------------------------------------------------------------------------|----------------------------------------------|
| `addons`                     | A list of addons to be used in the scenario explorer.                                           | `["simulationTool"]`                       |
| `simulationApiUrl`           | The URL of the Urban Model Platform API used for simulation.                                    | `https://api.simulation.com`                 |
| `login`                      | Configuration parameters for login, including sub-variables:                                    |                                              |
| - `oidcAuthorizationEndpoint`| The URL for the OIDC authorization endpoint.                                                    | `https://auth.example.com/authorize`         |
| - `oidcTokenEndpoint`        | The URL for the OIDC token endpoint.                                                            | `https://auth.example.com/token`             |
| - `oidcClientId`             | The client ID for OIDC authentication (typically set up in the Keycloak instance)               | `scenario-explorer`                           |
| - `oidcRedirectUri`          | The redirect URI for OIDC authentication (localhost when in development)                        | `http://localhost:8080/portal/simulation/`           |
| - `oidcScope`                | The scope for OIDC authentication.                                                              | `"openid"`                       |
| - `interceptorUrlRegex`      | A regex pattern to match URLs that should be intercepted.                                       | `^https://api\.example\.com/.*$`             |

### Local Urban Model Platform (this repository defaults)

[`portalconfig/config.js`](./portalconfig/config.js) is set up for a typical **urban-model-platform** dev stack on the host:

- API: `http://127.0.0.1:5000/api` (`simulationApiUrl`)
- Keycloak (OIDC): `http://localhost:8282/auth/realms/UrbanModelPlatform/...` — path **`/auth`** matches Keycloak when served under that context (account-console at `http://localhost:8282/auth`). Keep **`localhost`** (not mixed with `127.0.0.1`) on `oidcAuthorizationEndpoint` / `oidcTokenEndpoint` so issuer and redirect URIs align with client **ump-client** (realm **UrbanModelPlatform**; same stack as UMP `.env.example`).
- Redirect URI after login: `http://localhost:8080/portal/simulation/` (nginx from `docker compose`; override host port with `SCENARIO_EXPLORER_HTTP_PORT`, default **8080**)

**Docker Compose dev server:** [`devtools/proxyconf.json`](./devtools/proxyconf.json) proxies **`/api`** from the Masterportal webpack dev server to **`http://host.docker.internal:5000`** (UMP on the host). [`docker-compose.yml`](./docker-compose.yml) sets `extra_hosts` so `host.docker.internal` resolves on Linux too.

**UMP must listen on all interfaces** (not only `127.0.0.1`), otherwise the container cannot reach it. Example: `FLASK_RUN_HOST=0.0.0.0 FLASK_RUN_PORT=5000 flask run` from the urban-model-platform repo (with your usual `FLASK_APP`).

**Manual Masterportal clone (no Docker):** copy [`devtools/proxyconf.local.example.json`](./devtools/proxyconf.local.example.json) to `masterportal/devtools/proxyconf.json` so `/api` targets `http://127.0.0.1:5000`.

**Keycloak:** Import or align your realm with [urban-model-platform/keycloak-example-conf.json](https://github.com/citysciencelab/urban-model-platform/blob/main/keycloak-example-conf.json). Client **ump-client** should allow redirect URIs used by the Scenario Explorer (the example uses `/*` on `redirectUris`). After changing Keycloak in a running realm, add **`http://localhost`** / **`http://127.0.0.1`** to **Web origins** for **ump-client** if the browser blocks token requests (the example export includes these).

**Addon `node_modules`:** The compose bind-mount replaces `./scenario-explorer` over `/masterportal/addons/`, so `addons/simulationTool/node_modules` on the host is often missing. The **Docker image** installs `simulationTool` dependencies (`@vueform/slider`, `lodash`, `plotly.js-dist`, `vuetify`) into **`/masterportal/node_modules`**, which is **not** mounted over, so webpack can resolve imports. **Rebuild** the image (`docker compose build scenario-explorer`) after changing `simulationTool/package.json` dependencies. For local IDE support you can still run `cd scenario-explorer/simulationTool && npm install` on the host.

**Vuetify + Webpack 4:** The addon loads Vuetify via **`vuetify/lib/...`** paths in [`scenario-explorer/simulationTool/vuetify/index.js`](./scenario-explorer/simulationTool/vuetify/index.js) because Masterportal’s webpack does not resolve Vuetify’s `package.json` `exports` subpaths (`vuetify/components`, etc.). Current 3.x builds ship **`lib/**/index.js`** (some older tarballs used `.mjs`). After a **major** `vuetify` upgrade, if the build breaks, confirm the filenames under `node_modules/vuetify/lib/components` and `.../directives` (or switch back to subpath imports if you move to a build that supports `exports`).

**Run order:** Start UMP backing services and the Flask API (`make start-dev` and run the app per UMP docs), then `docker compose up --build` in this repo and open `http://localhost:8080/portal/simulation/` (or your chosen `SCENARIO_EXPLORER_HTTP_PORT`).

### Modifying Existing Phrasing

If existing text content from any component in the addon needs to be modified, this must be done in the JSON files from the `locales` folder under `scenario-explorer-addon/simulationTool/locales`. Here you can find a json document for each supported language. The `keys` of the `simulationTool` object are referenced in the application. These must remain unchanged. However, the `values` can be adjusted to change the existing texts.

## Help-Section

### Adding more items

To add more items, the component HelpPanel.vue needs to be modified under `scenario-explorer-addon/simulationTool/components/HelpSection/HelpPanel.vue`. The data() section within the `<script>` block returns an object with three keys: `definitions`, `faqsApplication`, and `faqsPrivacy`. These contain the questions and answers from the glossary and the FAQ (both for application-related and privacy-related topics). To add new questions and answers, simply add a new object 
```
{
    question: 'This is my question', 
    answer: 'This is my answer'
}
``` 
to the respective array.

Both the master portal and the addon currently support German and English languages. If this is to remain the case for help content and accordingly for questions and answers, the i18n library must still be used. In this case, the object would look as follows instead of what was previously described: 
```
{
    question: this.$t('additional:modules.tools.simulationTool.MyNewQuestion'), 
    answer: this.$t('additional:modules.tools.simulationTool.MyNewAnswer')
}
```

This way, the translation files under `scenario-explorer-addon/simulationTool/locales` are referenced. There is a separate JSON file for each language. The parameters `MyNewQuestion` and `MyNewAnswer` must appear as keys in the translation files. The value will then be the respective text:

```
"MyNewQuestion": "This is my question",
"MyNewAnswer": "This is my answer"
```

## Tutorial-Section

The images from the tutorial section still originate from the mockups. If these are to be updated, the respective image must be replaced under `scenario-explorer-addon/simulationTool/resources/img`. The images have the same names as the corresponding Vue components to make the association easier. If the name of an image is changed, the name must also be adjusted in the corresponding Vue component.
