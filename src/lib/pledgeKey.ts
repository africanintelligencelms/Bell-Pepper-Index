/**
 * This device's pledge id.
 *
 * A pledge has to be attributable to *someone*, or one person could pledge five
 * times and publish a floor by themselves. But asking a farmer to create an
 * account before they can say what they will refuse would cost more members than
 * the duplicate pledges it prevents — so the weakest identity that does the job
 * is an opaque random id kept on the device.
 *
 * It is not a verified identity, and the app never presents the pledge floor as
 * anything but self-reported. Verified phone identity is the upgrade path; when
 * it lands, this key becomes the fallback for members who have not verified yet
 * rather than the only mechanism.
 *
 * It carries no personal information and is never shown to the farmer: it exists
 * so the server can replace this device's previous pledge instead of counting it
 * twice.
 */

const STORAGE_KEY = 'pepper_index_pledge_key';

function generate(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '');
    }
  } catch {
    // Fall through to the Math.random path below.
  }
  // Only reached on browsers without crypto.randomUUID. Collision risk is
  // irrelevant here: a collision merges two devices' pledges, it does not leak
  // anything, and the server bounds the damage at one pledge per key per week.
  return `k${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Reads the device's key, creating one on first use. */
export function getPledgeKey(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[A-Za-z0-9_-]{8,100}$/.test(existing)) return existing;
  } catch {
    // Private browsing can throw on read. Fall through and generate a
    // per-session key so pledging still works, even if it is not remembered.
  }

  const key = generate();
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // Non-fatal: the pledge lands, it just will not be replaced next week by
    // this same device.
  }
  return key;
}
