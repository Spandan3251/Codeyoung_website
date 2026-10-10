import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mail, XCircle } from 'lucide-react';
import { api } from '../api.js';

// Step 3: confirmation. Reachable again from the "cancel" link in the confirmation email.
export default function ConfirmationPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const notification = state?.notification;
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.getBooking(id).then(r => setBooking(r.booking)).catch(err => setError(err.message));
  }, [id]);

  async function cancel() {
    if (!window.confirm(`Cancel your trial class on ${booking.parentLocalTime}?`)) return;
    setError('');
    setCancelling(true);
    try { setBooking((await api.cancelBooking(id)).booking); }
    catch (err) { setError(err.message); }
    finally { setCancelling(false); }
  }

  if (!booking) {
    return <div className="page-wrap narrow">{error
      ? <div className="empty-state large"><b>We couldn’t find that booking</b><span>{error}</span><Link className="primary-button" to="/book">Book a trial class</Link></div>
      : <div className="empty-state">Loading your booking…</div>}</div>;
  }

  const cancelled = booking.status === 'cancelled';
  const started = new Date(booking.startAt).getTime() <= Date.now();

  return (
    <div className="page-wrap narrow">
      <section className={`ticket${cancelled ? ' is-cancelled' : ''}`}>
        <div className="ticket-main">
          <span className="ticket-status">{cancelled ? <XCircle size={16}/> : <CheckCircle2 size={16}/>} {cancelled ? 'Cancelled' : 'Confirmed'}</span>
          <h2>{cancelled ? 'This trial class was cancelled' : 'Your trial class is booked!'}</h2>
          <dl className="ticket-rows">
            <div><dt>Mentor</dt><dd>{booking.mentor.name}</dd></div>
            <div><dt>Your time</dt><dd>{booking.parentLocalTime}</dd></div>
          </dl>
          {!cancelled && <p className="ticket-note"><Mail size={16}/><span>{notification?.mode === 'console'
            ? <>Demo mode: the emails to you and your mentor are printed in the API terminal.</>
            : <>A confirmation with your class link was emailed to {notification?.emailedTo ? <b>{notification.emailedTo}</b> : 'you'} and to your mentor.</>}</span></p>}
        </div>
        <div className="ticket-stub">
          {!cancelled && <a className="meeting-link" href={booking.meetingLink} target="_blank" rel="noreferrer">Open demo class link <ArrowRight size={16}/></a>}
          <div className="ticket-ref"><span>Booking reference</span><code>{booking.id}</code></div>
        </div>
      </section>

      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="confirm-actions">
        {!cancelled && !started && <button className="danger-button" onClick={cancel} disabled={cancelling}><XCircle size={15}/> {cancelling ? 'Cancelling…' : 'Cancel this booking'}</button>}
        <Link className="outline-button" to={cancelled ? '/book' : '/'}>{cancelled ? 'Book a new trial class' : 'Back to start'}</Link>
      </div>
    </div>
  );
}
