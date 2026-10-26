# Ellenőrző lista — a weboldal építése lépésenként

2026-10-23 · Bohoka

> **Claude Code-nak:** ez Bohoka átvételi listája. Minden jelentés előtt menj végig a „Minden szeletnél” pontjain és az aktuális szelet pontjain, mintha te lennél ő (CLAUDE.md §4.5). Ne szerkeszd, ne pipáld. Ha eltér a `docs/` dokumentumaitól, a dokumentumok az irányadók — jelezd az Eltérések között.

## Hogyan használd

Minden szelet végén Claude Code megáll, magyar jelentést ír, és vár rád. Te ezzel a listával nézed át: először a „Minden szeletnél” részt, aztán az adott szelet saját pontjait. Egy szelet 10–15 perc ellenőrzés.

1. Olvasd el a jelentést. A fejezetei: **Kész**, **Így nézd meg**, **Képek**, **Proposal-ök**, **Eltérések**, **Kérdés**. Ha valamelyik hiányzik, kérd el.
2. Nyisd meg, amit az „Így nézd meg” mond (link, szélesség, eszköz). A Képek rész screenshotjait tedd a Figma-keret mellé.
3. Menj végig a „Minden szeletnél” pontjain, aztán az adott szelet pontjain. Pipáld ki, ami rendben van.
4. Válaszolj Claude Code-nak, egy üzenetben:
   - **„rendben, mehet”** — a szelet kész, jöhet a következő;
   - **„javítsd: …”** — pontosan mit látsz, hol (oldal, szélesség, eszköz), mi lenne a jó; egy hiba egy sor; ha lehet, screenshot;
   - Proposal-re (a jelentésben §-számmal szerepel): **„a §4.2 Proposal jó”** / **„a §4.2 Proposal ne legyen, maradjon a Figma”**;
   - Eltérésre: **„az eltérés rendben”** vagy **„javítsd úgy, ahogy a Figmában van”**.
5. Szakasz végén (pl. a 0.6 után) jön a **Szakasz végi kapu** (a lista alja): ott az egész szakaszt nézed át egyben.

Amit sose fogadj el: „majd később megcsinálom”, ha az a szelet része; piros teszt; olyan szöveg az oldalon, ami nem a Figmából vagy a doksiból jön; valódi kártyás fizetés vagy valódi vásárlónak küldött e-mail a 11.3 előtt.

## Minden szeletnél

Ezt a blokkot minden felületet érintő szeletnél végignézed; a tiszta logikai szeleteknél (0.6, 3.1, 4.5 stb.) csak a Jelentés és a Tesztek részt.

**Jelentés és naplók**

- [ ] A jelentés magyar, mind a hat fejezete megvan, és rövid (nincs benne hosszú technikai magyarázat).
- [ ] A „Kész” pontosan azt mondja, amit a BUILD-PLAN az adott szeletre ír — se többet, se kevesebbet.
- [ ] Van 402-es és 1280-as screenshot, a Figma-keret mellett.
- [ ] Minden Proposal-sorhoz van §-hivatkozás; átgondoltad, kell-e.
- [ ] Az Eltéréseknél érted az okot; ha nem, kérdezz rá.
- [ ] Ha valami másik szeletre tartozik, a PROGRESS.md „Later” részébe került, nem most épült meg.
- [ ] A szelet nem lóg ki: kb. 600 sor kézzel írt kód alatt maradt, vagy szólt, hogy ketté kell vágni.

**Tesztek**

- [ ] A jelentés szerint minden teszt zöld, a lint és a typecheck tiszta, az axe 0 hibát mutat.
- [ ] Minden számos szabályhoz (határidő, ár, státusz, jogosultság) van teszt, a nevében a §-számmal.

**Három szélesség** (böngészőben: jobb klikk → Vizsgálat → eszköznézet, vagy az ablak átméretezése)

- [ ] **402 px** (telefon) a telefonos Figma-keret mellett: távolságok, betűméret, szín, lekerekítés, igazítás.
- [ ] **1024 px** (tablet) a tabletes keret mellett — a tablet = desktop × 0,8.
- [ ] **1280 px** (desktop) a desktop keret mellett.
- [ ] A köztes szélességeken (pl. 767 / 768, 1119 / 1120, 1600) sehol nincs vízszintes görgetés, egymásra csúszott vagy levágott szöveg.
- [ ] Valódi telefonon is megnézted (nem csak az emulátorban).

**Egér és érintés**

- [ ] Egeres hover: a gomb világosodik (+10 %, menüpontnál +15 %).
- [ ] Lenyomás: a gomb benyomódik; elengedéskor rugózik vissza, és a művelet **elengedéskor** történik.
- [ ] Ha lenyomod, majd lecsúsztatod róla az ujjad / egered, nem történik semmi.
- [ ] Telefonon nincs „beragadt” hover-állapot érintés után.
- [ ] Minden mező a gyors írás-animációval reagál (ANIM-05), fókuszban és gépeléskor.
- [ ] Minden kattintható elem legalább 44 × 44 pixeles érintési felület (telefonon könnyen eltalálod).
- [ ] Felugrók: egeres gépen párbeszédablak, érintéses eszközön alsó lap.

**Billentyűzet**

- [ ] Tab-bal minden kattintható elemre elérsz, logikus sorrendben, és látszik a fókuszkeret.
- [ ] Enter / Space működik; Esc bezárja a felugrót, és a fókusz visszakerül oda, ahonnan nyitottad.
- [ ] Felugró nyitva: a Tab nem szökik ki mögé az oldalra.

**Mozgás**

- [ ] Az animáció a Figma-storyboard soraival egyezik (a jelentés megmondja, melyik); az időzítés és a sorrend stimmel.
- [ ] Semmi nem „ugrik”: a tartalom nem tolódik el betöltéskor, nincs villanás.
- [ ] Csökkentett mozgás bekapcsolva (Mac: Rendszerbeállítások → Kisegítő lehetőségek → Kijelző → Mozgás csökkentése; iPhone: Beállítások → Kisegítő lehetőségek → Mozgás → Mozgás csökkentése): minden azonnal vált, semmi nem mozog.
- [ ] Egyik mozgás sem tart 1 másodpercnél tovább.

**Szövegek és adatok**

- [ ] Minden felirat szó szerint a Figmából jön — kivéve, ahol a SITE-FLOWS Appendix A javítást ír; akkor a javított változat.
- [ ] Az üzleti adatok (név, cím, telefon, e-mail, higiéniai besorolás, tanács) a Settingsből jönnek; ha az adminban átírod, mindenhol átíródik.
- [ ] Nincs stock fotó: a fotók helyett a Figmás placeholder-színnel kitöltött, pontos alakú doboz.
- [ ] Ahol torta van, ott ott vannak az allergének is.
- [ ] A szövegek olvashatók: halvány szürke sehol nem halványabb, mint a #756C82.

## 0. szakasz — Alapok

Ebben a szakaszban a vásárló még semmit nem lát; te a `/dev/…` bemutatóoldalakat nézed. A szakasz elején Claude Code egy képernyőnyi magyar szakasztervet ad — nézd meg, hogy a szeletek sorrendje a BUILD-PLAN-é legyen.

**0.1 Tárhely, eszközök, naplók**

- [ ] A README lépéseivel egy üres gépen (vagy egy friss másolatban) elindul az oldal — ha nem tudod kipróbálni, kérd meg, hogy mutassa egy tiszta klónon.
- [ ] Van egy-egy parancs az indításra, a tesztekre és a végponttól végpontig tesztekre.
- [ ] Létezik a `docs/PROGRESS.md`, és benne a BUILD-PLAN összes szelete (0.1–11.3) pipálható listáként; a 0.1 az elfogadásod után lesz kipipálva.
- [ ] Létezik a `docs/PROPOSALS.md` és a `docs/DEVIATIONS.md`.
- [ ] Van `.env.example`, minden változó mellett egysoros magyarázattal, és **nincs** benne valódi jelszó vagy kulcs.
- [ ] A CI (automatikus ellenőrzés) zöld.

**0.2 Színek, betűk, alapstílusok**

