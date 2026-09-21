import { PriceRecord } from '../types';

/**
 * Intentionally empty.
 *
 * The sample records that used to live here were logged against a price floor
 * roughly twice the current one, so seeding them would immediately contradict
 * the agreed range the app publishes. The index now starts empty and is defined
 * entirely by what farmers log — which is also what makes the first few
 * submissions worth making.
 *
 * This doubles as the offline fallback in `App.tsx`: showing nothing is honest
 * when the API cannot be reached; showing stale prices is not.
 */
export const INITIAL_PRICE_RECORDS: PriceRecord[] = [];
