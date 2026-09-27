/**
 * The hubs the form offers, as farmers name them rather than as the bands do.
 *
 * Shared between the logger and the offer checker so the two cannot drift: a
 * farmer who checks an offer against the Lagos floor and then logs the sale
 * against the Jos one would silently corrupt both numbers. `resolveHub` on the
 * server maps each of these to a band, and that mapping is the only place the
 * translation happens.
 */
export const COMMON_LOCATIONS = [
  'Jos, Plateau State',
  'Abuja (FCT)',
  'Lagos (Mile 12)',
  'Kano State',
  'Other',
];
