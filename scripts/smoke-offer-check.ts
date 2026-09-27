/**
 * End-to-end check of the offer checker and the pledge floor, against the real
 * Express app and the in-memory store.
 *
 * Kept out of `npm test` because it binds a port; run it with `npm run test:api`.
 * It covers what the pure-module tests cannot: hub resolution through the route,
 * the validation boundary, the upsert on re-pledging, and the rule that public
 * reads never carry a phone number.
 */
import { createApiApp } from '../src/server/app.js';

const app = createApiApp();
const server = app.listen(4599);
const base = 'http://127.0.0.1:4599/api';

const post = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
};
const get = async (path: string, headers: Record<string, string> = {}) => {
  const res = await fetch(`${base}${path}`, { headers });
  return { status: res.status, json: await res.json() };
};

let fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${JSON.stringify(detail)}`}`);
  if (!cond) fail++;
};

try {
  console.log('check-offer');
  const low = await post('/check-offer', { type: 'green', offerPerKg: 1500, quantityKg: 250, location: 'Jos, Plateau State' });
  ok('200', low.status === 200, low.json);
  ok('below_floor', low.json.data?.verdict?.level === 'below_floor', low.json.data?.verdict?.level);
  ok('shortfall stated', low.json.data?.verdict?.shortfallNgn === 125000, low.json.data?.verdict?.shortfallNgn);
  ok('hub resolved', low.json.data?.hub === 'Jos Farm Gate (Plateau)', low.json.data?.hub);
  ok('buyer reply present', typeof low.json.data?.verdict?.buyerReply === 'string' && low.json.data.verdict.buyerReply.length > 40);

  const lagos = await post('/check-offer', { type: 'green', offerPerKg: 2100, quantityKg: 100, location: 'Lagos (Mile 12)' });
  ok('Lagos hub differs', lagos.json.data?.hub === 'Lagos (Mile 12 / Retail / Hotels)', lagos.json.data?.hub);
  ok('Lagos floor is higher, so 2100 is below it', lagos.json.data?.verdict?.level === 'below_floor', lagos.json.data?.verdict?.level);

  const bad = await post('/check-offer', { type: 'green', quantityKg: 10 });
  ok('missing offer rejected 400', bad.status === 400, bad.json);

  console.log('\noutcome on a price record');
  const refused = await post('/prices', {
    type: 'green', pricePerKg: 1500, quantityKg: 250, transactionType: 'buyer_offer',
    productionMethod: 'greenhouse', location: 'Jos, Plateau State', farmerName: 'Test', outcome: 'refused',
  });
  ok('201', refused.status === 201, refused.json);
  ok('outcome stored', refused.json.data?.outcome === 'refused', refused.json.data);

  const badOutcome = await post('/prices', {
    type: 'green', pricePerKg: 2400, transactionType: 'actual_sale',
    location: 'Jos, Plateau State', farmerName: 'Test', outcome: 'refused',
  });
  ok('outcome on a sale rejected 400', badOutcome.status === 400, badOutcome.json);

  const summary = await get('/offer-checks/summary');
  // Two, not three: the rejected request never reached the counter, which is
  // the behaviour we want — a malformed check is not a consulted app.
  ok('only valid checks counted', summary.json.data?.checksLast7Days === 2, summary.json.data);
  ok('refusal below floor counted', summary.json.data?.refusedLast7Days === 1, summary.json.data);

  console.log('\npledges');
  const noKey = await post('/pledges', { type: 'green', minPerKg: 2300, location: 'Jos, Plateau State' });
  ok('missing pledge key rejected 400', noKey.status === 400, noKey.json);

  for (let i = 0; i < 4; i++) {
    await post('/pledges', { type: 'green', minPerKg: 2300, location: 'Jos, Plateau State' }, { 'x-pledge-key': `devicekey${i}` });
  }
  const fourth = await get('/pledges/summary?location=Jos, Plateau State');
  ok('4 pledges publish nothing', fourth.json.data?.green?.floorPerKg === null, fourth.json.data?.green);
  ok('and it is not sufficient', fourth.json.data?.green?.sufficient === false);

  const fifth = await post('/pledges', { type: 'green', minPerKg: 2500, location: 'Jos, Plateau State' }, { 'x-pledge-key': 'devicekey9' });
  ok('5th publishes a floor', fifth.json.data?.green?.floorPerKg === 2300, fifth.json.data?.green);
  ok('holding count reported', fifth.json.data?.green?.holdingCount === 5, fifth.json.data?.green);
  ok('labelled self-reported', /Self-reported/.test(fifth.json.data?.green?.note ?? ''), fifth.json.data?.green?.note);

  const repledge = await post('/pledges', { type: 'green', minPerKg: 2600, location: 'Jos, Plateau State' }, { 'x-pledge-key': 'devicekey0' });
  ok('re-pledging replaces, does not add', repledge.json.data?.green?.countedPledges === 5, repledge.json.data?.green);
  ok('mine reflects my own pledge', repledge.json.data?.mine?.[0]?.minPerKg === 2600, repledge.json.data?.mine);

  console.log('\nmarket-rate carries the pledge floor');
  const rate = await get('/market-rate?location=Jos, Plateau State');
  ok('greenPledge present', rate.json.data?.greenPledge?.floorPerKg === 2300, rate.json.data?.greenPledge);
  ok('colouredPledge present but insufficient', rate.json.data?.colouredPledge?.sufficient === false, rate.json.data?.colouredPledge);
  ok('a different hub has its own pledge state',
    (await get('/pledges/summary?location=Lagos (Mile 12)')).json.data?.green?.sufficient === false);

  console.log('\nphone numbers still withheld from public reads');
  const list = await get('/prices');
  ok('no farmerPhone in public read', !JSON.stringify(list.json.data).includes('farmerPhone'), Object.keys(list.json.data?.[0] ?? {}));
} finally {
  server.close();
}

console.log(`\n${fail === 0 ? 'ALL PASS' : `${fail} FAILED`}`);
process.exit(fail === 0 ? 0 : 1);
