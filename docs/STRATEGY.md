# Naija Greenhouse Pepper Index — Product, Adoption & Revenue Strategy

**Written for:** a member-builder with no association authority.
**Assumed channel reality:** WhatsApp groups are primary; members have Android smartphones and will open a link.
**Hard constraint:** farmers are never charged, ever. All revenue comes from the non-farmer side.

Everything below is written against those four facts. Where a recommendation would need
committee approval, a vote, or a budget, it is marked and an authority-free substitute is given.

---

## 1. The diagnosis in one paragraph

The app is a **price information service**. The problem it names — undercutting — is not an
information problem, it is a **collective action problem**. Farmers in the group already know
roughly what peppers are worth; they undercut anyway, because each one is individually better
off taking ₦3,000 today than holding for ₦4,500 that only materialises if *everybody else also
holds*. Publishing a better number does not change that payoff. What changes it is visible,
credible, reciprocal commitment — knowing that seventeen other members in your hub have said,
on the record, that they are not selling below ₦2,300 this week. The index is the evidence
layer; the missing product is the **coordination layer** on top of it. That is also, conveniently,
the thing a member with no authority *can* build: you cannot declare a floor, but you can build
the instrument through which the group declares one to itself.

---

## 2. What the app is today vs. what the job actually is

| The app currently does | The job a farmer actually has |
| --- | --- |
| Publishes a median of recent greenhouse sales | "A buyer is standing in my greenhouse offering ₦3,000. Do I take it?" |
| Shows an admin-set agreed floor per hub | "Will anyone else actually hold this line, or will I be the only one who didn't sell?" |
| Calculates cost of production and breakeven | "My peppers were picked four days ago. How long can I wait before this is a total loss?" |
| Lists offtaker phone numbers | "This buyer owes Musa ₦400k from last month. Should I even load his truck?" |
| Unlocks charts after three logged sales | "Why am I typing my sales into a website?" |

Every row on the right is a *decision under time pressure*, and every one of them is currently
answered either not at all or only by implication. The gap between the two columns is the roadmap.

---

## 3. Six behavioural truths that decide whether this gets adopted

### 3.1 The value moment and the contribution moment are in the wrong order

The app asks for a record **after** the sale — at the exact moment the farmer has nothing left
to gain. The moment the farmer *needs* the app is during the negotiation, and at that moment
the app asks for nothing and captures nothing. That inversion is why voluntary agricultural
price-reporting projects almost always die at the data layer.

Invert it. The front door should not be *"log what you sold for"*; it should be
**"a buyer just offered me ₦____ — is that fair?"** The farmer types the offer to get an
instant verdict, a comparison, and a sentence to say back to the buyer. Capturing a
`buyer_offer` record is the *byproduct* of a service rendered, not a favour requested. Then,
2–3 days later, a single WhatsApp reply — *"Did that ₦3,000 offer become a sale? Reply with
the price you got"* — converts the offer into the `actual_sale` the index actually needs.

This one change puts contribution downstream of value instead of upstream, and it captures the
*buyer offer distribution* — which is strategically the most valuable dataset in the whole
system, because it is the direct evidence of the lowballing tactic the app exists to name.

### 3.2 You have no authority, so the floor cannot be declared — it has to be aggregated

`price_bands` is admin-set and the UI calls it *"the association's agreed floor"*. Today that
sentence is only true if the association agreed it. A member-builder who sets it from an admin
token is publishing **one member's opinion wearing the association's clothes**. That is the
single largest adoption risk in the project: the first time a respected member says *"who
agreed this?"* in the group, the app's credibility is gone and does not come back.

Two honest options, and you should do both:

1. **Relabel what you cannot substantiate.** Until a real body sets it, call it what it is —
   *"the floor members have pledged to"* or *"proposed floor — 12 members backing"* — not
   *"agreed"*. Honest framing costs one afternoon and protects everything else.
2. **Build the mechanism that manufactures the legitimacy.** A pledge: each member declares
   the minimum they will accept this week for their hub and variety. The published floor
   becomes a *derived, attributable* figure (e.g. the 25th percentile of live member pledges,
   shown with the count backing it). Nobody has to approve it. It becomes true by being used.

