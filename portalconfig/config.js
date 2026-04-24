const Config = {
    namedProjections: [
        [
            "EPSG:25832",
            "+title=ETRS89/UTM 32N +proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
        ],
    ],
    footer: {
        urls: [
            {
                bezeichnung: "common:modules.footer.designation",
                url: "https://geoinfo.hamburg.de/",
                alias: "Landesbetrieb Geoinformation und Vermessung",
                alias_mobil: "LGV",
            },
        ],
        showVersion: true,
    },
    quickHelp: {
        imgPath: "./resources/img/",
    },
    layerConf: "https://geodienste.hamburg.de/services-internet.json",
    restConf: "https://geodienste.hamburg.de/lgv-config/rest-services-internet.json",
    styleConf: "https://geodienste.hamburg.de/lgv-config/style_v3.json",
    wfsImgPath: "https://geodienste.hamburg.de/lgv-config/img/",
    cesiumLibrary: "https://geoportal-hamburg.de/mastercode/cesium/latest/Cesium.js",
    scaleLine: true,
    mouseHover: {
        numFeaturesToShow: 2,
        infoText: "(weitere Objekte. Bitte zoomen.)",
    },
    portalLanguage: {
        enabled: true,
        debug: false,
        languages: {
            de: "Deutsch",
            en: "English",
        },
        fallbackLanguage: "de",
        changeLanguageOnStartWhen: ["querystring", "localStorage", "htmlTag"]
    },
    vuetify: "addons/simulationTool/vuetify.js",
    addons: ["simulationTool"],
    // Browser calls this URL directly (Vuex actions). Use host-accessible UMP; CORS is enabled on UMP.
    simulationApiUrl: "http://127.0.0.1:5000/api",
    login: {
        // UMP docker-compose-dev publishes Keycloak with legacy /auth context path (see urban-model-platform .env.example).
        oidcAuthorizationEndpoint: "http://127.0.0.1:8282/auth/realms/UrbanModelPlatform/protocol/openid-connect/auth",
        oidcTokenEndpoint: "http://127.0.0.1:8282/auth/realms/UrbanModelPlatform/protocol/openid-connect/token",
        oidcClientId: "ump-client",
        // Must match how you open the portal (docker-compose nginx default: port 8080 on host) and Keycloak client ump-client.
        oidcRedirectUri: "http://localhost:8080/portal/simulation/",
        oidcScope: "openid",
        // Attach Bearer to same-origin /api (webpack proxy) and to direct simulationApiUrl calls.
        interceptorUrlRegex: "https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?/.*"
    }
};

// conditional export to make config readable by e2e tests
if (typeof module !== "undefined") {
    module.exports = Config;
}