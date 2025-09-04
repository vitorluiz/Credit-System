import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './Register.jsx';
import Login from './Login.jsx';
import ResetPassword from './ResetPassword.jsx';
import Activate from './Activate.jsx';
import FirstAccess from './FirstAccess.jsx';
import Dashboard from './Dashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import Requests from './Requests.jsx';
import NewRequest from './NewRequest.jsx';
import './style.css';

// Root of the React application. Defines routes for each page. When
// first visiting the site, users are redirected to the login page.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/first-access" element={<FirstAccess />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/new-request" element={<NewRequest />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
