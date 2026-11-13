import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './auth/AuthContext';
import './index.css';

const Home = lazy(() => import('./pages/Home'));
const Browse = lazy(() => import('./pages/Browse'));
const ItemDetails = lazy(() => import('./pages/ItemDetails'));
const Sell = lazy(() => import('./pages/Sell'));
const Rentals = lazy(() => import('./pages/Rentals'));
const Messages = lazy(() => import('./pages/Messages'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SellMobile = lazy(() => import('./pages/SellMobile'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Admin = lazy(() => import('./pages/Admin'));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Suspense fallback={<div className="loading-state">Loading marketplace…</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="browse" element={<Browse />} />
              <Route path="sell" element={<RequireAuth><Sell /></RequireAuth>} />
              <Route path="rentals" element={<RequireAuth><Rentals /></RequireAuth>} />
              <Route path="messages" element={<RequireAuth><Messages /></RequireAuth>} />
              <Route path="dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="items/:id" element={<ItemDetails />} />
            </Route>
            <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
              <Route index element={<Navigate to="pending-listings" replace />} />
              <Route path="pending-listings" element={<Admin section="listings" />} />
              <Route path="verify-accounts" element={<Admin section="accounts" />} />
              <Route path="reports" element={<Admin section="reports" />} />
              <Route path="moderation-log" element={<Admin section="logs" />} />
            </Route>
            <Route path="/sell/mobile" element={<RequireAuth><SellMobile /></RequireAuth>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