This does **not** contradict the existing rule that the floor must never be derived from
*submissions*. Deriving a floor from what buyers paid follows the market down. Deriving it from
what members **commit to refuse** does the opposite: it is resistance by construction. Those
are opposite mechanisms that happen to share the word "derived". Keep the admin override as the
ceiling on legitimacy — when a real association decision exists, it wins.

### 3.3 Holding the line is a coordination game, so show the other players

A number alone is not a reason to refuse an offer. *"You would be the 18th of 23 Jos members
holding at ₦2,300 this week"* is. Make the commitment count the most prominent element in the
app and in the WhatsApp broadcast, above the median. Three mechanics, in order of power:

- **Pledge count per hub/variety, refreshed weekly** — the commitment device (§3.2).
- **Refusals logged** — *"members turned down 9 offers below ₦2,200 this week"*. Currently
  a refused lowball offer leaves no trace anywhere; it is the app's best content and it is
  being thrown away. Add a *"I turned this down"* outcome to the offer checker.
- **Named undercut alerts, aggregate not personal** — *"3 green sales below the floor logged
  in Lagos this week"*. Aggregate only. Naming individuals would end contribution instantly
  and would be the single fastest way to kill this project socially.

### 3.4 Nobody will open a website daily — the product has to live in WhatsApp

Right now the app has **zero outbound capability**. It cannot reach a farmer. Retention
therefore depends on farmers spontaneously remembering a URL during a negotiation, which will
not happen at any useful rate. Meanwhile the group chat they are already in gets read every day.

The strategic shape is: **WhatsApp is the interface, the web app is the workbench.** Farmers
interact by message; the site is for the sub-group who want charts, the COP model, and the
directory. Concretely, in order:

1. **A daily/weekly floor-and-rate message**, generated by the app, pasted by a human into the
   group. You already have this — `WhatsAppBroadcastCard`. It is your single best asset and it
   is currently a modal three taps deep behind an advanced-mode nav. Promote it, put a date
   and a pledge count in it, and get one committed person to post it every morning at a fixed
   time. A fixed daily slot is what creates a habit; content quality is secondary to punctuality.
2. **A WhatsApp number that answers.** A farmer texts `3000 green jos` and gets the verdict,
   the floor, the pledge count and a line to quote back. This is the product. Everything else
   is supporting infrastructure. Spec is in `docs/BACKLOG.md` §1.
3. **Outbound follow-up** — the offer→sale conversion prompt from §3.1, and a *"prices moved"*
   alert. This is what turns a one-time user into a panel member.

Note the platform constraint honestly: the WhatsApp Cloud API gives a monthly allowance of free
service conversations (user-initiated, 24-hour window) and charges per business-initiated
conversation, with template pre-approval required. **Verify current Nigeria pricing and the free
tier before you build the outbound half** — the inbound half (farmer texts first, you reply
inside 24h) is the cheap part and carries most of the value. Design so the bot is
*reply-driven*, and outbound is a small number of high-value templates.

### 3.5 Device-local identity is a dead end, and it blocks five other things

`localStorage` identity (`pepper_index_sales_logged`, `farmer_name`, `farmer_phone`) means:

- no way to ever contact a farmer again (kills every retention loop);
- a cleared cache or a new phone resets a member to zero, and the unlock gate punishes your
  most loyal users for changing phones;
- no attribution, so no reputation, so no way to tell a member's sale from a buyer's sock puppet;
- no per-farmer history, which is the exact asset that makes the finance revenue line possible (§7);
- no defence against the same sale being logged twice.

The fix is **phone number as identity**, verified once by the lightest possible means — the
farmer messages the WhatsApp number (which proves the number, free) or a 4-digit code. Not
accounts, not passwords, not email. One number, remembered, used everywhere. This is
infrastructure for items 3–7 of the backlog, which is why it is specced early despite being
unglamorous.

### 3.6 The fear is rot, not price

