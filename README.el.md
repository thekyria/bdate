# bdate

[English](README.md) | **Ελληνικά**

Η εντολή `date(1)`, αλλά όπως θα μετρούσε τον χρόνο ένας Βυζαντινός.

```
$ bdate
Kyriakē, 21 Septembrios 7535 AM (Julian 2026-09-21), indiction 5, 6th hour of the day
```

📖 **Τεκμηρίωση και θεωρία:** <https://thekyria.github.io/bdate/el/>
(πηγή στο [`docs/`](docs/), οι ελληνικές σελίδες στο [`docs/el/`](docs/el/))

🕰 **Ζωντανό ρολόι:** <https://bdate.app/?lang=el>. Ενσωματώστε το με
`<iframe src="https://bdate.app/?compact=1&lang=el" width="320" height="320" style="border:0"></iframe>`.
Επιλογές: `place=athens` (ή άλλος προκαθορισμένος τόπος), `lat=…&lon=…`, `theme=light|dark`, `lang=en|el`.
Για τοπική προεπισκόπηση: `cp js/src/bdate.js docs/clock/ && python3 -m http.server -d docs`,
και ανοίξτε το <http://localhost:8000/clock/>.
Το ρολόι εγκαθίσταται ως εφαρμογή («Εγκατάσταση» ή «Προσθήκη στην αρχική οθόνη»
στον περιηγητή) και λειτουργεί χωρίς σύνδεση. Για να το φιλοξενήσετε στο Vercel,
εισαγάγετε αυτό το αποθετήριο: το `vercel.json` αντιγράφει μέσα το `bdate.js` και
σερβίρει το `docs/clock/` ως ρίζα του ιστότοπου.

🔌 **Web API:** το <https://bdate.app/api/v1/date> επιστρέφει την έξοδο του `bdate --json`·
δέχεται `date`, `tz`, `lat`, `lon` και `hours=0` (δείτε τη
[Χρήση](https://thekyria.github.io/bdate/el/usage.html#web-api)).

Το ρολόι και η τεκμηρίωση υπάρχουν στα αγγλικά και στα ελληνικά (σημαίες πάνω
δεξιά). Η γραμμή εντολών και το API τυπώνουν τα ονόματα σε λατινική μεταγραφή.

## Δομή

| Διαδρομή | Τι περιέχει |
|---|---|
| [`python/`](python/) | Η υλοποίηση αναφοράς και το εργαλείο γραμμής εντολών `bdate` |
| [`js/`](js/) | Μια μεταφορά του ίδιου υπολογισμού σε JavaScript, για ιστοσελίδες και Node |
| [`fixtures/`](fixtures/) | Περιπτώσεις που παράγει το πακέτο Python· τις ελέγχουν και οι δύο σουίτες δοκιμών |
| [`docs/`](docs/) | Ο ιστότοπος GitHub Pages |
| [`api/`](api/) | Το web API του bdate.app, μια συνάρτηση Vercel πάνω στην έκδοση JavaScript |
| [`tests/clock/`](tests/clock/) | Έλεγχοι για την εφαρμογή του ρολογιού: τα αρχεία της και μια δοκιμή σε περιηγητή |
| [`tests/api/`](tests/api/) | Δοκιμές για το web API |

Η Python είναι η πηγή της αλήθειας. Αφού αλλάξετε τη λογική εκεί, ξαναφτιάξτε τα
fixtures (`cd python && uv run python scripts/gen_fixtures.py`). Οι δοκιμές της
Python αποτυγχάνουν όσο τα fixtures είναι παλιά, και οι δοκιμές της JS αποτυγχάνουν
ώσπου η μεταφορά να συμφωνήσει μαζί τους.

## Γρήγορη εκκίνηση

```
uvx --from ./python bdate          # γραμμή εντολών
cd js && npm test                  # δοκιμές της έκδοσης JS (Node ≥ 18, χωρίς εξαρτήσεις)
node --test tests/api/date.test.mjs   # web API
cd tests/clock && npm ci && npx playwright install chromium && npm test   # ρολόι
```

```js
import { byzantine, formatDefault } from "./js/src/bdate.js";
formatDefault(byzantine(new Date(), { lat: 37.98, lon: 23.73 }));
```

Άδεια MIT.
