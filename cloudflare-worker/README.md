# Olliebet AI Boekenschrijver — Cloudflare Worker (Gemini)

Deze Worker ontvangt boekaanvragen van olliebet.nl, roept Google Gemini aan,
en geeft de gegenereerde tekst terug. De Gemini API-key blijft op
Cloudflare, nooit in de frontend.

Gemini 2.0 Flash wordt gebruikt — gratis tier: **15 aanvragen per minuut, 1500 per dag**.

## Eenmalige setup (10 minuten)

### 1. Gemini API-key ophalen

- Ga naar [aistudio.google.com](https://aistudio.google.com)
- Log in met je Google-account
- Links: **"Get API key"** → **"Create API key"**
- Kopieer de key (`AIza...`)

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

### 5. Gemini API-key als secret opslaan

```bash
wrangler secret put GEMINI_API_KEY
```

Hij vraagt om de key — plak je `AIza...` key en druk op Enter.
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
- Google Gemini: **gratis** tot 1500 aanvragen per dag (= 1500 boeken)

**Totaal: €0 per maand** voor realistisch familiegebruik.
