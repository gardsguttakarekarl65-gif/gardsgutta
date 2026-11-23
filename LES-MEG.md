# Gårdsgutta Kåre & Karl – nettsiden

Hele nettsiden ligger i denne mappa. Den legges ut gratis på **GitHub Pages**, og GitHub
henter nye YouTube-videoer og oppdaterer siden **to ganger i timen, i skyen** –
PC-en din trenger ikke være på.

| Fil | Hva den gjør |
|---|---|
| `index.html` | Selve nettsiden |
| `config.js` | **Her endrer du tekster og lenker** (YouTube, TikTok, Discord, om oss, gjengen) |
| `logo.png`, `logo-traktor.png`, `favicon.png` | Logoen |
| `oppdater.mjs` | Henter videoer, tall og innlegg (kjøres av GitHub) |
| `.github/workflows/` | Automatikken |

Du kan dobbeltklikke på `index.html` for å se siden på PC-en med eksempelinnhold.

---

## 1. Legg ut siden (én gang, ca. 10 minutter)

1. Lag en gratis konto på **github.com**.
2. Trykk **+** øverst til høyre → **New repository**. Navn: `gardsgutta` · **Public** · **Create repository**.
3. Trykk **uploading an existing file**. Pakk ut zip-fila og dra **alt innholdet** inn i vinduet –
   også mappa `.github` (vis skjulte mapper i Filutforsker: **Vis → Skjulte elementer**). Trykk **Commit changes**.
4. **Settings → Pages** → under *Source* velger du **GitHub Actions**.
5. **Actions** → **Oppdater nettsiden** → **Run workflow**.
   Etter ca. ett minutt ligger siden på `https://<brukernavnet-ditt>.github.io/gardsgutta/`

## 2. Koble til YouTube-kanalen

Åpne `config.js` på GitHub → trykk blyanten (✏️) → skriv inn `youtube.handle`, f.eks. `"@GardsguttaKareKarl"`.
Fyll også inn `lenker.tiktok`, `lenker.discord` osv. Trykk **Commit changes**.

Da kommer de nyeste videoene inn automatisk. Siden husker alle videoer den har sett, så lista vokser for hver ny video.

### Anbefalt: API-nøkkel → ALLE videoene + live abonnenttall (gratis, ca. 5 min)

1. Gå til **console.cloud.google.com** og logg inn med Google-kontoen.
2. Lag et nytt prosjekt (f.eks. «Gardsgutta»).
3. Søk opp **YouTube Data API v3** → **Enable**.
4. **APIs & Services → Credentials → Create credentials → API key**.
5. Trykk på nøkkelen → **Application restrictions: Websites** → legg til
   `https://<brukernavnet-ditt>.github.io/*` → **API restrictions: YouTube Data API v3** → **Save**.
6. Lim nøkkelen inn i `config.js` → `youtube.apiKey`.

Nå henter siden hele kanalen (alle videoer, også de eldste), og abonnenter/visninger oppdateres live mens folk er inne på siden.
Nøkkelen er låst til nettsiden deres, så den kan ikke misbrukes andre steder.

## 3. Legg ut et innlegg («Nytt fra gården») – bare du kan

1. Gå til repoet → fanen **Issues** → **New issue** → velg **Nytt innlegg**.
   (Tips: lagre den siden som bokmerke, så er du der med ett klikk.)
2. Skriv tittel og tekst. Dra inn bilder rett i tekstfeltet.
3. Trykk **Create** / **Submit new issue**. Innlegget ligger på siden etter ca. ett minutt.

**Endre:** rediger innlegget (de tre prikkene → *Edit*). **Fjerne fra siden:** trykk **Close issue**.
Bare innlegg som *du* (eieren av repoet) har laget, vises – andre kan ikke legge ut noe på siden.

## 4. Om oss og gjengen

Alt står i `config.js` under `velkommen`, `historie` og `gjengen`.
Vil du ha bilde av noen: last opp bildet til repoet (**Add file → Upload files**, f.eks. `arne.jpg`) og skriv `bilde: "arne.jpg"`.
Fjern `utkast: true` når teksten om en person er ferdig.

## 5. Eget domene (f.eks. gardsgutta.no)

**Kjøpe:** Bruk en norsk forhandler, f.eks. Domeneshop (domeneshop.no). For .no-domener må du først lage en
gratis person-ID hos Norid (norid.no) – forhandleren viser deg veien når du bestiller.

**Koble til (gjør i denne rekkefølgen):**
1. GitHub: repoet → **Settings → Pages → Custom domain** → skriv `gardsgutta.no` → **Save**.
2. Hos domeneforhandleren → **DNS** for domenet → legg til:

   | Type | Navn/Host | Verdi |
   |---|---|---|
   | A | @ (tomt) | 185.199.108.153 |
   | A | @ (tomt) | 185.199.109.153 |
   | A | @ (tomt) | 185.199.110.153 |
   | A | @ (tomt) | 185.199.111.153 |
   | CNAME | www | `<brukernavnet-ditt>.github.io` |

   Slett andre A-poster på @ hvis forhandleren har lagt inn noen fra før.
3. Vent (fra noen minutter til et par timer). Gå tilbake til **Settings → Pages** og huk av **Enforce HTTPS** når det blir mulig.
4. Har du YouTube-nøkkel: legg til `https://gardsgutta.no/*` og `https://www.gardsgutta.no/*` på nøkkelen.

## Hvis noe ikke oppdaterer seg

- Se i fanen **Actions** – en rød prikk viser hva som gikk galt.
- GitHub pauser den automatiske jobben hvis det ikke har skjedd noe i repoet på 60 dager.
  Da trykker du **Actions → Oppdater nettsiden → Enable workflow**.
- Finner den ikke kanalen: skriv kanal-ID-en (starter med `UC…`) i `youtube.channelId`.
