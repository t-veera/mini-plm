import React, { useEffect, useState } from 'react';
import styles from '../../constants/styles';
import ContainerSelect from '../ContainerSelect/ContainerSelect';
import { MAX_COLUMNS, MIN_COLUMNS, NODE_TYPES, STATUS_FILTERS } from './traceGraph';

const SEARCH_DEBOUNCE_MS = 250;

const sectionLabel = {
  color: styles.colors.text.muted, fontSize: styles.fonts.size.xs,
  textTransform: 'uppercase', letterSpacing: '0.6px', margin: '10px 0 6px 2px',
};

const divider = { height: '1px', background: styles.colors.border, margin: '14px 2px' };

function rowStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
    padding: '6px 8px', borderRadius: styles.borderRadius.sm,
    color: active ? styles.colors.text.light : styles.colors.text.muted,
    fontSize: styles.fonts.size.sm,
  };
}

/**
 * The traceability matrix's left-panel controls.
 *
 * Everything except the search box is persisted server-side, so each change is handed
 * straight up to the preference writer. Search is deliberately local and ephemeral —
 * it is a way to find something now, not part of the saved layout.
 */
function MatrixControls({
  prod, toolbar, onSelectContainer, accent,
  columns, statusFilter, subsystemFilter, subsystems,
  onColumnsChange, onStatusFilterChange, onSubsystemFilterChange,
  search, onSearchChange,
}) {
  // Local mirror so typing stays responsive; the parent only hears the settled value.
  const [searchDraft, setSearchDraft] = useState(search);
  useEffect(() => setSearchDraft(search), [search]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== search) onSearchChange(searchDraft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, search, onSearchChange]);

  const atMinimum = columns.length <= MIN_COLUMNS;
  const atMaximum = columns.length >= MAX_COLUMNS;

  /** Toggling keeps NODE_TYPES order rather than click order, so columns always read
   *  upstream -> downstream however the user checked them. */
  function toggleColumn(key) {
    const isOn = columns.includes(key);
    if (isOn && atMinimum) return;
    if (!isOn && atMaximum) return;
    const next = NODE_TYPES
      .map(t => t.key)
      .filter(k => (k === key ? !isOn : columns.includes(k)));
    onColumnsChange(next);
  }

  function toggleSubsystem(name) {
    const next = subsystemFilter.includes(name)
      ? subsystemFilter.filter(s => s !== name)
      : [...subsystemFilter, name];
    onSubsystemFilterChange(next);
  }

  return (
    <>
      {toolbar}

      <ContainerSelect prod={prod} onSelectContainer={onSelectContainer} />

      <div style={divider} />

      <div style={sectionLabel}>
        Columns
        <span style={{ textTransform: 'none', letterSpacing: 0, marginLeft: '6px' }}>
          ({columns.length}/{MAX_COLUMNS})
        </span>
      </div>
      {NODE_TYPES.map(type => {
        const isOn = columns.includes(type.key);
        const locked = (isOn && atMinimum) || (!isOn && atMaximum);
        return (
          <label key={type.key} style={{ ...rowStyle(isOn), opacity: locked ? 0.5 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
            title={locked ? `Between ${MIN_COLUMNS} and ${MAX_COLUMNS} columns must stay selected` : type.label}>
            <input
              type="checkbox"
              checked={isOn}
              disabled={locked}
              onChange={() => toggleColumn(type.key)}
              style={{ cursor: locked ? 'not-allowed' : 'pointer', accentColor: accent }}
            />
            <span style={{ flex: 1 }}>{type.label}</span>
            <span style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>{type.key}</span>
          </label>
        );
      })}

      <div style={divider} />

      <div style={sectionLabel}>Status</div>
      {STATUS_FILTERS.map(filter => (
        <label key={filter.key} style={rowStyle(statusFilter === filter.key)}>
          <input
            type="radio"
            name="trace-status-filter"
            checked={statusFilter === filter.key}
            onChange={() => onStatusFilterChange(filter.key)}
            style={{ cursor: 'pointer', accentColor: accent }}
          />
          <span style={{ flex: 1 }}>{filter.label}</span>
        </label>
      ))}

      {subsystems.length > 0 && (
        <>
          <div style={divider} />
          <div style={sectionLabel}>
            Subsystem
            {subsystemFilter.length > 0 && (
              <span
                onClick={() => onSubsystemFilterChange([])}
                style={{ textTransform: 'none', letterSpacing: 0, marginLeft: '8px', cursor: 'pointer', color: accent }}
              >
                clear
              </span>
            )}
          </div>
          {subsystems.map(name => (
            <label key={name} style={rowStyle(subsystemFilter.includes(name))}>
              <input
                type="checkbox"
                checked={subsystemFilter.includes(name)}
                onChange={() => toggleSubsystem(name)}
                style={{ cursor: 'pointer', accentColor: accent }}
              />
              <span style={{ flex: 1 }}>{name}</span>
            </label>
          ))}
        </>
      )}

      <div style={divider} />

      <div style={sectionLabel}>Search</div>
      <input
        type="text"
        value={searchDraft}
        onChange={e => setSearchDraft(e.target.value)}
        placeholder="Tag, title or subsystem"
        className="form-control form-control-sm"
        style={{
          width: '100%', fontSize: styles.fonts.size.sm,
          backgroundColor: styles.colors.dark, color: styles.colors.text.light,
          border: `1px solid ${styles.colors.border}`, borderRadius: styles.borderRadius.md,
        }}
      />
    </>
  );
}

export default MatrixControls;
