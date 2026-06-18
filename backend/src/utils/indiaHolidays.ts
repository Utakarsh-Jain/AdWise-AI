/**
 * India national & major gazetted holidays (fixed + variable dates by year).
 * Variable festival dates sourced from RBI / government holiday calendars.
 */

const FIXED_INDIA_HOLIDAYS: Array<[month: number, day: number]> = [
  [1, 26], // Republic Day
  [8, 15], // Independence Day
  [10, 2], // Gandhi Jayanti
  [12, 25], // Christmas
];

/** Variable festival / gazetted holidays per year (YYYY-MM-DD). */
const VARIABLE_INDIA_HOLIDAYS: Record<number, string[]> = {
  2024: [
    '2024-03-25', // Holi
    '2024-03-29', // Good Friday
    '2024-04-11', // Eid ul-Fitr
    '2024-08-19', // Raksha Bandhan
    '2024-08-26', // Janmashtami
    '2024-09-07', // Ganesh Chaturthi
    '2024-10-12', // Dussehra
    '2024-10-31', // Diwali
    '2024-11-15', // Guru Nanak Jayanti
  ],
  2025: [
    '2025-03-14', // Holi
    '2025-03-31', // Eid ul-Fitr
    '2025-04-18', // Good Friday
    '2025-08-09', // Raksha Bandhan
    '2025-08-16', // Janmashtami
    '2025-08-27', // Ganesh Chaturthi
    '2025-10-02', // Dussehra
    '2025-10-20', // Diwali
    '2025-11-05', // Guru Nanak Jayanti
  ],
  2026: [
    '2026-03-03', // Holi
    '2026-03-21', // Eid ul-Fitr
    '2026-04-03', // Good Friday
    '2026-05-28', // Bakri Eid
    '2026-08-28', // Raksha Bandhan
    '2026-09-04', // Janmashtami
    '2026-09-14', // Ganesh Chaturthi
    '2026-10-20', // Dussehra
    '2026-11-08', // Diwali
    '2026-11-24', // Guru Nanak Jayanti
  ],
  2027: [
    '2027-03-22', // Holi
    '2027-03-10', // Eid ul-Fitr
    '2027-03-26', // Good Friday
    '2027-08-18', // Raksha Bandhan
    '2027-08-25', // Janmashtami
    '2027-09-04', // Ganesh Chaturthi
    '2027-10-09', // Dussehra
    '2027-10-29', // Diwali
    '2027-11-14', // Guru Nanak Jayanti
  ],
  2028: [
    '2028-03-11', // Holi
    '2028-02-27', // Eid ul-Fitr
    '2028-04-14', // Good Friday
    '2028-08-06', // Raksha Bandhan
    '2028-08-14', // Janmashtami
    '2028-08-24', // Ganesh Chaturthi
    '2028-09-28', // Dussehra
    '2028-11-17', // Diwali
    '2028-11-03', // Guru Nanak Jayanti
  ],
  2029: [
    '2029-02-28', // Holi
    '2029-02-16', // Eid ul-Fitr
    '2029-03-30', // Good Friday
    '2029-08-26', // Raksha Bandhan
    '2029-09-03', // Janmashtami
    '2029-09-13', // Ganesh Chaturthi
    '2029-10-18', // Dussehra
    '2029-11-06', // Diwali
    '2029-11-23', // Guru Nanak Jayanti
  ],
  2030: [
    '2030-03-19', // Holi
    '2030-02-05', // Eid ul-Fitr
    '2030-04-19', // Good Friday
    '2030-08-15', // Raksha Bandhan (also Independence Day)
    '2030-08-23', // Janmashtami
    '2030-09-02', // Ganesh Chaturthi
    '2030-10-07', // Dussehra
    '2030-10-26', // Diwali
    '2030-11-12', // Guru Nanak Jayanti
  ],
  2031: [
    '2031-03-08', // Holi
    '2031-01-26', // Eid ul-Fitr (approx)
    '2031-04-11', // Good Friday
    '2031-08-04', // Raksha Bandhan
    '2031-08-12', // Janmashtami
    '2031-08-22', // Ganesh Chaturthi
    '2031-09-26', // Dussehra
    '2031-11-15', // Diwali
    '2031-11-01', // Guru Nanak Jayanti
  ],
};

const variableSetCache = new Map<number, Set<string>>();

function getVariableSet(year: number): Set<string> {
  if (!variableSetCache.has(year)) {
    variableSetCache.set(year, new Set(VARIABLE_INDIA_HOLIDAYS[year] ?? []));
  }
  return variableSetCache.get(year)!;
}

/** True when date is a major India public / gazetted holiday. */
export function isIndiaHoliday(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);

  for (const [m, d] of FIXED_INDIA_HOLIDAYS) {
    if (month === m && day === d) return true;
  }

  return getVariableSet(year).has(dateStr);
}