Greenhouse shelf life (14–21 days) is described in the app's copy as *holding leverage*, but
nothing in the app **models the clock**. A farmer's real question is not "what is fair" but
"what is my pepper worth on day 4 versus day 9, net of the risk it doesn't sell at all". The
COP calculator answers an accounting question; the farmer has a *timing* question. Turn the
calculator into a **hold-or-sell clock**: pick date → days of shelf life left → today's offer
vs. the floor vs. the expected price if you wait, with rot risk priced in. That is the screen
a farmer opens with a buyer standing in front of them, and it is the one screen that would
justify the app's existence even with zero other members using it — which makes it the ideal
cold-start feature.

---

## 4. Adoption mechanism, designed for zero authority

### Stage 0 → 20 members: manufacture the data, don't wait for it

The index is unusable below ~3 sales per variety per 14 days, and **`INITIAL_PRICE_RECORDS` is
now empty**, so the very first visitor sees "not enough recent sales" — the worst possible first
impression, and correctly so, since inventing data would be worse. Bridge it by hand, not by
seeding fiction:

- **Harvest the history you already have.** The WhatsApp extractor exists and there are years
  of prices sitting in the group's scrollback. Export the group chat, run it through
  `/api/parse-whatsapp` in batches, review, and bulk-import with real dates. This is a weekend
  of work that turns an empty index into a credible one, using data the community itself
  produced. Do this before showing the app to anybody.
- **Ten anchor members, recruited one-to-one by phone call**, not by a group broadcast. Pick
  the ones who already complain about lowballing in the group — they have the motive. Ask each
  for one thing only: *text me your price when you sell*. You enter it. Do the data entry
  yourself for the first month; do not make adoption depend on farmers changing behaviour
  before the app has ever helped them.
- **Instrument one number: offers checked per week.** Not users, not page views. Offers
  checked is the only metric that proves the app is being consulted at the decision moment.

### Stage 20 → 100: the quoter loop

The behaviour that spreads this is not logging, it is **quoting**. A farmer who successfully
refuses a lowball offer by quoting the index tells the group about it. Engineer that story:

- Every offer check ends with a **copyable sentence** to send to the buyer, in the farmer's own
  voice, with the number and its provenance. Make the win shareable in one tap.
- **A "held the line" confirmation.** When a farmer reports they refused and later sold higher,
  produce a shareable card: *"Offered ₦3,000. Held. Sold ₦4,200 four days later."* That is the
  single most persuasive artefact this product can generate, it costs almost nothing to build,
  and it recruits better than any feature.
- **Recruit the group admins, not the members.** In a Nigerian WhatsApp farming group the
  admins control the pinned message and the daily rhythm. One admin who pins the floor message
  daily is worth fifty individually-onboarded farmers. Your single highest-leverage
  non-engineering action is getting the daily broadcast into a pinned, fixed-time slot.
- **Hub captains, not moderators.** One volunteer per hub who verifies suspicious entries and
  vouches for offtakers. Gives you distributed trust without an approval queue and without you
  claiming authority you don't have.

### Stage 100+: what stops being optional

Phone identity, dispute/flagging, outlier review, and per-hub pledge aggregation all become
mandatory, because at 100 members the incentive to manipulate the index becomes real money for
a buyer. See §6.

### What to stop doing

**Reconsider the three-sale unlock gate in its current form.** The reasoning behind it is
sound — the index needs contributions and an approval queue is worse — but as built it gates
*the tools that make the case for the app* behind an action the farmer has no reason to perform
yet, at a stage where you have ~zero users and every visitor is precious. It also punishes
phone changes and can be defeated by anyone who opens devtools, so it deters exactly the
compliant users and not the lurkers. Two changes keep the intent and remove the harm:

- Gate on **reciprocity after value delivered**, not on lifetime count: the first three offer
  checks are free; the fourth asks for one sale first. The farmer has been helped three times
  before being asked for anything.
