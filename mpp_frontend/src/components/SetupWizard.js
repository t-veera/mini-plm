import React, { useState } from 'react';
import axios from 'axios';
import './SetupWizard.css';

const SetupWizard = ({ onSetupComplete }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/initial-setup/', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        onSetupComplete();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-wizard-container">
      <div className="setup-wizard-card">
        <div className="setup-header">
          <div className="setup-logo">mP</div>
          <h1 className="setup-title">Welcome to Mini PLM</h1>
          <p className="setup-subtitle">Create your admin account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {error && (
            <div className="setup-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="admin"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@example.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="setup-submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Account & Start'}
          </button>

          <p className="setup-note">
            This will create your admin account and a sample product to get you started.
          </p>
        </form>
      </div>
    </div>
  );
};

export default SetupWizard;