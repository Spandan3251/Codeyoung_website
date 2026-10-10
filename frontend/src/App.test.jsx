import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import Calendar from './components/Calendar.jsx';
import { BookingDraftProvider } from './state/BookingDraft.jsx';

const booking = {
  id: '11111111-1111-4111-8111-111111111111', status: 'confirmed',
  startAt: new Date(Date.now() + 5 * 86400000).toISOString(), endAt: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(),
  meetingLink: 'https://demo.codeyoung.example/class/abc', parentName: 'Sarah Johnson', parentTimezone: 'Europe/London',
  parentLocalTime: 'Mon, Oct 12, 2026, 5:30 PM – 6:30 PM BST (UTC+01:00)',
  mentorLocalTime: 'Mon, Oct 12, 2026, 10:00 PM – 11:00 PM IST (UTC+05:30)',
  mentor: { name: 'Mentor 04', timezone: 'Asia/Kolkata' }
};

let calls;
function mockApi({ slotsByCall = [] } = {}) {
  calls = [];
  let availabilityCall = 0;
  globalThis.fetch = vi.fn(async (url, options = {}) => {
    const path = String(url).replace(/^.*\/api/, '');
    calls.push({ path, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
    const ok = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
    if (path.startsWith('/availability')) {
      const slots = slotsByCall[Math.min(availabilityCall++, slotsByCall.length - 1)] ?? [];
      return ok({ slots });
    }
    if (path === '/bookings' && options.method === 'POST') return ok({ booking, notification: { emailedTo: 'sarah@example.com', mode: 'smtp' } }, 201);
    if (path.endsWith('/cancel')) return ok({ booking: { ...booking, status: 'cancelled' } });
    if (path.startsWith('/bookings/')) return ok({ booking });
    return ok({}, 404);
  });
}

const slot = (h) => ({ startLocal: `2030-01-01T${h}:00`, startAt: '2030-01-01T00:00:00Z', displayTime: `${h}:00 BST` });
const renderApp = (path = '/book') => render(<MemoryRouter initialEntries={[path]}><BookingDraftProvider><App/></BookingDraftProvider></MemoryRouter>);

async function fillDetails(user) {
  await user.type(screen.getByLabelText(/full name/i), 'Sarah Johnson');
  await user.type(screen.getByLabelText(/email address/i), 'sarah@example.com');
  await user.type(screen.getByLabelText('Phone number'), '7700 900123');
  await user.selectOptions(screen.getByLabelText(/time zone/i), 'Europe/London');
}

describe('parent booking journey (no login)', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('has no login or registration anywhere', () => {
    mockApi();
    renderApp();
    expect(screen.queryByText(/log ?in|sign ?in|register|password/i)).toBeNull();
    expect(screen.getByRole('button', { name: /book a trial class/i })).toBeInTheDocument();
  });

  it('validates the details before continuing', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /book a trial class/i }));
    expect(screen.getByText(/enter your full name/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number without the country code/i)).toBeInTheDocument();
    expect(screen.queryByText(/select a date/i)).toBeNull();
  });

  it('defaults the phone country from the time zone', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp();
    await user.selectOptions(screen.getByLabelText(/time zone/i), 'Asia/Kolkata');
    expect(screen.getByLabelText('Country code')).toHaveValue('IN');
    await user.selectOptions(screen.getByLabelText(/time zone/i), 'Europe/London');
    expect(screen.getByLabelText('Country code')).toHaveValue('GB');
  });

  it('details → calendar + slots → confirm → confirmation, with the right API payload', async () => {
    mockApi({ slotsByCall: [[slot('09'), slot('10'), slot('11')]] });
    const user = userEvent.setup();
    renderApp();
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /book a trial class/i }));

    expect(await screen.findByText(/select a date/i)).toBeInTheDocument();
    const count = await screen.findByText(/time slots available on this day/i);
    expect(count.closest('p')).toHaveTextContent('3 time slots available on this day');

    const confirm = screen.getByRole('button', { name: /confirm booking/i });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '10:00 BST' }));
    await user.click(confirm);

    expect(await screen.findByText(/your trial class is booked/i)).toBeInTheDocument();
    expect(screen.getByText(/5:30 PM – 6:30 PM BST/)).toBeInTheDocument();
    expect(screen.getByText(/Mentor 04/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open demo class link/i })).toHaveAttribute('href', booking.meetingLink);

    const post = calls.find(c => c.method === 'POST');
    expect(post.body).toMatchObject({ name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+447700900123', parentTimezone: 'Europe/London', startLocal: '2030-01-01T10:00' });
  });

  it('shows "No Slots Available" when every mentor is full', async () => {
    mockApi({ slotsByCall: [[]] });
    const user = userEvent.setup();
    renderApp();
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /book a trial class/i }));
    expect(await screen.findByText('No Slots Available')).toBeInTheDocument();
    expect(screen.getByText(/no slot is available today! you can try to book tomorrow/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm booking/i })).toBeNull();
  });

  it('says so when the server cannot be reached (and does not claim there are no slots)', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp();
    await fillDetails(user);
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await user.click(screen.getByRole('button', { name: /book a trial class/i }));
    expect(await screen.findByText(/couldn’t load time slots/i)).toBeInTheDocument();
    expect(screen.getByText(/couldn’t reach the booking server/i)).toBeInTheDocument();
    expect(screen.queryByText('No Slots Available')).toBeNull();

    mockApi({ slotsByCall: [[slot('09')]] }); // server comes back
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText(/time slot available on this day/i)).toBeInTheDocument();
  });

  it('re-queries slots when another date is picked and cannot pick past dates', async () => {
    mockApi({ slotsByCall: [[slot('09')], []] });
    const user = userEvent.setup();
    renderApp();
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /book a trial class/i }));
    const count = await screen.findByText(/time slot available on this day/i);
    expect(count.closest('p')).toHaveTextContent('1 time slot available on this day');

    const grid = screen.getByRole('grid');
    const enabledDays = within(grid).getAllByRole('button').filter(b => !b.disabled);
    const next = enabledDays.find(b => b.getAttribute('aria-pressed') === 'false');
    await user.click(next);
    expect(await screen.findByText('No Slots Available')).toBeInTheDocument();
    expect(calls.filter(c => c.path.startsWith('/availability')).length).toBe(2);

  });

  it('sends a parent straight back to step 1 if they open /schedule without details', async () => {
    mockApi();
    renderApp('/schedule');
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('lets a parent cancel from the confirmation page', async () => {
    mockApi();
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    renderApp(`/booking/${booking.id}`);
    await user.click(await screen.findByRole('button', { name: /cancel this booking/i }));
    await waitFor(() => expect(screen.getByText(/was cancelled/i)).toBeInTheDocument());
  });
});

