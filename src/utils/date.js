export function getLocalDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateString) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(`${dateString}T12:00:00`));
}

export function calculateStreak(checkins, today = getLocalDateString()) {
  const completedDates = new Set(
    (checkins || [])
      .filter((item) => item.status === 'submitted' || item.status === 'reviewed')
      .map((item) => item.checkin_date),
  );
  let cursor = new Date(`${today}T12:00:00`);
  let streak = 0;
  while (completedDates.has(getLocalDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

