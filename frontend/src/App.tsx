import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import AdminDashboard from './components/AdminDashboard';
import TeacherPortal from './components/TeacherPortal';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/teacher" element={<TeacherPortal />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