- [ ] Nyisd meg a `/dev/tokens` oldalt, mellé a Figmában az **Arculattár v4** szekciót (`1490:8656`).
- [ ] Minden szín neve és kódja egyezik a Figma változóival; a meta szürke **#756C82**, a lila segédszöveg **#8957B8**.
- [ ] Betűk: Quicksand 300 / 500 / 600 és Fraunces 300; a címsorok Fraunces-ek, a szöveg Quicksand. Lassú neten sincs üres hely a betű betöltéséig (előbb tartalékbetűvel látszik).
- [ ] A betűméret-skála, a lekerekítések, az árnyékok és a távolságok mind a Figma értékei.
- [ ] A jelentés szerint a kontraszt-teszt minden együtt használt szöveg/háttér párra lefutott (szöveg ≥ 4,5 : 1, vezérlő ≥ 3 : 1).
- [ ] Sehol nincs bekódolt szín vagy betűméret a token-fájlon kívül (kérd meg, hogy a jelentésben erősítse meg).

**0.3 Elrendezés, töréspontok**

- [ ] Nyisd meg a `/dev/layout` oldalt, és lassan húzd az ablak szélét: az elrendezés pontosan **768**-nál (telefon → tablet) és **1120**-nál (tablet → desktop) vált, máshol nem.
- [ ] Tableten a betűk és méretek a desktop 80 %-ái.
- [ ] 1280 felett a tartalom középen marad, legfeljebb 1280 széles, a háttérszínek viszont széltől szélig érnek (pl. 1600-nál).
- [ ] A screenshotok 402, 768, 1024, 1119, 1120, 1280 és 1600 szélességen ott vannak a jelentésben.

**0.4 Érintés, kattintás és a mozgás alapjai**

- [ ] Nyisd meg a `/dev/motion` oldalt; mellé a Figmában az ANIM-07 (`1722:12049`) és ANIM-05 (`1692:12074`) storyboardot.
- [ ] Desktopon egeret használva: hover, lenyomás, elengedés, és a „lecsúszás róla” (megszakítás) úgy néz ki, mint a storyboard kockai.
- [ ] Telefonon érintéssel ugyanez — a telefonos viselkedés szerint (nincs hover).
- [ ] A mező: fókuszba lépés és gépelés az ANIM-05 szerint.
- [ ] Tab-bal járva a fókusz látszik, de nem indul el az egeres hover-animáció.
- [ ] Csökkentett mozgással minden azonnal vált.
- [ ] Gyors dupla kattintásra a művelet nem fut le kétszer (bemenet-zár).

**0.5 Alapkomponensek**

- [ ] Nyisd meg a `/dev/components` galériát, mellé a Figma komponenseit: gombok, pill-ek, mezők, jelölőnégyzet (`630:3012`, `630:3015`, telefonon `810:5860`), slider-jelző (`1759:12635`, `1759:12772`), értesítés-dobozok, párbeszédablak (`974:9137`) és alsó lap (`975:9168`).
- [ ] Megvan minden darab: gomb (teli, körvonalas, szöveges), link (önálló és szövegközi — utóbbi csak színt vált), pill, mező, szövegdoboz számlálóval, jelölőnégyzet, rádiógomb, legördülő, értesítés, mezőhiba, párbeszédablak, alsó lap, slider-jelző, lenyitható sor, töltő gombállapot.
- [ ] Párbeszédablak egeres gépen: 240 ms alatt előtűnik és picit nő (0,96 → 1), a háttér elsötétedik; záráskor gyorsabban (160 ms) tűnik el.
- [ ] Alsó lap telefonon: alulról csúszik fel (320 ms); lefelé húzva követi az ujjad; ha a harmadánál tovább húzod vagy gyorsan ellegyinted, bezár, különben visszaugrik.
- [ ] Esc zár, a fókusz visszakerül a nyitó gombra; nyitva a Tab nem megy ki a felugróból.
- [ ] Mezőhiba: a keret azonnal pirosra vált, az üzenet 4 px-t csúszik és előtűnik; az alatta lévő tartalom finoman lejjebb megy, nem ugrik.
- [ ] Slider-jelző: sok elemnél is legfeljebb 5 csík látszik.

**0.6 Adatréteg, pénz, idő, beállítások**

- [ ] Itt nincs mit nézni; kapsz egy egyoldalas magyar összefoglalót a tesztelt szabályokról, a tesztek számával.
- [ ] Az összefoglalóban szerepel a módosítási határidő (a szállítás előtti 2. nap 23:59, londoni idő), és minden visszatérítési sáv a SITE-FLOWS §10.1 példáival.
- [ ] Van teszt a nyári / téli óraátállítás napjára is.
- [ ] A pénz mindig egész pennyben tárolódik; a formázás (£, tizedesek) a §10.7 szerint.
- [ ] A Settingsben a valódi üzleti adatok vannak (név, cím, telefon, e-mail) — pipáld ki, ha mind stimmel.
- [ ] Egy paranccsal újra lehet tölteni a mintaadatokat (Figma-torták, BBL-2026-0147 rendelés, Mairi Sinclair stb.).

## 1. szakasz — A keret minden oldalon

A fejléc, a menü, a lábléc, a sütisáv és a hibaoldalak. Ezek minden oldalon ott lesznek, ezért itt érdemes a legaprolékosabbnak lenni.

**1.1 Desktop fejléc, menü, árnyék**

- [ ] 1280-on a fejléc a Figma fejléc-komponensével (`1421:9315`) egyezik: logo, hét menüpont, távolságok.
- [ ] Minden oldalon a megfelelő menüpont alá húzott (az ANIMATIONS §3.3 táblázata szerint; pl. a tortaoldalon a katalógusé).
- [ ] Kattintáskor az aláhúzás átcsúszik az új pontra (ANIM-08), nem ugrik.
- [ ] Az épp aktív pontra kattintva az oldal újratöltődik.
- [ ] Egeres hover a menüpontokon: +15 % világosodás.
- [ ] Lejjebb görgetve a fejléc alatt halvány árnyék jelenik meg (200 ms), legfelül eltűnik; a fejléc mérete és színe soha nem változik.
- [ ] Tab-bal végigmehetsz a menüponton, a fókusz látszik.

**1.2 Telefonos és tabletes fejléc, menü**

- [ ] A telefonos fejléc (`1461:9222`) és a tabletes fejléc egyezik a Figmával.
- [ ] A menü nyitása, zárása és a „kiválaszt és átlép” kockáról kockára egyezik a storyboardokkal (`1497:8799`, `1575:9215`, `1578:9779`); érdemes lassított képernyőfelvételt csinálni a telefonnal, és mellé tenni.
- [ ] A két kör a megfelelő helyről nő ki, a nyilak megfordulnak, a lekerekítések stimmelnek.
- [ ] Nyitott menünél: Esc, a telefon „Vissza” gombja és a logo is bezárja. A „Vissza” **csak** a menüt zárja, nem lép vissza az előző oldalra.
- [ ] A közösségi linkek működnek; az aktív pontra koppintva az oldal újratöltődik.
- [ ] Nyitott menüvel elforgatod a telefont (vagy átméretezed az ablakot): nem esik szét.
- [ ] Animáció közben a gyors újrakoppintás nem akasztja meg.
- [ ] Tablet-szélességen (1024) is kipróbáltad, nem csak telefonon.

**1.3 Fejléc-kabala (sütiszörny)**

- [ ] Új lapon megnyitva az oldalt a kabala becsúszik, ahogy a storyboard (`1545:10103`) mutatja.
- [ ] Másik oldalra lépve **nem** játszódik le újra; új lapon / új látogatáskor igen.
- [ ] Mindhárom szélességen ott van, és a végállapota pontosan a Figma szerinti hely.
- [ ] Csökkentett mozgással egyből a helyén van.

**1.4 Lábléc és lábléc-kabala**

- [ ] A lábléc a három mesterrel egyezik (`1411:9627`, `1551:10408`, `1461:9223`): jogi linkek két oszlopban, Food & Compliance, elérhetőség, „Find my order →”, „Cookie preferences”.
- [ ] A higiéniai besorolás, a tanács, a cím és a telefon a Settingsből jön (az adminban átírva itt is átíródik — ha még nincs admin, a jelentés mondja meg, hol látszik).
- [ ] Legörgetve a kabala egyszer kikukucskál (kb. amikor a lábléc 80 %-a látszik), és utána pontosan úgy ül, ahogy rajzoltad — mindhárom szélességen.
- [ ] Fel-le görgetve nem játszódik le mégegyszer ugyanazon az oldalbetöltésen belül.

