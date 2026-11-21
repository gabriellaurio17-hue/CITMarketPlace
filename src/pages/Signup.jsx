import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';
import { isCitEmail } from '../utils/validation';

const initialForm = {
  username: '',
  email: '',
  classification: '',
  password: '',
  confirmPassword: '',
};

export default function Signup() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();

  useEffect(() => {
    if (errors.form) document.getElementById('signup-form-error')?.focus();
    else if (Object.keys(errors).length) document.querySelector('#signup-form [aria-invalid="true"]')?.focus();
  }, [errors]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };
  const togglePassword = () => setShowPassword((visible) => !visible);
  const toggleConfirmation = () => setShowConfirmation((visible) => !visible);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = 'Choose a username';
    if (!isCitEmail(form.email)) nextErrors.email = 'Use your @cit.edu email';
    if (!form.classification) nextErrors.classification = 'Choose an account classification';
    if (!form.password) nextErrors.password = 'Choose a password';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password';
    else if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords must match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    const { error } = await signUp(form);
    setSubmitting(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    setSubmittedEmail(form.email.trim());
  };

  if (submittedEmail) {
    return (
      <AuthLayout headline="Join your campus marketplace.">
        <section className="auth-success" aria-live="polite">
          <span className="auth-success-icon" aria-hidden="true">✓</span>
          <h2>Account ready</h2>
          <p>{submittedEmail} is ready to use on this browser. Log in with this email and your password to open your {form.classification} dashboard.</p>
          <Link className="button auth-secondary-button" to="/login">Back to log in</Link>
        </section>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Join your campus marketplace.">
      <div className="auth-card-heading">
        <h2>Create your account</h2>
        <p>Create an account with your CIT email address.</p>
      </div>
      <form className="auth-form auth-signup-form" id="signup-form" onSubmit={submit} noValidate>
        {errors.form && <p className="auth-error" id="signup-form-error" role="alert" tabIndex={-1}>{errors.form}</p>}
        <div className="auth-field">
          <label htmlFor="signup-username">Username</label>
          <input id="signup-username" autoComplete="username" value={form.username} onChange={updateField('username')} aria-required="true" aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'signup-username-error' : undefined} />
          {errors.username && <p className="auth-error" id="signup-username-error" role="alert">{errors.username}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="signup-email">@cit.edu email</label>
          <input id="signup-email" type="email" autoComplete="email" value={form.email} onChange={updateField('email')} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'signup-email-error' : undefined} />
          {errors.email && <p className="auth-error" id="signup-email-error" role="alert">{errors.email}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="signup-classification">Account classification</label>
          <select id="signup-classification" value={form.classification} onChange={updateField('classification')} aria-required="true" aria-invalid={Boolean(errors.classification)} aria-describedby={errors.classification ? 'signup-classification-error' : undefined}>
            <option value="">Choose a classification</option>
            <option value="Buyer/Renter/Seller">Buyer/Renter/Seller</option>
            <option value="Admin">Admin</option>
          </select>
          {errors.classification && <p className="auth-error" id="signup-classification-error" role="alert">{errors.classification}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="signup-password">Password</label>
          <div className="auth-password-field">
            <input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={updateField('password')} aria-required="true" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'signup-password-error' : undefined} />
            <button className="auth-password-toggle" type="button" onClick={togglePassword} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          {errors.password && <p className="auth-error" id="signup-password-error" role="alert">{errors.password}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="signup-confirm-password">Confirm password</label>
          <div className="auth-password-field">
            <input id="signup-confirm-password" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={updateField('confirmPassword')} aria-required="true" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined} />
            <button className="auth-password-toggle" type="button" onClick={toggleConfirmation} aria-pressed={showConfirmation} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'}>{showConfirmation ? 'Hide' : 'Show'}</button>
          </div>
          {errors.confirmPassword && <p className="auth-error" id="signup-confirm-password-error" role="alert">{errors.confirmPassword}</p>}
        </div>
        <button className="button auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}
