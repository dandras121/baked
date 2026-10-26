# Induló prompt — Baked by Linda

**Bohokának:** az első munkamenetben a két vonal közötti részt másold be Claude Code-nak, egyben, változtatás nélkül. A fájl végén van egy rövid **Folytatás** prompt: azt minden későbbi, új munkamenet elején illeszd be.

---

Szia! Bohoka vagyok, a Baked by Linda weboldal és admin tervezője. Ebben a mappában minden megvan, ami a megépítéshez kell. Te fogod megépíteni, kis, ellenőrizhető lépésekben. Én nem vagyok programozó: úgy ellenőrzöm a munkádat, hogy megnézem, kattintgatok, telefonon kipróbálom, és összevetem a Figmával. Ezért írtam neked egy pontos munkamódot. Kérlek, tartsd magad hozzá végig.

## 1. Mi van a mappában

| Hely | Mi ez | Mit kezdj vele |
|---|---|---|
| `CLAUDE.md` | A munkamódod: források, Figma, stack, a szeletenkénti munkamenet, a megszeghetetlen szabályok, a jelentés formája, git, mikor kérdezz | Minden munkamenet elején teljesen olvasd el. Ez a legfontosabb fájl. |
| `docs/SITE-FLOWS.md` | A viselkedés teljes leírása: minden oldal, gomb, mező, állapot, e-mail, admin képernyő, szabály, változó és ütemezett feladat | A §0 („Start here”) kötelező, mielőtt bármit kódolsz; a többit szeletenként, ahogy a terv mondja |
| `docs/ANIMATIONS.md` | Minden mozgás (ANIM-01 … ANIM-25), a globális szabályok, a tokenek, az átvételi lista (§9) és a keyframe JSON (§12) | §1 és §3 mindig; a többi, ha a szeletben mozgás van |
| `docs/RESPONSIVE.md` | Töréspontok (telefon < 768, tablet 768–1119, desktop ≥ 1120), a tablet = desktop × 0,8 szabály | Minden felületi szeletnél |
| `docs/torta-video-szabalyrendszer.md` | A tortakártya-videó szabályai: négyzetes videó, alul rögzített kivágások, képletek, admin feltöltés | A 3.4 és a 9.2 szeletnél |
| `docs/BUILD-PLAN.md` | A sorrend: 12 szakasz (0–11), 70 szelet; mindegyiknél mit olvass, mit építs, mit tesztelj, és hogyan ellenőrzöm | Mindig |
| `ellenorzes/ELLENORZO-LISTA.md` | **Az én ellenőrző listám**, magyarul: mit nézek meg minden szeletnél, és mit az egyes szeleteknél 0.1-től 11.3-ig, plusz a szakasz végi kapu | Lásd a 2. pontot |
| `OLVASS-EL.md` | Az én telepítési jegyzetem | Nem neked szól; ne módosítsd |

A Figma-fájl: kulcs `py7HpVoQwoEm9shlxEoCXL`, oldal `0:1`. Minden képernyő, állapot, komponens és storyboard node id-vel szerepel a dokumentumokban. A Figmát csak olvasod, soha nem szerkeszted.

## 2. Az ellenőrző listám — miért adom oda neked

Az `ellenorzes/` mappát azért kapod meg, hogy **az én szememmel is lásd**, minek kell megfelelnie egy szeletnek, mielőtt átadod. Ne a kód szerzőjeként nézd, hanem úgy, mint aki először látja: kattint, átméretezi az ablakot, telefonon érinti, Tab-bal végigmegy rajta, bekapcsolja a csökkentett mozgást, és a Figma mellé teszi.

- Minden jelentés előtt menj végig a **„Minden szeletnél”** pontjain és az **aktuális szelet** pontjain. Amit eszközzel tudsz, ellenőrizd magad: Playwright 402 / 1024 / 1280 szélességen és a köztes szélességeken, egér és érintés, csak billentyűzet, csökkentett mozgás, axe, Figma-összevetés screenshotokkal, mail-elkapó, Stripe teszt felület, adatbázis.
- Amit hibásnak találsz, javítsd ki, mielőtt jelentesz.
- Amit csak ember tud megítélni (valódi telefon, VoiceOver, „gördülékeny-e”), azt írd az **Így nézd meg** részbe nekem lépésenként.
- Szakasz végén ugyanígy a **„Szakasz végi kapu”** pontjai, a szakasz-összefoglaló előtt.
- A listát ne szerkeszd és ne pipáld: az az enyém. A te haladásod a `docs/PROGRESS.md`-ben van.
- A lista a dokumentumokból készült, saját szabálya nincs. Ha bárhol eltér tőlük, **a dokumentumok az irányadók** — építsd a dokumentum szerint, és írd meg az Eltérések között, hogy javítsam a listát.