describe('calendar', () => {
  it('disables every date before today and the previous-month button', () => {
    render(<Calendar value="2030-01-20" min="2030-01-15" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'January 14, 2030' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'January 1, 2030' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'January 15, 2030' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'January 20, 2030' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /previous month/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next month/i })).toBeEnabled();
  });

  it('can move forward to later months and pick a date', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Calendar value="2030-01-20" min="2030-01-15" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('February 2030')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'February 3, 2030' }));
    expect(onChange).toHaveBeenCalledWith('2030-02-03');
  });
});

describe('home page and navigation', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('shows the landing page at / with the booking CTA, courses, newsletter and reviews', () => {
    mockApi();
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/learn with joy and confidence/i);
    expect(screen.getAllByRole('link', { name: /book a (free )?trial class/i }).length).toBeGreaterThan(0);
    for (const c of ['Programming', 'Maths', 'Science', 'English', 'Robotics']) expect(screen.getAllByText(c).length).toBeGreaterThan(0);
    expect(screen.getByText(/smart parenting starts here/i)).toBeInTheDocument();
    expect(screen.getByText(/what parents say/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your question or comment/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
  });

  it('opens the booking form from the nav button, then continues through the flow', async () => {
    mockApi({ slotsByCall: [[slot('09')]] });
    const user = userEvent.setup();
    renderApp('/');
    await user.click(within(screen.getByRole('navigation', { name: /main/i })).getByRole('link', { name: /book a trial class/i }));
    expect(await screen.findByLabelText(/full name/i)).toBeInTheDocument();
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: /book a trial class/i }));
    expect(await screen.findByText(/time slot available on this day/i)).toBeInTheDocument();
  });

  it('Contact and Help are dummy links that only show a notice', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByRole('status')).toHaveTextContent(/contact page coming soon/i);
    await user.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByRole('status')).toHaveTextContent(/help page coming soon/i);
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
  });

  it('Home link returns to the landing page from the booking form', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp('/book');
    await user.click(within(screen.getByRole('navigation', { name: /main/i })).getByRole('link', { name: 'Home' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/learn with joy and confidence/i);
  });

  it('expands a course card and subscribes/sends comments as harmless demos', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: /programming/i }));
    expect(screen.getByText('Scratch')).toBeVisible();
    await user.type(screen.getByLabelText(/newsletter email/i), 'a@b.co');
    await user.click(screen.getByRole('button', { name: /subscribe/i }));
    expect(screen.getByText(/you’re on the list/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/your question or comment/i), 'Hello?');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByText(/thanks for your message/i)).toBeInTheDocument();
    expect(calls.length).toBe(0);
  });
});
