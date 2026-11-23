// =====================================================================
//  GÅRDSGUTTA – INNSTILLINGER FOR NETTSIDEN
//  Alt du trenger å endre står her. Endre teksten mellom "anførselstegn",
//  trykk «Commit changes» på GitHub, og siden oppdaterer seg selv etter ca. 1 minutt.
// =====================================================================
window.SITE = {
  fulltNavn: "Gårdsgutta Kåre & Karl",
  slagord: "Norges (kanskje) minst kvalifiserte bønder 🚜🤡",
  bannertekst: "Norges (kanskje) minst kvalifiserte bønder",   // teksten bak traktoren

  // ---- YOUTUBE ------------------------------------------------------
  youtube: {
    handle: "@GårdsguttaKåreKarl",  // @-navnet til kanalen
    channelId: "UCVi_HXnaLJYkD4nj82h3_7A",  // kanal-ID
    apiKey: ""       // anbefalt: gir ALLE videoene + live abonnenttall (se LES-MEG.md)
  },

  // ---- LENKER (la stå tomt "" hvis dere ikke har den) ----------------
  lenker: {
    youtube: "",     // tomt = lages automatisk fra handle over
    tiktok: "",      // f.eks. "https://www.tiktok.com/@gardsgutta"
    discord: "https://discord.gg/yTBrmXDTdr",
    instagram: "",
    twitch: ""
  },
  discordServerId: "",  // valgfritt: viser hvor mange som er pålogget på Discord

  // ---- OM OSS ---------------------------------------------------------
  velkommen: [
    "Velkommen til kanalen hvor en vennegjeng prøver seg som digitale bønder.",
    "Når Gårdsgutta setter i gang for å jobbe, er det om å gjøre å komme seg så langt vekk fra bøgda som mulig 🤠",
    "Hold dere godt fast – for her kan alt skje!"
  ],
  historie: [
    { ikon: "start",   tittel: "Kåre starter kanalen", tekst: "Kåre ville ha mer norsk Farming Simulator-innhold med ekte rollespill. Da han ikke fant det han lette etter, startet han Gårdsgutta Kåre & Karl selv – med stor entusiasme og litt mindre erfaring." },
    { ikon: "folk",    tittel: "Arne og Svein blir med", tekst: "Etter hvert fikk Kåre med seg Arne og Svein. Kanalen fikk flere hender og flere ideer – og et par ekstra traktorer i grøfta." },
    { ikon: "traktor", tittel: "Gårdsgutta i dag", tekst: "I dag driver tre kompiser kanalen sammen. Målet er norsk Farming Simulator-innhold med gårdsliv, rollespill og historier som henger sammen fra episode til episode." }
  ],
  gjengen: [
    { navn: "Kåre", rolle: "Grunnlegger og selvutnevnt gårdssjef", bilde: "",
      tekst: "Startet Gårdsgutta fordi Norge trengte mer Farming Simulator på norsk – med rollespill, drama og altfor dyre traktorer. Sjef på gården, i hvert fall på papiret.",
      fakta: [["Med siden", "Dag én"], ["Ansvar", "Kanalen, klippingen og alle dårlige investeringer"], ["Superkraft", "Finner grøfta – hver gang"]] },
    { navn: "Arne", rolle: "Gårdsgutt nr. 2", bilde: "",
      tekst: "Ble lurt med på «litt lett gårdsarbeid» og har ikke sett en fridag siden. Mener bestemt at alle problemer kan løses med en større traktor.",
      fakta: [["Med siden", "Kåre trengte hjelp"], ["Ansvar", "Alt Kåre ikke gidder"], ["Favorittlyd", "Turboen som piper"]] },
    { navn: "Svein", rolle: "Gårdsgutt nr. 3", bilde: "",
      tekst: "Sistemann inn på gården, men allerede den mest erfarne – i å velte. Påstår at sauene liker ham. Sauene har ikke kommentert saken.",
      fakta: [["Med siden", "De trengte noen til å måke"], ["Ansvar", "Dyr, rydding og moralsk støtte"], ["Rekord", "Tre traktorer i grøfta på én kveld"]] }
  ],
  // Tips: last opp et bilde til repoet (f.eks. kare.jpg) og skriv bilde: "kare.jpg"

  spillVideoerPaaSiden: true   // true = videoene spilles av rett på siden
};
