import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMyDiaries } from '../services/api';

/**
 * Review-state vocabulary for the progress charts.
 *
 * `Reviewed` means a university supervisor has left a comment on the entry.
 * `Awaiting review` covers everything else, including entries the supervisor
 * explicitly sent back for revision — the charts show review activity, not the
 * backend's PENDING/APPROVED/NEEDS_REVISION workflow state.
 */
export const REVIEWED = 'Reviewed';
export const AWAITING_REVIEW = 'Awaiting review';
export const STATUSES = [REVIEWED, AWAITING_REVIEW];

/** Mon–Sat, matching the internship working week. */
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * A supervisor comment is only meaningful when it has content. The backend
 * defaults `universitySupervisorComment` to `""` when feedback is submitted
 * without one, so a plain truthiness check would count every untouched entry as
 * reviewed.
 */
export function isReviewed(entry) {
  return typeof entry?.universitySupervisorComment === 'string'
    && entry.universitySupervisorComment.trim().length > 0;
}

function startOfWeek(reference) {
  const date = new Date(reference);
  const isoDay = date.getDay(); // 0 = Sunday
  const offset = isoDay === 0 ? 1 : isoDay - 1; // Monday-based
  date.setDate(date.getDate() - offset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function bucketKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getDay() === 0) return null; // Sunday is not a working day
  return WEEK_DAYS[(date.getDay() + 6) % 7];
}

/** Entries per weekday for the current week, split by review state. */
export function buildDailyProgress(entries, reference = new Date()) {
  const weekStart = startOfWeek(reference);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return WEEK_DAYS.map((day) => {
    const counts = { day, Reviewed: 0, [AWAITING_REVIEW]: 0 };
    entries.forEach((entry) => {
      if (bucketKey(entry.date) !== day) return;
      const when = new Date(entry.date);
      if (Number.isNaN(when.getTime()) || when < weekStart || when > weekEnd) return;
      counts[isReviewed(entry) ? REVIEWED : AWAITING_REVIEW] += 1;
    });
    return counts;
  });
}

export function buildStatusTotals(entries) {
  const totals = { [REVIEWED]: 0, [AWAITING_REVIEW]: 0 };
  entries.forEach((entry) => {
    totals[isReviewed(entry) ? REVIEWED : AWAITING_REVIEW] += 1;
  });
  return totals;
}

const StudentDataContext = createContext(null);

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error('useStudentData must be used within StudentDataProvider');
  return ctx;
}

export default function StudentDataProvider({ children }) {
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDiaries(await fetchMyDiaries());
    } catch (err) {
      setDiaries([]);
      setError(err.message || 'Unable to load your diary entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => ({
    diaries,
    dailyProgress: buildDailyProgress(diaries),
    statusTotals: buildStatusTotals(diaries),
    loading,
    error,
    reload: load,
  }), [diaries, loading, error, load]);

  return (
    <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
  );
}
