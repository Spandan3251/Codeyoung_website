import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronLeft, ChevronRight, Gift, Globe2, Send, Sparkles, Star, UserRound, Video } from 'lucide-react';
import { COURSES, FEATURES, REVIEWS, STEPS, TOPICS } from '../data/home.js';
import heroBoy from '../assets/hero-boy.jpg';
import '../home.css';

const FEATURE_ICONS = { user: UserRound, chart: BarChart3, globe: Globe2, gift: Gift };

function goTo(id) { return (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth' }); }; }

function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero-copy">
        <span className="pill"><span className="pill-dot"/> Free trial class · Live 1:1 mentors</span>
        <h1>Helping every child learn with <em>joy and confidence</em></h1>
        <p className="hero-sub">Fun, friendly one-to-one live classes in coding, maths, science, English and robotics, built around your child’s pace and your family’s schedule.</p>
        <div className="hero-actions">
          <Link to="/book" className="cta-button big">Book a FREE trial class <ArrowRight size={18}/></Link>
          <a href="#courses" className="ghost-link" onClick={goTo('courses')}>Explore courses</a>
        </div>
        <ul className="hero-points">
          <li>✓ No payment details</li><li>✓ No sign-up</li><li>✓ Pick your own time</li>
        </ul>
      </div>

      <div className="hero-photo">
        <div className="photo-ring" aria-hidden="true"/>
        <div className="photo-arch"><img src={heroBoy} alt="Smiling student holding his school books" /></div>
        <span className="float-badge badge-live"><Video size={14}/> Live 1:1 class</span>
        <span className="float-badge badge-free"><Sparkles size={14}/> Free trial class</span>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="features" aria-label="Why parents choose us">
      {FEATURES.map(f => {
        const Icon = FEATURE_ICONS[f.icon];
        return (
          <div key={f.title} className="feature">
            <span className="feature-icon"><Icon size={22}/></span>
            <b>{f.title}</b>
            <p>{f.text}</p>
          </div>
        );
      })}
    </section>
  );
}