## 3. Ami soha nem változik (röviden — a részletek a CLAUDE.md-ben)

1. **Egy szelet egyszerre.** A következőt csak akkor kezded, ha az előzőre azt írtam: „rendben” / „mehet”.
2. **Csak azt építed, amit a szelet mond.** Ami máshová tartozik, a `PROGRESS.md` „Later” részébe kerül.
3. **Kb. 600 sor kézzel írt kód** fölött egy szelet túl nagy: állj meg, vágd ketté, szólj.
4. **Elsőbbség:** SITE-FLOWS (benne a Decided sor nyer) → RESPONSIVE / ANIMATIONS → Figma build-spec tábla → Figma képernyők → soha nem a Figma mintaadata. A ~120 ismert Figma-szövegeltérés a SITE-FLOWS Appendix A-ban van.
5. **Proposal sorokat** megépíted, és egy sort írsz róluk a `PROPOSALS.md`-be. Olyan esetet, amit egyik dokumentum sem fed le, a legegyszerűbb szabálykövető módon építesz meg, és Proposalként jelölsz. **Oldalt, e-mailt, fizetést vagy árszabályt soha nem találsz ki** — ilyenkor kérdezel.
6. **Pénz:** egész penny. **Idő:** Europe/London. **Határidők:** pontosan a SITE-FLOWS §10.1 szerint.
7. **Stripe csak teszt módban**, amíg nem írom, hogy „indulhat”. Fejlesztésből **soha nem megy e-mail valódi vásárlónak** (helyi mail-elkapó).
8. **Titkos kulcs, jelszó** csak környezeti változóban; soha nem kerül gitbe, jelentésbe vagy a chatbe.
9. **Minden animáció** 1 mp alatt, csak `transform` / `opacity` (a megnevezett kivételekkel), csökkentett mozgásnál azonnali, elmozdulás nélkül. Minden nyomható elem ANIM-07, minden írható mező ANIM-05 — az admin által hozzáadott tartalomban is.
10. **Minden érintési felület legalább 44 × 44**, minden szöveg eléri a kontrasztot, billentyűzet és képernyőolvasó működik.
11. **Üzleti adat** (név, cím, telefon, e-mail, higiéniai besorolás, tanács) soha nincs beírva az oldalba: a Settingsből jön.
12. **Nem módosíthatod:** a `docs/` fájljait (kivéve `PROGRESS.md`, `PROPOSALS.md`, `DEVIATIONS.md`), a `CLAUDE.md`-t, ezt a fájlt, az `OLVASS-EL.md`-t és az `ellenorzes/` mappát. Ha egy leírás hibásnak tűnik, szólj és kérdezz.
13. **Fotók, videók, design-elemek** még nincsenek: a Figma pontos alakú, placeholder-színű helyőrzőit építed. Stock fotót soha nem használsz. A `Placeholder-<mi>-desktop|tablet|phone` ellipszisek üres dekoratív képhelyek, pontosan abban a méretben és pozícióban.
14. **Linda dolgai** (Stripe-, Postmark-, Google-fiók, domain, higiéniai adatok, jogi jóváhagyás, tartalom) később jönnek. **Ne várj rájuk:** teszt módokkal és kis adapterekkel dolgozz, hogy az élesítés csak beállítás legyen.

## 4. Hogyan beszélünk

**A jelentésed** minden szelet után magyarul, röviden, ebben a sorrendben: **Kész** · **Így nézd meg** (URL, mire kattintsak, mit látok 402 / 1024 / 1280 szélességen, hogyan kapcsoljam be a csökkentett mozgást) · **Képek** (a te screenshotod a Figma mellett, legalább 402 és 1280) · **Proposal-ök** (§-számmal) · **Eltérések** („Nincs”, ha nincs) · **Kérdés** (csak ha döntés kell). Hosszú technikai magyarázat nem kell; az a commit üzenetbe és a `PROGRESS.md`-be megy.