**1.5 Sütisáv, beállítások, hozzájárulás**

- [ ] Privát ablakban az első látogatáskor a sáv kb. 0,7 mp után alulról becsúszik, és nem veszi el a fókuszt.
- [ ] Accept / Reject / Settings: mind a három működik; választáskor a sáv lecsúszik és eltűnik.
- [ ] A Settings desktopon párbeszédablakként, telefonon alsó lapként nyílik; a Figma állapotaival egyezik (`1003:9096`, `1199:9345`, `1199:9382`).
- [ ] Választás előtt nincs semmilyen nem szükséges süti (kérd meg, hogy a jelentésben mutassa meg a böngésző sütilistáját).
- [ ] A lábléc „Cookie preferences” linkje újra megnyitja; a visszavonás újratöltés nélkül hat.
- [ ] Analitika még nincs bekötve (Linda még nem választott szolgáltatót) — a jelentés ezt mondja is.

**1.6 404, 500, kereső-alapok**

- [ ] Egy rossz címet beírva mindhárom szélességen a Figma 404-es oldala jön, fejléccel, lábléccel.
- [ ] A 500-as oldalt a jelentés szerinti módon megnézted.
- [ ] A böngészőfülön a cím „Oldalnév — Baked by Linda” formájú.
- [ ] Van `robots.txt` és sitemap; a tokenes / privát oldalak (§2 „no” oszlop) nincsenek indexelve.

## 2. szakasz — Tartalmi oldalak

Itt látod először a valódi oldalakat. Minden oldalnál: felülről lefelé, szekciónként a Figma-keret mellé téve, mindhárom szélességen.

**2.1 Home: hero és a fix szekciók**

- [ ] A Home a három Figma-keret mellett (`518:2687` desktop, `1464:8417` telefon, `1562:12130` tablet), szekcióról szekcióra.
- [ ] A hero az általad tervezett első dia, fixen (admin-diák még nincsenek — ez így jó).
- [ ] A „We got you.” résznél a `Placeholder-fast changing cakes-…` ellipszisek a helyükön, pontos méretben és színnel.
- [ ] A közösségi sáv linkjei működnek.
- [ ] Lassú neten (eszköznézetben „Slow 4G”) betöltéskor semmi nem ugrál.

**2.2 Vélemények = Google-értékelések**

- [ ] A kártyák a legfrissebbel kezdődnek; minden csillagszám látszik (az 1–2 csillagosak is — ezeket tilos elrejteni).
- [ ] Szöveg nélküli értékelésből nincs kártya; a hosszú szöveg le van vágva, utána „Read on Google →”.
- [ ] A kártyán csillagok + hónap (a mesterek szerint: `701:4790`, `684:4790`).
- [ ] Felül a csillagátlag-sor a Google-jelöléssel; külön „Reviews from Google” sor nincs.
- [ ] Sokat lapozol (telefonon húzva, desktopon nyilakkal): mindig van következő, nem akad meg; ha egy kártya még tölt, egy azonos méretű üres alak áll a helyén, ami finoman előtűnik.
- [ ] A csíkok száma soha nem több 5-nél, és a jelző úgy csúszik, mint az ANIM-10 storyboardon.
- [ ] Egy kártyára kattintva az középre úszik.
- [ ] Az elején desktopon 6, tableten 5, telefonon 3 kártya jön le; a jelentés mondja, hogy ezt a fixture (próbaadat) adja, nem az élő Google.

**2.3 Home tortasor és „Special idea”**

- [ ] Az első öt látható torta jön, a katalógus sorrendjében.
- [ ] A zárt kártya a Figma szerint; a „View” a tortaoldalra visz; a sarokgomb még nincs (az a 3.4-ben jön).
- [ ] A „Special idea” négy négyzete a galéria kiválasztott képeiből jön; üres galériánál a doksi szerinti szabály él.
- [ ] A galériához vezető link működik.

**2.4 About Linda**

- [ ] A három keret mellett (`518:2688`, `1600:10493`, `1562:12372`).
- [ ] Telefonon a kártyacarousel a csíkjelzővel; kattintott kártya középre kerül.

**2.5 GYIK**

- [ ] A három keret mellett (`658:3996`, `803:5741`, `1559:11372`); a kategóriák és a sorrend egyezik.
- [ ] Az első kérdés nyitva érkezik; egyszerre csak egy van nyitva.
- [ ] Nyitás / zárás az ANIM-09 storyboard (`1745:12629`) szerint, telefonon és desktopon.
- [ ] A zárt válaszok szövege is stimmel — a Figmában rejtett rétegek is valódi tartalom (a frissített GYIK-válaszok már az új, nem online árajánlatos folyamatot írják).
- [ ] A válaszokban lévő változók (pl. határidők, árak) valódi értékre cserélődnek, nincs `{…}` a szövegben.
- [ ] Billentyűzettel is nyitható.

**2.6 Jogi oldalak és Allergén-információ**

- [ ] Mind a hét jogi oldal megvan; telefonos szélességen végig olvasható.
- [ ] Az „On this page” navigáció a megfelelő részhez ugrik.
- [ ] A frissítés dátuma automatikus; az üzleti adatok a Settingsből jönnek.
- [ ] Az Appendix A javításai át vannak vezetve (a jelentés listázza). Ne feledd: a végleges szövegeket Linda még átnézi.

**2.7 Kapcsolat és „Message sent”**

- [ ] Küldj üres űrlapot: minden hibás mező mellett ott az üzenet, ami megmondja, mit kell tenni; az üzenetek finoman csúsznak be (ANIM-19).
- [ ] Rossz e-mail-cím, túl hosszú üzenet: mindkettőre érthető hiba.
- [ ] Javítsd, küldd el: a „Message sent” oldal jön.
- [ ] Ugyanabból a böngészőből gyorsan sokszor küldve egy idő után letiltja (spamvédelem), érthető üzenettel.
- [ ] Valódi e-mail még nem megy ki (az az 5. szakasz) — a jelentés mutatja, hogy az üzenet eltárolódott.

**2.8 Galéria, nagyító, „Show more”, fotó-előtűnés**

- [ ] 12 kép látszik, a „Show more” hozza a következőket: az új csempék egymás után emelkednek fel és tűnnek elő (ANIM-17); a gomb az új sor alá kerül, az oldal nem görget el.
- [ ] A legvégén a gomb eltűnik.
- [ ] Egy csempére kattintva a kép a csempéből nő ki nagyítóvá (ANIM-14); bezáráskor visszamegy a csempébe.
- [ ] Lapozás nyilakkal, billentyűvel (← →), telefonon húzva; a csíkjelző követi.
- [ ] A nagyító címe megosztható (`?photo=…`): új lapon megnyitva ugyanaz a kép jön; a telefon „Vissza” gombja csak a nagyítót zárja.
- [ ] Az „I’d like one like this” az egyedi tortás űrlapra visz, a képpel.
- [ ] A képek betöltéskor a háttérszínről finoman tűnnek elő (ANIM-23); a már betöltött képek nem villannak.
- [ ] Összevetve az ANIM-14 és ANIM-17 storyboard-soraival.

## 3. szakasz — Katalógus és tortaoldal

A bolt szíve. Itt két dolgot nézz különösen alaposan: a tortakártya nyitását (3.4) és az árat + allergéneket (3.6).

**3.1 Tortaadatok**

- [ ] Kapsz egy magyar táblázatot a betöltött tortákról: név, kategória, méretek és árak, opciók, allergének. Vesd össze a Figma katalógusával.
- [ ] A „From £…” mindig a legkisebb méret ára.
- [ ] Mind a 14 allergén kezelhető, plusz az „also contains”.
- [ ] Egy rejtett torta címét megnyitva 404 jön.

**3.2 A teljes kínálat: rács, szűrők, lapozás**

