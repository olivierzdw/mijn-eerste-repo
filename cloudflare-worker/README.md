# Olliebet AI Boekenschrijver — Cloudflare Worker (Claude)

Deze Worker ontvangt boekaanvragen van olliebet.nl, roept Anthropic Claude aan,
en geeft de gegenereerde tekst terug. De Anthropic API-key blijft op
Cloudflare, nooit in de frontend.

Model: **claude-sonnet-4-5** (betaald — zie "Kosten" onderaan).

## Eenmalige setup (10 minuten)

### 1. Anthropic API-key ophalen

- Ga naar [console.anthropic.com](https://console.anthropic.com)
- Log in met je account
- Links: **"API Keys"** → **"Create Key"**
- Kopieer de key (`sk-ant-...`)
- Zet wat tegoed op je account onder **"Billing"** (bijv. €5)

### 2. Cloudflare-account aanmaken

- Ga naar [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
- Vul e-mail en wachtwoord in
- Verifieer je e-mail

### 3. Wrangler installeren (de Cloudflare-tool)

Open Terminal op je Mac en typ:

```bash
npm install -g wrangler
```

(Werkt niet? Dan heb je Node.js nodig: [nodejs.org](https://nodejs.org))

### 4. Inloggen op Cloudflare via Wrangler

```bash
cd ~/development/mijn-eerste-repo/cloudflare-worker
wrangler login
```

Dit opent je browser → geef Wrangler toestemming.

### 5. Anthropic API-key als secret opslaan

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Hij vraagt om de key — plak je `sk-ant-...` key en druk op Enter.
De key wordt versleuteld opgeslagen bij Cloudflare, komt NOOIT in de git repo.

### 6. Deploy de Worker

```bash
wrangler deploy
```

Je krijgt een URL terug, bijv.:

```
https://olliebet-boek.olivierzonderwijk.workers.dev
```

**Kopieer deze URL** — die moet in `script.js` komen.

### 7. URL in Olliebet zetten

In `script.js` staat bovenaan de AI-sectie:

```js
const BOEKEN_WORKER_URL = "";
```

Vervang de lege string door jouw Worker-URL en commit + push.

## Updates deployen

```bash
cd cloudflare-worker
wrangler deploy
```

Dat is alles. De Worker leeft op Cloudflare, los van git/GitHub Pages.

## Kosten

- Cloudflare Workers: **gratis** tot 100.000 aanvragen per dag
- Anthropic Claude Sonnet 4.5: **betaald per gebruik**
  - ~$3 per miljoen input tokens, ~$15 per miljoen output tokens
  - Eén boek van ~20 bladzijdes ≈ $0.10 – $0.15
  - Op €5 tegoed kun je dus ~30–50 boeken genereren

De `(1 keer gratis)` tekst op de knop slaat op lokale lokale rate-limiting
in de frontend (localStorage) — niet op API-kosten.