function Courses() {
  const [open, setOpen] = useState(null);
  return (
    <section id="courses" className="courses">
      <div className="section-head">
        <span className="eyebrow">COURSES</span>
        <h2>Pick what your child will love</h2>
        <p>Five subjects, one mentor per child. Tap a card to see what’s inside.</p>
      </div>
      <div className="course-grid">
        {COURSES.map((c, i) => {
          const isOpen = open === c.id;
          return (
            <article key={c.id} className={`course-card${isOpen ? ' open' : ''}`} style={{ '--i': i }}>
              <button type="button" className="course-hit" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.id)}>
                <span className={`course-pic ${c.fit}`}><img src={c.image} alt="" /></span>
                <b className="course-name">{c.name}</b>
                <span className="course-tag">{c.tagline}</span>
                <span className="course-more">{isOpen ? 'Show less' : 'What’s inside'}</span>
              </button>
              <div className="course-detail" hidden={!isOpen}>
                <p>{c.blurb}</p>
                <div className="chips">{c.topics.map(t => <span key={t}>{t}</span>)}</div>
                <Link to="/book" className="cta-button small">Try a free class <ArrowRight size={14}/></Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="how">
      <div className="section-head">
        <span className="eyebrow">HOW IT WORKS</span>
        <h2>From click to classroom in three steps</h2>
      </div>
      <ol className="how-steps">
        {STEPS.map(s => (
          <li key={s.n}><span className="how-n">{s.n}</span><b>{s.title}</b><p>{s.text}</p></li>
        ))}
      </ol>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="about">
      <div className="about-card">
        <div>
          <span className="eyebrow">ABOUT US</span>
          <h2>Personalized learning starts with one great class</h2>
          <p>We pair every child with a dedicated mentor for live, one-to-one sessions. No crowded classrooms, no pre-recorded videos — just a mentor who knows your child’s name, pace and goals.</p>
          <p>Your free trial is a no-pressure way to see it in action. Pick a time, meet the mentor, and watch your child light up.</p>
          <Link to="/book" className="cta-button">Book a Trial Class <ArrowRight size={16}/></Link>
        </div>
        <ul className="about-list">
          <li><b>Live &amp; interactive</b><span>Real conversations, not recordings.</span></li>
          <li><b>Matched mentors</b><span>We assign a free mentor automatically.</span></li>
          <li><b>Parent-friendly</b><span>Class link and reminders sent to your email.</span></li>
        </ul>
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  function submit(e) {
    e.preventDefault();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) setDone(true);
  }
  return (
    <section className="newsletter">
      <div className="news-card">
        <div className="news-copy">
          <span className="eyebrow">NEWSLETTER</span>
          <h2>Parenting<br/>Matters.</h2>
          <h3>Smart parenting starts here.</h3>
          <p>Practical parenting insights, screen-time strategies, study and homework habits, plus tips on math, English, coding, and other future skills, delivered to your inbox every week.</p>
        </div>
        <div className="news-side">
          <b>Every week, we cover things like</b>
          <ul className="topic-list">
            {TOPICS.map(t => <li key={t.label}><span>{t.emoji}</span>{t.label}</li>)}
          </ul>
          {done
            ? <div className="subscribed" role="status">🎉 Thanks! You’re on the list (demo only — nothing was sent).</div>
            : <form className="subscribe" onSubmit={submit}>
                <input type="email" placeholder="Your email address" aria-label="Newsletter email" value={email} onChange={e => setEmail(e.target.value)} />
                <button type="submit" className="cta-button small">Subscribe</button>
              </form>}
        </div>
      </div>
    </section>
  );
}

function Reviews() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setI(n => (n + 1) % REVIEWS.length), 6000);
    return () => clearInterval(t);
  }, [paused]);
  const go = (d) => setI(n => (n + d + REVIEWS.length) % REVIEWS.length);
  return (
    <section className="reviews" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="section-head">
        <span className="eyebrow">PARENT REVIEWS</span>
        <h2>What parents say</h2>
      </div>
      <div className="review-stage">
        <button type="button" className="rv-nav" onClick={() => go(-1)} aria-label="Previous review"><ChevronLeft size={20}/></button>
        <div className="review-track">
          {REVIEWS.map((r, idx) => (
            <figure key={idx} className={`review${idx === i ? ' active' : ''}`} aria-hidden={idx !== i}>
              <div className="stars" aria-label={`${r.stars} out of 5 stars`}>{[0,1,2,3,4].map(s => <Star key={s} size={16} className={s < r.stars ? 'on' : ''}/>)}</div>
              <blockquote>“{r.text}”</blockquote>
              <figcaption><span className="rv-avatar">{r.name.charAt(0)}</span><span><b>{r.name}</b><small>{r.place} class</small></span></figcaption>
            </figure>
          ))}
        </div>
        <button type="button" className="rv-nav" onClick={() => go(1)} aria-label="Next review"><ChevronRight size={20}/></button>
      </div>
      <div className="rv-dots">{REVIEWS.map((_, idx) => <button key={idx} type="button" className={idx === i ? 'on' : ''} onClick={() => setI(idx)} aria-label={`Show review ${idx + 1}`}/>)}</div>
    </section>
  );
}

// Dummy: nothing is sent anywhere.
function DoubtBox() {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section className="doubt">
      <div className="doubt-card">
        <div>
          <h2>Have a doubt or a comment?</h2>
          <p>Ask us anything about classes, timings or mentors.</p>
        </div>
        {sent
          ? <div className="subscribed" role="status">Thanks for your message! (demo only — nothing was sent)</div>
          : <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) setSent(true); }}>
              <textarea rows={3} placeholder="Type your question or comment here…" aria-label="Your question or comment" value={text} onChange={e => setText(e.target.value)} />
              <button type="submit" className="cta-button small"><Send size={14}/> Send</button>
            </form>}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="home">
      <Hero/>
      <Features/>
      <Courses/>
      <HowItWorks/>
      <About/>
      <Newsletter/>
      <Reviews/>
      <DoubtBox/>
    </div>
  );
}
