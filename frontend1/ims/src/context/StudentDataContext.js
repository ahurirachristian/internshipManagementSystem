import { useMemo, createContext, useContext } from 'react';
import { generateTasks, buildDailyProgress, buildStatusTotals } from '../data/tasksData';

const StudentDataContext = createContext(null);

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error('useStudentData must be used within StudentDataProvider');
  return ctx;
}

export default function StudentDataProvider({ children }) {
  const value = useMemo(() => {
    const tasks = generateTasks(1000, 2026);
    return {
      tasks,
      dailyProgress: buildDailyProgress(tasks),
      statusTotals: buildStatusTotals(tasks),
    };
  }, []);

  return (
    <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
  );
}