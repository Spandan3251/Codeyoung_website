import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

// A month-grid date picker. Dates are plain "YYYY-MM-DD" strings (the parent's own calendar date),
// so no time-zone maths is needed here. `min` is the first selectable date.
export default function Calendar({ value, min, onChange }) {
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const [month, setMonth] = useState(Number(value.slice(5, 7)) - 1); // 0-11

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const iso = (day) => `${year}-${pad(month + 1)}-${pad(day)}`;
  const minYear = Number(min.slice(0, 4));
  const minMonth = Number(min.slice(5, 7)) - 1;
  const atEarliestMonth = year < minYear || (year === minYear && month <= minMonth);

  function shift(delta) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="cal-nav" onClick={() => shift(-1)} disabled={atEarliestMonth} aria-label="Previous month"><ChevronLeft size={18}/></button>
        <b aria-live="polite">{MONTHS[month]} {year}</b>
        <button type="button" className="cal-nav" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18}/></button>
      </div>
      <div className="calendar-grid" role="grid">
        {WEEKDAYS.map(d => <span key={d} className="cal-weekday">{d}</span>)}
        {cells.map((day, i) => {
          if (!day) return <span key={`blank-${i}`} />;
          const date = iso(day);
          const disabled = date < min;
          return (
            <button
              type="button"
              key={date}
              disabled={disabled}
              aria-label={`${MONTHS[month]} ${day}, ${year}`}
              aria-pressed={date === value}
              className={`cal-day ${date === value ? 'selected' : ''} ${date === min ? 'today' : ''}`}
              onClick={() => onChange(date)}
            >{day}</button>
          );
        })}
      </div>
    </div>
  );
}
