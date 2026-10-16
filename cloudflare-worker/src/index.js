// Olliebet AI Boekenschrijver — Cloudflare Worker
// Ontvangt een boek-opdracht van de frontend, roept Claude aan,
// en geeft de gegenereerde tekst terug.
//
// ANTHROPIC_API_KEY wordt als Cloudflare-secret ingesteld:
//   wrangler secret put ANTHROPIC_API_KEY

const ALLOWED_ORIGINS = [
  "https://olliebet.nl",
  "https://www.olliebet.nl",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResp({ error: "Alleen POST toegestaan" }, 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResp({ error: "Ongeldige JSON" }, 400, origin);
    }

    const { genre, hoofdpersonen, bijpersonen, onderwerp, bladzijdes, plaatjes } = body;

    if (!genre || !hoofdpersonen || !onderwerp || !bladzijdes) {
      return jsonResp({ error: "Ontbrekende velden" }, 400, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResp({ error: "Server mist ANTHROPIC_API_KEY" }, 500, origin);
    }

    // Bouw het Claude-prompt
    const systemPrompt = bouwSystemPrompt(genre);
    const userContent = bouwUserContent({
      genre, hoofdpersonen, bijpersonen, onderwerp, bladzijdes, plaatjes,
    });

    // Schaal max_tokens met gewenste lengte (ongeveer 400 tokens per bladzijde)
    const maxTokens = Math.min(64000, Math.max(2000, bladzijdes * 400));

    try {
      const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!claudeResp.ok) {
        const errText = await claudeResp.text();
        return jsonResp({ error: `Claude: ${claudeResp.status} ${errText.slice(0, 300)}` }, 502, origin);
      }

      const data = await claudeResp.json();
      const tekst = (data.content || [])
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("\n\n");

      return jsonResp({ tekst, usage: data.usage }, 200, origin);
    } catch (err) {
      return jsonResp({ error: `Fout bij aanroepen Claude: ${err.message}` }, 500, origin);
    }
  },
};

function bouwSystemPrompt(genre) {
  const basis = `Je bent een ervaren Nederlandse schrijver die boeken schrijft op maat. Je schrijft in natuurlijk, levendig Nederlands. Je gebruikt dialoog, beschrijvingen en een duidelijke verhaalstructuur met hoofdstukken.`;
  if (genre.id === "leerzaam") {
    return `${basis}

Je schrijft nu een LEERZAAM boek. Taalgebruik moet geschikt zijn voor alle leeftijden: duidelijk, concreet, met voorbeelden. Leg stap voor stap uit. Gebruik korte paragrafen en koppen. Vermijd jargon of leg het meteen uit. Begin met een boeiende inleiding en eindig met een samenvatting.`;
  }
  if (genre.id === "avontuur") {
    return `${basis}

Je schrijft nu een AVONTUURLIJK boek voor kinderen van 7 tot 13 jaar. Taal moet eenvoudig maar levendig zijn. Veel actie, humor, cliffhangers aan het eind van hoofdstukken. Hoofdpersonen zijn moedig maar maken ook fouten. Geen geweld dat te heftig is voor kinderen, geen seksuele inhoud.`;
  }
  if (genre.id === "thriller") {
    return `${basis}

Je schrijft nu een THRILLER voor jongeren van 13 tot 17 jaar. Spanning, mysterie, verrassende wendingen. Taal mag volwassener zijn maar blijft toegankelijk. Mag intens zijn, maar vermijd expliciet grafisch geweld of seksuele inhoud die ongeschikt is voor tieners.`;
  }
  if (genre.id === "roman") {
    return `${basis}

Je schrijft nu een LITERAIRE ROMAN voor volwassenen (18+). Diepgang, karakterontwikkeling, emotie, realisme. Taal mag rijk en genuanceerd zijn. Thema's zoals liefde, verlies, identiteit mogen uitgewerkt worden met de nuance die bij volwassenen past.`;
  }
  return basis;
}

function bouwUserContent({ genre, hoofdpersonen, bijpersonen, onderwerp, bladzijdes, plaatjes }) {
  const tekstPrompt = `Schrijf een ${genre.naam.toLowerCase()}-boek voor ${genre.leeftijd}.

HOOFDPERSONEN:
${hoofdpersonen}

BIJPERSONEN:
${bijpersonen || "(geen)"}

ONDERWERP / PLOT:
${onderwerp}

GEWENSTE LENGTE: ongeveer ${bladzijdes} bladzijdes (${bladzijdes * 300} woorden). Verdeel het boek in hoofdstukken van passende lengte. Begin met een pakkende titel bovenaan.

Schrijf het hele boek in één keer. Gebruik Markdown: # voor de titel, ## voor hoofdstukken.`;

  // Als er plaatjes zijn: stuur ze mee als Claude vision-input
  const content = [];
  if (Array.isArray(plaatjes) && plaatjes.length > 0) {
    for (const p of plaatjes.slice(0, 5)) { // max 5 plaatjes
      if (!p.dataUrl || typeof p.dataUrl !== "string") continue;
      const match = p.dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (!match) continue;
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: match[1],
          data: match[2],
        },
      });
    }
    content.push({
      type: "text",
      text: `Hierboven zie je ${content.length} plaatje${content.length === 1 ? "" : "s"} ter inspiratie. Gebruik ze als visuele referentie voor hoe personages, plekken of dingen eruit zouden kunnen zien.\n\n${tekstPrompt}`,
    });
  } else {
    content.push({ type: "text", text: tekstPrompt });
  }
  return content;
}

function jsonResp(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}