- [ ] A három keret mellett (`599:2721`, `798:5566`, `1557:11293`).
- [ ] A fejlécsávban a `Placeholder-cake from above 1–6-…` ellipszisek a helyükön.
- [ ] Fix négy szűrő-pill; ha egy kategóriában nincs torta, a pill nem látszik.
- [ ] 12 torta oldalanként; „Show the next …” hozza a többit (ANIM-17).
- [ ] „Showing x of y” mindig a valós számot mutatja, szűréskor is.
- [ ] Az üres állapotok a Figma szerint (`1108:9860`, `1108:9884`).
- [ ] Egy régi, szűrős link (a §4.2 szerint) is jó helyre visz.

**3.3 Keresés és a találatok mozgása**

- [ ] Gépelés közben (kb. 0,15 mp szünet után) frissül a lista: a kieső kártyák elhalványulnak, a maradók a helyükre csúsznak, az újak előtűnnek — a rács soha nem villan (ANIM-16).
- [ ] A névre illeszkedő torták jönnek elől; az íz és a leírás is keresődik.
- [ ] Ha van kiválasztott pill, csak azon belül keres.
- [ ] Nincs találat: „Search all designs” — az állapotok a Figma szerint (`1687:11997`, `1687:12083`).
- [ ] Nagyon gyorsan gépelve, törölve sem akad meg, nem ugrál.

**3.4 Tortakártya nyitása / zárása a kártyavideóval**

- [ ] Mindhárom szélességen a storyboard (`1779:12951`) flow-jai mellé téve; a kártyakomponensek: `1776:12902`, `1776:12914`, `1777:12902`, `1777:12926`.
- [ ] Nyitás 0,5 mp: a kép nő, a torta **a kép alján** marad (telefonon is), a cím lassan, puhán kisebbül, a leírás és a szintek halványulva picit zsugorodnak, a nyíl megfordul.
- [ ] A videó csak teljesen nyitott kártyán indul, varrat nélkül ismétlődik (nem látszik ugrás a végén), és megáll, ha kigörgetsz.
- [ ] Zárás: rövid áttűnés a videóról a fotóra, aztán a nyitás visszafelé.
- [ ] Egyszerre csak egy kártya lehet nyitva: egy másikat nyitva az előző bezár.
- [ ] A sarokgomb 44 × 44, nyomásra reagál (ANIM-07), billentyűvel is nyitható.
- [ ] Kártyavideó nélküli tortánál: a főfotó látszik, sarokgomb nincs.
- [ ] Csökkentett mozgással azonnal nyílik, és a videó nem indul el magától.
- [ ] A Home tortasorában is működik (ott más a vágás, de a torta ott is alul van).

**3.5 Tortaoldal: képek, videók**

- [ ] A három keret mellett (`609:2889`, `815:5841`, `1557:11744`).
- [ ] Desktopon és tableten: bélyegképek és nyilak; képváltáskor 240 ms-os áttűnés (ANIM-22); a kijelölő keret azonnal ugrik.
- [ ] Telefonon húzható, csíkjelzővel.
- [ ] A videó némítva indul, koppintásra szól; egyszerre csak egy videó megy.
- [ ] Egyfotós tortánál nincs nyíl, nincs jelző.
- [ ] Csökkentett mozgással a videó helyett lejátszás-gomb van.

**3.6 Tortaoldal: méret, opciók, felirat, ár, allergének, kosárba**

- [ ] A legkisebb méret van előre kiválasztva.
- [ ] Méretet és opciót váltva az ár azonnal és helyesen változik; a régi szám felfelé kimegy, az új alulról jön (ANIM-20), a sor nem mozdul el.
- [ ] Számolj utána kézzel legalább két összeállításnál (méret + opciók ára = a kijelzett összeg).
- [ ] Az allergén-blokk a torta és a kiválasztott opciók allergénjeit együtt mutatja — válassz egy diós opciót, és nézd, hogy megjelenik-e.
- [ ] Felirat: számláló, előnézet; felirat nélkül a „Leave the cake plain?” kérdés jön (desktopon ablak, telefonon alsó lap) — a Figma állapotai szerint (`974:9087`).
- [ ] Az opciók a `1715:11991` állapotai szerint.
- [ ] „Add to your order” után a tortasor szerkeszthető (vissza a tortaoldalra, kitöltött értékekkel).
- [ ] Több torta: ötnél több nem tehető be; a hatodiknál a „telt a rendelés” figyelmeztetés jön, a szövege már az Appendix A szerinti („Adding a sixth”, „Five…” — nem a Figma régi „seventh / six” változata); a keret: `1096:9106` szerint.
- [ ] Ha 24 órán át nem folytatod, a piszkozat lejár (a jelentés teszttel igazolja).

## 4. szakasz — Rendelés és fizetés

Minden fizetés Stripe **teszt módban** megy, valódi pénz nem mozdul. A Stripe tesztkártyái (bármilyen jövőbeli lejárat, bármilyen CVC):

| Kártyaszám | Mit csinál |
| --- | --- |
| 4242 4242 4242 4242 | sikeres fizetés |
| 4000 0000 0000 0002 | elutasított kártya |
| 4000 0027 6000 3184 | banki megerősítés (3D Secure) ablakot kér |

A többi esethez Claude Code a 4.5-ben ad egy magyar táblázatot a pontos tesztkártyákkal.

**4.1 Piszkozat, lépések, lépésjelző**

- [ ] A lépésjelző a Figma komponensei szerint (`627:3124`, telefonon `812:5951`); telefonon a haladás-pöttyök.
- [ ] A kész lépésekre kattintva vissza lehet menni; előre ugrani nem lehet.
- [ ] Egy későbbi lépés címét közvetlenül beírva (pl. a 4. lépését üres kosárral) a megfelelő helyre irányít át.
- [ ] Lépésváltáskor a régi tartalom elhalványul, az új 8 px-t emelkedik és előtűnik; a kész lépés kipipálódik, az összekötő vonal betöltődik (ANIM-18). Visszafelé tükrözve.
- [ ] Desktopon és tableten a jobb oldali összesítő-oszlop látszik, és mindig a helyes tortákat és összeget mutatja.
- [ ] Két lapon megnyitva ugyanaz a kosár látszik.

**4.2 2. lépés: dátum, idősáv, szállítás vagy átvétel**

- [ ] A naptár a Figma állapotai szerint (`1102:9278`): szabad, majdnem tele, tele és zárt nap, mindegyik a saját címkéjével.
- [ ] A legkorábbi választható nap a Settings előkészítési idejét tartja.
- [ ] Hónapváltáskor (‹ ›) a régi hónap kicsúszik, az új a másik oldalról bejön (ANIM-21); a fókusz a nyílon marad.
- [ ] Ha egy hónap tele van, megjelenik a „Show me {következő hónap} →”.
- [ ] Szállítás: idősávok, irányítószám-ellenőrzés — próbálj egy edinburgh-it (pl. EH3), egy lothians-it és egy távolit (pl. G1): az utolsónál érthető üzenet jön.
- [ ] Átvétel: a cím és az idő a Settingsből.
- [ ] A 3–4. lépésen fut a 20 perces foglalás-visszaszámláló; a számjegyek animáció nélkül váltanak.
- [ ] Hagyd lejárni (a teszt környezetben rövidítve): a „Hold ran out” értesítés jön, a Pay letiltva, minden kitöltött adat megmarad.

**4.3 3. lépés: adataid**

- [ ] Telefonon töltsd ki rosszul (üres név, hibás e-mail, rövid telefonszám): minden hiba a mező mellett, érthetően (ANIM-19).
- [ ] Külföldi telefonszámot (pl. +36…) elfogad.
- [ ] Allergia-megjegyzést írva megjelenik a hozzájárulás-doboz (`1797:13110`); a megjegyzést törölve eltűnik. Pipálás nélkül nem lehet továbbmenni.
- [ ] A marketing-hozzájárulás alapból nincs bepipálva.
- [ ] Javítsd ki, menj tovább: semmi nem veszett el.

**4.4 4. lépés: áttekintés és fizetés**

- [ ] A „Your details” blokk a Figma szerint (`1797:13126` / `13136` / `13146`), a „Change” linkek a jó lépésre visznek.
- [ ] Torták, átadás, összegek, a fizetés előtti feltételek mind látszanak; az allergének is.
- [ ] Fizess a 4242-es kártyával: a gombban „Taking payment” állapot (legalább 0,6 mp), a mezők lezárnak, utána az Order confirmed oldal jön.
- [ ] A Stripe tesztfelületén (a jelentés linkel) pontosan **egy** fizetés van, a helyes összeggel.
- [ ] Telefonon az Apple Pay / Google Pay gomb is látszik, ha a telefon támogatja.

