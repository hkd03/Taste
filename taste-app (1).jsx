import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// TASTE IN MOTION — Clean rebuild
// FREE_LIMIT = 60 for testing (change to 3 for launch)
// ─────────────────────────────────────────────────────────────

const FREE_LIMIT = 60;

const CATS = [
  { id:"movies",    label:"Film & TV",  emoji:"🎬" },
  { id:"music",     label:"Music",      emoji:"🎵" },
  { id:"games",     label:"Games",      emoji:"🎮" },
  { id:"books",     label:"Books",      emoji:"📚" },
  { id:"beer",      label:"Beer",       emoji:"🍺" },
  { id:"whiskey",   label:"Whiskey",    emoji:"🥃" },
  { id:"perfume",   label:"Perfume",    emoji:"🌹" },
  { id:"cocktails", label:"Cocktails",  emoji:"🍹" },
];

// ─────────────────────────────────────────────────────────────
// AI PROMPTS — all at module level, plain string concatenation
// No template literals. No JSON braces in strings near JSX.
// ─────────────────────────────────────────────────────────────

function buildProfilePrompt(signalsJson, catIds) {
  return "Build a taste profile from these signals: " + signalsJson +
    ". Active worlds: " + catIds +
    ". Return ONLY a JSON object with these exact keys: " +
    '{"signature":"One evocative sentence about their taste","dimensions":' +
    '{"intensity":7,"complexity":8,"darkness":6,"warmth":5,"energy":5,' +
    '"boldness":7,"sweetness":3,"nostalgia":5,"acquired_taste":7,"social":4,"narrative":8},' +
    '"byCategory":{}}';
}

function buildRecsPrompt(profileStr, catIds) {
  return "You are a taste intelligence engine. User taste profile: " + profileStr +
    ". Active worlds: " + catIds +
    ". Give exactly one personalised recommendation per world listed." +
    " Return ONLY a JSON object: " +
    '{"recommendations":[{"category":"movies","title":"Parasite","subtitle":"Thriller / 2019",' +
    '"why":"One punchy sentence","matchScore":94}]}';
}

function buildMoodPrompt(query, profileStr, catIds) {
  return "Mood request: " + query +
    ". User taste: " + profileStr +
    ". Active worlds: " + catIds +
    ". Return ONLY JSON: " +
    '{"fingerprint":"Short evocative phrase","categories":[{"category":"movies",' +
    '"hero":{"title":"","subtitle":"","why":""},"alternatives":[{"title":"","subtitle":""}]}]}';
}

function buildHiddenGemsPrompt(profileStr, catIds) {
  return "User taste: " + profileStr +
    ". Active worlds: " + catIds +
    ". Give one deep-cut hidden gem per world — perfectly matched to their taste but undiscovered." +
    " Return ONLY JSON: " +
    '{"headline":"One punchy sentence","recommendations":[{"category":"movies",' +
    '"title":"","subtitle":"","why":"","matchScore":88}]}';
}

function buildSurprisePrompt(profileStr, catIds) {
  return "User taste: " + profileStr +
    ". Active worlds: " + catIds +
    ". Give one adventurous recommendation per world OUTSIDE their usual taste — challenge and expand their horizons." +
    " Return ONLY JSON: " +
    '{"headline":"One punchy sentence","recommendations":[{"category":"movies",' +
    '"title":"","subtitle":"","why":"","matchScore":72}]}';
}

function buildSearchPrompt(query, profileStr, catIds, inLibStr) {
  return "User searched: " + query +
    ". User taste: " + profileStr +
    ". Active worlds: " + catIds +
    (inLibStr ? ". " + inLibStr : "") +
    ". Return ONLY JSON in one of these formats: " +
    '{"mode":"recommendation","heading":"","recommendations":[{"category":"","title":"","subtitle":"","why":"","matchScore":85}]}' +
    " OR " +
    '{"mode":"lookup","searched":{"category":"","title":"","verdict":"Yes","reason":"","matchScore":85},' +
    '"alternativesLabel":"More like this","withinCategory":[{"category":"","title":"","subtitle":"","why":""}],' +
    '"crossCategory":[{"category":"","title":"","subtitle":"","why":""}]}' +
    ". verdict must be exactly: Yes, Maybe, or Probably not";
}

function buildDetailPrompt(catId, title, catLabel) {
  if (catId === "movies") {
    return "Give detailed info about the film or TV show: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","year":"","director":"","cast":[""],"genre":"","runtime":"",' +
      '"imdbRating":"","synopsis":"2-3 sentences","whyWatch":"One sentence","streamingOn":[""]}';
  }
  if (catId === "music") {
    return "Give detailed info about the music: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","artist":"","year":"","genre":"","about":"2-3 sentences","topTracks":["T1","T2","T3"]}';
  }
  if (catId === "games") {
    return "Give detailed info about the game: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","year":"","developer":"","platforms":["PC"],"genre":"","metacritic":"","about":"2-3 sentences","playtime":""}';
  }
  if (catId === "books") {
    return "Give detailed info about the book: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","author":"","year":"","genre":"","pages":"","goodreadsRating":"","synopsis":"2-3 sentences"}';
  }
  if (catId === "whiskey") {
    return "Give detailed info about the whiskey: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","distillery":"","region":"","age":"","abv":"","type":"","tastingNotes":{"nose":"","palate":"","finish":""},"flavourTags":[""],"price":""}';
  }
  if (catId === "beer") {
    return "Give detailed info about the beer: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","brewery":"","style":"","abv":"","ibu":"","origin":"","tastingNotes":{"aroma":"","taste":"","finish":""},"about":"2 sentences"}';
  }
  if (catId === "perfume") {
    return "Give detailed info about the fragrance: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","house":"","perfumer":"","year":"","family":"","concentration":"","notes":{"top":[],"heart":[],"base":[]},"sillage":"","longevity":"","about":"2-3 sentences"}';
  }
  if (catId === "cocktails") {
    return "Give the recipe and info for the cocktail: " + title +
      ". Return ONLY JSON: " +
      '{"title":"","glass":"","garnish":"","about":"1-2 sentences","ingredients":[{"amount":"","item":""}],"method":"","flavourProfile":[""]}';
  }
  return "Give detailed info about: " + title + " (category: " + catLabel + ")." +
    ' Return ONLY JSON: {"title":"","about":"2-3 sentences","keyFacts":["Fact 1","Fact 2"]}';
}

function buildSuggestPrompt(val, catLabel) {
  return "User is searching for " + catLabel + " items matching: " + val +
    ". Return ONLY JSON with 6 real matching titles: " +
    '{"suggestions":["Title One","Title Two","Title Three","Title Four","Title Five","Title Six"]}';
}

// ─────────────────────────────────────────────────────────────
// CLAUDE API
// ─────────────────────────────────────────────────────────────

