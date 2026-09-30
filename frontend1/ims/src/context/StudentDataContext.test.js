import {
  AWAITING_REVIEW,
  REVIEWED,
  STATUSES,
  WEEK_DAYS,
  buildDailyProgress,
  buildStatusTotals,
  isReviewed,
} from './StudentDataContext';

// 2026-09-30 is a Wednesday.
const WEDNESDAY = new Date('2026-09-30T10:00:00');

function entry(date, comment) {
  return { id: date + String(comment), date, universitySupervisorComment: comment };
}

describe('review state', () => {
  test('a blank or whitespace-only supervisor comment is not a review', () => {
    expect(isReviewed(entry('2026-09-28', 'Looks good, well explained.'))).toBe(true);
    expect(isReviewed(entry('2026-09-28', '   '))).toBe(false);
    expect(isReviewed(entry('2026-09-28', ''))).toBe(false);
    expect(isReviewed(entry('2026-09-28', null))).toBe(false);
    expect(isReviewed(entry('2026-09-28', undefined))).toBe(false);
  });
});

describe('buildDailyProgress', () => {
  test('covers Monday to Saturday in order', () => {
    const buckets = buildDailyProgress([], WEDNESDAY);
    expect(buckets.map((b) => b.day)).toEqual(WEEK_DAYS);
    expect(WEEK_DAYS).toHaveLength(6);
  });

  test('splits entries by review state within the current week', () => {
    const buckets = buildDailyProgress([
      entry('2026-09-28', 'reviewed'), // Monday
      entry('2026-09-28', ''), // Monday, awaiting
      entry('2026-09-29', ''), // Tuesday, awaiting
      entry('2026-10-01', 'reviewed'), // Thursday
    ], WEDNESDAY);

    const byDay = Object.fromEntries(buckets.map((b) => [b.day, b]));
    expect(byDay.Monday[REVIEWED]).toBe(1);
    expect(byDay.Monday[AWAITING_REVIEW]).toBe(1);
    expect(byDay.Tuesday[REVIEWED]).toBe(0);
    expect(byDay.Tuesday[AWAITING_REVIEW]).toBe(1);
    expect(byDay.Thursday[REVIEWED]).toBe(1);
  });

  test('excludes entries outside the current week', () => {
    const buckets = buildDailyProgress([
      entry('2026-09-21', 'reviewed'), // previous Monday
      entry('2026-10-05', 'reviewed'), // next Monday
    ], WEDNESDAY);
    expect(buckets.reduce((acc, b) => acc + b[REVIEWED], 0)).toBe(0);
  });

  test('ignores Sunday and unparseable dates', () => {
    const buckets = buildDailyProgress([
      entry('2026-10-04', 'reviewed'), // Sunday
      entry('not-a-date', 'reviewed'),
    ], WEDNESDAY);
    expect(buckets.reduce((acc, b) => acc + b[REVIEWED] + b[AWAITING_REVIEW], 0)).toBe(0);
  });

  test('never emits a NaN column when the week is empty', () => {
    const buckets = buildDailyProgress([], WEDNESDAY);
    buckets.forEach((b) => {
      STATUSES.forEach((status) => expect(Number.isFinite(b[status])).toBe(true));
    });
  });
});

describe('buildStatusTotals', () => {
  test('counts every entry across all time, not just this week', () => {
    const totals = buildStatusTotals([
      entry('2026-09-21', 'reviewed'),
      entry('2026-09-28', 'reviewed'),
      entry('2026-10-05', ''),
    ], WEDNESDAY);
    expect(totals[REVIEWED]).toBe(2);
    expect(totals[AWAITING_REVIEW]).toBe(1);
  });

  test('returns zeroed totals for no entries', () => {
    expect(buildStatusTotals([])).toEqual({ Reviewed: 0, 'Awaiting review': 0 });
  });
});
