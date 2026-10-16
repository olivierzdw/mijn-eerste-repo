# Olliebet AI Boekenschrijver — Cloudflare Worker

Deze Worker vangt boekaanvragen op van olliebet.nl, roept Claude aan,
en geeft de gegenereerde tekst terug. De Anthropic API-key blijft op
Cloudflare, nooit in de frontend.

## Eenmalige setup

### 1. Installeer Wrangler (de Cloudflare-tool)

```bash
npm install -g wrangler
# of eenmalig zonder install:
npx wrangler <command>
```

### 2. Login op Cloudflare

```bash
cd cloudflare-worker
wrangler login
```

Dit opent je browser → maak gratis Cloudflare-account aan als je die nog niet hebt → geef toestemming.

### 3. Zet de Anthropic API-key als secret

```bash
wrangler secret put ANTHROPIC_API_KEY
```

Plak je `sk-ant-api03-...` key in. De key wordt versleuteld opgeslagen bij Cloudflare en komt NOOIT in de git repo.

### 4. Deploy de Worker

```bash
wrangler deploy
```

Je krijgt een URL terug, bijv.:

```
https://olliebet-boek.olivierzonderwijk.workers.dev
```

### 5. Zet die URL in Olliebet

In `script.js` staat `const BOEKEN_WORKER_URL = "..."`. Vervang die
door jouw Worker-URL.

## Updates deployen

```bash
wrangler deploy
```

Dat is alles. Geen git nodig voor de Worker — die leeft op Cloudflare.

## Kosten

- Cloudflare Workers: gratis tot 100.000 aanvragen per dag
- Anthropic Claude: per gegenereerd boek
  - 10 bladzijdes ≈ $0.05
  - 50 bladzijdes ≈ $0.25
  - 100 bladzijdes ≈ $0.50
- Totaal per boek: ongeveer €0,05–€0,50