async function ai(prompt, fallback) {
  if (fallback === undefined) fallback = null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20251115",
        max_tokens: 1200,
        system: "You are a taste intelligence engine. Respond ONLY with a single valid JSON object. No markdown, no explanation.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    if (!data.content) return fallback;
    const raw = data.content.map(function(b) { return b.text || ""; }).join("").trim();
    const clean = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(clean);
  } catch(e) {
    console.error("AI call failed:", e);
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────
// SWIPE CARDS
// ─────────────────────────────────────────────────────────────

const SWIPE_CARDS = [
  { id:"mv1", cat:"movies",    emoji:"🎬", title:"The Office",                 descriptor:"Warm, cosy, endlessly rewatchable comedy" },
  { id:"mv2", cat:"movies",    emoji:"🎬", title:"Hereditary",                 descriptor:"Slow-dread horror — deeply unsettling" },
  { id:"mv3", cat:"movies",    emoji:"🎬", title:"Parasite",                   descriptor:"Genre-bending Korean thriller, won the Palme d'Or" },
  { id:"mv4", cat:"movies",    emoji:"🎬", title:"Interstellar",               descriptor:"Epic, cerebral sci-fi — big feelings, big ideas" },
  { id:"mv5", cat:"movies",    emoji:"🎬", title:"The Grand Budapest Hotel",   descriptor:"Whimsical, hyper-stylised Wes Anderson comedy" },
  { id:"mv6", cat:"movies",    emoji:"🎬", title:"Midsommar",                  descriptor:"Disturbing folk horror in broad daylight" },
  { id:"mu1", cat:"music",     emoji:"🎵", title:"Bohemian Rhapsody – Queen",  descriptor:"Theatrical, genre-defying, universally known" },
  { id:"mu2", cat:"music",     emoji:"🎵", title:"Kid A – Radiohead",          descriptor:"Cold, abstract, electronic — deliberately alienating" },
  { id:"mu3", cat:"music",     emoji:"🎵", title:"Rolling in the Deep – Adele",descriptor:"Powerful, soulful, emotionally direct" },
  { id:"mu4", cat:"music",     emoji:"🎵", title:"Kind of Blue – Miles Davis", descriptor:"Cool jazz — spacious, subtle, requires patience" },
  { id:"mu5", cat:"music",     emoji:"🎵", title:"DAMN. – Kendrick Lamar",     descriptor:"Dense, layered hip-hop — rewards close listening" },
  { id:"mu6", cat:"music",     emoji:"🎵", title:"Carrie & Lowell – Sufjan Stevens", descriptor:"Sparse, devastating folk — deeply personal grief" },
  { id:"gm1", cat:"games",     emoji:"🎮", title:"Mario Kart",                 descriptor:"Pure fun, zero friction, everyone knows it" },
  { id:"gm2", cat:"games",     emoji:"🎮", title:"Dark Souls",                 descriptor:"Punishing, atmospheric — failure is the point" },
  { id:"gm3", cat:"games",     emoji:"🎮", title:"The Last of Us",             descriptor:"Cinematic, emotionally devastating story" },
  { id:"gm4", cat:"games",     emoji:"🎮", title:"Stardew Valley",             descriptor:"Quiet, meditative farming — no urgency at all" },
  { id:"gm5", cat:"games",     emoji:"🎮", title:"Disco Elysium",              descriptor:"All dialogue, no combat — a political fever dream" },
  { id:"gm6", cat:"games",     emoji:"🎮", title:"Hades",                      descriptor:"Fast, stylish roguelike — tight and satisfying" },
  { id:"bk1", cat:"books",     emoji:"📚", title:"Harry Potter",               descriptor:"Warm, magical, beloved coming-of-age" },
  { id:"bk2", cat:"books",     emoji:"📚", title:"Blood Meridian",             descriptor:"Brutal, poetic, uncompromising — not for everyone" },
  { id:"bk3", cat:"books",     emoji:"📚", title:"Normal People – Sally Rooney",descriptor:"Intimate, precise, emotionally raw modern fiction" },
  { id:"bk4", cat:"books",     emoji:"📚", title:"Sapiens – Harari",           descriptor:"Sweeping non-fiction — big ideas, easy read" },
  { id:"bk5", cat:"books",     emoji:"📚", title:"Dune – Herbert",             descriptor:"Dense, political sci-fi epic — slow burn" },
  { id:"bk6", cat:"books",     emoji:"📚", title:"The Road – McCarthy",        descriptor:"Sparse, bleak, relentlessly intense" },
  { id:"br1", cat:"beer",      emoji:"🍺", title:"Corona Extra",               descriptor:"Light, crisp, easy — the safe choice" },
  { id:"br2", cat:"beer",      emoji:"🍺", title:"Guinness Draught",           descriptor:"Roasty, creamy — distinctly bitter stout" },
  { id:"br3", cat:"beer",      emoji:"🍺", title:"Pliny the Elder IPA",        descriptor:"Aggressively hoppy — polarising and celebrated" },
  { id:"br4", cat:"beer",      emoji:"🍺", title:"Chimay Blue",                descriptor:"Rich, complex Belgian Trappist — almost wine-like" },
  { id:"br5", cat:"beer",      emoji:"🍺", title:"Founders Breakfast Stout",   descriptor:"Coffee-chocolate imperial stout — intense and thick" },
  { id:"br6", cat:"beer",      emoji:"🍺", title:"Weihenstephaner Hefeweissbier", descriptor:"Soft, banana-clove wheat beer — gentle and traditional" },
  { id:"wh1", cat:"whiskey",   emoji:"🥃", title:"Jameson",                    descriptor:"Light, easy, crowd-pleasing — zero challenge" },
  { id:"wh2", cat:"whiskey",   emoji:"🥃", title:"Laphroaig 10yr",             descriptor:"Heavy peat, medicinal smoke — you know if you know" },
  { id:"wh3", cat:"whiskey",   emoji:"🥃", title:"Woodford Reserve",           descriptor:"Sweet, smooth Kentucky bourbon" },
  { id:"wh4", cat:"whiskey",   emoji:"🥃", title:"Hibiki Harmony",             descriptor:"Delicate, floral Japanese blend — subtle luxury" },
  { id:"wh5", cat:"whiskey",   emoji:"🥃", title:"Ardbeg Uigeadail",           descriptor:"Peat meets sherry — dark, rich, complex" },
  { id:"wh6", cat:"whiskey",   emoji:"🥃", title:"Balvenie DoubleWood",        descriptor:"Honeyed, approachable — good gateway single malt" },
  { id:"pf1", cat:"perfume",   emoji:"🌹", title:"Acqua di Gio",               descriptor:"Light, aquatic, clean — almost invisible" },
  { id:"pf2", cat:"perfume",   emoji:"🌹", title:"Tom Ford Oud Wood",          descriptor:"Dark, smoky, intensely luxurious" },
  { id:"pf3", cat:"perfume",   emoji:"🌹", title:"Chanel No. 5",               descriptor:"Powdery, aldehydic classic — polarising icon" },
  { id:"pf4", cat:"perfume",   emoji:"🌹", title:"Dior Sauvage",               descriptor:"Fresh, woody — one of the world's best-sellers" },
  { id:"pf5", cat:"perfume",   emoji:"🌹", title:"By the Fireplace – Margiela",descriptor:"Warm, smoky vanilla — like a hug" },
  { id:"pf6", cat:"perfume",   emoji:"🌹", title:"Zoologist Bat",              descriptor:"Strange, earthy, animalic — a real challenge" },
  { id:"ck1", cat:"cocktails", emoji:"🍹", title:"Aperol Spritz",              descriptor:"Light, sweet, fizzy — easy yes" },
  { id:"ck2", cat:"cocktails", emoji:"🍹", title:"Negroni",                    descriptor:"Bitter, assertive — acquired taste" },
  { id:"ck3", cat:"cocktails", emoji:"🍹", title:"Old Fashioned",              descriptor:"Strong, stirred, spirit-forward" },
  { id:"ck4", cat:"cocktails", emoji:"🍹", title:"Gin & Tonic",                descriptor:"Crisp, botanical, refreshing" },
  { id:"ck5", cat:"cocktails", emoji:"🍹", title:"Last Word",                  descriptor:"Equal-parts classic — herbal, complex, green" },
  { id:"ck6", cat:"cocktails", emoji:"🍹", title:"Jungle Bird",                descriptor:"Rum + Campari — bitter-tropical, unusual combo" },
];

function getSwipeCards(catIds) {
  return catIds.flatMap(function(catId) {
    return SWIPE_CARDS.filter(function(c) { return c.cat === catId; }).slice(0, 3);
  });
}

// ─────────────────────────────────────────────────────────────
// LOCAL SEARCH DB
// ─────────────────────────────────────────────────────────────

const LOCAL_DB = {
  movies: ["The Godfather","The Godfather Part II","Pulp Fiction","The Dark Knight","Schindler's List","Inception","Interstellar","The Matrix","Goodfellas","Fight Club","Forrest Gump","The Silence of the Lambs","Parasite","Spirited Away","Blade Runner 2049","Blade Runner","Arrival","Her","Whiplash","La La Land","Amelie","The Grand Budapest Hotel","Midsommar","Hereditary","Get Out","Moonlight","No Country for Old Men","There Will Be Blood","Apocalypse Now","2001: A Space Odyssey","Mad Max: Fury Road","Dunkirk","Oppenheimer","Dune","Everything Everywhere All at Once","Nomadland","Portrait of a Lady on Fire","Mulholland Drive","Eternal Sunshine of the Spotless Mind","Lost in Translation","The Social Network","Gone Girl","Se7en","Memento","Joker","Black Swan","Requiem for a Dream","Oldboy","In the Mood for Love","Pan's Labyrinth","The Shape of Water","Star Wars","The Empire Strikes Back","Avatar","Avengers: Endgame","Top Gun: Maverick","John Wick","My Neighbor Totoro","Princess Mononoke","Akira","Toy Story","WALL-E","Inside Out","Coco","The Shawshank Redemption","Succession","Breaking Bad","The Wire","The Sopranos","Chernobyl","True Detective","Fleabag","Peaky Blinders","Mindhunter","Ozark","Squid Game","Dark","Severance"],
  music: ["Radiohead","The Beatles","David Bowie","Pink Floyd","Led Zeppelin","Miles Davis","John Coltrane","Kendrick Lamar","Frank Ocean","Beyonce","Taylor Swift","Kanye West","Billie Eilish","The National","Tame Impala","Arctic Monkeys","Arcade Fire","Bon Iver","Sufjan Stevens","Nick Cave","LCD Soundsystem","Bjork","Massive Attack","Portishead","Burial","Daft Punk","Aphex Twin","Brian Eno","James Blake","Four Tet","FKA Twigs","Bob Dylan","Joni Mitchell","Bruce Springsteen","Neil Young","The Velvet Underground","Joy Division","New Order","The Cure","Nirvana","Michael Jackson","Prince","Stevie Wonder","Marvin Gaye","Adele","Ed Sheeran","Radiohead – OK Computer","Radiohead – Kid A","Radiohead – In Rainbows","The Beatles – Abbey Road","Pink Floyd – Dark Side of the Moon","Pink Floyd – Wish You Were Here","Led Zeppelin – IV","Miles Davis – Kind of Blue","Kendrick Lamar – To Pimp a Butterfly","Frank Ocean – Blonde","Beyonce – Lemonade","Taylor Swift – Folklore","Kanye West – My Beautiful Dark Twisted Fantasy","Bon Iver – For Emma Forever Ago","Sufjan Stevens – Carrie and Lowell","Arcade Fire – Funeral","The National – Boxer","Tame Impala – Currents","Massive Attack – Mezzanine","Portishead – Dummy","Daft Punk – Random Access Memories","Joni Mitchell – Blue","Arctic Monkeys – AM","SZA – SOS","FKA Twigs – LP1"],
  games: ["Dark Souls","Elden Ring","Bloodborne","Sekiro","The Last of Us","God of War","Red Dead Redemption 2","The Witcher 3","Cyberpunk 2077","Baldur's Gate 3","Disco Elysium","Fallout New Vegas","Skyrim","Zelda Breath of the Wild","Zelda Tears of the Kingdom","Super Mario Odyssey","Mario Kart 8","Pokemon","Hollow Knight","Celeste","Hades","Stardew Valley","Animal Crossing","Minecraft","Portal","Portal 2","Half-Life 2","Resident Evil 4","Resident Evil 2","Silent Hill 2","Bioshock","Mass Effect","Final Fantasy VII","Final Fantasy XIV","Death Stranding","Metal Gear Solid V","Shadow of the Colossus","Journey","What Remains of Edith Finch","Outer Wilds","Spider-Man","Horizon Zero Dawn","Returnal","Cuphead","Metroid Dread"],
  books: ["Blood Meridian","The Road","Cormac McCarthy","A Little Life","The Secret History","Donna Tartt","Hanya Yanagihara","Elena Ferrante","Toni Morrison","Beloved","One Hundred Years of Solitude","Gabriel Garcia Marquez","Crime and Punishment","Dostoevsky","War and Peace","Tolstoy","The Trial","Kafka","The Stranger","Camus","Dune","Foundation","Isaac Asimov","Do Androids Dream of Electric Sheep","Philip K Dick","The Left Hand of Darkness","Ursula Le Guin","1984","Brave New World","Slaughterhouse Five","Vonnegut","Infinite Jest","David Foster Wallace","White Noise","DeLillo","Catch-22","Haruki Murakami","Norwegian Wood","Kafka on the Shore","The Wind-Up Bird Chronicle","Sapiens","Homo Deus","Harry Potter","Lord of the Rings","Dune Herbert","Normal People","Sally Rooney","Atomic Habits","Thinking Fast and Slow","The Great Gatsby","To Kill a Mockingbird"],
  beer: ["Guinness","Heineken","Stella Artois","Peroni","Corona","Modelo","Hoegaarden","Blue Moon","Budweiser","Sierra Nevada Pale Ale","Stone IPA","Pliny the Elder","Founders Breakfast Stout","Founders KBS","Bell's Two Hearted","Chimay Blue","Chimay Red","Orval","Westmalle Tripel","Rochefort 10","St Bernardus","Duvel","Delirium Tremens","Samuel Adams","Newcastle Brown Ale","Brooklyn Lager","BrewDog Punk IPA","Paulaner Hefeweizen","Weihenstephaner","Asahi","Sapporo","Kirin","Anchor Steam","Goose Island","New Belgium Fat Tire","Oskar Blues","Russian River Pliny","Ballast Point Sculpin","Firestone Walker"],
  whiskey: ["Laphroaig","Ardbeg","Bowmore","Lagavulin","Bruichladdich","Glenfiddich","Macallan","Glenlivet","Balvenie","Highland Park","Dalmore","Oban","Talisker","GlenDronach","Springbank","Hibiki","Yamazaki","Hakushu","Nikka","Suntory Toki","Woodford Reserve","Buffalo Trace","Eagle Rare","Blanton's","Pappy Van Winkle","Four Roses","Maker's Mark","Jim Beam","Wild Turkey","Bulleit","Angel's Envy","Michter's","Redbreast","Green Spot","Jameson","Teeling","Midleton"],
  perfume: ["Chanel No 5","Chanel Coco Mademoiselle","Chanel Chance","Chanel Bleu","Dior Sauvage","Dior Jadore","Dior Miss Dior","Tom Ford Oud Wood","Tom Ford Black Orchid","Tom Ford Tobacco Vanille","Tom Ford Neroli Portofino","Maison Margiela By the Fireplace","Maison Margiela Jazz Club","Maison Margiela Beach Walk","YSL Black Opium","Armani Acqua di Gio","Gucci Bloom","Prada Candy","Hermes Terre","Byredo Gypsy Water","Byredo Santal 33","Le Labo Santal 33","Creed Aventus","Creed Green Irish Tweed","Frederic Malle Portrait of a Lady","Diptyque Baies","Diptyque Philosykos","Jo Malone Lime Basil","Jo Malone Peony","Guerlain Shalimar","Serge Lutens Chergui","Nasomatto Black Afgano","Xerjoff Naxos","Amouage Interlude","Viktor and Rolf Flowerbomb","Jean Paul Gaultier Le Male","Thierry Mugler Angel","Lancôme La Vie Est Belle"],
  cocktails: ["Negroni","Old Fashioned","Manhattan","Martini","Daiquiri","Margarita","Aperol Spritz","Paloma","French 75","Cosmopolitan","Mojito","Caipirinha","Whisky Sour","Tom Collins","Gin and Tonic","Last Word","Corpse Reviver","Aviation","Penicillin","Singapore Sling","Long Island Iced Tea","Pina Colada","Jungle Bird","Zombie","Mai Tai","Espresso Martini","White Russian","Irish Coffee","Sazerac","Vieux Carre","Paper Plane","Naked and Famous","Division Bell","Oaxacan Old Fashioned","Bramble","Gimlet","Sidecar","Clover Club"]
};

function localSearch(catId, query) {
  if (!query || query.length < 1) return [];
  var items = LOCAL_DB[catId] || [];
  var q = query.toLowerCase();
  var startsWith = items.filter(function(i) { return i.toLowerCase().startsWith(q); });
  var contains = items.filter(function(i) { return !i.toLowerCase().startsWith(q) && i.toLowerCase().includes(q); });
  return startsWith.concat(contains).slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// CSS — injected via DOM, no template literal
// ─────────────────────────────────────────────────────────────

var APP_CSS = [
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400&display=swap');",
  "*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}",
  ":root{--ink:#f0ede8;--paper:#0e0e0f;--cream:#141416;--muted:#b0adc0;--faint:#2a2a30;--gold:#ccff00;--fuschia:#ff55ff;--red:#ff4060;--green:#ccff00;}",
  "body{background:var(--paper);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-size:17px;overflow-x:hidden;}",
  ".mono{font-family:'DM Mono',monospace}",
  ".serif{font-family:'Playfair Display',Georgia,serif}",
  "::-webkit-scrollbar{width:2px}::-webkit-scrollbar-track{background:var(--paper)}::-webkit-scrollbar-thumb{background:var(--faint)}",
  "@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}",
  "@keyframes fadeIn{from{opacity:0}to{opacity:1}}",
  "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
  "@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}",
  "@keyframes flyLeft{0%{transform:translateX(0) rotate(0deg);opacity:1}100%{transform:translateX(-140%) rotate(-20deg);opacity:0}}",
  "@keyframes flyRight{0%{transform:translateX(0) rotate(0deg);opacity:1}100%{transform:translateX(140%) rotate(20deg);opacity:0}}",
  "@keyframes cardIn{from{transform:scale(0.93) translateY(22px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}",
  "@keyframes ripple{0%{transform:scale(0);opacity:1}100%{transform:scale(1);opacity:0}}",
  ".fu{animation:fadeUp 0.45s ease both}.fu1{animation:fadeUp 0.45s 0.07s ease both}.fu2{animation:fadeUp 0.45s 0.14s ease both}.fu3{animation:fadeUp 0.45s 0.21s ease both}",
  ".shimmer{background:linear-gradient(90deg,var(--cream) 25%,var(--faint) 50%,var(--cream) 75%);background-size:600px 100%;animation:shimmer 1.5s infinite;border-radius:4px}",
  ".neon-line{height:1px;background:linear-gradient(90deg,transparent,var(--gold) 40%,var(--fuschia) 60%,transparent);opacity:0.35;margin:20px 0}",
  "input,textarea{font-family:'DM Sans',sans-serif;background:var(--cream) !important;color:var(--ink) !important;border:1px solid var(--faint) !important;border-radius:4px}",
  "input::placeholder,textarea::placeholder{color:var(--muted) !important}",
  "input:focus,textarea:focus{outline:none !important;border-color:var(--gold) !important;box-shadow:0 0 0 2px rgba(204,255,0,0.15) !important}",
  "button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}"
].join("\n");

(function injectCSS() {
  var el = document.createElement("style");
  el.textContent = APP_CSS;
  document.head.appendChild(el);
})();

// ─────────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────────

function RippleBtn({ onClick, style, children, disabled, className }) {
  var ref = useRef(null);
  function handle(e) {
    if (disabled) return;
    var btn = ref.current;
    var rect = btn.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var size = Math.max(rect.width, rect.height) * 2;
    var r = document.createElement("span");
    r.style.cssText = "position:absolute;border-radius:50%;background:rgba(204,255,0,0.25);transform:scale(0);animation:ripple 0.55s ease-out;pointer-events:none;";
    r.style.left = (x - size / 2) + "px";
    r.style.top = (y - size / 2) + "px";
    r.style.width = size + "px";
    r.style.height = size + "px";
    if (!btn.style.position) btn.style.position = "relative";
    btn.appendChild(r);
    setTimeout(function() { r.remove(); }, 600);
    if (onClick) onClick(e);
  }
  return (
    <button ref={ref} onClick={handle} className={className}
      style={Object.assign({ position:"relative", overflow:"hidden", cursor: disabled ? "not-allowed" : "pointer" }, style)}
      disabled={disabled}
    >{children}</button>
  );
}

function Spinner({ size }) {
  size = size || 36;
  return (
    <div style={{ width:size, height:size, border:"1.5px solid rgba(204,255,0,0.15)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
  );
}

function NeonLabel({ children, color, style }) {
  var col = color === "fuschia" ? "var(--fuschia)" : "var(--gold)";
  return (
    <div className="mono" style={Object.assign({ fontSize:11, letterSpacing:"0.28em", color:col, textTransform:"uppercase", textShadow:"0 0 8px " + col }, style)}>{children}</div>
  );
}

function GCard({ children, style, onClick, hover }) {
  if (hover === undefined) hover = true;
  var [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={function() { if (hover) setHov(true); }}
      onMouseLeave={function() { if (hover) setHov(false); }}
      style={Object.assign({
        background:"rgba(22,22,26,0.75)",
        backdropFilter:"blur(20px)",
        border: hov ? "1px solid rgba(204,255,0,0.28)" : "1px solid rgba(204,255,0,0.07)",
        borderRadius:8,
        boxShadow: hov ? "0 16px 56px rgba(0,0,0,0.7),0 0 24px rgba(204,255,0,0.06)" : "0 8px 32px rgba(0,0,0,0.55)",
        transform: hov && onClick ? "translateY(-2px)" : "none",
        transition:"all 0.22s ease",
        cursor: onClick ? "pointer" : "default"
      }, style)}
    >{children}</div>
  );
}

function Pill({ children, active, onClick, style }) {
  return (
    <button onClick={onClick} style={Object.assign({
      padding:"5px 14px", border: active ? "1px solid var(--gold)" : "1px solid var(--faint)",
      background: active ? "rgba(204,255,0,0.1)" : "transparent", borderRadius:999,
      fontSize:13, color: active ? "var(--gold)" : "var(--muted)", cursor:"pointer",
      fontFamily:"inherit", letterSpacing:"0.02em", transition:"all 0.15s"
    }, style)}>{children}</button>
  );
}

function SHead({ children, accent, sub }) {
  var grad = accent === "fuschia"
    ? "linear-gradient(90deg,var(--fuschia),var(--gold))"
    : "linear-gradient(90deg,var(--gold),#88ff00)";
  return (
    <div style={{ marginBottom: sub ? 4 : 20 }}>
      <h2 className="serif" style={{ fontSize:"clamp(22px,5vw,34px)", fontWeight:700, letterSpacing:"-0.03em", color:"var(--ink)", lineHeight:1.1 }}>{children}</h2>
      {sub && <p style={{ fontSize:14, color:"var(--muted)", marginTop:6 }}>{sub}</p>}
      <div style={{ width:40, height:2, background:grad, borderRadius:2, marginTop:10 }} />
    </div>
  );
}

function ScoreBadge({ score }) {
  if (!score) return null;
  return (
    <span className="mono" style={{ fontSize:11, color:"var(--gold)", background:"rgba(204,255,0,0.08)", border:"1px solid rgba(204,255,0,0.22)", padding:"2px 8px", borderRadius:3, letterSpacing:"0.06em", flexShrink:0 }}>{score}%</span>
  );
}

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────

export default function App() {
  var [screen, setScreen] = useState("landing");
  var [activeCats, setActiveCats] = useState([]);
  var [profile, setProfile] = useState(null);
  var [library, setLibrary] = useState([]);
  var [used, setUsed] = useState(0);
  var [paywall, setPaywall] = useState(false);
  var [tab, setTab] = useState("home");

  function useRec() {
    if (used >= FREE_LIMIT) { setPaywall(true); return false; }
    setUsed(function(u) { return u + 1; });
    return true;
  }
  function addToLib(item) {
    setLibrary(function(prev) {
      var i = prev.findIndex(function(x) { return x.title === item.title && x.category === item.category; });
      if (i >= 0) { var n = prev.slice(); n[i] = Object.assign({}, n[i], item); return n; }
      return prev.concat([Object.assign({}, item, { addedAt: Date.now() })]);
    });
  }
  function onOnboardDone(cats, prof, lib) {
    setActiveCats(cats); setProfile(prof);
    setLibrary((lib || []).map(function(item) { return Object.assign({}, item, { addedAt: Date.now() }); }));
    setScreen("home");
  }

  return (
    <div>
      {screen === "landing" && <Landing onStart={function() { setScreen("onboard"); }} />}
      {screen === "onboard" && <Onboard onDone={onOnboardDone} />}
      {screen === "home" && (
        <HomeShell activeCats={activeCats} setActiveCats={setActiveCats} profile={profile}
          library={library} addToLib={addToLib} used={used} useRec={useRec}
          tab={tab} setTab={setTab} onPaywall={function() { setPaywall(true); }} />
      )}
      {paywall && <Paywall onClose={function() { setPaywall(false); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LANDING
// ─────────────────────────────────────────────────────────────

function Landing({ onStart }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center", background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(204,255,0,0.04) 0%,transparent 60%),var(--paper)" }}>
      <div style={{ maxWidth:580, position:"relative" }}>
        <div className="fu mono" style={{ fontSize:10, letterSpacing:"0.45em", color:"var(--gold)", marginBottom:28, textTransform:"uppercase", opacity:0.7 }}>
          Taste Intelligence Platform
        </div>
        <div className="fu1" style={{ marginBottom:24 }}>
          <div className="serif" style={{ fontSize:"clamp(52px,12vw,100px)", fontWeight:900, letterSpacing:"-0.05em", lineHeight:0.88, color:"var(--ink)" }}>Taste</div>
          <div className="serif" style={{ fontSize:"clamp(52px,12vw,100px)", fontWeight:400, fontStyle:"italic", letterSpacing:"-0.05em", lineHeight:0.88, background:"linear-gradient(125deg,var(--gold) 0%,#aaff00 45%,var(--fuschia) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>in Motion</div>
        </div>
        <div className="fu2" style={{ fontSize:"clamp(14px,2.5vw,18px)", color:"var(--muted)", marginBottom:44, fontWeight:300 }}>
          Take pleasure seriously.
        </div>
        <div className="fu3" style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:56 }}>
          {CATS.map(function(cat) {
            return (
              <span key={cat.id} style={{ fontSize:12, color:"var(--muted)", padding:"5px 14px", border:"1px solid rgba(255,255,255,0.07)", borderRadius:999, background:"rgba(255,255,255,0.025)" }}>{cat.emoji} {cat.label}</span>
            );
          })}
        </div>
        <RippleBtn className="fu3" onClick={onStart} style={{ padding:"18px 64px", fontSize:15, borderRadius:4, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:700, background:"var(--gold)", color:"#0a0a0b", border:"none", boxShadow:"0 0 32px rgba(204,255,0,0.4)" }}>Begin</RippleBtn>
        <p className="mono fu3" style={{ fontSize:10, color:"var(--muted)", marginTop:20, letterSpacing:"0.16em", opacity:0.5 }}>3 FREE RECS · NO ACCOUNT NEEDED</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ONBOARD
// ─────────────────────────────────────────────────────────────

function Onboard({ onDone }) {
  var [step, setStep] = useState(0);
  var [selSet, setSelSet] = useState(new Set());
  var [cards, setCards] = useState([]);
  var [cardIdx, setCardIdx] = useState(0);
  var [flyDir, setFlyDir] = useState(null);
  var [reactions, setReactions] = useState({});
  var [favs, setFavs] = useState({});
  var cats = Array.from(selSet).map(function(id) { return CATS.find(function(c) { return c.id === id; }); }).filter(Boolean);

  function toggleCat(id) {
    setSelSet(function(s) {
      var n = new Set(s);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }
  function goToSwipe() {
    setCards(getSwipeCards(Array.from(selSet)));
    setCardIdx(0); setReactions({}); setStep(1);
  }
  function swipe(dir) {
    var card = cards[cardIdx];
    if (!card || flyDir) return;
    setFlyDir(dir === "love" ? "right" : "left");
    setTimeout(function() {
      setReactions(function(r) { return Object.assign({}, r, { [card.id]: dir }); });
      setCardIdx(function(i) { return i + 1; });
      setFlyDir(null);
    }, 320);
  }
  function addFav(catId, title) {
    setFavs(function(f) {
      var curr = f[catId] || [];
      if (curr.length >= 2 || curr.includes(title)) return f;
      return Object.assign({}, f, { [catId]: curr.concat([title]) });
    });
  }
  function removeFav(catId, title) {
    setFavs(function(f) {
      return Object.assign({}, f, { [catId]: (f[catId] || []).filter(function(t) { return t !== title; }) });
    });
  }
  async function buildProfile() {
    setStep(3);
    var signals = [];
    Object.entries(reactions).forEach(function(pair) {
      var id = pair[0]; var reaction = pair[1];
      var card = cards.find(function(c) { return c.id === id; });
      if (card) signals.push({ category: card.cat, title: card.title, reaction: reaction });
    });
    Object.entries(favs).forEach(function(pair) {
      var catId = pair[0]; var titles = pair[1];
      titles.forEach(function(title) { signals.push({ category: catId, title: title, reaction: "love" }); });
    });
    var fallback = {
      signature: "A refined, adventurous palate drawn to depth and complexity.",
      dimensions: { intensity:7,complexity:8,darkness:6,warmth:5,energy:5,boldness:7,sweetness:3,nostalgia:5,acquired_taste:7,social:4,narrative:8 },
      byCategory: {}
    };
    var prof = fallback;
    if (signals.length > 0) {
      var result = await ai(buildProfilePrompt(JSON.stringify(signals), Array.from(selSet).join(", ")), fallback);
      if (result && result.signature) prof = result;
    }
    var initialLib = [];
    Object.entries(reactions).forEach(function(pair) {
      var id = pair[0]; var reaction = pair[1];
      var card = cards.find(function(c) { return c.id === id; });
      if (card) initialLib.push({ title:card.title, category:card.cat, status:"tasted", rating:reaction, notes:"" });
    });
    Object.entries(favs).forEach(function(pair) {
      var catId = pair[0]; var titles = pair[1];
      titles.forEach(function(title) { initialLib.push({ title:title, category:catId, status:"tasted", rating:"love", notes:"" }); });
    });
    onDone(Array.from(selSet), prof, initialLib);
  }

  var currentCard = cards[cardIdx] || null;
  var allSwiped = cards.length > 0 && cardIdx >= cards.length;
  var progress = cards.length > 0 ? Math.min(100, (cardIdx / cards.length) * 100) : 0;
  var pageStyle = { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px", background:"var(--paper)" };

  if (step === 0) return (
    <div style={pageStyle}>
      <div style={{ maxWidth:580, width:"100%" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <NeonLabel style={{ marginBottom:10 }}>Step 1 of 3</NeonLabel>
          <h2 className="serif" style={{ fontSize:"clamp(26px,5vw,44px)", fontWeight:700, letterSpacing:"-0.03em", marginBottom:8 }}>Choose your worlds</h2>
          <p style={{ color:"var(--muted)", fontSize:15 }}>Only these categories will ever appear.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:36 }}>
          {CATS.map(function(cat) {
            var on = selSet.has(cat.id);
            return (
              <button key={cat.id} onClick={function() { toggleCat(cat.id); }} style={{ padding:"18px 16px", border: on ? "1px solid rgba(204,255,0,0.5)" : "1px solid var(--faint)", background: on ? "rgba(204,255,0,0.07)" : "rgba(255,255,255,0.015)", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:12, textAlign:"left", transition:"all 0.15s", fontFamily:"inherit" }}>
                <span style={{ fontSize:26 }}>{cat.emoji}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight: on ? 600 : 400, color: on ? "var(--ink)" : "var(--muted)" }}>{cat.label}</div>
                  {on && <NeonLabel style={{ marginTop:2 }}>Selected</NeonLabel>}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ textAlign:"center" }}>
          <RippleBtn onClick={goToSwipe} disabled={selSet.size === 0} style={{ padding:"14px 48px", fontSize:15, borderRadius:4, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:700, background: selSet.size > 0 ? "var(--gold)" : "var(--faint)", color: selSet.size > 0 ? "#0a0a0b" : "var(--muted)", border:"none" }}>Continue →</RippleBtn>
        </div>
      </div>
    </div>
  );

  if (step === 1) return (
    <div style={pageStyle}>
      <div style={{ maxWidth:380, width:"100%" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <NeonLabel style={{ marginBottom:8 }}>Step 2 of 3</NeonLabel>
          <h2 className="serif" style={{ fontSize:"clamp(22px,5vw,34px)", fontWeight:700, letterSpacing:"-0.03em", marginBottom:4 }}>This or that?</h2>
          <p style={{ fontSize:13, color:"var(--muted)" }}>
            <span style={{ color:"var(--green)" }}>♥ love</span>
            {" · "}
            <span style={{ color:"var(--red)" }}>✕ not for me</span>
            {" · "}
            <span>— skip</span>
          </p>
        </div>
        <div style={{ height:2, background:"var(--faint)", borderRadius:2, marginBottom:28, overflow:"hidden" }}>
          <div style={{ width: progress + "%", height:"100%", background:"linear-gradient(90deg,var(--gold),var(--fuschia))", borderRadius:2, transition:"width 0.3s ease" }} />
        </div>
        {currentCard && (
          <div style={{ position:"relative", height:300, marginBottom:28 }}>
            {cards[cardIdx + 1] && (
              <div style={{ position:"absolute", inset:0, background:"rgba(20,20,24,0.6)", border:"1px solid rgba(204,255,0,0.05)", borderRadius:14, transform:"scale(0.92) translateY(16px)", zIndex:0 }} />
            )}
            <div key={"c" + cardIdx} style={{ position:"absolute", inset:0, background:"rgba(22,22,26,0.88)", backdropFilter:"blur(24px)", border:"1px solid rgba(204,255,0,0.12)", borderRadius:14, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, zIndex:1, boxShadow:"0 16px 60px rgba(0,0,0,0.7)", animation: flyDir === "right" ? "flyRight 0.32s ease forwards" : flyDir === "left" ? "flyLeft 0.32s ease forwards" : "cardIn 0.28s ease both" }}>
              <div style={{ fontSize:56, marginBottom:16 }}>{currentCard.emoji}</div>
              <NeonLabel style={{ marginBottom:10 }}>
                {(function() { var c = CATS.find(function(x) { return x.id === currentCard.cat; }); return c ? c.label : ""; })()}
              </NeonLabel>
              <div className="serif" style={{ fontSize:22, fontWeight:700, textAlign:"center", marginBottom:8, color:"var(--ink)" }}>{currentCard.title}</div>
              <div style={{ fontSize:13, color:"var(--muted)", textAlign:"center", fontStyle:"italic", lineHeight:1.5 }}>{currentCard.descriptor}</div>
            </div>
          </div>
        )}
        {allSwiped && (
          <div style={{ textAlign:"center", padding:"32px 0 20px", animation:"fadeIn 0.3s ease" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✓</div>
            <div className="serif" style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>All done</div>
          </div>
        )}
        {currentCard && (
          <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:16 }}>
            <RippleBtn onClick={function() { swipe("hate"); }} style={{ width:64, height:64, borderRadius:"50%", border:"1.5px solid var(--red)", background:"transparent", fontSize:22, color:"var(--red)" }}>✕</RippleBtn>
            <button onClick={function() { swipe("skip"); }} style={{ width:48, height:48, borderRadius:"50%", border:"1.5px solid var(--faint)", background:"transparent", fontSize:16, color:"var(--muted)", cursor:"pointer", alignSelf:"center" }}>—</button>
            <RippleBtn onClick={function() { swipe("love"); }} style={{ width:64, height:64, borderRadius:"50%", border:"1.5px solid var(--green)", background:"transparent", fontSize:22, color:"var(--green)" }}>♥</RippleBtn>
          </div>
        )}
        <div style={{ textAlign:"center" }}>
          {currentCard && cardIdx > 0 && (
            <button onClick={function() { setStep(2); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:13, fontFamily:"inherit", textDecoration:"underline" }}>Skip remaining cards</button>
          )}
          {allSwiped && (
            <RippleBtn onClick={function() { setStep(2); }} style={{ padding:"13px 44px", fontSize:15, borderRadius:4, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:700, border:"none", background:"var(--gold)", color:"#0a0a0b" }}>Next →</RippleBtn>
          )}
        </div>
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={{ minHeight:"100vh", padding:"40px 24px 60px", maxWidth:560, margin:"0 auto", background:"var(--paper)" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <NeonLabel style={{ marginBottom:10 }}>Step 3 of 3</NeonLabel>
        <h2 className="serif" style={{ fontSize:"clamp(22px,4vw,36px)", fontWeight:700, letterSpacing:"-0.03em", marginBottom:8 }}>Your all-time favourites</h2>
        <p style={{ color:"var(--muted)", fontSize:14 }}>Add up to 2 per world. Type to search.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:32 }}>
        {cats.map(function(cat) {
          return (
            <FavRow key={cat.id} cat={cat} selected={favs[cat.id] || []}
              onAdd={function(title) { addFav(cat.id, title); }}
              onRemove={function(title) { removeFav(cat.id, title); }} />
          );
        })}
      </div>
      <div style={{ textAlign:"center" }}>
        <RippleBtn onClick={buildProfile} style={{ padding:"14px 48px", fontSize:15, borderRadius:4, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:700, border:"none", background:"var(--gold)", color:"#0a0a0b", boxShadow:"0 0 28px rgba(204,255,0,0.35)" }}>Build my taste profile</RippleBtn>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, background:"var(--paper)" }}>
      <Spinner size={56} />
      <div style={{ textAlign:"center" }}>
        <div className="serif" style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Reading your taste</div>
        <NeonLabel color="fuschia" style={{ opacity:0.8 }}>Connecting the dots across your worlds</NeonLabel>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FAV ROW
// ─────────────────────────────────────────────────────────────

function FavRow({ cat, selected, onAdd, onRemove }) {
  var [query, setQuery] = useState("");
  var [suggs, setSuggs] = useState([]);
  var [loading, setLoading] = useState(false);
  var [open, setOpen] = useState(false);
  var debRef = useRef(null);
  var contRef = useRef(null);

  useEffect(function() {
    function h(e) { if (contRef.current && !contRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return function() { document.removeEventListener("mousedown", h); };
  }, []);

  function handleInput(val) {
    setQuery(val); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    if (val.length < 1) { setSuggs([]); setLoading(false); return; }
    var local = localSearch(cat.id, val);
    if (local.length >= 3) { setSuggs(local); setLoading(false); return; }
    if (val.length < 2) return;
    setLoading(true);
    debRef.current = setTimeout(async function() {
      var result = await ai(buildSuggestPrompt(val, cat.label), { suggestions: [] });
      var merged = Array.from(new Set(local.concat((result && result.suggestions) || []))).slice(0, 6);
      setSuggs(merged.length > 0 ? merged : local);
      setLoading(false);
    }, 500);
  }
  function pick(title) { onAdd(title); setQuery(""); setSuggs([]); setOpen(false); }
  var canAdd = selected.length < 2;

  return (
    <GCard hover={false} style={{ padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <span style={{ fontSize:18 }}>{cat.emoji}</span>
        <span className="mono" style={{ fontSize:11, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase" }}>{cat.label}</span>
        <span className="mono" style={{ fontSize:11, color:"var(--muted)", marginLeft:"auto" }}>{selected.length}/2</span>
      </div>
      {selected.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
          {selected.map(function(t) {
            return (
              <div key={t} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 12px", background:"rgba(204,255,0,0.08)", border:"1px solid rgba(204,255,0,0.3)", borderRadius:999, fontSize:13 }}>
                <span style={{ color:"var(--ink)" }}>{t}</span>
                <button onClick={function() { onRemove(t); }} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontSize:14, padding:0, lineHeight:1 }}>×</button>
              </div>
            );
          })}
        </div>
      )}
      {canAdd && (
        <div ref={contRef} style={{ position:"relative" }}>
          <input value={query} onChange={function(e) { handleInput(e.target.value); }} onFocus={function() { if (suggs.length > 0) setOpen(true); }}
            placeholder={cat.id === "music" ? "Artist, band, album, or song..." : "Search " + cat.label + "..."}
            style={{ width:"100%", padding:"9px 13px", fontSize:15 }}
          />
          {loading && <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)" }}><Spinner size={14} /></div>}
          {open && suggs.length > 0 && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"rgba(18,18,22,0.97)", backdropFilter:"blur(20px)", border:"1px solid rgba(204,255,0,0.15)", borderRadius:6, zIndex:50, boxShadow:"0 12px 40px rgba(0,0,0,0.7)", overflow:"hidden" }}>
              {suggs.map(function(s) {
                return (
                  <button key={s} onMouseDown={function(e) { e.preventDefault(); pick(s); }}
                    style={{ display:"block", width:"100%", padding:"10px 14px", background:"none", border:"none", borderBottom:"1px solid rgba(255,255,255,0.04)", textAlign:"left", fontSize:15, fontFamily:"inherit", cursor:"pointer", color:"var(--ink)" }}
                    onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(204,255,0,0.06)"; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
                  >{s}</button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </GCard>
  );
}

// ─────────────────────────────────────────────────────────────
// HOME SHELL
// ─────────────────────────────────────────────────────────────

function HomeShell({ activeCats, setActiveCats, profile, library, addToLib, used, useRec, tab, setTab, onPaywall }) {
  var cats = CATS.filter(function(c) { return activeCats.includes(c.id); });
  var remaining = FREE_LIMIT - used;
  var TABS = [{ id:"home", label:"For You" }, { id:"find", label:"Look it up" }, { id:"cellar", label:"My Cellar" }, { id:"profile", label:"Profile" }, { id:"settings", label:"⚙" }];

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", maxWidth:700, margin:"0 auto" }}>
      <header style={{ padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--faint)", flexShrink:0, background:"rgba(10,10,12,0.92)", backdropFilter:"blur(24px)", position:"sticky", top:0, zIndex:50 }}>
        <div className="mono" style={{ fontSize:11, letterSpacing:"0.4em", textTransform:"uppercase", background:"linear-gradient(90deg,var(--gold),var(--fuschia))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
          Taste in Motion
        </div>
        <div className="mono" onClick={remaining <= 0 ? onPaywall : undefined}
          style={{ fontSize:11, letterSpacing:"0.08em", cursor: remaining <= 0 ? "pointer" : "default", color: remaining <= 5 ? "var(--red)" : "var(--muted)" }}>
          {remaining > 0 ? (remaining + " left") : "Upgrade ↑"}
        </div>
      </header>
      <nav style={{ display:"flex", borderBottom:"1px solid var(--faint)", padding:"0 16px", flexShrink:0, background:"rgba(10,10,12,0.8)", backdropFilter:"blur(16px)" }}>
        {TABS.map(function(t) {
          return (
            <button key={t.id} onClick={function() { setTab(t.id); }} style={{ padding:"14px 10px", border:"none", background:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "var(--gold)" : "var(--muted)", borderBottom: tab === t.id ? "2px solid var(--gold)" : "2px solid transparent", marginBottom:-1, transition:"all 0.15s", letterSpacing:"0.02em" }}>{t.label}</button>
          );
        })}
      </nav>
      <main style={{ flex:1, overflowY:"auto", padding:"28px 24px" }}>
        {tab === "home"     && <ForYouTab cats={cats} profile={profile} useRec={useRec} addToLib={addToLib} />}
        {tab === "find"     && <FindTab cats={cats} profile={profile} useRec={useRec} library={library} addToLib={addToLib} />}
        {tab === "cellar"   && <CellarTab library={library} cats={cats} addToLib={addToLib} />}
        {tab === "profile"  && <ProfileTab profile={profile} cats={cats} />}
        {tab === "settings" && <SettingsTab activeCats={activeCats} setActiveCats={setActiveCats} allCats={CATS} />}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FOR YOU TAB
// ─────────────────────────────────────────────────────────────

function ForYouTab({ cats, profile, useRec, addToLib }) {
  var [recs, setRecs] = useState(function() {
    try {
      var saved = sessionStorage.getItem("tim_recs");
      if (!saved) return null;
      var parsed = JSON.parse(saved);
      if (Date.now() - parsed.ts > 86400000) { sessionStorage.removeItem("tim_recs"); return null; }
      return parsed.data;
    } catch(e) { return null; }
  });
  var [recsLoading, setRecsLoading] = useState(false);
  var [mood, setMood] = useState("");
  var [moodRes, setMoodRes] = useState(null);
  var [moodLoading, setMoodLoading] = useState(false);
  var [pushMode, setPushMode] = useState(null);
  var [pushRes, setPushRes] = useState(null);
  var [pushLoading, setPushLoading] = useState(false);
  var loadedRef = useRef(false);
  var OCCASIONS = ["dark rainy evening","celebratory night","lazy Sunday morning","need to focus","nostalgic mood","making dinner"];

  async function loadRecs(force) {
    if (!force && loadedRef.current) return;
    if (force && !useRec()) return;
    if (!cats || cats.length === 0) return;
    loadedRef.current = true;
    setRecsLoading(true); setRecs(null);
    var catIds = cats.map(function(c) { return c.id; }).join(", ");
    var profileStr = profile ? JSON.stringify(profile) : "No profile yet — give varied recommendations";
    var result = await ai(buildRecsPrompt(profileStr, catIds), { recommendations: [] });
    var fresh = (result && result.recommendations) || [];
    if (fresh.length > 0) {
      try { sessionStorage.setItem("tim_recs", JSON.stringify({ data: fresh, ts: Date.now() })); } catch(e) {}
    }
    setRecs(fresh.length > 0 ? fresh : null);
    setRecsLoading(false);
  }

  async function searchMood(q) {
    var query = (q || mood).trim();
    if (!query || !useRec()) return;
    setMoodLoading(true); setMoodRes(null);
    var result = await ai(buildMoodPrompt(query, JSON.stringify(profile), cats.map(function(x) { return x.id; }).join(", ")), null);
    setMoodRes(result); setMoodLoading(false);
  }

  async function loadPush(mode) {
    if (!useRec()) return;
    setPushMode(mode); setPushLoading(true); setPushRes(null);
    var pStr = JSON.stringify(profile);
    var cIds = cats.map(function(x) { return x.id; }).join(", ");
    var result = await ai(mode === "gems" ? buildHiddenGemsPrompt(pStr, cIds) : buildSurprisePrompt(pStr, cIds), null);
    setPushRes(result); setPushLoading(false);
  }

  useEffect(function() {
    if (cats && cats.length > 0) {
      if (!recs) loadRecs(false);
      else loadedRef.current = true;
    }
  }, [cats.length]);

  return (
    <div>
      <div className="fu" style={{ marginBottom:28 }}>
        <SHead accent="fuschia" sub="Describe a vibe or occasion.">
          What is the <em style={{ color:"var(--fuschia)", fontStyle:"italic" }}>mood?</em>
        </SHead>
        <div style={{ position:"relative", marginBottom:10 }}>
          <input value={mood} onChange={function(e) { setMood(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") searchMood(); }}
            placeholder="dark rainy night, need to focus, something smoky..."
            style={{ width:"100%", padding:"14px 80px 14px 16px", fontSize:15 }}
          />
          <RippleBtn onClick={function() { searchMood(); }} style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", padding:"6px 14px", background:"var(--gold)", color:"#0a0a0b", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, borderRadius:3 }}>GO</RippleBtn>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {OCCASIONS.map(function(o) {
            return <Pill key={o} onClick={function() { setMood(o); searchMood(o); }} active={mood === o}>{o}</Pill>;
          })}
        </div>
        {moodLoading && <div style={{ marginTop:14 }}><Spinner /></div>}
        {moodRes && (
          <div className="fu" style={{ marginTop:16 }}>
            <div style={{ padding:"10px 16px", background:"rgba(255,85,255,0.06)", borderLeft:"2px solid var(--fuschia)", marginBottom:14, borderRadius:"0 6px 6px 0" }}>
              <NeonLabel color="fuschia" style={{ marginBottom:4 }}>Matched Vibe</NeonLabel>
              <span style={{ fontSize:15, fontStyle:"italic", color:"var(--ink)" }}>{moodRes.fingerprint}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(moodRes.categories || []).map(function(cr, i) {
                var cat = cats.find(function(c) { return c.id === cr.category; });
                if (!cat) return null;
                return (
                  <GCard key={i}>
                    <div style={{ padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:14 }}>{cat.emoji}</span>
                      <NeonLabel>{cat.label}</NeonLabel>
                    </div>
                    <div style={{ padding:"12px 14px" }}>
                      {cr.hero && (
                        <div style={{ marginBottom:8 }}>
                          <div style={{ fontSize:16, fontWeight:500, color:"var(--ink)" }}>{cr.hero.title}</div>
                          <div style={{ fontSize:13, color:"var(--muted)" }}>{cr.hero.subtitle}</div>
                          {cr.hero.why && <div style={{ fontSize:13, fontStyle:"italic", color:"var(--muted)", marginTop:4 }}>{cr.hero.why}</div>}
                        </div>
                      )}
                    </div>
                  </GCard>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="neon-line" />

      <div className="fu1" style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:16 }}>
          <SHead>For <em style={{ color:"var(--gold)", fontStyle:"italic" }}>you</em> today</SHead>
          <button onClick={function() { loadRecs(true); }} style={{ background:"none", border:"1px solid var(--faint)", cursor:"pointer", color:"var(--gold)", fontSize:11, fontFamily:"DM Mono,monospace", letterSpacing:"0.12em", padding:"4px 12px", borderRadius:3, textTransform:"uppercase" }}>Refresh</button>
        </div>
        {recsLoading && <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{cats.map(function(c) { return <div key={c.id} className="shimmer" style={{ height:88, borderRadius:8 }} />; })}</div>}
        {!recsLoading && recs && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
            {recs.map(function(rec, i) {
              return (
                <RecCard key={i} rec={rec} cat={cats.find(function(c) { return c.id === rec.category; })} index={i}
                  onAdd={function(payload) { addToLib(Object.assign({}, rec, payload)); }} />
              );
            })}
          </div>
        )}
        {!recsLoading && !recs && (
          <div style={{ textAlign:"center", padding:40, color:"var(--muted)" }}>
            <RippleBtn onClick={function() { loadRecs(true); }} style={{ padding:"12px 32px", background:"var(--gold)", color:"#0a0a0b", border:"none", borderRadius:4, fontFamily:"inherit", fontSize:14, fontWeight:700 }}>Get recommendations</RippleBtn>
          </div>
        )}
      </div>

      <div className="neon-line" />

      <div className="fu2">
        <SHead accent="fuschia" sub="Deep cuts or something outside your comfort zone.">
          Push your <em style={{ color:"var(--fuschia)", fontStyle:"italic" }}>taste</em>
        </SHead>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <RippleBtn onClick={function() { loadPush("gems"); }} style={{ flex:1, minWidth:130, padding:"13px 16px", border:"1px solid rgba(204,255,0,0.25)", background:"rgba(204,255,0,0.04)", fontFamily:"inherit", fontSize:14, color:"var(--gold)", borderRadius:6, textAlign:"left" }}>
            <div style={{ fontWeight:600 }}>Hidden gems</div>
            <div style={{ fontSize:11, color:"var(--muted)", marginTop:3 }}>Perfect for you, undiscovered</div>
          </RippleBtn>
          <RippleBtn onClick={function() { loadPush("push"); }} style={{ flex:1, minWidth:130, padding:"13px 16px", border:"1px solid rgba(255,85,255,0.25)", background:"rgba(255,85,255,0.04)", fontFamily:"inherit", fontSize:14, color:"var(--fuschia)", borderRadius:6, textAlign:"left" }}>
            <div style={{ fontWeight:600 }}>Surprise me</div>
            <div style={{ fontSize:11, color:"var(--muted)", marginTop:3 }}>Outside your comfort zone</div>
          </RippleBtn>
        </div>
        {pushLoading && <div style={{ marginTop:14 }}><Spinner /></div>}
        {pushRes && (
          <div className="fu" style={{ marginTop:16 }}>
            <div style={{ padding:"10px 16px", background: pushMode === "gems" ? "rgba(204,255,0,0.05)" : "rgba(255,85,255,0.06)", borderLeft: pushMode === "gems" ? "2px solid var(--gold)" : "2px solid var(--fuschia)", marginBottom:14, borderRadius:"0 6px 6px 0" }}>
              <NeonLabel color={pushMode === "gems" ? "gold" : "fuschia"} style={{ marginBottom:4 }}>{pushMode === "gems" ? "Hidden Gems" : "Challenge Pick"}</NeonLabel>
              <span style={{ fontSize:14, fontStyle:"italic", color:"var(--ink)" }}>{pushRes.headline}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(pushRes.recommendations || []).map(function(rec, i) {
                return (
                  <RecCard key={i} rec={rec} cat={cats.find(function(c) { return c.id === rec.category; })} index={i}
                    onAdd={function(payload) { addToLib(Object.assign({}, rec, payload)); }} />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REC CARD
// ─────────────────────────────────────────────────────────────

function RecCard({ rec, cat, index, onAdd }) {
  var [showDetail, setShowDetail] = useState(false);
  var [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <GCard onClick={function() { setShowDetail(true); }} style={{ padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{cat ? cat.emoji : "✦"}</span>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:"var(--ink)" }}>{rec.title}</div>
              {rec.subtitle && <div style={{ fontSize:13, color:"var(--muted)" }}>{rec.subtitle}</div>}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
              <ScoreBadge score={rec.matchScore} />
              <button onClick={function(e) { e.stopPropagation(); setShowAdd(true); }}
                style={{ background:"none", border:"1px solid var(--faint)", borderRadius:"50%", width:26, height:26, cursor:"pointer", color:"var(--muted)", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = "var(--faint)"; e.currentTarget.style.color = "var(--muted)"; }}
              >+</button>
            </div>
          </div>
          {rec.why && <div style={{ fontSize:13, fontStyle:"italic", color:"var(--muted)", marginTop:6 }}>{rec.why}</div>}
        </div>
      </GCard>
      {showDetail && <DetailModal item={rec} cat={cat} onClose={function() { setShowDetail(false); }} onAdd={function(payload) { onAdd(payload); setShowDetail(false); }} />}
      {showAdd && <AddToCellarPopup item={rec} cat={cat} onClose={function() { setShowAdd(false); }} onConfirm={function(payload) { onAdd(payload); setShowAdd(false); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FIND TAB
// ─────────────────────────────────────────────────────────────

function FindTab({ cats, profile, useRec, library, addToLib }) {
  var [query, setQuery] = useState("");
  var [results, setResults] = useState(null);
  var [loading, setLoading] = useState(false);
  var [showRecord, setShowRecord] = useState(false);
  var [rCat, setRCat] = useState(cats[0] ? cats[0].id : "");
  var [rTitle, setRTitle] = useState("");
  var [rSuggs, setRSuggs] = useState([]);
  var [rStatus, setRStatus] = useState("want");
  var [rRating, setRRating] = useState("love");
  var [rNotes, setRNotes] = useState("");
  var debRef = useRef(null);
  var contRef = useRef(null);

  useEffect(function() {
    function h(e) { if (contRef.current && !contRef.current.contains(e.target)) setRSuggs([]); }
    document.addEventListener("mousedown", h);
    return function() { document.removeEventListener("mousedown", h); };
  }, []);

  async function search() {
    if (!query.trim() || !useRec()) return;
    setLoading(true); setResults(null);
    var q = query.trim().toLowerCase();
    var inLib = library.find(function(i) { return i.title.toLowerCase().includes(q); });
    var inLibStr = inLib ? ("Item is in user library with status=" + inLib.status + " rating=" + inLib.rating) : "";
    var result = await ai(buildSearchPrompt(query, JSON.stringify(profile), cats.map(function(x) { return x.id; }).join(", "), inLibStr), null);
    setResults(result); setLoading(false);
  }

  function fetchRSuggs(text) {
    if (debRef.current) clearTimeout(debRef.current);
    if (text.length < 1) { setRSuggs([]); return; }
    var local = localSearch(rCat, text);
    if (local.length >= 3) { setRSuggs(local); return; }
    if (text.length < 2) return;
    debRef.current = setTimeout(async function() {
      var cat = CATS.find(function(c) { return c.id === rCat; });
      var result = await ai(buildSuggestPrompt(text, cat ? cat.label : ""), { suggestions: [] });
      var merged = Array.from(new Set(local.concat((result && result.suggestions) || []))).slice(0, 6);
      setRSuggs(merged);
    }, 350);
  }

  function saveRecord() {
    if (!rTitle.trim()) return;
    addToLib({ title:rTitle, category:rCat, status:rStatus, rating: rStatus === "tasted" ? rRating : null, notes:rNotes });
    setShowRecord(false); setRTitle(""); setRNotes(""); setRSuggs([]);
  }

  var RATINGS = [["love","♥ Loved"],["like","👍 Liked"],["neutral","😐 OK"],["dislike","👎 Not for me"],["hate","✕ Disliked"]];

  return (
    <div>
      <div className="fu" style={{ marginBottom:20 }}>
        <SHead sub="Search a specific item for a verdict — or ask anything.">
          Look it <em style={{ color:"var(--gold)", fontStyle:"italic" }}>up</em>
        </SHead>
        <div style={{ fontSize:12, color:"var(--muted)", fontStyle:"italic", marginTop:4, opacity:0.7 }}>
          Try: "Woodford Reserve" or "what whiskey should I try next?"
        </div>
      </div>
      <div className="fu1" style={{ marginBottom:10 }}>
        <div style={{ position:"relative", marginBottom:8 }}>
          <input value={query} onChange={function(e) { setQuery(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") search(); }}
            placeholder="A title, an ingredient, or a question..."
            style={{ width:"100%", padding:"14px 110px 14px 16px", fontSize:16 }}
          />
          <RippleBtn onClick={search} style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", padding:"7px 18px", background:"var(--gold)", color:"#0a0a0b", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:700, borderRadius:3, letterSpacing:"0.1em" }}>SEARCH</RippleBtn>
        </div>
      </div>
      <div className="fu2" style={{ marginBottom:22 }}>
        <RippleBtn onClick={function() { setShowRecord(function(s) { return !s; }); }} style={{ width:"100%", padding:"11px", border:"1px dashed rgba(204,255,0,0.3)", background:"rgba(204,255,0,0.03)", fontFamily:"inherit", fontSize:14, color:"var(--gold)", borderRadius:6 }}>
          + Record something you have tasted
        </RippleBtn>
      </div>
      {showRecord && (
        <GCard hover={false} style={{ padding:20, marginBottom:22, border:"1px solid rgba(204,255,0,0.18)" }}>
          <NeonLabel style={{ marginBottom:16 }}>Add to taste record</NeonLabel>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>World</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {cats.map(function(c) {
                return <Pill key={c.id} active={rCat === c.id} onClick={function() { setRCat(c.id); setRTitle(""); setRSuggs([]); }}>{c.emoji} {c.label}</Pill>;
              })}
            </div>
          </div>
          <div style={{ marginBottom:14 }} ref={contRef}>
            <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>What is it?</div>
            <div style={{ position:"relative" }}>
              <input value={rTitle} onChange={function(e) { setRTitle(e.target.value); fetchRSuggs(e.target.value); }}
                placeholder={"Search " + ((CATS.find(function(c) { return c.id === rCat; }) || {}).label || "") + "..."}
                style={{ width:"100%", padding:"10px 13px", fontSize:15 }}
              />
              {rSuggs.length > 0 && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"rgba(16,16,20,0.98)", backdropFilter:"blur(20px)", border:"1px solid rgba(204,255,0,0.15)", borderRadius:6, zIndex:50, boxShadow:"0 12px 40px rgba(0,0,0,0.8)", overflow:"hidden" }}>
                  {rSuggs.map(function(s) {
                    return (
                      <button key={s} onMouseDown={function(e) { e.preventDefault(); setRTitle(s); setRSuggs([]); }}
                        style={{ display:"block", width:"100%", padding:"10px 14px", background:"none", border:"none", borderBottom:"1px solid rgba(255,255,255,0.03)", textAlign:"left", fontSize:15, fontFamily:"inherit", cursor:"pointer", color:"var(--ink)" }}
                        onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(204,255,0,0.05)"; }}
                        onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}
                      >{s}</button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>Status</div>
            <div style={{ display:"flex", gap:6 }}>
              <Pill active={rStatus === "want"} onClick={function() { setRStatus("want"); }}>Want to taste</Pill>
              <Pill active={rStatus === "tasted"} onClick={function() { setRStatus("tasted"); }}>I have tasted it</Pill>
            </div>
          </div>
          {rStatus === "tasted" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>How was it?</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {RATINGS.map(function(pair) {
                  return <Pill key={pair[0]} active={rRating === pair[0]} onClick={function() { setRRating(pair[0]); }}>{pair[1]}</Pill>;
                })}
              </div>
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>Notes (optional)</div>
            <input value={rNotes} onChange={function(e) { setRNotes(e.target.value); }} placeholder="Anything to remember..."
              style={{ width:"100%", padding:"9px 13px", fontSize:14 }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <RippleBtn onClick={saveRecord} disabled={!rTitle.trim()} style={{ flex:1, padding:"11px", fontSize:15, fontWeight:700, background: rTitle.trim() ? "var(--gold)" : "var(--faint)", color: rTitle.trim() ? "#0a0a0b" : "var(--muted)", border:"none", borderRadius:4 }}>Save to My Cellar</RippleBtn>
            <button onClick={function() { setShowRecord(false); }} style={{ padding:"11px 18px", background:"transparent", color:"var(--muted)", border:"1px solid var(--faint)", fontFamily:"inherit", fontSize:14, cursor:"pointer", borderRadius:4 }}>Cancel</button>
          </div>
        </GCard>
      )}
      {loading && <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{[1,2,3].map(function(i) { return <div key={i} className="shimmer" style={{ height:90, borderRadius:8 }} />; })}</div>}
      {results && (
        <div className="fu" style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {(results.mode === "recommendation" || results.mode === "attribute") && (
            <div>
              {results.heading && (
                <div style={{ padding:"10px 16px", background:"rgba(204,255,0,0.05)", borderLeft:"2px solid var(--gold)", marginBottom:14, borderRadius:"0 6px 6px 0" }}>
                  <span style={{ fontSize:14, fontStyle:"italic", color:"var(--ink)" }}>{results.heading}</span>
                </div>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {(results.recommendations || []).map(function(rec, i) {
                  var cat = CATS.find(function(c) { return c.id === rec.category; });
                  return (
                    <GCard key={i} style={{ padding:"14px 16px", display:"flex", gap:12 }}>
                      <span style={{ fontSize:20, flexShrink:0 }}>{cat ? cat.emoji : "✦"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <div style={{ fontSize:16, fontWeight:500, color:"var(--ink)" }}>{rec.title}</div>
                            <div style={{ fontSize:13, color:"var(--muted)" }}>{rec.subtitle}</div>
                          </div>
                          <ScoreBadge score={rec.matchScore} />
                        </div>
                        {rec.why && <div style={{ fontSize:13, fontStyle:"italic", color:"var(--muted)", marginTop:6 }}>{rec.why}</div>}
                      </div>
                    </GCard>
                  );
                })}
              </div>
            </div>
          )}
          {results.mode === "lookup" && results.searched && (
            <div>
              <VerdictCard result={results.searched} />
              {(results.withinCategory || []).length > 0 && (
                <div style={{ marginTop:16 }}>
                  <NeonLabel style={{ marginBottom:12 }}>{results.alternativesLabel || "More like this"}</NeonLabel>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {results.withinCategory.map(function(item, i) {
                      return <FindResultItem key={i} item={item} cats={cats} addToLib={addToLib} />;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictCard({ result }) {
  var v = result.verdict;
  var vColor = v === "Yes" ? "var(--green)" : v === "Probably not" ? "var(--red)" : "var(--gold)";
  return (
    <GCard style={{ padding:20 }}>
      <NeonLabel style={{ marginBottom:12 }}>Will you like it?</NeonLabel>
      <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:12 }}>
        <div className="serif" style={{ fontSize:42, fontWeight:900, color:vColor }}>{v}</div>
        <div>
          <div style={{ fontSize:18, fontWeight:500, color:"var(--ink)" }}>{result.title}</div>
          <ScoreBadge score={result.matchScore} />
        </div>
      </div>
      {result.reason && <p style={{ fontSize:14, fontStyle:"italic", color:"var(--muted)" }}>{result.reason}</p>}
    </GCard>
  );
}

function FindResultItem({ item, cats, addToLib }) {
  var [showDetail, setShowDetail] = useState(false);
  var [showAdd, setShowAdd] = useState(false);
  var cat = CATS.find(function(c) { return c.id === item.category; });
  return (
    <div>
      <GCard onClick={function() { setShowDetail(true); }} style={{ padding:"12px 15px", display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:18, flexShrink:0 }}>{cat ? cat.emoji : "✦"}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--ink)" }}>{item.title}</div>
          {item.subtitle && <div style={{ fontSize:13, color:"var(--muted)" }}>{item.subtitle}</div>}
          {item.why && <div style={{ fontSize:13, fontStyle:"italic", color:"var(--muted)", marginTop:4 }}>{item.why}</div>}
        </div>
        <button onClick={function(e) { e.stopPropagation(); setShowAdd(true); }}
          style={{ background:"none", border:"1px solid var(--faint)", borderRadius:"50%", width:26, height:26, cursor:"pointer", color:"var(--muted)", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
          onMouseEnter={function(e) { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
          onMouseLeave={function(e) { e.currentTarget.style.borderColor = "var(--faint)"; e.currentTarget.style.color = "var(--muted)"; }}
        >+</button>
      </GCard>
      {showDetail && <DetailModal item={item} cat={cat} onClose={function() { setShowDetail(false); }} onAdd={function(payload) { addToLib && addToLib(Object.assign({}, item, payload)); setShowDetail(false); }} />}
      {showAdd && <AddToCellarPopup item={item} cat={cat} onClose={function() { setShowAdd(false); }} onConfirm={function(payload) { addToLib && addToLib(Object.assign({}, item, payload)); setShowAdd(false); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────────────────────

function FactChip({ label, value }) {
  return (
    <div style={{ padding:"8px 12px", background:"rgba(255,255,255,0.03)", border:"1px solid var(--faint)", borderRadius:6 }}>
      <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:500, color:"var(--ink)" }}>{value}</div>
    </div>
  );
}

function DetailModal({ item, cat, onClose, onAdd }) {
  var [detail, setDetail] = useState(null);
  var [loading, setLoading] = useState(true);
  var [showAdd, setShowAdd] = useState(false);

  useEffect(function() {
    async function load() {
      var catId = item.category || (cat && cat.id);
      var catLabel = (cat && cat.label) ? cat.label : catId;
      var result = await ai(buildDetailPrompt(catId, item.title, catLabel), null);
      if (result && (result.about || result.synopsis || result.tastingNotes || result.ingredients || result.keyFacts)) {
        setDetail(result);
      } else {
        setDetail({ title: item.title, about: "Could not load details. Please try again." });
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(6,6,8,0.88)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn 0.2s ease", backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div onClick={function(e) { e.stopPropagation(); }} style={{ background:"rgba(16,16,20,0.97)", backdropFilter:"blur(32px)", border:"1px solid rgba(204,255,0,0.1)", borderRadius:"14px 14px 0 0", width:"100%", maxWidth:640, maxHeight:"88vh", padding:"20px 24px 48px", overflowY:"auto", animation:"fadeUp 0.28s ease" }}>
        <div style={{ width:36, height:3, background:"linear-gradient(90deg,var(--gold),var(--fuschia))", borderRadius:2, margin:"0 auto 24px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div className="serif" style={{ fontSize:22, fontWeight:700, color:"var(--ink)", marginBottom:4 }}>{item.title}</div>
            {cat && <NeonLabel>{cat.label}</NeonLabel>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"1px solid var(--faint)", borderRadius:"50%", width:32, height:32, cursor:"pointer", color:"var(--muted)", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
        </div>
        {loading && <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner /></div>}
        {!loading && detail && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {(detail.about || detail.synopsis || detail.whyWatch) && (
              <p style={{ fontSize:15, color:"var(--muted)", lineHeight:1.7 }}>{detail.about || detail.synopsis || detail.whyWatch}</p>
            )}
            {(detail.year || detail.director || detail.genre || detail.runtime || detail.imdbRating || detail.rottenTomatoes) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.year && <FactChip label="Year" value={detail.year} />}
                {detail.director && <FactChip label="Director" value={detail.director} />}
                {detail.genre && <FactChip label="Genre" value={detail.genre} />}
                {detail.runtime && <FactChip label="Runtime" value={detail.runtime} />}
                {detail.imdbRating && <FactChip label="IMDb" value={detail.imdbRating} />}
                {detail.streamingOn && detail.streamingOn.length > 0 && <FactChip label="Stream on" value={detail.streamingOn.join(", ")} />}
              </div>
            )}
            {detail.cast && detail.cast.length > 0 && (
              <div>
                <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>Cast</div>
                <div style={{ fontSize:14, color:"var(--ink)" }}>{detail.cast.join(", ")}</div>
              </div>
            )}
            {(detail.artist || detail.year) && detail.topTracks && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.artist && <FactChip label="Artist" value={detail.artist} />}
                {detail.year && <FactChip label="Year" value={detail.year} />}
                {detail.genre && <FactChip label="Genre" value={detail.genre} />}
              </div>
            )}
            {detail.topTracks && detail.topTracks.length > 0 && (
              <div>
                <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>Top Tracks</div>
                {detail.topTracks.map(function(t, i) {
                  return <div key={i} style={{ fontSize:13, color:"var(--ink)", paddingLeft:12, borderLeft:"2px solid var(--faint)", marginBottom:4 }}>{t}</div>;
                })}
              </div>
            )}
            {(detail.developer || detail.metacritic || detail.playtime) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.developer && <FactChip label="Developer" value={detail.developer} />}
                {detail.platforms && <FactChip label="Platforms" value={detail.platforms.join(", ")} />}
                {detail.metacritic && <FactChip label="Metacritic" value={detail.metacritic} />}
                {detail.playtime && <FactChip label="Playtime" value={detail.playtime} />}
              </div>
            )}
            {(detail.author || detail.pages || detail.goodreadsRating) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.author && <FactChip label="Author" value={detail.author} />}
                {detail.year && <FactChip label="Year" value={detail.year} />}
                {detail.pages && <FactChip label="Pages" value={detail.pages} />}
                {detail.goodreadsRating && <FactChip label="Goodreads" value={detail.goodreadsRating} />}
              </div>
            )}
            {(detail.house || detail.perfumer || detail.family || detail.concentration) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.house && <FactChip label="House" value={detail.house} />}
                {detail.perfumer && <FactChip label="Perfumer" value={detail.perfumer} />}
                {detail.year && <FactChip label="Year" value={detail.year} />}
                {detail.family && <FactChip label="Family" value={detail.family} />}
                {detail.concentration && <FactChip label="Type" value={detail.concentration} />}
                {detail.sillage && <FactChip label="Sillage" value={detail.sillage} />}
                {detail.longevity && <FactChip label="Longevity" value={detail.longevity} />}
              </div>
            )}
            {detail.notes && (detail.notes.top || detail.notes.heart || detail.notes.base) && (
              <div>
                <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>Notes</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {detail.notes.top && detail.notes.top.length > 0 && <FactChip label="Top" value={detail.notes.top.join(", ")} />}
                  {detail.notes.heart && detail.notes.heart.length > 0 && <FactChip label="Heart" value={detail.notes.heart.join(", ")} />}
                  {detail.notes.base && detail.notes.base.length > 0 && <FactChip label="Base" value={detail.notes.base.join(", ")} />}
                </div>
              </div>
            )}
            {(detail.brewery || detail.style || detail.abv) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.brewery && <FactChip label="Brewery" value={detail.brewery} />}
                {detail.style && <FactChip label="Style" value={detail.style} />}
                {detail.abv && <FactChip label="ABV" value={detail.abv} />}
                {detail.ibu && <FactChip label="IBU" value={detail.ibu} />}
                {detail.origin && <FactChip label="Origin" value={detail.origin} />}
              </div>
            )}
            {(detail.distillery || detail.region || detail.age) && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {detail.distillery && <FactChip label="Distillery" value={detail.distillery} />}
                {detail.region && <FactChip label="Region" value={detail.region} />}
                {detail.age && <FactChip label="Age" value={detail.age} />}
                {detail.abv && <FactChip label="ABV" value={detail.abv} />}
                {detail.type && <FactChip label="Type" value={detail.type} />}
                {detail.price && <FactChip label="Price" value={detail.price} />}
              </div>
            )}
            {detail.flavourTags && detail.flavourTags.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {detail.flavourTags.map(function(t, i) {
                  return <span key={i} style={{ fontSize:12, padding:"3px 10px", background:"rgba(204,255,0,0.07)", border:"1px solid rgba(204,255,0,0.2)", borderRadius:999, color:"var(--gold)" }}>{t}</span>;
                })}
              </div>
            )}
            {detail.tastingNotes && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase" }}>Tasting Notes</div>
                {Object.entries(detail.tastingNotes).map(function(pair) {
                  return (
                    <div key={pair[0]} style={{ padding:"10px 13px", background:"rgba(255,255,255,0.03)", border:"1px solid var(--faint)", borderRadius:6 }}>
                      <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:3 }}>{pair[0]}</div>
                      <div style={{ fontSize:14, color:"var(--ink)" }}>{pair[1]}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {detail.ingredients && (
              <div>
                <div className="mono" style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>Ingredients</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {detail.ingredients.map(function(ing, i) {
                    return (
                      <div key={i} style={{ display:"flex", gap:12, fontSize:14 }}>
                        <span className="mono" style={{ color:"var(--gold)", minWidth:64 }}>{ing.amount}</span>
                        <span style={{ color:"var(--ink)" }}>{ing.item}</span>
                      </div>
                    );
                  })}
                </div>
                {detail.method && <p style={{ fontSize:13, color:"var(--muted)", marginTop:8, fontStyle:"italic" }}>{detail.method}</p>}
                {detail.glass && (
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    <FactChip label="Glass" value={detail.glass} />
                    {detail.garnish && <FactChip label="Garnish" value={detail.garnish} />}
                  </div>
                )}
              </div>
            )}
            {detail.flavourProfile && detail.flavourProfile.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {detail.flavourProfile.map(function(t, i) {
                  return <span key={i} style={{ fontSize:12, padding:"3px 10px", background:"rgba(204,255,0,0.07)", border:"1px solid rgba(204,255,0,0.2)", borderRadius:999, color:"var(--gold)" }}>{t}</span>;
                })}
              </div>
            )}
            {detail.keyFacts && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {detail.keyFacts.map(function(f, i) {
                  return <div key={i} style={{ fontSize:14, color:"var(--muted)", paddingLeft:12, borderLeft:"2px solid var(--faint)" }}>{f}</div>;
                })}
              </div>
            )}
            <div style={{ marginTop:8 }}>
              <RippleBtn onClick={function() { setShowAdd(true); }} style={{ width:"100%", padding:"12px", background:"var(--gold)", color:"#0a0a0b", border:"none", borderRadius:4, fontFamily:"inherit", fontSize:15, fontWeight:700 }}>+ Add to My Cellar</RippleBtn>
            </div>
          </div>
        )}
      </div>
      {showAdd && <AddToCellarPopup item={item} cat={cat} onClose={function() { setShowAdd(false); }} onConfirm={function(payload) { onAdd && onAdd(payload); setShowAdd(false); onClose(); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD TO CELLAR POPUP
// ─────────────────────────────────────────────────────────────

function AddToCellarPopup({ item, cat, onClose, onConfirm }) {
  var [step, setStep] = useState(0);
  var [rating, setRating] = useState("love");
  var RATINGS = [["love","♥ Loved it"],["like","👍 Liked it"],["neutral","😐 It was OK"],["dislike","👎 Not for me"],["hate","✕ Really disliked"]];

  function handleStatus(status) {
    if (status === "want") {
      onConfirm({ status:"want", rating:null }); onClose();
    } else {
      setStep(1);
    }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <GCard hover={false} onClick={function(e) { e.stopPropagation(); }} style={{ padding:24, maxWidth:340, width:"100%", border:"1px solid rgba(204,255,0,0.2)" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"var(--ink)", marginBottom:4 }}>{item.title}</div>
        {cat && <NeonLabel style={{ marginBottom:16 }}>{cat.label}</NeonLabel>}
        {step === 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={function() { handleStatus("want"); }} style={{ padding:"12px 16px", background:"rgba(204,255,0,0.06)", border:"1px solid rgba(204,255,0,0.3)", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"var(--ink)", textAlign:"left" }}>
              Want to taste
            </button>
            <button onClick={function() { handleStatus("tasted"); }} style={{ padding:"12px 16px", background:"rgba(204,255,0,0.06)", border:"1px solid rgba(204,255,0,0.3)", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:14, color:"var(--ink)", textAlign:"left" }}>
              I have tasted it
            </button>
          </div>
        )}
        {step === 1 && (
          <div>
            <div style={{ fontSize:14, color:"var(--muted)", marginBottom:12 }}>How was it?</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              {RATINGS.map(function(pair) {
                return (
                  <button key={pair[0]} onClick={function() { setRating(pair[0]); }}
                    style={{ padding:"10px 14px", background: rating === pair[0] ? "rgba(204,255,0,0.1)" : "transparent", border: rating === pair[0] ? "1px solid rgba(204,255,0,0.4)" : "1px solid var(--faint)", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:14, color: rating === pair[0] ? "var(--gold)" : "var(--ink)", textAlign:"left", transition:"all 0.15s" }}
                  >{pair[1]}</button>
                );
              })}
            </div>
            <RippleBtn onClick={function() { onConfirm({ status:"tasted", rating:rating }); onClose(); }} style={{ width:"100%", padding:"11px", background:"var(--gold)", color:"#0a0a0b", border:"none", borderRadius:4, fontFamily:"inherit", fontSize:14, fontWeight:700 }}>Save</RippleBtn>
          </div>
        )}
      </GCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CELLAR ITEM (tappable row with detail modal)
// ─────────────────────────────────────────────────────────────

function CellarItem({ item, addToLib }) {
  var [showDetail, setShowDetail] = useState(false);
  var [showAdd, setShowAdd] = useState(false);
  var cat = CATS.find(function(c) { return c.id === item.category; });
  var RATING_ICON = { love:"♥", like:"👍", neutral:"😐", dislike:"👎", hate:"✕" };
  return (
    <div>
      <GCard onClick={function() { setShowDetail(true); }} style={{ padding:"12px 16px", display:"flex", gap:12, alignItems:"center" }}>
        <span style={{ fontSize:18, flexShrink:0 }}>{cat ? cat.emoji : "✦"}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:500, color:"var(--ink)" }}>{item.title}</div>
          <div style={{ fontSize:12, color:"var(--muted)" }}>{cat ? cat.label : ""}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <span className="mono" style={{ fontSize:10, color: item.status === "tasted" ? "var(--gold)" : "var(--muted)", letterSpacing:"0.1em" }}>
            {item.status === "tasted" ? "TASTED" : "WANT"}
          </span>
          {item.rating && <span style={{ fontSize:16 }}>{RATING_ICON[item.rating] || ""}</span>}
        </div>
      </GCard>
      {showDetail && (
        <DetailModal item={item} cat={cat} onClose={function() { setShowDetail(false); }}
          onAdd={function(payload) { addToLib && addToLib(Object.assign({}, item, payload)); setShowDetail(false); }} />
      )}
      {showAdd && (
        <AddToCellarPopup item={item} cat={cat} onClose={function() { setShowAdd(false); }}
          onConfirm={function(payload) { addToLib && addToLib(Object.assign({}, item, payload)); setShowAdd(false); }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CELLAR TAB
// ─────────────────────────────────────────────────────────────

function CellarTab({ library, cats, addToLib }) {
  var [filter, setFilter] = useState("all");
  var [catFilter, setCatFilter] = useState("all");

  var filtered = library.filter(function(item) {
    var statusOk = filter === "all" || item.status === filter;
    var catOk = catFilter === "all" || item.category === catFilter;
    return statusOk && catOk;
  });

  var RATING_ICON = { love:"♥", like:"👍", neutral:"😐", dislike:"👎", hate:"✕" };

  return (
    <div>
      <div className="fu" style={{ marginBottom:20 }}>
        <SHead>My <em style={{ color:"var(--gold)", fontStyle:"italic" }}>Cellar</em></SHead>
        <p style={{ fontSize:13, color:"var(--muted)", marginTop:-12, marginBottom:16 }}>Everything you have tasted or want to taste.</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {[["all","All"],["tasted","Tasted"],["want","Want to taste"]].map(function(pair) {
            return <Pill key={pair[0]} active={filter === pair[0]} onClick={function() { setFilter(pair[0]); }}>{pair[1]}</Pill>;
          })}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[{ id:"all", label:"All worlds", emoji:"" }].concat(cats).map(function(cat) {
            return <Pill key={cat.id} active={catFilter === cat.id} onClick={function() { setCatFilter(cat.id); }}>{cat.emoji} {cat.label}</Pill>;
          })}
        </div>
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:48, color:"var(--muted)" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:15 }}>Nothing here yet</div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(function(item, i) {
          return <CellarItem key={i} item={item} addToLib={addToLib} />;
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, cats }) {
  if (!profile) return (
    <div style={{ textAlign:"center", padding:60, color:"var(--muted)" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>🧬</div>
      <div>Complete onboarding to build your taste profile.</div>
    </div>
  );

  var dims = profile.dimensions || {};
  var DIM_LABELS = { intensity:"Intensity", complexity:"Complexity", darkness:"Darkness", warmth:"Warmth", energy:"Energy", boldness:"Boldness", sweetness:"Sweetness", nostalgia:"Nostalgia", acquired_taste:"Acquired Taste", social:"Social", narrative:"Narrative" };

  return (
    <div>
      <div className="fu" style={{ marginBottom:28 }}>
        <SHead>Taste <em style={{ color:"var(--gold)", fontStyle:"italic" }}>Signature</em></SHead>
        <div style={{ padding:"16px 20px", background:"rgba(204,255,0,0.04)", border:"1px solid rgba(204,255,0,0.15)", borderRadius:8, marginBottom:20 }}>
          <p style={{ fontSize:15, fontStyle:"italic", color:"var(--ink)", lineHeight:1.7 }}>{profile.signature}</p>
        </div>
      </div>
      <div className="fu1">
        <NeonLabel style={{ marginBottom:16 }}>Taste Dimensions</NeonLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Object.entries(dims).map(function(pair) {
            var key = pair[0]; var val = pair[1];
            var label = DIM_LABELS[key] || key;
            var pct = Math.round((val / 10) * 100);
            var isHigh = val >= 7;
            var barColor = isHigh ? "var(--gold)" : "var(--fuschia)";
            return (
              <div key={key}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, color:"var(--muted)" }}>{label}</span>
                  <span className="mono" style={{ fontSize:11, color: isHigh ? "var(--gold)" : "var(--fuschia)" }}>{val}/10</span>
                </div>
                <div style={{ height:4, background:"var(--faint)", borderRadius:2 }}>
                  <div style={{ width: pct + "%", height:"100%", background:barColor, borderRadius:2, transition:"width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────────

function SettingsTab({ activeCats, setActiveCats, allCats }) {
  function toggle(id) {
    if (activeCats.includes(id)) {
      if (activeCats.length > 1) setActiveCats(activeCats.filter(function(c) { return c !== id; }));
    } else {
      setActiveCats(activeCats.concat([id]));
    }
  }
  return (
    <div>
      <div className="fu" style={{ marginBottom:24 }}>
        <SHead>Your <em style={{ color:"var(--gold)", fontStyle:"italic" }}>Worlds</em></SHead>
        <p style={{ fontSize:13, color:"var(--muted)", marginTop:-12 }}>Toggle which categories appear in your recommendations.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {allCats.map(function(cat) {
          var on = activeCats.includes(cat.id);
          return (
            <button key={cat.id} onClick={function() { toggle(cat.id); }} style={{ padding:"16px", border: on ? "1px solid rgba(204,255,0,0.5)" : "1px solid var(--faint)", background: on ? "rgba(204,255,0,0.07)" : "rgba(255,255,255,0.015)", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left", fontFamily:"inherit" }}>
              <span style={{ fontSize:22 }}>{cat.emoji}</span>
              <div>
                <div style={{ fontSize:14, fontWeight: on ? 600 : 400, color: on ? "var(--ink)" : "var(--muted)" }}>{cat.label}</div>
                {on && <div className="mono" style={{ fontSize:10, color:"var(--gold)", letterSpacing:"0.12em" }}>ACTIVE</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAYWALL
// ─────────────────────────────────────────────────────────────

function Paywall({ onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <GCard hover={false} onClick={function(e) { e.stopPropagation(); }} style={{ padding:40, maxWidth:380, width:"100%", textAlign:"center", border:"1px solid rgba(204,255,0,0.2)" }}>
        <div className="serif" style={{ fontSize:32, fontWeight:900, marginBottom:8, background:"linear-gradient(135deg,var(--gold),var(--fuschia))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
          Upgrade
        </div>
        <p style={{ fontSize:15, color:"var(--muted)", marginBottom:28 }}>You have used your free recommendations. Upgrade for unlimited access.</p>
        <RippleBtn onClick={onClose} style={{ padding:"14px 40px", background:"var(--gold)", color:"#0a0a0b", border:"none", borderRadius:4, fontFamily:"inherit", fontSize:15, fontWeight:700, boxShadow:"0 0 28px rgba(204,255,0,0.35)" }}>$7.99 / month</RippleBtn>
        <button onClick={onClose} style={{ display:"block", marginTop:16, background:"none", border:"none", cursor:"pointer", color:"var(--muted)", fontFamily:"inherit", fontSize:13 }}>Maybe later</button>
      </GCard>
    </div>
  );
}
