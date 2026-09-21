/**
 * Tests for the published going rate.
 *
 * This figure is what a farmer quotes to a buyer, so the rules behind it —
 * which records count, how far back, what happens when data is thin — are
 * worth asserting rather than assuming. Deliberately dependency-free: run with
 * `npm test`, no test runner to install or configure.
 */
import { resolveMarketRate, median, percentile, windowStart, RateSample } from '../src/server/marketRate.js';
import { UnifiedPriceBand } from '../src/types.js';

const band: UnifiedPriceBand = {
  hub: 'Jos Farm Gate (Plateau)',
  colouredMin: 6500, colouredTarget: 7000, colouredMax: 7500,
  greenMin: 4000, greenTarget: 4500, greenMax: 5000,
  logisticsFromJosPerKg: 0, notes: '',
};
const TODAY = new Date('2026-09-21T12:00:00Z');
const day = (n: number) => windowStart(n, TODAY);
let pass = 0, fail = 0;
const check = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};

console.log('median');
check('odd count', median([4000, 4500, 5000]), 4500);
check('even count averages the middle two', median([4000, 4400, 4600, 9000]), 4500);
check('single value', median([4321]), 4321);
check('rounds to whole naira', median([4000, 4333]), 4167);
check('outlier barely moves it', median([4000, 4400, 4500, 4600, 99000]), 4500);

console.log('\nreported range resists outliers');
check('p25 / p75 of a clean set', [percentile([4300,4500,4800],0.25), percentile([4300,4500,4800],0.75)], [4300, 4800]);
check('a typo does not become the market high',
  [percentile([4300,4500,4800,99000],0.25), percentile([4300,4500,4800,99000],0.75)], [4300, 4800]);
check('single sample', [percentile([4321],0.25), percentile([4321],0.75)], [4321, 4321]);

console.log('\nwindow selection');
const s = (price: number, daysAgo: number): RateSample => ({ pricePerKg: price, date: day(daysAgo) });

let r = resolveMarketRate('green', [s(4400,1), s(4500,2), s(4600,3)], band, TODAY);
check('3 fresh sales -> 14d window', [r.windowDays, r.sampleSize, r.pricePerKg, r.basis], [14, 3, 4500, 'community_median']);

r = resolveMarketRate('green', [s(4400,1), s(4500,20), s(4600,25)], band, TODAY);
check('thin at 14d widens to 30d', [r.windowDays, r.sampleSize, r.basis], [30, 3, 'community_median']);

r = resolveMarketRate('green', [s(4400,1), s(4500,60), s(4600,80)], band, TODAY);
check('widens to 90d', [r.windowDays, r.sampleSize, r.basis], [90, 3, 'community_median']);

console.log('\nminimum sample');
r = resolveMarketRate('green', [s(4400,1), s(4500,2)], band, TODAY);
check('2 sales -> falls back to band target', [r.sufficient, r.pricePerKg, r.basis], [false, 4500, 'association_band']);
check('fallback reports what it counted', [r.sampleSize, r.windowDays], [2, 90]);
check('fallback has no fake spread', [r.low, r.high], [null, null]);

r = resolveMarketRate('green', [], band, TODAY);
check('no sales at all', [r.sufficient, r.pricePerKg, r.sampleSize], [false, 4500, 0]);

r = resolveMarketRate('coloured', [], null, TODAY);
check('no band configured either', [r.sufficient, r.pricePerKg, r.band], [false, 0, null]);

console.log('\nend-to-end range');
r = resolveMarketRate('green', [s(4300,1), s(4500,2), s(4800,3), s(99000,4)], band, TODAY);
check('median absorbs the typo', r.pricePerKg, 4650);
check('range excludes the typo', [r.low, r.high], [4300, 4800]);

console.log('\nexclusions and band flagging');
r = resolveMarketRate('green', [s(4400,1), s(4500,2), s(4600,3), s(4700,200)], band, TODAY);
check('record older than 90d never counts', r.sampleSize, 3);

r = resolveMarketRate('green', [s(3000,1), s(3100,2), s(3200,3)], band, TODAY);
check('median below agreed band is flagged', [r.pricePerKg, r.withinBand], [3100, false]);

r = resolveMarketRate('coloured', [s(7000,1), s(7200,2), s(7400,3)], band, TODAY);
check('coloured uses coloured band', [r.pricePerKg, r.withinBand, r.band?.target], [7200, true, 7000]);

r = resolveMarketRate('green', [s(4400,14), s(4500,13), s(4600,12)], band, TODAY);
check('boundary: exactly 14 days ago is included', [r.windowDays, r.sampleSize], [14, 3]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
