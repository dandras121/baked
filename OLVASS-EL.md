# Olvass el — így indítsd a Claude Code-ot

Ez a mappa a Baked by Linda építésének teljes csomagja. Claude Code ebben a mappában dolgozik: itt olvassa a leírásokat, és ide építi az alkalmazást.

## Mi van benne

```
baked-by-linda/
├─ INDITO-PROMPT.md      ← ezt illeszted be első üzenetként (a végén: Folytatás prompt)
├─ CLAUDE.md             ← Claude Code munkamódja (minden munkamenetben magától beolvassa)
├─ OLVASS-EL.md          ← ez a fájl, neked
├─ docs/
│  ├─ SITE-FLOWS.md      ← a viselkedés teljes leírása
│  ├─ ANIMATIONS.md      ← minden mozgás
│  ├─ RESPONSIVE.md      ← töréspontok
│  ├─ BUILD-PLAN.md      ← a sorrend: 0–11. szakasz, 70 szelet
│  └─ torta-video-szabalyrendszer.md
└─ ellenorzes/
   └─ ELLENORZO-LISTA.md ← a te ellenőrző listád (Claude Code is olvassa, de nem szerkeszti)
```

Az ellenőrző lista élő változata a Claude-ban van („Ellenőrző lista — a weboldal építése lépésenként”); ott pipálhatsz. Az itteni másolat Claude Code-nak szól. Ha a listán változtatsz, szólj, és frissítem ezt a másolatot is.

## Beállítás (egyszer)

1. **Csomagold ki** a zipet oda, ahol tartani szeretnéd a projektet (pl. Dokumentumok / `baked-by-linda`). A mappa maradjon üres azon kívül, ami a zipben van.
2. **Telepítsd a Claude Code-ot**, ha még nincs: a Claude desktop app Code füle, vagy terminálban a claude.com/claude-code oldal utasítása szerint.
3. **Kösd be a Figmát** (hogy Claude Code lássa a terveket). Terminálban:
   `claude plugin install figma@claude-plugins-official`
   Utána indítsd újra a Claude Code-ot, írd be: `/plugin` → Installed → `figma` → Enter, és a böngészőben kattints az **Allow access**-re.
   Ha ez nem megy, kézzel: `claude mcp add --transport http figma https://mcp.figma.com/mcp`, majd Claude Code-ban `/mcp` → figma → Authenticate.
4. **Nyisd meg a Claude Code-ot ebben a mappában:** terminálban `cd` a mappába, majd `claude`; vagy a desktop app Code fülén válaszd ki a mappát.

## Indítás

1. Nyisd meg az `INDITO-PROMPT.md`-t, és másold be Claude Code-nak a két vonal közötti részt.
2. Claude Code először nem kódol: elolvassa a leírásokat, megnézi a gépet és a Figma-kapcsolatot, összefoglalja, mit értett meg, és megírja a 0. szakasz tervét kérdésekkel. Válaszolj a kérdésekre, és ha a terv jó, írd: „mehet”.
3. Utána minden szelet végén jelentést kapsz. Az ellenőrző listával nézed át, és a lista elején leírt módon válaszolsz („rendben, mehet” / „javítsd: …”).

## Új munkamenet

Ha bezárod a Claude Code-ot, vagy egy hosszú munkamenet után újat nyitsz, az `INDITO-PROMPT.md` végén lévő **Folytatás** promptot illeszd be. Claude Code a `docs/PROGRESS.md`-ből tudja, hol tartotok.

## Amit ne csinálj

- Ne írd át a `docs/` fájljait kézzel. Ha valami változik a tervben, szólj nekem (Claude, a Baked By Linda 2 projektben): frissítem a doksit, és új csomagot adok.
- Ne másolj be jelszót vagy kulcsot a chatbe. Ha Linda fiókjai elkészülnek (11. szakasz), Claude Code megmondja, melyik beállításba kell beírni őket.
