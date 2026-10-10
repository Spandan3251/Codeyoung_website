import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Check, Menu, X } from 'lucide-react';

const STEPS = [['/book', 'Your details'], ['/schedule', 'Pick a time'], ['/booking', 'Confirmed']];

function stepIndex(pathname) {
  if (pathname.startsWith('/booking/')) return 2;
  if (pathname.startsWith('/schedule')) return 1;
  if (pathname.startsWith('/book')) return 0;
  return -1;
}

// Scrolls to #section links, or back to the top on a normal page change.
function useScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el && el.scrollIntoView) { requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' })); return; }
    }
    if (window.scrollTo) { try { window.scrollTo(0, 0); } catch { /* jsdom */ } }
  }, [pathname, hash]);
}

// Highlights the nav item for the section currently on screen (home page only).
function useActiveSection(enabled) {
  const [active, setActive] = useState('home');
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return undefined;
    const ids = ['home', 'courses', 'about'];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [enabled]);
  return active;
}

export default function Layout({ children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const timer = useRef();
  const onHome = location.pathname === '/';
  const active = useActiveSection(onHome);
  const step = stepIndex(location.pathname);
  useScrollManager();

  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Contact and Help are placeholders for now.
  function dummy(label) {
    setMenuOpen(false);
    setNotice(label);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3500);
  }

  const homeActive = onHome && active === 'home';
  const linkClass = (isActive) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      <header className={`topbar site-nav${scrolled ? ' scrolled' : ''}`}>
        <Link className="brand" to="/">
          <span className="brand-mark">c</span>
          <span>codeyoung<span className="brand-light"> trial classes</span></span>
        </Link>

        <button className="nav-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>

        <nav className={`site-links${menuOpen ? ' open' : ''}`} aria-label="Main">
          <NavLink to="/" end className={() => linkClass(homeActive)}>Home</NavLink>
          <NavLink to="/#courses" className={() => linkClass(onHome && active === 'courses')}>Courses</NavLink>
          <NavLink to="/#about" className={() => linkClass(onHome && active === 'about')}>About</NavLink>
          <button type="button" className="nav-link" onClick={() => dummy('Contact')}>Contact</button>
          <button type="button" className="nav-link" onClick={() => dummy('Help')}>Help</button>
          <Link to="/book" className="cta-button nav-cta">Book a Trial Class</Link>
        </nav>
      </header>

      {step >= 0 && (
        <ol className="stepper" aria-label="Booking progress">
          {STEPS.map(([, label], i) => (
            <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="step-dot">{i < step ? <Check size={14}/> : i + 1}</span>
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ol>
      )}

      <main>{children}</main>

      {notice && (
        <div className="toast" role="status">
          <b>{notice} page coming soon</b>
          <span>This is a demo link for now.</span>
        </div>
      )}

      <footer className="site-footer">
        <div className="footer-inner">
          <span className="brand"><span className="brand-mark">c</span><span>codeyoung</span></span>
          <p>Personalized learning starts with one great class.</p>
        </div>
      </footer>
    </div>
  );
}
