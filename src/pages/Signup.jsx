import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { isCitEmail } from '../utils/validation';

const initialForm = {
  name: '',
  email: '',
  classification: '',
  password: '',
  confirmPassword: '',
  offlineAgreement: false,
};

export default function Signup() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const updateField = (field) => (event) => {
    const value = field === 'offlineAgreement' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };
  const togglePassword = () => setShowPassword((visible) => !visible);
  const toggleConfirmation = () => setShowConfirmation((visible) => !visible);

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Enter your full name';
    if (!isCitEmail(form.email)) nextErrors.email = 'Use your @cit.edu email';
    if (!form.classification) nextErrors.classification = 'Choose your classification';
    if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password';
    else if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords must match';
    if (!form.offlineAgreement) nextErrors.offlineAgreement = 'Please confirm the offline exchange terms';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmittedEmail(form.email.trim());
  };

  if (submittedEmail) {
    return (
      <AuthLayout headline="Join your campus marketplace.">
        <section className="auth-success" aria-live="polite">
          <span className="auth-success-icon" aria-hidden="true">✓</span>
          <h2>Check your email</h2>
          <p>We sent a verification link to {submittedEmail}. Your account is active once your @cit.edu email is verified.</p>
          <Link className="button auth-secondary-button" to="/login">Back to log in</Link>
        </section>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Join your campus marketplace.">
      <div className="auth-card-heading">
        <h2>Create your account</h2>
        <p>Verified CIT students, faculty and staff only.</p>
      </div>
      <form className="auth-form auth-signup-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="signup-name">Full name</label>
          <input id="signup-name" autoComplete="name" value={form.name} onChange={updateField('name')} aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'signup-name-error' : undefined} />
          {errors.name && <p className="auth-error" id="signup-name-error" role="alert">{errors.name}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="signup-email">@cit.edu email</label>
          <input id="signup-email" type="email" autoComplete="email" value={form.email} onChange={updateField('email')} aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'signup-email-error' : undefined} />
          {errors.email && <p className="auth-error" id="signup-email-error" role="alert">{errors.email}</p>}
        </div>
        <div className="auth-field">
          <label htmlFor="signup-classification">Classification</label>
          <select id="signup-classification" value={form.classification} onChange={updateField('classification')} aria-required="true" aria-invalid={Boolean(errors.classification)} aria-describedby={errors.classification ? 'signup-classification-error' : undefined}>
            <option value="">Choose your classification</option>
            <option value="Student">Student</option>
            <option value="Faculty/Staff">Faculty/Staff</option>
            <option value="School organization">School organization</option>
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
        <div className="auth-field auth-checkbox-field">
          <label htmlFor="signup-offline-agreement">
            <input id="signup-offline-agreement" type="checkbox" checked={form.offlineAgreement} onChange={updateField('offlineAgreement')} aria-required="true" aria-invalid={Boolean(errors.offlineAgreement)} aria-describedby={errors.offlineAgreement ? 'signup-offline-agreement-error' : undefined} />
            <span>I understand payment and item exchange happen offline by cash and meetup.</span>
          </label>
          {errors.offlineAgreement && <p className="auth-error" id="signup-offline-agreement-error" role="alert">{errors.offlineAgreement}</p>}
        </div>
        <button className="button auth-submit" type="submit">Create account</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
    </AuthLayout>
  );
}
