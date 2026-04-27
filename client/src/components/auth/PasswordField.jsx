import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

/**
 * Password input with show/hide toggle (Login, Apply, etc.).
 */
export default function PasswordField({
  id,
  label,
  labelEnd = null,
  value,
  onChange,
  autoComplete = 'current-password',
  minLength,
  required = false,
  placeholder = '••••••••',
  hint = null,
}) {
  const [show, setShow] = useState(false);

  return (
    <label className="auth-field" htmlFor={id}>
      <span className={`auth-field-label ${labelEnd ? 'auth-field-label-row' : ''}`}>
        <span>{label}</span>
        {labelEnd}
      </span>
      <div className="auth-input-wrap auth-input-wrap--password">
        <input
          id={id}
          className="auth-input auth-input--password-toggle"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          {show ? <FiEyeOff size={18} aria-hidden /> : <FiEye size={18} aria-hidden />}
        </button>
      </div>
      {hint}
    </label>
  );
}
