import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe2, UserRound } from 'lucide-react';
import { useDraft } from '../state/BookingDraft.jsx';
import { browserZone, zoneOptions } from '../timezones.js';
import { COUNTRIES, defaultCountryFor, dialCodeOf } from '../countries.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1: who is booking, and in which time zone are they?
export default function DetailsPage() {
  const { draft, setDraft } = useDraft();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const timezone = draft?.timezone || browserZone();
    return {
      name: draft?.name || '',
      email: draft?.email || '',
      country: draft?.country || defaultCountryFor(timezone),
      phoneNumber: draft?.phoneNumber || '',
      timezone
    };
  });
  const [countryChosen, setCountryChosen] = useState(Boolean(draft?.country));
  const [errors, setErrors] = useState({});

  function update(event) {
    const { name, value } = event.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Until the parent picks a country themselves, follow their time zone.
      if (name === 'timezone' && !countryChosen) next.country = defaultCountryFor(value);
      return next;
    });
    if (name === 'country') setCountryChosen(true);
    setErrors(e => ({ ...e, [name]: '' }));
  }

  function validate() {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Please enter your full name.';
    if (!EMAIL_PATTERN.test(form.email.trim())) found.email = 'Please enter a valid email address.';
    const digits = form.phoneNumber.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 12) found.phoneNumber = 'Enter your phone number without the country code (6–12 digits).';
    return found;
  }

  function submit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setDraft({
      name: form.name.trim(),
      email: form.email.trim(),
      country: form.country,
      phoneNumber: form.phoneNumber.trim(),
      phone: `${dialCodeOf(form.country)}${form.phoneNumber.replace(/\D/g, '')}`,
      timezone: form.timezone
    });
    navigate('/schedule');
  }

  return (
    <div className="page-wrap narrow">
      <section className="page-heading">
        <div className="eyebrow">FREE TRIAL CLASS</div>
        <h1>Book a trial class<span className="period">.</span></h1>
        <p>Tell us a little about you, then choose a time that suits your family. It takes about a minute.</p>
      </section>

      <form className="panel form details-form" onSubmit={submit} noValidate>
        <div className="section-title"><span className="icon-tile"><UserRound/></span><div><h2>Your details</h2><p>We’ll send your class link to this email.</p></div></div>

        <label className="field-label">Parent’s full name
          <input name="name" value={form.name} onChange={update} autoComplete="name" placeholder="e.g. Sarah Johnson" aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label className="field-label">Email address
          <input name="email" type="email" value={form.email} onChange={update} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        <div className="field-label">
          <span>Phone number (with country code)</span>
          <div className="phone-row">
            <select name="country" value={form.country} onChange={update} aria-label="Country code">
              {COUNTRIES.map(([code, name, dial]) => <option key={code} value={code}>{name} ({dial})</option>)}
            </select>
            <input name="phoneNumber" type="tel" inputMode="tel" value={form.phoneNumber} onChange={update} autoComplete="tel-national" placeholder="7700 900123" aria-label="Phone number" aria-invalid={Boolean(errors.phoneNumber)} />
          </div>
          {errors.phoneNumber && <span className="field-error">{errors.phoneNumber}</span>}
        </div>

        <label className="field-label">Your time zone
          <select name="timezone" value={form.timezone} onChange={update}>
            {zoneOptions(form.timezone).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="timezone-note"><Globe2 size={17}/><span>All class times will be shown in your own time zone, and adjust automatically for daylight saving. Your mentor sees the same class in their local time.</span></div>

        <button className="primary-button full" type="submit">Book a Trial Class <ArrowRight size={16}/></button>
      </form>
    </div>
  );
}
