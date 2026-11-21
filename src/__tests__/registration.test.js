import React from 'react';
import { fireEvent, render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../pages/Signup';
import Login from '../pages/Login';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { isCitEmail } from '../utils/validation';
import RequireAuth from '../components/RequireAuth';
import AdminLayout from '../components/AdminLayout';
import Admin from '../pages/Admin';
import DashboardEntry from '../pages/DashboardEntry';
import Sell from '../pages/Sell';
import useMarketplaceListings from '../hooks/useMarketplaceListings';
import { readStore, writeStore } from '../data/localStore';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';

function AccountStatus() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const logout = async () => { await signOut(); navigate('/login'); };
  return <div><output data-testid="active-account">{profile ? `${profile.username}:${profile.classification}` : 'signed out'}</output><output data-testid="current-route">{location.pathname}</output><button onClick={logout}>Sign out</button></div>;
}

function BrowseListingsProbe() {
  const { listings } = useMarketplaceListings();
  return <ul data-testid="browse-listings">{listings.map(listing => <li key={listing.id}>{listing.title} | {listing.description} | {listing.price} | {listing.category} | {listing.owner}</li>)}</ul>;
}

function signup(username, email, password, classification = 'Student') {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><Signup /></AuthProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('@cit.edu email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Account classification'), { target: { value: classification } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

function loginView() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/login']}><AuthProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/dashboard" element={<RequireAuth><DashboardEntry /></RequireAuth>} />
    <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}><Route index element={<Admin section="listings" />} /></Route>
  </Routes><AccountStatus /></AuthProvider></MemoryRouter>);
}

async function login(email, password, username, classification) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await waitFor(() => expect(screen.getByTestId('active-account')).toHaveTextContent(`${username}:${classification}`));
  await waitFor(() => expect(screen.getByTestId('current-route')).toHaveTextContent(classification === 'Admin' ? '/admin' : '/dashboard'));
  if (classification === 'Admin') expect(screen.getAllByRole('heading', { name: 'Pending Listings' }).length).toBeGreaterThan(0);
  if (classification === 'Faculty/Staff') expect(screen.getByText('FACULTY & STAFF CAMPUS CORNER')).toBeInTheDocument();
  if (classification === 'Student') expect(screen.getByText('YOUR CAMPUS CORNER')).toBeInTheDocument();
}

afterEach(() => { cleanup(); localStorage.clear(); });

test('accepts trimmed CIT emails case-insensitively and rejects other domains', () => {
  [' student1@cit.edu ', 'john123@CIT.EDU', 'anyname@cit.edu'].forEach(email => expect(isCitEmail(email)).toBe(true));
  ['student@gmail.com', 'john@yahoo.com', 'user@outlook.com', 'student@cit.com'].forEach(email => expect(isCitEmail(email)).toBe(false));
});

test('registers three unique accounts, persists them, and allows credential-based switching', async () => {
  localStorage.clear();
  const people = [
    ['adminone', 'adminone@cit.edu', 'pass-one', 'Admin'],
    ['studenttwo', 'studenttwo@cit.edu', 'pass-two', 'Student'],
    ['facultythree', 'facultythree@cit.edu', 'pass-three', 'Faculty/Staff'],
  ];
  for (const [username, email, password, classification] of people) {
    signup(username, email, password, classification);
    await screen.findByRole('heading', { name: 'Account ready' });
    cleanup();
    localStorage.removeItem('cit-marketplace-demo-account');
  }

  const saved = JSON.parse(localStorage.getItem('cit-marketplace-demo-v1'));
  const registered = saved.accounts.filter(account => people.some(person => person[0] === account.username));
  expect(registered).toHaveLength(3);
  expect(registered.map(account => account.classification)).toEqual(['Admin', 'Student', 'Faculty/Staff']);

  loginView();
  await login(people[0][1], people[0][2], people[0][0], people[0][3]);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByTestId('active-account')).toHaveTextContent('signed out'));
  await login(people[1][1], people[1][2], people[1][0], people[1][3]);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByTestId('active-account')).toHaveTextContent('signed out'));
  await login(people[2][1], people[2][2], people[2][0], people[2][3]);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByTestId('active-account')).toHaveTextContent('signed out'));
  await login(people[0][1], people[0][2], people[0][0], people[0][3]);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await waitFor(() => expect(screen.getByTestId('active-account')).toHaveTextContent('signed out'));
  await login(people[1][1], people[1][2], people[1][0], people[1][3]);
  cleanup();

  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><AccountStatus /></AuthProvider></MemoryRouter>);
  await waitFor(() => expect(screen.getByTestId('active-account')).toHaveTextContent(`${people[1][0]}:${people[1][3]}`));
});

