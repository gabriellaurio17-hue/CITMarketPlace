import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { isCitEmail } from '../utils/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!isCitEmail(email)) nextErrors.email = 'Use your @cit.edu email';
    if (!password.trim()) nextErrors.password = 'Enter your password';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) navigate('/dashboard');
  };

  const togglePassword = () => setShowPassword((visible) => !visible);
  const updateEmail = (event) => setEmail(event.target.value);
  const updatePassword = (event) => setPassword(event.target.value);

  return (
    <AuthLayout headline="Your campus, your marketplace.">
      <div className="auth-card-heading">
        <h2>Welcome back</h2>
        <p>Log in with your @cit.edu email.</p>
      </div>
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={updateEmail}
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
          {errors.email && <p className="auth-error" id="login-email-error" role="alert">{errors.email}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <div className="auth-password-field">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={updatePassword}
              aria-required="true"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={togglePassword}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <p className="auth-error" id="login-password-error" role="alert">{errors.password}</p>}
        </div>
        <button className="button auth-submit" type="submit">Log in</button>
      </form>
      <p className="auth-switch">New to CIT Marketplace? <Link to="/signup">Sign up</Link></p>
    </AuthLayout>
  );
}
