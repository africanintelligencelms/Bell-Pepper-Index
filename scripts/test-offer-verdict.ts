/**
 * Tests for the offer verdict and the pledge floor.
 *
 * Both of these produce a number or a sentence a farmer will repeat to a buyer,
 * so the rules behind them are worth asserting rather than assuming. Same
 * dependency-free harness as test-market-rate.ts: run with `npm test`.
 */
import { assessOffer, ngn, MARKET_TOLERANCE } from '../src/server/offerVerdict.js';
import { MarketRate } from '../src/server/marketRate.js';
import { currentWeekStart, resolvePledgeFloor, MIN_PLEDGES } from '../src/server/pledgeFloor.js';

let pass = 0, fail = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};
const checkTrue = (name: string, got: boolean) => check(name, got, true);

/** A published rate with a real median behind it. */
const sufficientRate = (overrides: Partial<MarketRate> = {}): MarketRate => ({
  type: 'green',
  pricePerKg: 2400,
  basis: 'community_median',
  sufficient: true,
  sampleSize: 7,
  windowDays: 14,
  low: 2300,
  high: 2500,
  band: { min: 2000, target: 2250, max: 2500 },
  withinBand: true,
  note: '',
  ...overrides,
});

/** Thin data: the band is all there is to compare against. */
const thinRate = (overrides: Partial<MarketRate> = {}): MarketRate => ({
  ...sufficientRate(),
  pricePerKg: 2250,
  basis: 'association_band',
  sufficient: false,
  sampleSize: 1,
  windowDays: 90,
  low: null,
  high: null,
  withinBand: null,
  ...overrides,
});

const HUB = 'Jos Farm Gate (Plateau)';

console.log('naira formatting');
check('groups thousands', ngn(112500), '₦112,500');
check('rounds to whole naira', ngn(2399.6), '₦2,400');
check('no separator below a thousand', ngn(950), '₦950');
check('zero', ngn(0), '₦0');
check('millions', ngn(1234567), '₦1,234,567');

console.log('\nverdict levels');
const verdict = (offerPerKg: number, rate = sufficientRate(), quantityKg = 250) =>
  assessOffer({ type: 'green', offerPerKg, quantityKg, rate, hub: HUB });

check('below the floor is the alarm case', verdict(1800).level, 'below_floor');
check('at the floor exactly is not below it', verdict(2000).level, 'below_market');
check('clears the floor but well under the median', verdict(2100).level, 'below_market');
check('within tolerance of the median', verdict(2300).level, 'at_market');
check('the median itself', verdict(2400).level, 'at_market');
check('above tolerance', verdict(2700).level, 'above_market');
check(
  'exactly at the tolerance edge is still at market',
  verdict(Math.round(2400 * (1 - MARKET_TOLERANCE))).level,
  'at_market',
);

console.log('\nbelow the floor outranks everything');
// A price can be above the recent median and still below the agreed floor when
// the market has fallen under it — the floor must still win, because that is
// the alarm the group exists to raise.
const fallenMarket = sufficientRate({ pricePerKg: 1700 });
check('median below the floor: floor still wins', verdict(1900, fallenMarket).level, 'below_floor');

console.log('\nthe shortfall is stated as a total, not per kg');
check('shortfall on 250kg at ₦200 under', verdict(1800).shortfallNgn, 50000);
check('no shortfall when the offer clears the floor', verdict(2400).shortfallNgn, 0);
check('zero quantity gives zero, not NaN', verdict(1800, sufficientRate(), 0).shortfallNgn, 0);
checkTrue('the headline names the total cost', verdict(1800).headline.includes('₦50,000'));
checkTrue('the headline names the floor', verdict(1800).headline.includes('₦2,000'));

console.log('\npercentage comparisons');
check('vsFloorPct below the floor', verdict(1800).vsFloorPct, -10);
check('vsRatePct against the median', verdict(1800).vsRatePct, -25);
check('vsRatePct is withheld when the median is thin', verdict(1800, thinRate()).vsRatePct, null);
checkTrue('vsFloorPct still reported when the median is thin', verdict(1800, thinRate()).vsFloorPct === -10);

console.log('\nthin data never pretends to be a market comparison');
const thinAboveFloor = verdict(2100, thinRate());
check('above the floor with thin data is not judged as at-market strength', thinAboveFloor.level, 'at_market');
checkTrue('and says so plainly', thinAboveFloor.headline.includes('not enough recent sales'));
checkTrue(
  'the reasoning names the association target as the basis',
  thinAboveFloor.reasoning.some((r) => r.includes("association's agreed target")),
);
checkTrue(
  'below the floor with thin data is still the alarm',
  verdict(1500, thinRate()).level === 'below_floor',
);

console.log('\nno band configured at all');
const noBand = thinRate({ band: null });
const unjudgeable = verdict(3000, noBand);
check('nothing is claimed', unjudgeable.level, 'at_market');
check('no shortfall can be computed', unjudgeable.shortfallNgn, null);
check('no floor comparison', unjudgeable.vsFloorPct, null);
checkTrue('and it says the offer cannot be judged', unjudgeable.headline.includes('cannot be judged'));

