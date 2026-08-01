export function generateCampaignSchedule(startDate: Date, endDate: Date, totalItems: number): Date[] {
  if (totalItems <= 0) return [];
  if (totalItems === 1) return [new Date(endDate)];

  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const durationMs = endMs - startMs;
  
  const dates: Date[] = [];
  for (let i = 1; i <= totalItems; i++) {
    // Distribute evenly up to the end date
    const fraction = i / totalItems;
    const offsetMs = durationMs * fraction;
    dates.push(new Date(startMs + offsetMs));
  }
  
  return dates;
}
