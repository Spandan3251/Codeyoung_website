import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarX2, Clock3, ArrowRight } from 'lucide-react';
import { api } from '../api.js';
import Calendar from '../components/Calendar.jsx';
import { useDraft } from '../state/BookingDraft.jsx';
import { todayIn, zoneLabel } from '../timezones.js';

const prettyDate = (iso) => new Date(`${iso}T00:00:00Z`)
  .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Step 2: pick a date on the calendar (left) and a time slot for that date (right).
export default function SchedulePage() {
  const { draft } = useDraft();
  const navigate = useNavigate();
  const today = draft ? todayIn(draft.timezone) : '';
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState(null); // null = loading
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');         // problems while confirming a booking
  const [loadError, setLoadError] = useState(''); // problems while loading the slot list

  async function loadSlots(forDate = date) {
    try {
      const result = await api.availability(forDate, draft.timezone);
      setLoadError('');
      setSlots(result.slots);
    } catch (err) {
      setSlots([]);
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    if (!draft) return;
    setSlots(null);
    setSelected('');
    setError('');
    setLoadError('');
    loadSlots(date);
  }, [date]);

  if (!draft) return <Navigate to="/book" replace />;

  async function confirm() {
    if (!selected || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await api.book({
        name: draft.name, email: draft.email, phone: draft.phone,
        startLocal: selected, parentTimezone: draft.timezone
      });
      navigate(`/booking/${result.booking.id}`, { state: { notification: result.notification } });
    } catch (err) {
      setError(err.message);
      setSelected('');
      await loadSlots(); // e.g. someone else took the slot a moment ago: show what is left
    } finally {
      setSubmitting(false);
    }
  }

  const loading = slots === null;

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <div className="eyebrow">STEP 2 OF 2</div>
        <h1>Choose a date &amp; time<span className="period">.</span></h1>
        <p>Booking for <b>{draft.name}</b> · times shown in <b>{zoneLabel(draft.timezone)}</b> · <Link className="text-link inline" to="/book">Change details</Link></p>
      </section>

      <div className="booking-grid schedule-grid">
        <section className="panel">
          <div className="section-title"><span className="icon-tile"><CalendarDays/></span><div><h2>Select a date</h2><p>Pick any day on the calendar.</p></div></div>
          <Calendar value={date} min={today} onChange={setDate} />
        </section>

        <section className="panel slots-panel">
          <div className="section-title"><span className="icon-tile"><Clock3/></span><div><h2>Available time slots</h2><p>{prettyDate(date)}</p></div></div>

          {loading ? <div className="empty-state">Finding available mentors…</div>
          : loadError ? (
            <div className="empty-state no-slots" role="alert">
              <CalendarX2 size={32}/>
              <b>Couldn’t load time slots</b>
              <span>{loadError}</span>
              <button type="button" className="outline-button" onClick={() => { setSlots(null); loadSlots(); }}>Try again</button>
            </div>
          ) : slots.length === 0 ? (
            <div className="empty-state no-slots">
              <CalendarX2 size={32}/>
              <b>No Slots Available</b>
              <span>{date === today ? 'No slot is available today! You can try to book tomorrow.' : 'No slot is available on this day. Please try another date on the calendar.'}</span>
            </div>
          ) : (
            <>
              <p className="slot-count"><b>{slots.length}</b> time {slots.length === 1 ? 'slot' : 'slots'} available on this day</p>
              <div className="slots-grid">
                {slots.map(slot => (
                  <button type="button" key={slot.startLocal} className={`slot ${selected === slot.startLocal ? 'selected' : ''}`} onClick={() => setSelected(slot.startLocal)}>
                    {slot.displayTime}
                  </button>
                ))}
              </div>
              <div className="slot-footer">
                <span>Each class is 60 minutes.</span>
                <button className="primary-button" onClick={confirm} disabled={!selected || submitting}>{submitting ? 'Booking…' : 'Confirm booking'} <ArrowRight size={16}/></button>
              </div>
            </>
          )}
          {error && <div className="alert error" role="alert">{error}</div>}
        </section>
      </div>
    </div>
  );
}
