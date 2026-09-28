import { useMemo, createContext, useContext } from 'react';
import { generateTasks, buildDailyProgress, buildStatusTotals } from '../data/tasksData';

<<<<<<< HEAD
const TasksContext = createContext(null);

export function useStudentData() {
  const ctx = useContext(TasksContext);
=======
const StudentDataContext = createContext(null);

export function useStudentData() {
  const ctx = useContext(StudentDataContext);
>>>>>>> developer
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

<<<<<<< HEAD
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
=======
  return (
    <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
  );
>>>>>>> developer
}