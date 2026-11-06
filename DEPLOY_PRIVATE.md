# Diboraculum Hub — Deploy privato

Questo archivio contiene il codice sorgente aggiornato del progetto. Non include `node_modules`, la directory `dist`, file `.env`, credenziali, token o chiavi private.

## Requisiti

- Node.js 20 LTS o superiore
- pnpm 10 (`corepack enable && corepack prepare pnpm@10.4.1 --activate`)
- MySQL/TiDB raggiungibile dal server
- HTTPS obbligatorio in produzione, soprattutto per OAuth e cookie di sessione

## Installazione

```bash
pnpm install --frozen-lockfile
cp .env.example .env
# Compilare .env con valori reali e segreti mantenuti fuori dal repository
pnpm check
pnpm test
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

Il server Express serve il frontend compilato da `dist/public` e usa `dist/index.js` come entrypoint.

## Variabili ambiente

Compilare `.env` con:

- `DATABASE_URL`: URL MySQL/TiDB del database applicativo.
- `JWT_SECRET`: segreto lungo e casuale per firmare la sessione.
- `VITE_APP_ID`: application ID Manus OAuth.
- `OAUTH_SERVER_URL`: base URL del server OAuth Manus.
- `VITE_OAUTH_PORTAL_URL`: URL del portale OAuth lato browser.
- `OWNER_OPEN_ID` e `OWNER_NAME`: identificativo e nome dell’amministratore iniziale.
- `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY`: endpoint e chiave del gateway AI/server-side, se si usano le funzioni AI.
- `VITE_FRONTEND_FORGE_API_URL` e `VITE_FRONTEND_FORGE_API_KEY`: solo se richiesti dalle integrazioni frontend già configurate.
- `NODE_ENV=production` e `PORT=3000`.

Non committare mai `.env` o valori reali nel repository.

## Database

Dopo aver configurato `DATABASE_URL`, applicare lo schema con:

```bash
pnpm db:push
```

Eseguire questo comando solo dopo aver verificato il database target e avere un backup valido.

## OAuth e dominio privato

Nel pannello Manus OAuth configurare come origin/redirect il dominio HTTPS usato per l’installazione privata. Il frontend usa `window.location.origin`, quindi non inserire domini hardcoded nel codice. Assicurarsi che proxy o reverse proxy inoltrino correttamente `Host`, `X-Forwarded-Proto` e cookie sicuri.

Esempio Nginx minimale:

```nginx
server {
    listen 443 ssl http2;
    server_name diboraculum.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## PWA, SEO e cache

I file pubblici SEO/PWA sono in `client/public/`:

- `manifest.json` contiene `id`, `scope`, `start_url` e tema monocromatico.
- `robots.txt` permette la homepage e blocca dashboard, API e storage dall’indicizzazione.
- `sitemap.xml` pubblicizza solo la homepage.
- `sw.js` usa una cache versionata e network-first per le navigazioni, così gli aggiornamenti e i redirect OAuth non restano bloccati da HTML obsoleto.

Dopo un nuovo deploy, se un dispositivo mostra ancora una versione precedente, aggiornare la PWA dal browser o disinstallarla/reinstallarla.

## Checklist privata prima del go-live

1. HTTPS attivo e certificato valido.
2. `.env` presente solo sul server e con permessi restrittivi.
3. Database creato e schema applicato.
4. Redirect OAuth autorizzati sul dominio privato.
5. `pnpm check`, `pnpm test` e `pnpm build` completati senza errori.
6. `/`, `/dashboard`, `/manifest.json`, `/robots.txt` e `/sitemap.xml` verificati con HTTP 200.
7. API e dashboard non esposte nei risultati dei motori di ricerca.
8. Backup del database prima di ogni migrazione o aggiornamento.