**4.5 Minden fizetési kimenet**

- [ ] Megkaptad a magyar táblázatot: minden kimenet (elutasítva, 3D Secure, megszakított 3D Secure, feldolgozás alatt, bezárt lap, dupla kattintás, lejárt foglalás, Linda közben árat változtatott, másik lapon fizetés), a hozzá használt tesztkártyával.
- [ ] Próbálj ki legalább kettőt: az elutasított kártyát (az üzenet a fizetési blokk felett, a Figma `983:9181` / telefonon `985:9166` szerint, az adataid megmaradnak) és a 3D Secure-t (fogadd el, majd egy másik próbánál szakítsd meg).
- [ ] Elutasítás után soha nem történik dupla terhelés; a Pay gomb gyors dupla kattintásra is csak egyszer fizet.
- [ ] A jelentés igazolja: ha a Stripe visszajelzése (webhook) elveszik, a pótló ellenőrzés 10 percen belül megerősíti a rendelést; kétszer megérkező visszajelzésből nem lesz két rendelés.

**4.6 Order confirmed és a kabala**

- [ ] Teljes rendelés telefonon és desktopon; a három keret mellett (`643:3478`, `836:6509`, `1558:10938`).
- [ ] 0,3 mp után a sütiszörny a rendelésszám-kártya mögül felkukucskál és megdől (18° → 8°), aztán ül; a kártya teteje levágja, nem látszik át rajta.
- [ ] Az oldalt újratöltve nem játszódik le újra.
- [ ] A rendelésszám BBL-ÉÉÉÉ-NNNN formájú; az összeg, a torta és az allergének egyeznek azzal, amit fizettél.
- [ ] Ha közben Linda átírja a torta árát, a már leadott rendelés nem változik (pillanatfelvétel) — a jelentés teszttel igazolja.

## 5. szakasz — E-mailek

Fejlesztés közben egyetlen e-mail sem megy ki valódi címre: mind egy helyi „mail-elkapóba” érkezik, amit a böngészőben nézel meg (a jelentés megadja a címét). Minden e-mailt nézz meg a `/dev/emails` előnézetben és a mail-elkapóban is, telefon- és desktop-szélességen.

**Minden e-mailnél**

- [ ] A Figma e-mail-keretével egyezik (a sablon-szekció: `1128:9106`).
- [ ] Felül a logo, alul a lábléc az üzleti adatokkal (a Settingsből).
- [ ] A tárgy és az előnézeti sor (a postaládában a tárgy mellett látszó szöveg) a SITE-FLOWS §8.1 szerint.
- [ ] Minden `{…}` helyén valódi adat áll (név, rendelésszám, dátum, összeg).
- [ ] Minden gomb és link működik, és a megfelelő oldalra visz.
- [ ] Van sima szöveges változat is (a mail-elkapóban átváltható).
- [ ] Ugyanaz az e-mail ugyanarra az eseményre soha nem megy ki kétszer.

**5.1 Az e-mail rendszer**

- [ ] Megvan a `/dev/emails` oldal mintaadatokkal, és a mail-elkapó.
- [ ] A jelentés igazolja: ha a küldés nem sikerül, újrapróbálja; minden küldés naplózódik.

**5.2 Rendelési e-mailek: 1, 2, 3, 3b, 4**

- [ ] Adj le egy rendelést (4242-es kártya): az **1. „Order confirmed”** megérkezik a mail-elkapóba; tortankénti blokkokkal, allergénekkel, a feltételek PDF-jeivel, és alul a Google-értékelés blokkal (ha van Place ID). A teljes változat: `1800:13257`.
- [ ] A kézi (admin) rendelés 1-es e-mailje a saját változata szerint („I have put {date} in the diary.”, fizetve / még fizetendő).
- [ ] A dev gombbal indítsd el az ütemezett küldéseket:
  - **2.** „Két nappal előtte” — 08:00, a módosítás utolsó napján; átvételes változat is;
  - **3.** „A napon — szállítás” — 07:00, „Keep your phone to hand — I text you when I set off.”;
  - **3b.** „A napon — átvétel” — 07:00, az átvétel idejével;
  - **4.** Linda napi listája — 06:00, ugyanazok a sorok, mint az admin Today oldalon.
- [ ] Egy későn (a 2. nap 08:00 után) leadott rendelésre a 2-es nem megy ki.

**5.3 E-mailek: 5, 6, 8, 12, 13, 15, 16, 17, 18 és leiratkozás**

- [ ] **5.** „Egy évvel később” (marketing): csak marketing-hozzájárulással, egy kattintásos leiratkozással; alul a szerény „Leave a Google review →” link (`1167:9106`, `1167:9144`).
- [ ] **6.** „Enquiry received” (egyedi torta): a képek csak darabszámként szerepelnek, a fájlok nem.
- [ ] **8.** „Cancelled”: teljes / fél visszatérítés változat.
- [ ] **12.** „Your change is saved”: a módosítás szavakban, pénz-sor (terhelés vagy visszatérítés).
- [ ] **13.** „I missed you”: 18:00 utáni és „holnap zárva” változat is.
- [ ] **15.** „Pay for your cake”: előleg / maradék / különbözet / újraszállítás.
- [ ] **16.** „Your order link” (`1800:13044`): több rendelésnél több blokk.
- [ ] **17.** „Complaint received” (`1800:13148`): hivatkozási szám, „I will reply within one working day”, se gomb, se link.
- [ ] **18.** „Thank you — how was it?” (`1800:12959`): az átadás utáni nap 10:00-kor; **minden** vásárló megkapja, nem csak az elégedettek (tilos csak a jó véleményre kérni), és semmilyen jutalmat nem ígér.
- [ ] Place ID nélkül (még nincs Lindától) a Google-linkek nem jelennek meg — a jelentés mutassa mindkét esetet.
- [ ] A leiratkozás egy kattintás; puszta megnyitásra (pl. egy levelező link-előnézetére) még nem iratkozik le.

**5.4 Lindának szóló és rendszer-e-mailek**

- [ ] A `/dev/emails` listája a riasztások táblájával (`1800:13441`) egyezik: pl. „Check this payment”, belépési kód, meghívó.
- [ ] Egy eseményre egy riasztás megy, nem több.
- [ ] A korábbi szakaszokban csak naplózott riasztások (pl. a 4.5-ös fizetés-ellenőrzés) most már e-mailként érkeznek.

## 6. szakasz — Rendelés után

Az e-mailekben kapott, egyedi linkes („tokenes”) oldalak. A mintaadatokban minden állapothoz van rendelés; a jelentés listázza a linkjeiket. Itt különösen figyelj a pénzre: minden összeget számolj utána.

**6.1 Tokenes linkek és a rendelés állapotoldala**

- [ ] A link megnyitásakor először a „második ellenőrzés” kérdése jön (irányítószám vagy a telefonszám utolsó négy számjegye); rossz válaszokkal csak korlátozottan lehet próbálkozni.
- [ ] Minden állapotot nyiss meg a Figma (`1036:9106`) mellett:
  - **A · Booked** — Change something, Message Linda, „Need to cancel instead?”, és a módosítási határidő dátummal;
  - **B · Close to the date** — csak Message Linda;
  - **B2 · It is today** — szállításnál idősáv, átvételnél az átvétel ideje;
  - **C · After the date** — Message Linda + **Leave a Google review** gomb (`1797:13105`, telefonon `1797:13107`; új lapon nyílik; Place ID nélkül nem látszik);
  - **E · Cancelled** — a lemondás dátuma, a visszatérített összeg;
  - „Nobody was in” és „After a missed delivery”.
- [ ] Kézi (egyedi) rendelésnél nincs „Change something” és nincs lemondás-link.
- [ ] Egy lejárt vagy elrontott link a „Let me send you a new one” oldalra visz, és nem árul el semmit a rendelésről.
- [ ] A jelentés igazolja: ezek az oldalak nincsenek indexelve, és nem adják tovább a címüket más oldalnak.

