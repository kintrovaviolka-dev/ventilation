# Audit logiky, křivek a ovládání — 1. 11. 2026

## Rozsah a výsledek

Audit vychází z `docs/PHYSIOLOGY_ENGINE_HANDOFF.md` v checkoutu `kintrovaviolka-dev-fluffy-enigma`, včetně necommitnutých fází 2–5 a lékové zásuvky. Původně otevřený `ventilation-main` tyto změny neobsahuje. Jde o technický audit implementace a konzistence výukového modelu, nikoli o klinickou validaci.

Výsledek: opraveny jednoznačné chyby nulových hodnot, nesouladu PSV, limitování křivek, zobrazování historie a ovládání. Níže zůstávají závažné nálezy vyžadující další práci na modelu; úspěšné testy neznamenají fyziologickou věrnost.

## Implementované opravy

| Priorita | Původní problém | Výsledek |
| --- | --- | --- |
| P1 | `settings.peep || 5` přepisovalo PEEP 0 na 5; nulová tlaková podpora se nahrazovala nenulovou. | Nula je zachována ve výpočtu i křivce. PSV bez podpory a bez drive nyní vrací nulový objem. |
| P1 | PSV readout používal jiný inspirační čas než objemová křivka. | Oba používají čas daný RR/I:E. UI výslovně popisuje PSV jako zjednodušený časovaný model. |
| P1 | FlowPeak v PC/PS byl průměrný průtok, nikoli špička z křivky. | Odebírá se počáteční inspirační průtok ze stejného waveform modelu. |
| P1 | Výpočet křivky potichu ořezával tlak na 80, průtok na ±160 a objem na 1200. Šlo získat Ppeak 80 a Pplat 85. | Skryté ořezy byly odstraněny; extrémy zůstávají viditelné a nadále vstupují do alarmů. Grafy mají adaptivní rozsah. |
| P2 | Kapnografie a ECG/pleth vykreslovaly budoucnost (`elapsed + x * window`), při změně parametru přepisovaly celý obraz. | Všechny časové kanály sbírají vzorky do omezené historie se shodným desetisekundovým průběhem. Historie se při změně hodnoty nepřepočítává. |
| P2 | CO₂ mělo plateau během nádechu a nereagovalo na I:E; na konci upstroke byl skok. | Kapnogram sdílí fázi nádechu s Paw/flow, I:E a spojitý přechod na plateau. Tvar zůstává ilustrativní. |
| P2 | Paw/flow/volume graf po startu a resize doplňoval i neexistující historická data. | Nový buffer se plní až od pozorovaného času; žádné záporné časové vzorky. |
| P2 | Grafy končily na 60 cmH₂O / 800 mL / ±120 L/min, takže vyšší hodnoty splývaly s okrajem. | Rozsah je adaptivní a popsaný. P-V reference používá skutečně modelovaný VT místo neúčinného setpointu v PC/PS. Popis X osy už neleží přes číselné značky. |
| P2 | Výška obsahu monitoru 100 % plus nadpis mohla ořezávat spodní část. V malé výšce grafu zasahovala křivka do popisků. | Monitor používá flex výšku; graf má vyhrazený prostor pro popisky a minimální výšku 300 px. |
| P2 | Kolečko bylo jediný editor; i parametry bez účinku v daném režimu šly upravovat. | Výchozí číselný editor, volitelné kolečko, preference uložená lokálně. Neúčinné parametry se v editoru skrývají a v kolečku jsou zakázány/přeskočeny. |
| P2 | Počáteční VT mohl být 497 mL při kroku 10 mL. | Výchozí VT se při výběru i spuštění případu zaokrouhluje na krok 10 mL v existujícím rozsahu. |

## Ovládání

Pod monitory je přepínač **Číselné zadávání / Otočný ovladač**. Číselný editor nabízí přímý zápis, −/+, jednotky, rozsah a krok, samostatné Použít/Zrušit, potvrzení Enterem a zrušení Escapem. Rozepsaná změna neovlivní simulaci, nemá sedmisekundový timeout a průběžné přepočty ji nemažou. Přepnutí způsobu ovládání zahodí nepotvrzené změny. Režim a I:E používají výběrová pole se stejným potvrzením. Volba se ukládá do `ventilation-input-style-v1`; nedostupné úložiště aplikaci nezablokuje.

## Otevřené nálezy

### P1 — Zbytkový objem se na začátku dalšího dechu vynuluje

`src/lib/waveformMath.ts:20`: cyklus je odvozen z modulo absolutního času a začíná vždy od nuly. Reprodukce: RR 40, VT 800, I:E 1:4, C 62, R 30, PEEP 5. Těsně před časem 1,5 s je objem přibližně 419,7 mL; v 1,5 s skočí na 0. Nevzniká akumulace objemu/auto-PEEP, ačkoli CHOPN případ o auto-PEEP mluví. VTe se navíc reportuje z inspiračního objemu, nikoli z integrálu výdechu. Řešení vyžaduje stav dechu přenášený mezi cykly; neopravovat pouze vyhlazením grafu.

### P1 — Průtok a objem nejsou integrálně konzistentní, Paw při výdechu má jinou rovnici

`src/lib/waveformMath.ts:57–116`: inspirační průtok VC je násoben `riseFactor`, objem ale roste lineárně. Při výdechu průtok násobí `expRiseFactor`, exponenciální objem tento člen nemá. Integrál průtoku proto neodpovídá změně objemu. Inspirační Paw obsahuje resistivní člen, výdechový Paw je počítán jen z elastického tlaku. Před případným fyzikálním přepracováním je nutné určit, zda se zobrazuje proximální Paw, nebo alveolární tlak; model nyní tyto významy míchá. Neprováděna nová klinická interpretace.

