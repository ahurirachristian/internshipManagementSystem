import { STATUSES } from '../context/StudentDataContext';
import { STATUS_COLORS, STATUS_COLORS_DARK } from './colors';

/**
 * The chart palette is keyed by string, so a mismatch with the review-state
 * vocabulary fails silently: every segment renders `undefined` and the tone
 * falls back to generic slate. These assertions turn that into a test failure.
 */
describe('status color palette', () => {
  it('covers every status the charts actually render, in both themes', () => {
    STATUSES.forEach((status) => {
      expect(STATUS_COLORS[status]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(STATUS_COLORS_DARK[status]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('has no keys beyond the real status vocabulary', () => {
    expect(Object.keys(STATUS_COLORS).sort()).toEqual([...STATUSES].sort());
    expect(Object.keys(STATUS_COLORS_DARK).sort()).toEqual([...STATUSES].sort());
  });

  it('keeps the light and dark palettes one-to-one', () => {
    expect(Object.keys(STATUS_COLORS)).toEqual(Object.keys(STATUS_COLORS_DARK));
  });

  it('gives the two states visually distinct colors in light mode', () => {
    // A single hue for both states would make the split unreadable.
    expect(STATUS_COLORS.Reviewed).not.toBe(STATUS_COLORS['Awaiting review']);
    expect(STATUS_COLORS_DARK.Reviewed).not.toBe(STATUS_COLORS_DARK['Awaiting review']);
  });
});