**6.2 Rendelés módosítása**

- [ ] A szerkesztők a Figma szerint (desktop `1799:12959`, telefon `1799:13052`): tortánként csoportosítva, alul a „Date and window” sor; egyszerre egy szerkesztő nyitva; van Undo.
- [ ] Méret felfelé: a különbözet helyesen számolva, a gomb „Pay £… and save”; tesztkártyával fizetve mentődik, és megjön a 12-es e-mail.
- [ ] Méret lefelé: a visszatérítés összege helyes, a Stripe tesztfelületén megjelenik.
- [ ] Dátumváltás: a naptár a 2. lépés szabályai szerint, az új napra foglalással.
- [ ] Az ár a választáskor animálva vált (ANIM-20), a hibák és értesítések az ANIM-19 szerint.
- [ ] Hagyd nyitva az oldalt a határidőn túl (teszt környezetben): mentéskor az A2 „Change window closed” jön (`1036:9260`), semmi nem mentődik.
- [ ] Két lapon nyitva: az egyikben mentve a másik régi állapota nem írja felül.
- [ ] A visszatérítési sávot mindig a legkorábbi dátumhoz számolja (dátumváltás után is).

**6.3 Lemondás**

- [ ] Mondj le két mintarendelést különböző dátummal: az egyik teljes, a másik fél visszatérítést kapjon (a §10.1 sávjai szerint), és egy olyat is, ahol már nem lehet lemondani.
- [ ] A lemondás előtt pontosan látod, mennyi jön vissza.
- [ ] A 8-as e-mail megjön a helyes összeggel; a nap visszakerül a naptárba.

**6.4 Üzenet Lindának és „Find my order”**

- [ ] Üzenet küldése a rendelés oldaláról: megérkezik Lindához (riasztás), minden állapotban működik.
- [ ] Find my order: keress e-maillel és rendelésszámmal — a 16-os e-mail megérkezik a linkkel (több rendelésnél mind benne).
- [ ] Nem létező címre ugyanazt az üzenetet adja (nem árulja el, van-e ilyen vásárló).
- [ ] Sokszor egymás után próbálva letiltja egy időre.

**6.5 Szállítási nap: „Nobody was in”**

- [ ] Az oldal a Figma szerint (`1102:9106`, `1199:9206` G és H): csak a címsor, a „WHAT NOW” és a gombok — cím, allergia-megjegyzés, e-mail nem látszik.
- [ ] „I will collect it today” és „Try again tomorrow — £15” (díj nélkül: „… — free”, fizetés nélkül): mindkettőt próbáld ki.
- [ ] 18:00 után az átvétel holnapra szól; ha holnap zárva van, a doksi szerinti szöveg jön.
- [ ] A nap 23:59 után a link „These choices have closed…” üzenetet ad.
- [ ] Második sikertelen kézbesítésnél új link és új 13-as e-mail megy.

**6.6 „Pay for your cake” és leiratkozás**

- [ ] Fizess ki egy fizetési linket tesztkártyával (`1598:10573`, `1598:10598` szerint): utána ugyanazon a címen „Paid — thank you.”, a „Paid so far” frissül.
- [ ] Egy már kifizetett vagy visszavont link: „This payment link is no longer needed…”.
- [ ] Leiratkozás (`1199:9206` J): az oldal megnyitása még nem iratkoztat le, csak a gomb.
- [ ] Leiratkozás után az 5-ös (marketing) e-mail nem megy ki erre a címre, a rendelési e-mailek viszont igen.

## 7. szakasz — Egyedi torta és panasz

Két űrlap, képfeltöltéssel. Ezeket főleg telefonon próbáld, mert a vásárlók is onnan küldik.

**7.1 Egyedi torta űrlap**

- [ ] A három keret mellett, mindhárom szélességen.
- [ ] Pill-ek: a kiválasztottra újra koppintva törlődik; az étrend-pill-eknél a „None” törli a többit, bármelyik másik törli a „None”-t.
- [ ] Ha a „None”-on kívül bármelyik étrend-pill-t választod, megjelenik a kötelező hozzájárulás-doboz (`1797:13114` desktop, `1797:13122` tablet, `1797:13118` telefon).
- [ ] A költségkeret első sávja „£{minimum} – 250” a Settingsből; a bevezetőben a minimum és az előkészítési idő is onnan.
- [ ] Dátum: holnaptól 24 hónapig; túl közeli dátumnál (alapból 21 napon belül) és esküvőnél (6 hónapon belül) nyugodt lila figyelmeztetés jön, de **nem tilt**. A „My date is still flexible” egyedül is használható.
- [ ] „I would rather talk it through on the phone”: a telefonszám kötelezővé válik.
- [ ] Képfeltöltés telefonról: legfeljebb 3 kép, 8 MB-ig; a csempe előbb „+”, feltöltés közben folyamat-gyűrű, utána bélyegkép ×-szel; a harmadik után a „+” eltűnik. Próbálj egy túl nagy fájlt is: érthető hiba jön.
- [ ] Hiányzó válaszokkal küldve: összegzés a gomb mellett, „Take me to the first one”, és ha van telefonszám, „or send it anyway and I will call you →” (`974:9087` K).
- [ ] A galériából érkezve („I’d like one like this”) felül az „INSPIRED BY” kártya a képpel, levehető (`1633:12328`, telefonon `1642:11966`).
- [ ] Küldés képpel és kép nélkül is; a gomb az első nyomásra letilt, dupla küldés nincs.
- [ ] E-mail nélkül, csak telefonnal is elküldhető.

**7.2 „Enquiry sent” és „Your enquiry”**

- [ ] Az elküldött oldalon a hivatkozási szám BBL-ÉÉÉÉ-E-NNNN formájú, a telefonszám hívható link.
- [ ] A 6-os e-mail „See what I have written down” gombja a csak olvasható oldalra visz (`1609:10885` / `1609:11066` / `1609:11227`): minden válasz pontosan úgy, ahogy elküldted, a hiányzóknál „Not answered”.
- [ ] Az „Email Linda about it” a levelezőt nyitja meg, a tárgyban „Enquiry {hivatkozási szám}”.
- [ ] E-mail nélküli kérésnél nincs 6-os e-mail, de az elküldött oldal mutatja a számot.

**7.3 Panasz**

- [ ] Az űrlap a Complaints procedure oldalon: rendelésszám (nem kötelező), név, e-mail, mi a baj (max 400 karakter), 0–3 kép, „What would help” pill-ek.
- [ ] Küldd el: az elküldött oldal a Figma szerint (`1253:9529`, telefonon `1253:9542`), a szám BBL-ÉÉÉÉ-C-NNNN.
- [ ] Ugyanarra a rendelésre két panaszt küldve két külön szám jön.
- [ ] Lindához megérkezik az e-mail (válasz-cím a vásárlóé), a vásárlóhoz a 17-es.

## 8. szakasz — Admin alapok

Az admin 1024 px-től desktop-elrendezésű, alatta telefonos (tab-sávval). A nyilvános oldal mozgásszabályai itt nem kötelezők, de a 44 × 44-es érintési felületek és a billentyűzet igen. Mindent nézz meg **Ownerként és Helperként** is: a Helper csak a Today és az Orders menüt látja, a pénzes részek nála nem jelennek meg (nem szürkítve — egyszerűen nincsenek ott).

**8.1 Belépés, munkamenet, szerepek**

- [ ] Belépés e-mailes kóddal, telefonon és desktopon; a kód a mail-elkapóba érkezik. A képernyők: `Admin / 1`, a kód-lépés `1801:13621`, telefonos e-mail-lépés `1801:13646`.
- [ ] A kód 10 percig él, 5 rossz próbálkozás után új kód kell; belépve 30 napig bent maradsz.
- [ ] Helperként egy csak tulajdonosi oldal címét beírva a Today-re visz „That page is for the owner.” üzenettel.
- [ ] Az első Owner létrehozása a jelentés szerinti módon működik.

**8.2 Admin keret**

- [ ] Oldalsáv (desktop) és tab-sáv (telefon) a Figma komponensei szerint; a „More” menü telefonon.
- [ ] Telefonon a „Kezdőképernyőre tennéd?” ajánló megjelenik, a „Not now” (`1801:13703`) eltünteti.
- [ ] Ha két ember egyszerre szerkeszti ugyanazt (két lapon próbáld), a második mentés nem írja felül csöndben az elsőt, hanem szól.

