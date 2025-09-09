import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './Register.jsx';
import Login from './Login.jsx';
import ResetPassword from './ResetPassword.jsx';
import Activate from './Activate.jsx';
import FirstAccess from './FirstAccess.jsx';
import DesktopDashboard from './components/Desktop/DesktopDashboard.jsx';
import DesktopDashboardAdmin from './components/Desktop/DesktopDashboardAdmin.jsx';
import Requests from './Requests.jsx';
import NewRequest from './NewRequest.jsx';
import PixGeneration from './PixGeneration.jsx';
import Patients from './Patients.jsx';
import Help from './Help.jsx';
import NotFound from './NotFound.jsx';
import { PatientProvider } from './context/PatientContext.jsx'; // Importar o Provider
import './styles/design-system.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/theme.css';

// Root of the React application. Defines routes for each page. When
// first visiting the site, users are redirected to the login page.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PatientProvider> {/* Envolver as rotas com o Provider */}
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/first-access" element={<FirstAccess />} />
          <Route path="/dashboard" element={<DesktopDashboard />} />
          <Route path="/admin" element={<DesktopDashboardAdmin />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/new-request" element={<NewRequest />} />
          <Route path="/generate-pix" element={<PixGeneration />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PatientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
