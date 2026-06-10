import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import useIconTheme from '../../hooks/useIconTheme';
import './UserMenu.css';

const THEMES = [
  {
    id: 'material',
    label: 'Material',
    description: 'VS Code Material icon theme',
    preview: ['js', 'pdf', 'cpp', 'xlsx']
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Monochrome, low distraction',
    preview: ['js', 'pdf', 'cpp', 'xlsx']
  },
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    description: 'Soothing pastel Mocha palette',
    preview: ['js', 'pdf', 'cpp', 'xlsx']
  }
];

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const { user, logout } = useAuth();
  const { activeTheme, setActiveTheme } = useIconTheme();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowThemes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    setShowThemes(false);
  };

  if (!user) return null;

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => { setIsOpen(!isOpen); setShowThemes(false); }}
        title={user.username}
      >
        <div className="user-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          {/* User info */}
          <div className="user-menu-header">
            <div className="user-info">
              <div className="user-info-name">{user.username}</div>
              {user.email && <div className="user-info-email">{user.email}</div>}
              {user.is_staff && <div className="user-info-badge">Admin</div>}
            </div>
          </div>

          <div className="user-menu-divider"></div>

          {/* Icon theme picker */}
          <button
            className="user-menu-item"
            onClick={() => setShowThemes(!showThemes)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="2" fill="currentColor"/>
              <path d="M8 2V1M8 15v-1M2 8H1M15 8h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Icon Theme
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '11px' }}>
              {THEMES.find(t => t.id === activeTheme)?.label}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '4px', transform: showThemes ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Theme options */}
          {showThemes && (
            <div className="user-menu-themes">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  className={`user-menu-theme-option ${activeTheme === theme.id ? 'active' : ''}`}
                  onClick={() => { setActiveTheme(theme.id); setShowThemes(false); }}
                >
                  <div className="theme-option-info">
                    <span className="theme-option-label">{theme.label}</span>
                    <span className="theme-option-desc">{theme.description}</span>
                  </div>
                  {activeTheme === theme.id && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l3.5 3.5L12 3" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="user-menu-divider"></div>

          {/* Logout */}
          <button className="user-menu-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.6667 11.3333L14 8L10.6667 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;