**8.3 Today**

- [ ] A mintarendelésekkel a Figma szerint (`Admin / 2`, telefonon mobile 1): sorok, alcím („Three going out today · one collection · one payment still open”), desktopon a statisztika-csempék.
- [ ] „Mark handed over”, „Send a text” (`Admin / 20`), „Nobody was in” (`Admin / 21`) — mindegyiket próbáld ki; a Nobody was in után kimegy a 13-as e-mail.
- [ ] „Not collected yet” sorok is látszanak.
- [ ] Ugyanazok a sorok, mint a 06:00-s 4-es e-mailben.

**8.4 Orders és a rendelés részletei**

- [ ] A lista a Figma szerint (`Admin / 3`, telefonon mobile 2); szűrők: All, This week, Upcoming, Completed, Cancelled, To pay; keresés névre és számra.
- [ ] Nyisd meg a mintarendeléseket (`Admin / 5`, mobile 3): minden adat, allergén, allergia-megjegyzés, fizetések, előzmények stimmel.
- [ ] „Delivered after all” (Nobody was in után): lezárja a vásárló választásait, az esetleg kifizetett £15 visszamegy.

**8.5 Rendelés hozzáadása**

- [ ] Adj hozzá egy egyedi (bespoke) rendelést (`Admin / 22`, mobile 23).
- [ ] Telt napnál figyelmeztet, de engedi.
- [ ] Az e-mail-kapcsoló működik: kikapcsolva csak az 1-es, a 8-as és a 15-ös megy ki (ezek mindig).
- [ ] Az új rendelés a Today-ben, a listában és a naptárban is megjelenik.

**8.6 Rendelés módosítása (Linda)**

- [ ] Módosíts egy kifizetett rendelést (`Admin / 18`, mobile 20): méret, dátum, felirat.
- [ ] Torta hozzáadása és eltávolítása (`1801:13154`): legfeljebb 5; az utolsó nem távolítható el (azt lemondással lehet).
- [ ] Ha az összeg nő, fizetési link (15-ös e-mail) megy; ha csökken vagy nem változik, a 12-es azonnal.

**8.7 Fizetési link, kézi befizetés, kézi visszatérítés**

- [ ] A három ablak a Figma szerint (`Admin / 24`, `1801:12967`, `1801:13035`); telefonon alsó lapként.
- [ ] Küldj fizetési linket, és fizesd ki tesztkártyával: a rendelésen frissül a „Paid so far”.
- [ ] Rögzíts egy készpénzes befizetést és egy visszatérítést: az összegek mindenhol helyesen változnak.

**8.8 Money**

- [ ] A képernyő (`Admin / 4`, mobile 14) csak Ownernek látszik.
- [ ] A csempék (még fizetendő, ezen a héten fizetve, 7 napon belüli fizetetlen, idén bevéve) egyeznek azzal, amit a mintaadatokból kézzel kiszámolsz — kérd el a mintarendelések listáját összegekkel.
- [ ] A figyelmeztetések (pl. „Stripe payment has no order”) megjelennek és elrejthetők.

## 9. szakasz — Admin tartalom és beállítások

Itt mindig a teljes kört nézd: változtatsz az adminban → megnézed a nyilvános oldalon, hogy tényleg átment-e.

**9.1 Torták, torta hozzáadása / szerkesztése**

- [ ] A lista és az űrlap a Figma szerint (`Admin / 8`, `Admin / 9`, `9b`, `9c`, telefonon mobile 4, 6, 6b).
- [ ] Adj hozzá egy tortát az elejétől a végéig: méretek árakkal, opciók (+£ és allergén), kategória, mind a 14 allergén jelölőnégyzete (`1801:13494`), láthatóság.
- [ ] A nyilvános katalógusban és a tortaoldalon pontosan úgy jelenik meg; a „From £” a legkisebb ár.
- [ ] Húzd át a sorrendet: a katalógusban és a Home tortasorában is változik.
- [ ] Rejtsd el: a katalógusból eltűnik, a címe 404. A már leadott rendelések nem változnak.

**9.2 Képek, videók, kártyavideó**

- [ ] Tölts fel fotót a telefonodról (iPhone-on HEIC is): megjelenik, állítható a fókuszpont, írható alt szöveg, átrendezhető, törölhető.
- [ ] A fókuszpont állítása után a kivágások a nyilvános oldalon a megjelölt részt mutatják.
- [ ] Card video mező (`1801:13221`): tölts fel egy szabályos tesztvideót (2160 × 2160, 5 mp) — elfogadja, és mutatja a zárt / nyitott kivágás előnézetét; a torta mindkettőben alul van.
- [ ] Tölts fel egy rossz méretű és egy rossz hosszúságú videót: pontos, érthető hibaüzenettel elutasítja (a torta-videó szabályrendszer szövegei szerint).
- [ ] A kártya utána a nyilvános oldalon a sarokgombbal nyílik, és a videó szakadás nélkül ismétlődik.

**9.3 Elérhetőség (naptár)**

- [ ] Zárj be egy napot és egy időszakot: a rendelés 2. lépésében zártként látszanak.
- [ ] Állítsd át a napi / heti korlátot és az előkészítési időt: a naptár azonnal követi.

**9.4 Tartalom: GYIK, jogi oldalak, oldalfotók**

- [ ] Írj át egy GYIK-választ és egy jogi oldalt: a változók (pl. telefonszám) chip-ként látszanak, nem lehet átírni őket; a nyilvános oldalon a valódi érték jelenik meg.
- [ ] A jogi oldalon a frissítés dátuma változik; a régi változat eltárolódik (a régi rendelések PDF-jei a régit mutatják).
- [ ] Az admin által hozzáadott linkek és gombok is a nyilvános nyomás-animációval működnek.

**9.5 Galéria kezelése**

- [ ] Adj hozzá, rejts el és rendezz át fotókat: a nyilvános galéria követi.
- [ ] A Home „Special idea” négy képe kiválasztható, és a Home-on megjelenik.

**9.6 Google-értékelések**

- [ ] A képernyő a Figma szerint (desktop `1797:12951`, telefon `1797:13035`), próbaadatokkal; csak olvasható (értékelést elrejteni, törölni, átírni nem lehet — ez törvényi követelmény).
- [ ] A menüben „Google reviews” néven szerepel.
- [ ] A „Check now” gomb frissít; a Google-ban törölt értékelés itt is eltűnik.
- [ ] Az élő „Connect Google” kapcsolat Linda jóváhagyására vár — a jelentés ezt mondja, és mutatja a tartalék-megoldást (Places, 5 értékelés).

**9.7 E-mailek, beállítások, csapat**

- [ ] E-mail-kapcsolók (`Admin / 14`): minden kapcsolható e-mailhez van „Send a test”, és a teszt megérkezik.
- [ ] Settings (`Admin / 15`): változtasd meg a szállítási díjat → a rendelés 2. lépésében és az összesítőben az új díj látszik. Írd át a telefonszámot → a láblécben, a jogi oldalakon és az e-mailekben is átíródik.
- [ ] Team (`Admin / 17`, szerkesztés `1801:13103`): hívj meg valakit Helpernek, a meghívó megérkezik; a link puszta megnyitása még nem aktivál, csak a „Join the team” gomb. Szerepkör-váltás, eszközök kiléptetése működik.

**9.8 Egyedi kérések és panaszok**

- [ ] A listák és részletek a Figma szerint (`Admin / 6`, `Admin / 7`, `1801:13272`, `1801:13318`, `1801:13365`).
- [ ] Egy egyedi kérésből „Turn into an order”: a rendelés az adatokkal előtöltve jön létre.
- [ ] A kérés adatai exportálhatók és törölhetők.
- [ ] A panaszok listája és részletei: a feltöltött képek, a hivatkozási szám, a kapcsolódó rendelés.

**9.9 Nyomtatás, CSV, export, törlés**