console.log('\nthe buyer reply');
const reply = verdict(1800).buyerReply;
checkTrue('thanks the buyer', reply.startsWith('Thank you for the offer'));
checkTrue('quotes the floor', reply.includes('₦2,000/kg'));
checkTrue('quotes what members got', reply.includes('₦2,400/kg'));
checkTrue('names the shelf life as the reason to wait', reply.includes('14-21 days'));
checkTrue('offers the quantity at the right price', reply.includes('250kg at ₦2,400/kg'));
checkTrue('never accuses the buyer', !/lowball|cheat|exploit|unfair/i.test(reply));
checkTrue(
  'omits the median sentence when there is no real median',
  !verdict(1800, thinRate()).buyerReply.includes('median of'),
);
// The floor is the minimum to quote even when the market has fallen below it:
// quoting the fallen median would be the app arguing the buyer's side.
checkTrue(
  'quotes the floor, not a median that has fallen under it',
  verdict(1900, fallenMarket).buyerReply.includes('250kg at ₦2,000/kg'),
);

console.log('\ncoloured peppers are a different market');
const colouredRate = sufficientRate({ type: 'coloured', pricePerKg: 4000, band: { min: 3500, target: 3850, max: 4200 } });
const colouredVerdict = assessOffer({ type: 'coloured', offerPerKg: 3000, quantityKg: 100, rate: colouredRate, hub: HUB });
check('judged against the coloured band', colouredVerdict.level, 'below_floor');
checkTrue('and the copy says coloured', colouredVerdict.buyerReply.includes('coloured'));

console.log('\nreasoning always names the produce distinction');
for (const offer of [1800, 2100, 2400, 2700]) {
  checkTrue(
    `open-field distinction present at ₦${offer}`,
    verdict(offer).reasoning.some((r) => r.includes('Open-field pepper is a different crop')),
  );
}

console.log('\nweek boundaries (pledges are weekly)');
check('a Monday is its own week start', currentWeekStart(new Date('2026-09-21T12:00:00Z')), '2026-09-21');
check('a Sunday belongs to the week that began', currentWeekStart(new Date('2026-09-27T23:59:00Z')), '2026-09-21');
check('a Wednesday', currentWeekStart(new Date('2026-09-23T06:00:00Z')), '2026-09-21');
check('crossing a month', currentWeekStart(new Date('2026-10-01T00:00:00Z')), '2026-09-28');

console.log('\npledge floor: below the minimum, nothing is published');
const pledges = (...values: number[]) => values.map((minPerKg) => ({ minPerKg }));
const floor = (values: number[], uncounted = 0) =>
  resolvePledgeFloor(HUB, 'green', pledges(...values), uncounted, '2026-09-21');

check('no pledges at all', floor([]).floorPerKg, null);
check('no pledges is not sufficient', floor([]).sufficient, false);
checkTrue('and says how many are needed', floor([]).note.includes(`${MIN_PLEDGES} are needed`));
check('one short of the minimum publishes nothing', floor([2300, 2300, 2400, 2400]).floorPerKg, null);
checkTrue(
  'and counts down the remainder',
  floor([2300, 2300, 2400, 2400]).note.includes('1 more needed'),
);

console.log('\npledge floor: at the minimum it publishes');
const five = floor([2200, 2300, 2400, 2400, 2500]);
check('publishes the 25th percentile', five.floorPerKg, 2300);
check('is sufficient', five.sufficient, true);
check('counts the pledges', five.countedPledges, 5);
check('counts who is holding at or above it', five.holdingCount, 4);
checkTrue('labels the figure self-reported', five.note.includes('Self-reported'));
checkTrue('never calls it agreed', !/agreed/i.test(five.note));

console.log('\npledge floor: one low pledge must not drag it down');
// The whole reason for a percentile rather than a minimum: a member who
// pledges low, whether through pessimism or because a buyer got to them,
// cannot set the number everyone else quotes.
check('a single low pledge', floor([800, 2300, 2400, 2400, 2500]).floorPerKg, 2300);
check('the minimum would have published ₦800', Math.min(800, 2300, 2400, 2400, 2500), 800);
check('a single high pledge does not inflate it', floor([2300, 2300, 2400, 2400, 9000]).floorPerKg, 2300);

console.log('\npledge floor: uncounted pledges encourage but never move the figure');
const withUncounted = floor([2200, 2300, 2400, 2400, 2500], 3);
check('total shown to members includes them', withUncounted.pledgeCount, 8);
check('but the counted population is unchanged', withUncounted.countedPledges, 5);
check('and the floor is unchanged', withUncounted.floorPerKg, five.floorPerKg);
check(
  'uncounted alone never reaches the minimum',
  resolvePledgeFloor(HUB, 'green', [], 20, '2026-09-21').sufficient,
  false,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