test('rejects duplicate emails and usernames, and login checks the saved password', async () => {
  localStorage.clear();
  signup('UniqueName', 'unique@cit.edu', 'correct', 'Student');
  await screen.findByRole('heading', { name: 'Account ready' });
  cleanup();
  localStorage.removeItem('cit-marketplace-demo-account');

  signup('AnotherName', 'UNIQUE@CIT.EDU', 'correct', 'Faculty/Staff');
  expect(await screen.findByRole('alert')).toHaveTextContent('email already exists');
  cleanup();
  signup('uniquename', 'different@cit.edu', 'correct', 'Admin');
  expect(await screen.findByRole('alert')).toHaveTextContent('username is already taken');
  cleanup();

  loginView();
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'unique@cit.edu' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
  await login(' UNIQUE@CIT.EDU ', 'correct', 'UniqueName', 'Student');
});

test('new listings stay hidden while pending, appear live when approved, and persist after refresh', async () => {
  localStorage.clear();
  localStorage.setItem('cit-marketplace-demo-account', 'member-ana');
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><Sell /><BrowseListingsProbe /><Admin section="listings" /></AuthProvider></MemoryRouter>);

  const createListing = (title, description, price) => {
    fireEvent.change(screen.getByLabelText('Listing title'), { target: { value: title } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: description } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Electronics' } });
    fireEvent.change(screen.getByLabelText('Price'), { target: { value: String(price) } });
    fireEvent.change(screen.getByLabelText('Preferred campus pickup point'), { target: { value: 'CIT Main Gate' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit for approval/ }));
  };

  createListing('Approval test item one', 'Original item description one', 125);
  await waitFor(() => expect(screen.getByText('Approval test item one').closest('tr')).toBeInTheDocument());
  createListing('Approval test item two', 'Original item description two', 250);
  await waitFor(() => expect(screen.getByText('Approval test item two').closest('tr')).toBeInTheDocument());
  const browse = screen.getByTestId('browse-listings');
  expect(within(browse).queryByText(/Approval test item/)).not.toBeInTheDocument();

  const firstRow = screen.getByText('Approval test item one').closest('tr');
  fireEvent.click(within(firstRow).getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(within(browse).getByText(/Approval test item one \| Original item description one \| 125 \| Electronics \| Ana Reyes/)).toBeInTheDocument());
  expect(within(browse).queryByText(/Approval test item two/)).not.toBeInTheDocument();

  const secondRow = screen.getByText('Approval test item two').closest('tr');
  fireEvent.click(within(secondRow).getByRole('button', { name: 'Reject' }));
  await waitFor(() => expect(screen.queryByText('Approval test item two')).not.toBeInTheDocument());
  const stored = readStore().listings;
  expect(stored.find(item => item.title === 'Approval test item one')).toMatchObject({ approval_status: 'approved', description: 'Original item description one', price: 125, owner_id: 'member-ana' });
  expect(stored.find(item => item.title === 'Approval test item two').approval_status).toBe('rejected');

  cleanup();
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><BrowseListingsProbe /></MemoryRouter>);
  expect(await screen.findByText(/Approval test item one \| Original item description one/)).toBeInTheDocument();
  expect(within(screen.getByTestId('browse-listings')).queryByText(/Approval test item two/)).not.toBeInTheDocument();
});

test('Browse normalizes approved statuses and hides pending, rejected, and removed records', () => {
  localStorage.clear();
  const store = readStore();
  store.listings.push(
    { id: 'legacy-approved', title: 'Legacy approved', status: 'Approved', availability: 'Active', owner: 'Member', category: 'Other', type: 'sale', price: 10 },
    { id: 'legacy-pending', title: 'Still pending', status: 'Pending', owner: 'Member', category: 'Other', type: 'sale', price: 10 },
    { id: 'legacy-rejected', title: 'Rejected', status: 'Rejected', owner: 'Member', category: 'Other', type: 'sale', price: 10 },
    { id: 'legacy-removed', title: 'Removed', approval_status: 'approved', status: 'Removed', owner: 'Member', category: 'Other', type: 'sale', price: 10 },
  );
  writeStore(store);
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><BrowseListingsProbe /></MemoryRouter>);
  const browse = screen.getByTestId('browse-listings');
  expect(within(browse).getByText(/Legacy approved/)).toBeInTheDocument();
  expect(within(browse).queryByText(/Still pending|Rejected|Removed/)).not.toBeInTheDocument();
});