- [ ] A napi lista nyomtatva (vagy PDF-be nyomtatva) olvasható, minden allergia-megjegyzéssel.
- [ ] CSV letöltés megnyitható Excelben / Numbersben, ékezetek és £ jel rendben.
- [ ] Egy mintavásárló adatainak exportja: minden adata benne van.
- [ ] A törlése után: a személyes adatai eltűnnek, a könyveléshez szükséges pénzügyi sorok megmaradnak (a jelentés pontosan listázza, mi marad); a régi linkjei nem működnek.

## 10. szakasz — Csiszolás

Új funkció itt már nem készül, csak javítás. Ez az utolsó nagy átnézés indulás előtt, ezért szánj rá egy egész délutánt.

**10.1 Ütemezett feladatok**

- [ ] Van egy `/dev/jobs` oldal, ahol minden ütemezett feladat (06:00 lista, 07:00 és 08:00 e-mailek, értékelés-szinkron, fizetés-egyeztetés, adattörlések) kézzel elindítható.
- [ ] A jelentés igazolja: ha a szerver éjjel leállt, induláskor pótolja a kimaradt feladatokat, és semmi nem megy ki kétszer.

**10.2 Adatvédelem, korlátok, biztonság**

- [ ] A jelentésben van egy táblázat: melyik adatot meddig tárolja (SITE-FLOWS §10.10), és melyik feladat törli.
- [ ] Az űrlapok gyors ismétlésére (kapcsolat, keresés, panasz, belépés) a korlát él, érthető üzenettel.
- [ ] A naplókban nincs személyes adat (név, e-mail, telefon, allergia) — kérj egy mintát.
- [ ] A biztonsági fejlécek ellenőrzése zöld (pl. egy online fejléc-ellenőrző a staging címen a 11.1 után).

**10.3 Keresőoptimalizálás**

- [ ] Minden nyilvános oldalnak saját címe és leírása van (a jelentés listázza).
- [ ] A sitemap csak a látható tortákat és a nyilvános oldalakat tartalmazza.
- [ ] Egy linket bemásolva Messengerbe / WhatsAppba szép előnézet jön (kép, cím) — ezt a staging után tudod igazán kipróbálni.

**10.4 Akadálymentesség és mozgás-átvétel**

- [ ] Claude Code ad egy magyar, telefonon pipálható listát (ANIMATIONS §9 + minden ANIM elfogadási sora) — menj végig rajta.
- [ ] Egy teljes rendelés csak billentyűzettel (egér nélkül) végigvihető, a fizetésig.
- [ ] iPhone-on VoiceOverrel (Beállítások → Kisegítő lehetőségek → VoiceOver) nézz meg egy tortaoldalt: felolvassa a tortát, az árat, az allergéneket, a gombokat érthető néven.
- [ ] Csökkentett mozgással az összes oldalt végiggörgetve sehol nem mozog semmi.
- [ ] Telefonon a szövegméretet nagyra állítva (Beállítások → Kijelző → Szövegméret) semmi nem csúszik egymásra.
- [ ] Az axe minden oldalon 0 hibát mutat.

**10.5 Sebesség és eszközök**

- [ ] Lighthouse (mobil) legalább 90 pont a Home, a katalógus, a tortaoldal és a rendelés oldalain — a jelentés mutatja a számokat.
- [ ] Kipróbált böngészők: Safari iPhone-on, Chrome Androidon, desktopon Chrome, Safari, Firefox, Edge. Ha van Android a közeledben, nézd meg rajta te is.
- [ ] Lassú mobilneten (vagy az eszköznézet „Slow 4G”-jével) a Home és egy tortaoldal is gyorsan használható, a képek nem ugrálnak.

## 11. szakasz — Indulás

Ez a szakasz csak veled együtt futhat, és Linda fiókjai kellenek hozzá (lásd „Linda teendői a weboldal indulásáig”). Az élő oldal csak akkor indul, ha te leírod: **„indulhat”**.

**11.1 Próbakörnyezet (staging)**

- [ ] A staging egy valódi webcímen fut, brit szerverrégióban, még Stripe teszt módban.
- [ ] Van automatikus mentés, felügyelet és hibariasztás — a jelentés megmondja, ki kapja a riasztásokat.
- [ ] Ismételd meg rajta a 4. szakasz egy teljes rendelését telefonon, és nézd meg, megérkezik-e az e-mail egy saját címedre.
- [ ] Mutasd meg Lindának is: adminba belépés, egy torta felvitele, a Today.

**11.2 Éles beállítások**

- [ ] Csak veled együtt, és egyetlen jelszó vagy kulcs sem kerülhet a jelentésbe vagy a chatbe — ha látsz egyet, szólj, és cseréltesd le.
- [ ] Stripe éles kulcsok, Postmark domain-beállítások (az e-mailek nem mennek spambe: küldj magadnak Gmailre és Outlookra is), Google Place ID és API, a domain.
- [ ] A Settings minden üzleti adata végleges (higiéniai besorolás, tanács, cím, telefon, szállítási díj, korlátok).
- [ ] A Google-értékelés gombok és linkek (status oldal, 1-es, 5-ös, 18-as e-mail) most már látszanak, és Linda Google-oldalára visznek.

**11.3 Tartalom és indulás**

- [ ] Linda valódi tortái, fotói, videói és szövegei betöltve; a mintaadatok (Mairi Sinclair, BBL-2026-0147 stb.) **törölve**.
- [ ] A jogi szövegek Linda által jóváhagyott változata van fent.
- [ ] A helyőrző ellipszisek helyén vagy a végleges design-elemek vannak, vagy tudatosan maradnak (dönts róla).
- [ ] Az ANIMATIONS §9 és minden elfogadási sor még egyszer, az éles oldalon.
- [ ] Egy valódi kis tesztrendelés valódi kártyával → megérkezik az 1-es e-mail → Linda látja az adminban → visszatérítve, és a pénz tényleg visszajött.
- [ ] Ha minden rendben: írd le Claude Code-nak, hogy **„indulhat”**.

## Szakasz végi kapu

Minden szakasz utolsó szelete után Claude Code összefoglalót ad, és csak a te „mehet”-ed után kezdi a következő szakaszt. Ilyenkor nem szeletet nézel, hanem az egészet egyben.

**Az összefoglaló tartalma**

- [ ] Magyar, és megvan benne: mi működik; az összes Proposal a szakaszból; az eltérések; az ismert hiányok; egy rövid „így próbáld ki” túra.
- [ ] A szakasz minden szelete ki van pipálva a `PROGRESS.md`-ben; a „Later” listán lévő tételek mindegyikéhez oda van írva, melyik későbbi szelet viszi.
- [ ] A teljes tesztcsomag zöld, az axe minden eddig elkészült oldalon 0 hibát mutat.
- [ ] Van Lighthouse-eredmény a fő oldalakra (teljesítmény, akadálymentesség, jó gyakorlatok, kereső) — ha valamelyik 90 alatt van, tudod, miért.
- [ ] A szakasz animációinak elfogadási sorai (ANIMATIONS §9) egyenként ki vannak pipálva.

**Amit te csinálsz**

- [ ] Végigmentek a „így próbáld ki” túrán először telefonon, aztán desktopon, egyben, megszakítás nélkül — úgy, mint egy vásárló (vagy az admin-szakaszoknál: mint Linda).
- [ ] Visszanézted a korábbi szakaszok oldalait: nem romlott el semmi, ami már jó volt (fejléc, menü, lábléc, kabalák, sütisáv).
- [ ] Az összes Proposal-ról döntöttél (marad / ne legyen).
- [ ] Minden eltérést elfogadtál vagy javításra küldtél.
- [ ] Ha valami a doksiban rossz volt, és Claude Code jelezte: eldöntötted, és ha kell, szólj nekem, hogy frissítsem a doksit (Claude Code maga nem írhatja át).
- [ ] Ha minden rendben, írd: **„mehet a következő szakasz”**. Claude Code ekkor címkézi a kész állapotot (pl. `phase-03-done`), így bármikor vissza lehet térni hozzá.

**Az új szakasz elején**

- [ ] Megkaptad az egy képernyőnyi szakasztervet: a szeletek sorrendje egyezik a BUILD-PLAN-nel, és mindegyiknél le van írva, mit fogsz látni.
- [ ] A döntési kérdései feleletválasztósak, az ajánlott válasz az első — válaszolj, és csak utána induljon el.
