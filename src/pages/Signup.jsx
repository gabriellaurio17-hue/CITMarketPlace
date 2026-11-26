import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../auth/AuthContext';
import { isCitEmail } from '../utils/validation';
import { isSupabaseConfigured } from '../lib/supabase';

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
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [registeredAccount, setRegisteredAccount] = useState(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
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
    const { data, error } = await signUp(form);
    setSubmitting(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    setSubmittedEmail(form.email.trim());
    setRegisteredAccount(data?.user || null);
    setEmailConfirmationRequired(Boolean(data?.emailConfirmationRequired));
  };

  if (submittedEmail) {
    if (emailConfirmationRequired) {
      return (
        <AuthLayout headline="Join your campus marketplace.">
          <section className="auth-success" aria-live="polite">
            <span className="auth-success-icon" aria-hidden="true">âœ“</span>
            <h2>Check your CIT email</h2>
            <p>Supabase sent a confirmation link to {submittedEmail}. Confirm your email, then log in to continue.</p>
            <Link className="button auth-secondary-button" to="/login">Go to log in</Link>
          </section>
        </AuthLayout>
      );
    }
    if (isSupabaseConfigured) {
      return (
        <AuthLayout headline="Join your campus marketplace.">
          <section className="auth-success" aria-live="polite">
            <span className="auth-success-icon" aria-hidden="true">âœ“</span>
            <h2>Account created</h2>
            <p>Your Supabase account was created for {submittedEmail}. Marketplace access may require administrator verification.</p>
            <Link className="button auth-secondary-button" to="/dashboard">Continue to your dashboard</Link>
          </section>
        </AuthLayout>
      );
    }
    if (verificationSuccess) {
      return (
        <AuthLayout headline="Join your campus marketplace.">
          <section className="auth-success" aria-live="polite">
            <span className="auth-success-icon" aria-hidden="true">✓</span>
            <h2>Verification submitted</h2>
            <p>{submittedEmail} passed this frontend-only email verification simulation. Your account is now pending administrator approval before restricted marketplace features become available.</p>
            <Link className="button auth-secondary-button" to="/login">Continue to log in</Link>
          </section>
        </AuthLayout>
      );
    }
    return (
      <AuthLayout headline="Join your campus marketplace.">
        <section className="auth-success" aria-live="polite">
          <span className="auth-success-icon" aria-hidden="true">1</span>
          <h2>Verify your account</h2>
          <p>This is a frontend verification simulation—no email was sent. Use the demo code below, then enter it to activate your account.</p>
          <p><strong>Demo verification code: {registeredAccount?.verification_code}</strong></p>
          <form className="auth-form" onSubmit={(event) => {
            event.preventDefault();
            if (verificationCode.trim() === registeredAccount?.verification_code) {
              const store = JSON.parse(localStorage.getItem('cit-marketplace-demo-v1') || '{}');
              const account = store.accounts?.find(item => item.id === registeredAccount.id);
              if (account) {
                  account.is_verified = false;
                  account.verification_status = 'verified_pending_admin';
                localStorage.setItem('cit-marketplace-demo-v1', JSON.stringify(store));
                window.dispatchEvent(new Event('marketplace-store-change'));
              }
              setVerificationSuccess(true);
            } else {
              setVerificationError('The verification code is incorrect.');
            }
          }}>
            <label htmlFor="verification-code">Verification code</label>
            <input id="verification-code" inputMode="numeric" value={verificationCode} onChange={(event) => { setVerificationCode(event.target.value); setVerificationError(''); }} aria-invalid={Boolean(verificationError)} />
            {verificationError && <p className="auth-error" role="alert">{verificationError}</p>}
            <button className="button auth-submit" type="submit">Verify account</button>
          </form>
          <button type="button" className="text-button" onClick={() => {
            const code = String(Math.floor(100000 + Math.random() * 900000));
            const store = JSON.parse(localStorage.getItem('cit-marketplace-demo-v1') || '{}');
            const account = store.accounts?.find(item => item.id === registeredAccount.id);
            if (account) account.verification_code = code;
            localStorage.setItem('cit-marketplace-demo-v1', JSON.stringify(store));
            setRegisteredAccount(current => ({ ...current, verification_code: code }));
            setVerificationCode('');
            setVerificationError('A new frontend demo code was generated.');
          }}>Resend verification code</button>
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
            <option value="Student">Student</option>
            <option value="Faculty/Staff">Faculty/Staff</option>
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
