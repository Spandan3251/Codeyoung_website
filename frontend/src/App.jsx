import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import DetailsPage from './pages/DetailsPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import ConfirmationPage from './pages/ConfirmationPage.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage/>}/>
        <Route path="/book" element={<DetailsPage/>}/>
        <Route path="/schedule" element={<SchedulePage/>}/>
        <Route path="/booking/:id" element={<ConfirmationPage/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </Layout>
  );
}
