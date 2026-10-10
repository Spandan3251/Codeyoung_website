// Content for the marketing home page. Edit the text here — no component changes needed.
import programming from '../assets/programming.jpg';
import maths from '../assets/maths.jpg';
import science from '../assets/science.jpg';
import english from '../assets/english.jpg';
import robotics from '../assets/robotics.jpg';

export const COURSES = [
  { id: 'programming', image: programming, fit: 'cover', name: 'Programming', icon: 'code', tone: 'indigo', tagline: 'Build games, apps and websites.',
    topics: ['Scratch', 'Python', 'Web basics', 'Game design'], blurb: 'Kids go from drag-and-drop blocks to real code, building projects they are proud to show off.' },
  { id: 'maths', image: maths, fit: 'cover', name: 'Maths', icon: 'calc', tone: 'amber', tagline: 'Make numbers feel friendly.',
    topics: ['Mental maths', 'Fractions', 'Algebra', 'Olympiad prep'], blurb: 'Concepts explained step by step at your child’s pace, so confidence grows with every class.' },
  { id: 'science', image: science, fit: 'contain', name: 'Science', icon: 'flask', tone: 'teal', tagline: 'Experiments that spark curiosity.',
    topics: ['Physics', 'Chemistry', 'Biology', 'Experiments'], blurb: 'Hands-on, question-led lessons that turn “why?” into a love of discovering how things work.' },
  { id: 'english', image: english, fit: 'contain', name: 'English', icon: 'book', tone: 'rose', tagline: 'Read, write and speak with confidence.',
    topics: ['Phonics', 'Grammar', 'Creative writing', 'Speaking'], blurb: 'Vocabulary, writing and spoken fluency, taught through stories and conversation.' },
  { id: 'robotics', image: robotics, fit: 'contain', name: 'Robotics', icon: 'bot', tone: 'violet', tagline: 'Design it. Code it. Watch it move.',
    topics: ['Sensors', 'Motors', 'Circuits', 'Automation'], blurb: 'Learn how robots sense and move by combining simple electronics with beginner-friendly coding.' }
];

export const TOPICS = [
  { emoji: '📱', label: 'Screen time' },
  { emoji: '📚', label: 'Study habits' },
  { emoji: '✏️', label: 'Homework wins' },
  { emoji: '✨', label: 'Confidence' },
  { emoji: '🔢', label: 'Math & English' },
  { emoji: '💻', label: 'Coding & AI' },
  { emoji: '🎓', label: 'Free webinars' }
];

export const FEATURES = [
  { icon: 'user', title: 'One child. One mentor.', text: 'Every class is 1:1, so your child gets real attention instead of fighting for it.' },
  { icon: 'chart', title: 'Clear progress', text: 'Know exactly what was learned and what comes next after every session.' },
  { icon: 'globe', title: 'Any time zone', text: 'Pick a slot in your own time zone — we handle the conversion for your mentor.' },
  { icon: 'gift', title: 'Free trial class', text: 'Meet a mentor and see your child learn live before you decide anything.' }
];

export const STEPS = [
  { n: 1, title: 'Share your details', text: 'Tell us who is booking and where you are in the world.' },
  { n: 2, title: 'Pick a date & time', text: 'Choose a slot that suits your family from live availability.' },
  { n: 3, title: 'Join the class', text: 'We match a mentor and email you the class link instantly.' }
];

// PLACEHOLDER REVIEWS — sample copy for the design only.
// Replace these with real, permissioned parent reviews before this site goes live.
export const REVIEWS = [
  { name: 'Parent of a Grade 4 learner', place: 'Programming', stars: 5, text: 'My daughter went from “I don’t like computers” to showing us her own little game. The mentor was patient and kind.' },
  { name: 'Parent of a Grade 6 learner', place: 'Maths', stars: 5, text: 'Fractions finally make sense to him. The one-to-one pace is the difference — no feeling left behind.' },
  { name: 'Parent of a Grade 3 learner', place: 'English', stars: 5, text: 'Booking was quick and the time showed in our own time zone. The trial class was relaxed and fun.' },
  { name: 'Parent of a Grade 7 learner', place: 'Robotics', stars: 5, text: 'He built a sensor-driven car in a few classes and could not stop talking about it at dinner.' },
  { name: 'Parent of a Grade 5 learner', place: 'Science', stars: 4, text: 'Lots of hands-on experiments and endless “why” questions answered. She looks forward to every session.' }
];
