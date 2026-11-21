import React from 'react';
import { useAuth } from '../auth/AuthContext';
import Dashboard from './Dashboard';
import FacultyStaffDashboard from './FacultyStaffDashboard';

export default function DashboardEntry() {
  const { profile } = useAuth();
  return profile?.classification === 'Faculty/Staff' ? <FacultyStaffDashboard /> : <Dashboard />;
}