- Make it **freshness-based** thereafter (*"your last sale was 5 weeks ago — log one to keep
  the tools open"*), which is what the index actually needs. Lifetime counts reward a farmer
  who logged three sales in 2025 and vanished.

Keep the rule that the offtaker directory never locks. That rule is correct.

---

## 5. Missing features, ranked by leverage

Ranked by (adoption impact × strategic value) ÷ effort. The top five are specced in
`docs/BACKLOG.md`.

| # | Feature | Why it matters | Effort |
| --- | --- | --- | --- |
| 1 | **WhatsApp bot: check an offer, log by reply** | Puts the product where farmers already are; makes the daily loop possible; inbound-first keeps it cheap | L |
| 2 | **"Check this offer" front door** (in-app) | Moves the ask downstream of value; captures the buyer-offer dataset; ships in days with no external dependency | S |
| 3 | **Phone identity + weekly price pledge** | Manufactures floor legitimacy without authority; the coordination device; unlocks retention, reputation, anti-abuse, and the credit dataset | M |
| 4 | **Hold-or-sell harvest clock** | Answers the actual decision; valuable at N=1 so it works during cold start; models the leverage the copy already claims | M |
| 5 | **Offline outbox + Hausa / low-literacy mode** | Nigerian network reality; today a failed submission is honestly reported but permanently lost | M |
| 6 | **Forward supply signal** (what's coming to market in 2–4 weeks) | Flips the buyers' only information advantage; enables collective selling; the most saleable dataset you have | M |
| 7 | **Buyer payment reputation** (did they pay, on time, in full) | Probably the #1 unmet need after price; the directory currently vouches for *existence*, not *payment behaviour* | M |
| 8 | **Group-buy input coordination** (seedlings, substrate, nutrients) | Real cash saving for farmers and your best-aligned revenue line (§7) | M |
| 9 | **Logistics pooling** (shared Jos→Lagos loads) | ₦200–500/kg is the biggest single number in the model; pooling is pure farmer gain | L |
| 10 | **My price book / season record** (exportable, per farmer) | Turns contribution into a personal asset; the artefact lenders and insurers will pay to see | S |
| 11 | **Dispute & flag flow** | Integrity floor at scale (§6) | S |
| 12 | **Voice-note logging** (send a voice note, AI transcribes and extracts) | Matches how business is actually done for lower-literacy members | M |

**Two existing gaps worth fixing before adding anything**, both in `CLAUDE.md`'s own known-gaps list:

- **The three components that compute their own averages** (`PriceOverviewHero`,
  `PriceTrendChart`, the `predict-price` fallback). The whole product is *one trustworthy
  number*. Two screens showing two different numbers is not a cosmetic bug, it is a direct
  attack on the only thing the app sells. Migrate them to `/api/market-rate`. Highest
  credibility-per-line-of-code in the codebase.
- **`fetchPrices` silently falls back to bundled seed data on API failure**, and the empty-state
  path is now indistinguishable from the offline path. A farmer looking at stale or absent data
  believing it is live is the same failure mode the "never report a write that did not happen"
  rule was written to prevent. Show the failure.

---

## 6. Integrity: what breaks when this starts to matter

The moment the index is quoted at buyers, someone has a financial motive to move it. The
current defences are a median (good), greenhouse-actual-sale filtering (good), a minimum sample
(good), and per-IP hourly rate limits of 30 single / 5 bulk (loose by design, and correctly so
for shared Nigerian connections). What is missing:

- **No identity**, so one person can be thirty contributors. With a minimum sample of 3 and a
  median, **4–5 fabricated low sales are enough to move a hub's published rate.** That is the
  real exposure, and it is cheap for a buyer.
- **No duplicate detection.** The same sale logged twice by two parties double-counts.
- **No flagging**, no outlier review queue, no way for a member to say "that ₦1,800 Jos sale
  didn't happen".
- **No counterparty confirmation.** The strongest available signal — buyer and farmer
  independently reporting the same transaction — is not captured at all.

Recommended integrity floor, in order: phone identity → duplicate detection on
(phone, date, variety, quantity) → member flagging with a hub-captain review queue →
weight-by-verified-contributor when computing the median → counterparty confirmation badge.
None of this requires accounts in the traditional sense, and none of it should add a step to
the submission form.

---

## 7. Making money without charging farmers

The design rule that governs every option below, and which you should write into `CLAUDE.md`
before you take the first naira: **no revenue line may ever pay for access to an individual
farmer's weakness.** A buyer must never be able to purchase the knowledge that a specific named
farmer has day-9 peppers and no offer. Aggregate supply: sellable. Individual desperation: not
for sale at any price. Break that once and the app becomes the lowballing instrument it was
built to fight, and the group will work it out.

Ranked by alignment first, revenue second — because a misaligned line kills the asset.

### Tier 1 — aligned, start here

**A. Input group-buying commission.**
You already collect cost-of-production data, so you know precisely what the group spends on
seedlings, substrate, nutrients and pest control. Aggregate demand across members, negotiate a
bulk price with suppliers, take a commission from the **supplier**, not the farmer. Farmers pay
less than they do today; your margin comes out of the distributor's spread. Requires no scale on
the index — it works at 20 members — and it produces an immediate, cash-visible farmer benefit,
which is also the best adoption engine on this page. This is the one to start.

**B. Grants and development funding.**
Horticulture value chains, post-harvest loss and smallholder price transparency in Nigeria are
squarely inside the mandate of multiple development programmes (state ADPs, federal
agriculture programmes, and the Nigeria horticulture portfolios of the major bilateral and
multilateral donors). A working app with real farmer submissions and a measurable
post-harvest-loss story is a far stronger application than a proposal. Non-dilutive,
non-extractive, and it funds exactly the unglamorous work (identity, offline, translation) that
no commercial line will fund. **Verify current open calls before writing anything** — do not
budget against a programme you haven't confirmed is live.

**C. Lender and insurer data services.**
Greenhouse farmers are largely uncreditable because no verifiable price-and-yield history
exists. Two seasons of logged sales *is* that history. Sell — with **explicit per-farmer,
per-purpose, revocable consent** — a verified production-and-sales record to lenders,
input-credit providers and index insurers, priced per assessment or as a data licence. The
farmer's payoff is credit access they cannot otherwise get, which makes logging sales
self-interested rather than altruistic. This is the strongest long-run line and the reason
feature #10 (my price book) and phone identity matter. Consent must be per-request and
revocable, or you have sold your members' data, which is the same betrayal as A above wearing
a suit.

### Tier 2 — viable with guardrails

**D. Buyer-side subscription.** Hotels, supermarkets, processors and exporters pay for
*aggregate* supply visibility and the ability to post a demand ("need 500kg coloured weekly,
Lagos") that is broadcast to members, who respond if they choose. Sell **reliability of supply**,
never **visibility of weakness**: no individual inventory, no days-since-harvest, no
"farmer X is unsold". Price it as an annual seat per buying organisation. Real risk to manage:
the moment buyers are paying customers, every product decision acquires a quiet bias. Consider
publishing what buyers can and cannot see, in the app, where members can read it.

**E. Logistics pooling margin.** Consolidate Jos→Lagos loads across members; take margin from
the haulier on a filled truck. ₦200–500/kg of freight is the largest single lever in the entire
cost model, so even a small share of it is meaningful, and the farmer strictly gains. Operationally
heavy — this is a real logistics business, not a feature.

**F. Traceability / certification support for export buyers.** Export-facing buyers need
traceable, documented supply. Farmers with a logged history are the only ones who can supply it.
Charge the buyer or the certifier.

### Tier 3 — high revenue, high risk to the mission

**G. Brokerage take-rate / becoming the aggregator.** The most money, and the point at which the
platform becomes a market participant with an interest in the price it publishes. If you ever do
this, the index must be governed separately from the trading arm, and you should say so loudly
and in writing. My recommendation: not before there is an actual association with actual
governance, and not while you are the sole operator.

**H. Institutional and research data licensing** (statistics agencies, agtech, research). Small
but clean revenue, and the citations are reputationally useful. Aggregate and anonymised only;
never row-level with phone numbers.

### Sequencing

| Horizon | Lines | Why |
| --- | --- | --- |
| 0–6 months | A (input group-buy), B (grants) | Work at 20 members; strictly farmer-positive; fund the boring infrastructure |
| 6–18 months | C (lender data, with consent), D (buyer seats) | Need identity + 2 seasons of history + real coverage first |
| 18 months+ | E, F, H | Operationally heavy or dependent on scale |
| Only with governance | G | Conflicts with the mission unless structurally separated |

A note on the numbers: I have deliberately not put naira figures or market sizes in this
document, because I would be inventing them. Before committing to any line, get three real
inputs — current member count and average volume per member per season, the actual distributor
margin on the top three inputs, and one real buyer's willingness to pay for a seat. Those three
numbers decide whether A is a ₦50k/month side effect or the business.

---

## 8. What in the current code will undermine all of this

Ordered by how much damage it does to trust, which is the only currency this app has:

1. **Three components compute their own averages** and will disagree with the headline figure
   (`PriceOverviewHero`, `PriceTrendChart`, `predict-price` fallback). Fix first. Cheap.
2. **The floor is labelled "agreed" without an agreement** (§3.2). A wording change and a
   pledge count. Cheap, and it is the difference between credible and pretend.
3. **`fetchPrices` falls back to bundled seed data on API failure** — silently substitutes stale
   data for live data, in a product whose entire value is the freshness of one number.
4. **A destructive reset control is rendered to every advanced-mode user.** It is properly
   admin-gated server-side (so it fails safely), but showing it invites confusion and a support
   burden. Hide it behind a token that is actually present.
5. **`/api/predict-price` calls Gemini on every records-count change.** Already flagged in the
   repo. At 20 members it is a cost curiosity; at 500 it is your entire budget.
6. **No identity primitive** (§3.5) — blocks retention, reputation, integrity and the revenue
   lines simultaneously. The most important architectural gap in the project.
7. **Test coverage is one module.** `marketRate.ts` is well tested, which is the right thing to
   have tested first. But `validation.ts` is your entire trust boundary and has no tests; the
   pledge aggregation in backlog §3 will be a second load-bearing computation and must ship
   with tests from the start.

---

## 9. Suggested 90 days

**Weeks 1–2 — credibility.** Migrate the three stray averages to `/api/market-rate`. Relabel
the floor honestly. Fix the silent seed fallback. Import the WhatsApp scrollback so the index
is not empty. Nothing new is built.

**Weeks 3–5 — the front door.** Ship "Check this offer" (backlog §2) as the landing screen, with
the copyable buyer response and the "I turned it down" outcome. Soften the unlock gate to
reciprocity-after-value. Get the daily broadcast into a pinned fixed-time group slot — that is a
conversation, not a commit.

**Weeks 6–9 — identity and the pledge.** Phone identity (backlog §3), weekly pledges, pledge
count in the app and in the broadcast. This is the release that turns an information service
into a coordination device.

**Weeks 10–13 — the clock and the channel.** Hold-or-sell harvest clock (backlog §4). In
parallel, start the WhatsApp Cloud API application (it takes longer than the code does) and
build the inbound-only bot (backlog §1). Offline outbox (backlog §5) whenever a week frees up —
it silently raises every other number.

**Running alongside, not after:** the input group-buy conversation with two suppliers, and one
grant application. Both are phone calls and documents, not code, and both can start on day one.

---

## Appendix: is this a Claude Skill?

Three of the recurring jobs in this project are strong Skill candidates, in that they are
repeatable, rule-heavy, and currently depend on you remembering the rules:

- **A "pepper index domain guard" skill** — the market-logic invariants that `CLAUDE.md` already
  documents (greenhouse actual sales only, median never mean, floor never derived from
  submissions, one rate computation, never report a write that didn't happen). Encoded as a
  skill, every future change gets checked against them automatically instead of relying on
  whoever reads the file.
- **A WhatsApp scrollback import skill** — export → parse → review → bulk import, with the
  date-handling and duplicate rules baked in. You will run this every time the group generates
  history worth keeping.
- **A weekly broadcast + digest skill** — generate the group message, the pledge summary and the
  held-the-line cards on a schedule.

Worth revisiting your Skills and preferences once the first two of those have been run by hand a
few times — the patterns that survive manual repetition are the ones worth encoding.