**Kérdéseidet** feleletválasztósan tedd fel, az ajánlott válasz legyen az első. Én így válaszolok:

| Ezt írom | Ezt jelenti |
|---|---|
| „rendben, mehet” | A szelet kész: commit, pipa a `PROGRESS.md`-ben, jöhet a következő szelet. |
| „javítsd: …” | Csak ezt javítsd, teszteld újra, és küldj rövid jelentést csak a változásról. |
| „a §4.2 Proposal jó” / „a §4.2 Proposal ne legyen, maradjon a Figma” | Döntés egy Proposalról; jegyezd fel a `PROPOSALS.md`-be. |
| „az eltérés rendben” / „javítsd úgy, ahogy a Figmában van” | Döntés egy eltérésről; jegyezd fel a `DEVIATIONS.md`-be. |
| „mehet a következő szakasz” | A szakasz kapuja átment: címkézd (pl. `phase-00-done`), és kezdd a következő szakasz tervével. |
| „indulhat” | Csak a 11.3-ban: mehet élesbe. Ezt máskor soha ne vedd indulásnak. |

## 5. Az első feladatod most — még kód nélkül

1. **Olvass:** a `CLAUDE.md`-t teljesen; a `docs/SITE-FLOWS.md` §0-t teljesen; a `docs/BUILD-PLAN.md`-t teljesen; a `docs/RESPONSIVE.md` §1–4-et; a `docs/ANIMATIONS.md` §1–3-at; az `ellenorzes/ELLENORZO-LISTA.md`-ből a „Hogyan használd”, a „Minden szeletnél”, a „0. szakasz” és a „Szakasz végi kapu” részt.
2. **Nézd meg a környezetet**, és írd meg, mit találtál:
   - Elérhető-e a Figma MCP? Próbáld ki csak olvasásra: kérd le a `0:1` oldal metaadatait, és egy screenshotot a Home desktop keretről (`518:2687`). Ha nem működik, állj meg, és mondd meg, mit kapcsoljak be.
   - Node.js és csomagkezelő verziója; git; van-e Postgres vagy Docker a gépen. Ami hiányzik, arra adj feleletválasztós javaslatot (az ajánlott elöl), és ne telepíts semmit a jóváhagyásom nélkül.
   - Ez a mappa lesz a git repó és az alkalmazás gyökere. A Next.js vázat úgy hozd létre, hogy a meglévő fájlok (`CLAUDE.md`, `INDITO-PROMPT.md`, `OLVASS-EL.md`, `docs/`, `ellenorzes/`) érintetlenek maradjanak. A `README.md` a tiéd lesz: az alkalmazás futtatásának leírása.
3. **Írd meg, hogy mit értettél meg**, magyarul, legfeljebb 12 pontban: mi a projekt, mik a megszeghetetlen szabályok, hogyan dolgozol, és hogyan használod az ellenőrző listámat. Ha bármi ellentmondást vagy hiányt találtál a dokumentumokban, sorold fel (§-szal).
4. **Írd meg a 0. szakasz tervét** a CLAUDE.md §4.1 szerint: legfeljebb egy képernyő; a szeletek sorrendben (0.1–0.6); mit mutat nekem mindegyik; és a döntések, amik kellenek tőlem (pl. Prisma vagy Drizzle, csomagkezelő, helyi Postgres módja) — feleletválasztósan, az ajánlottal elöl.
5. **Várj.** Kódot csak azután írsz, hogy jóváhagytam a 0. szakasz tervét.

Köszönöm! Lassan és biztosan haladjunk — inkább kisebb szelet, mint nagy meglepetés.

---

## Folytatás — új munkamenet elején ezt illeszd be

---

Szia, folytatjuk a Baked by Linda építését. Olvasd el teljesen a `CLAUDE.md`-t, aztán a `docs/PROGRESS.md`-t és a `docs/BUILD-PLAN.md` aktuális szakaszát, valamint az `ellenorzes/ELLENORZO-LISTA.md` „Minden szeletnél” részét és az aktuális szelet pontjait. Utána írd meg magyarul, 3–5 sorban: hol tartunk (melyik szelet), mi volt az utolsó jóváhagyott lépés, van-e nyitott kérdés vagy javítás, és mi a következő lépés. Ne kezdj új szeletet, amíg nem írtam, hogy „mehet”.

---
