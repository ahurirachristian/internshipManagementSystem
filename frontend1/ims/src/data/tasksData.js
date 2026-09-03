const TYPES = [
  'Report', 'Presentation', 'Code Review', 'Documentation', 'Research',
  'Testing', 'Design', 'Deployment', 'Analysis', 'Bug Fix',
];

const SUBJECTS = [
  'Weekly Progress', 'Project Setup', 'Database Schema', 'API Endpoints',
  'User Interface', 'Authentication', 'Performance', 'Security Audit',
  'Unit Tests', 'Integration Tests', 'Client Meeting', 'Standup Notes',
  'Onboarding', 'Data Migration', 'Refactoring', 'Feature Spec',
  'Wireframes', 'Deployment Plan', 'Release Notes', 'Demo Prep',
];

const TASK_SENTENCES = [
  'Test the outgoing links from all the pages to the specific domain under test.',
  'Test links are used to send emails to admin or other users from web pages.',
  'Options to create forms, if any, form deletes a view or modify the forms.',
  'Wrong inputs in the forms to the fields in the forms.',
  'Check if the instructions provided are perfect to satisfy its purpose.',
  'Application server and Database server interface.',
  'Verify error messages are displayed for invalid login attempts.',
  'Confirm responsive layout on tablet and mobile breakpoints.',
  'Review pull request feedback and apply requested changes.',
  'Update README with deployment instructions for staging.',
  'Audit user permissions on the supervisor dashboard.',
  'Migrate legacy CSV imports to the new endpoint.',
  'Sanity-check the empty state when no tasks are present.',
  'Replace placeholder avatar with real user initials.',
  'Make sure role-based routes redirect unauthorized users.',
];

const PRIORITIES = ['Low', 'Medium', 'High'];
const ASSIGNEES = ['Self', 'Team A', 'Team B', 'Team C', 'Supervisor'];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function seedRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTasks(count = 1000, seed = 2026) {
  const rand = seedRand(seed);
  const start = new Date(2026, 8, 1);
  const list = [];
  const targetPct = { Completed: 17, 'In Progress': 62, Uncompleted: 21 };
  const order = ['Completed', 'In Progress', 'Uncompleted'];
  const cumulative = [
    targetPct.Completed,
    targetPct.Completed + targetPct['In Progress'],
    targetPct.Completed + targetPct['In Progress'] + targetPct.Uncompleted,
  ];

  for (let i = 1; i <= count; i += 1) {
    const roll = Math.floor(rand() * 100);
    let status;
    if (roll < cumulative[0]) status = order[0];
    else if (roll < cumulative[1]) status = order[1];
    else status = order[2];

    let progress;
    if (status === 'Completed') progress = 100;
    else if (status === 'Uncompleted') progress = 0;
    else progress = Math.floor(rand() * 99) + 1;

    const due = new Date(start);
    due.setDate(due.getDate() + Math.floor(rand() * 30));

    const dayIndex = due.getDay();
    const dueDayName = DAYS[dayIndex];

    list.push({
      id: i,
      title: TASK_SENTENCES[Math.floor(rand() * TASK_SENTENCES.length)],
      assignee: ASSIGNEES[Math.floor(rand() * ASSIGNEES.length)],
      priority: PRIORITIES[Math.floor(rand() * PRIORITIES.length)],
      status,
      progress,
      dueDate: due.toISOString().slice(0, 10),
      dueDayName,
      type: TYPES[Math.floor(rand() * TYPES.length)],
      subject: SUBJECTS[Math.floor(rand() * SUBJECTS.length)],
    });
  }
  return list;
}

export function buildDailyProgress(tasks) {
  return WEEKDAYS.map((day) => {
    const dayTasks = tasks.filter((t) => t.dueDayName === day);
    const completed = dayTasks.filter((t) => t.status === 'Completed').length;
    const inProgress = dayTasks.filter((t) => t.status === 'In Progress').length;
    const uncompleted = dayTasks.filter((t) => t.status === 'Uncompleted').length;
    return { day, completed, inProgress, uncompleted };
  });
}

export function buildStatusTotals(tasks) {
  const totals = { Completed: 0, 'In Progress': 0, Uncompleted: 0 };
  tasks.forEach((t) => {
    if (totals[t.status] !== undefined) totals[t.status] += 1;
  });
  return totals;
}