### P1 — Dva nezávislé systémy anestezie a léků

`src/App.tsx`, `src/components/MedicationPanel.tsx`, `src/lib/medicationModel.ts`: starý panel mění `nmbLevel`/`sedationLevel`, zásuvka zapisuje dávkové události s jinými efekty. Rocuronium ze zásuvky snižuje drive, ale starý TOF je stále odvozen od `nmbLevel`; původní „BOLUS (50mg)“ naopak nezaloží dávkovou událost. Uživatel tak vidí různé odpovědi podle místa podání. Handoff výslovně zachovával staré ovládání, proto tato revize svévolně neslučuje farmakologii. Další krok: jeden zdroj účinků a jasná vazba na historii i TOF.

### P1 — Nesjednocené zadání hmotnosti a lékových instrukcí

`src/components/PatientIntakeScreen.tsx:41–43`: absolutní dávky všech tří indukčních léčiv se počítají z `ibwKg`, zatímco praktické procvičování používá svou výslovně popsanou metodiku a výluky. Příjem zobrazuje konkrétní „standard“ a „RSI“ popisky; nová zásuvka naopak označuje hodnoty jen jako technické vstupy. Není to sjednocená výuková specifikace. Neměnit dávkování odhadem; při odborné revizi musí být u každé aktivity jasný základ hmotnosti, účel a podmínky použití.

### P2 — Fáze dechu/tepu skáče při změně frekvence

`waveformMath.ts` a `VitalsMonitor.tsx`: fáze stále vychází z absolutního času modulo aktuální periody. Například změna RR může okamžitě přeskočit z nádechu do výdechu. Historie již zůstává zachována, ale kontinuita právě probíhajícího cyklu vyžaduje integrovaný fázový čas nebo aplikaci nastavení na hranici dechu.

### P2 — P-V „předchozí smyčka“ není vždy skutečná historie

`src/components/PVLoopCanvas.tsx:36`: při změně parametrů, drive či jazyka se vygeneruje úplný modelový cyklus jako dimmed reference a současná smyčka se smaže. Není to předchozí naměřený dech. Buď uchovávat skutečně dokončený cyklus, nebo tento obraz označit jako modelovou referenci. Při medikačních efektech se to může opakovat každou sekundu.

### P2 — Recovery gate je pouze v prezentační vrstvě

`src/lib/simulationState.ts:123`: `crisis-begin-recovery` kontroluje stav a čas, ale ne požadovaný zásah. Aktuální UI tlačítko správně blokuje pomocí `canBeginCrisisRecovery`; přímý dispatch nebo budoucí jiný ovladač jej obejde. Přesunout kontrolu podmínek do doménové vrstvy a přidat test nepovoleného přechodu. Nynější reducer testy toto nezaručují.

### P2 — Nejednotná role výukových hodnot a scénářů

`src/App.tsx:209–210`: krize upraví SpO₂/EtCO₂ až po výpočtu, ostatní oxygenační výstupy zůstávají bez stejné úpravy. Současně existují staré klinické scénáře i nový krizový picker s odlišným průběhem a recovery pravidly. SIMV je ve výpočtu stejný jako VC, PSV stále nemodeluje trigger ani apnoe. Doporučení pro zadání: výslovně odlišit demonstraci mechaniky, řízený scénář a hodnocené procvičování; používat názvy „modelované hodnoty“ místo slibu naměřených dat. Poznámka o omezení PSV je již součástí nového editoru.

## Ověření a limity

- TypeScript: `npm run lint` prošel.
- Testy: 46/46 přes `node --import tsx --test src/lib/*.test.ts`. `npm test` používá stejný glob, ale jeho tsx CLI zde blokoval sandbox při vytváření IPC socketu; přímý Node runner tuto překážku nemá.
- Produkční build prošel. Výstup směrován do dočasného adresáře, původní `dist/` nebyl měněn.
- Prohlížeč: průchod úvod → příjem → simulace, výchozí VT 500, staged PEEP 0 bez změny monitoru před potvrzením, použití PEEP 0, odmítnutí VT 555, Escape, přepnutí na kolečko bez ztráty potvrzených hodnot, změna PEEP kolečkem, přepnutí VC→PC, změna Pinsp Enterem, objem PC nad 1200 mL a odpovídající readout.
- Vizualita ověřena v dostupném viewportu přibližně 770 px. Plnohodnotné testy na fyzickém telefonu/tabletu, drag gesta na dotyku, screenshotová matice desktopů a klinická validace nejsou součástí tohoto výsledku.
- Přímé ovládání a buffer mají nové testy; původní scénářové/medikační/practice testy zůstávají v celé sadě. Není zaveden nový lék ani scénář.

## Follow-up repair — 2026-11-02

The residual-volume, flow-integral/Paw, dual-drug/IBW induction, phase-continuity, fabricated previous-loop and UI-only recovery findings above are addressed by the new deterministic runtime. See [repair plan](SIMULATION_REPAIR_PLAN.md) and [handoff](PHYSIOLOGY_ENGINE_HANDOFF.md) for implemented interfaces, 62 tests, browser evidence and explicit remaining clinical/touch/visibility verification. Historical audit text describes the earlier version and is retained as evidence, not the current implementation status.
