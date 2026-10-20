import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<div className="loading-state">Loading marketplace…</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="browse" element={<Browse />} />
            <Route path="sell" element={<Sell />} />
            <Route path="rentals" element={<Rentals />} />
            <Route path="messages" element={<Messages />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="items/:id" element={<ItemDetails />} />
          </Route>
          <Route path="/sell/mobile" element={<SellMobile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
