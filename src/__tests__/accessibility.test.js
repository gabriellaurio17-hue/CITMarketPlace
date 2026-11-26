import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Browse from '../pages/Browse';
import Home from '../pages/Home';
import ItemDetails from '../pages/ItemDetails';
import ListingCard from '../components/ListingCard';
import Login from '../pages/Login';
import { AuthProvider } from '../auth/AuthContext';
import Admin from '../pages/Admin';
import { readStore, writeStore } from '../data/localStore';
import getScrollBehavior from '../utils/getScrollBehavior';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('featured listing filters expose their selected state', () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Home /></MemoryRouter>);

  const filters = within(screen.getByRole('group', { name: 'Filter featured listings' }));
  const saleFilter = filters.getByRole('button', { name: 'For sale' });
  expect(saleFilter).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(saleFilter);
  expect(saleFilter).toHaveAttribute('aria-pressed', 'true');
});

function CurrentSearch() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  return <output data-testid="current-search">{`${search.get('type')}|${search.get('search')}`}</output>;
}

test('homepage search carries the selected listing type and query to Browse', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<p>Browse results</p>} />
      </Routes>
      <CurrentSearch />
    </MemoryRouter>
  );

  fireEvent.click(within(screen.getByRole('group', { name: 'Listing type' })).getByRole('button', { name: 'For rent' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search items, categories, or sellers' }), { target: { value: 'physics textbook' } });
  fireEvent.click(screen.getByRole('button', { name: /Find something good/ }));

  expect(screen.getByTestId('current-search')).toHaveTextContent('rent|physics textbook');
});

test('Browse exposes removable active filters and announces result counts', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/browse']}>
      <Routes><Route path="/browse" element={<Browse />} /></Routes>
    </MemoryRouter>
  );

  fireEvent.click(within(screen.getByRole('group', { name: 'What are you after?' })).getByRole('button', { name: 'For sale' }));
  expect(screen.getByRole('status')).toHaveTextContent('3 listings found');

  fireEvent.click(screen.getByRole('button', { name: 'Remove Type: For sale filter' }));
  expect(screen.queryByRole('group', { name: 'Active filters' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('6 listings found');
});

test('Browse explains an invalid price range and identifies the field', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/browse']}>
      <Routes><Route path="/browse" element={<Browse />} /></Routes>
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText('Minimum price'), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText('Maximum price'), { target: { value: '100' } });

  expect(screen.getByLabelText('Maximum price')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent('Maximum price must be at least the minimum price.');
});

test('listing photos have descriptive alternative text', () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ListingCard listing={{
    id: 'listing-1',
    title: 'Physics textbook',
    imageUrl: '/physics-textbook.jpg',
    gradient: 'book',
    type: 'sale',
    category: 'Textbooks',
    condition: 'Good',
    price: 250,
    owner: 'Ana Reyes',
  }} /></MemoryRouter>);

  expect(screen.getByRole('img', { name: 'Physics textbook' })).toBeInTheDocument();
});

test('rental details show the deposit and estimated meetup amount', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/items/digital-multimeter']}>
      <AuthProvider>
        <Routes><Route path="/items/:id" element={<ItemDetails />} /></Routes>
      </AuthProvider>
    </MemoryRouter>
  );

  expect(screen.getByText('Refundable deposit')).toBeInTheDocument();
  expect(screen.getByText('Estimated due at meetup')).toBeInTheDocument();
  expect(screen.getByText('₱130')).toBeInTheDocument();
});

test('admin actions announce their result and can be found with the labeled search', () => {
  const store = readStore();
  store.listings.push({
    id: 'pending-accessibility-test',
    title: 'Pending test listing',
    owner_id: 'member-ana',
    listing_type: 'sale',
    category: 'Other',
    price: 25,
    created_at: new Date().toISOString(),
    approval_status: 'pending',
    status: 'pending',
  });
  writeStore(store);

  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider><Admin section="listings" /></AuthProvider>
    </MemoryRouter>
  );

  expect(screen.getByRole('textbox', { name: 'Search pending listings' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

  expect(screen.getByRole('status')).toHaveTextContent('Pending test listing: approved.');
  expect(readStore().listings.find(item => item.id === 'pending-accessibility-test').approval_status).toBe('approved');
});

test('login focuses the first field with a validation error', () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider><Login /></AuthProvider>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

  expect(screen.getByLabelText('Email')).toHaveFocus();
});

test('programmatic scrolling respects reduced-motion preference', () => {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });

  try {
    expect(getScrollBehavior()).toBe('auto');
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});
