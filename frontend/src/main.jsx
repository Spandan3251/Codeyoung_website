import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BookingDraftProvider } from './state/BookingDraft.jsx';
import App from './App.jsx';
import './styles.css';
import './theme.css'; // sky-blue + white theme, must load after styles.css so it can override it

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BookingDraftProvider>
        <App />
      </BookingDraftProvider>
    </BrowserRouter>
  </React.StrictMode>
);
