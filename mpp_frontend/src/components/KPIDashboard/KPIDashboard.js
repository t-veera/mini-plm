import React from 'react';
import styles from '../../constants/styles';

function KPICard({ label, value, unit = '', color = styles.colors.primary }) {
  return (
    <div style={{
      backgroundColor: styles.colors.darkAlt,
      border: `1px solid ${styles.colors.border}`,
      borderRadius: styles.borderRadius.md,
      padding: '1rem 1.25rem',
      minWidth: '140px',
      flex: '1 1 140px'
    }}>
      <div style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ color, fontSize: '1.5rem', fontWeight: styles.fonts.weight.bold }}>
        {value}<span style={{ fontSize: styles.fonts.size.sm, marginLeft: '4px', color: styles.colors.text.muted }}>{unit}</span>
      </div>
    </div>
  );
}

function KPIDashboard({ prod }) {
  const totalIterations = prod.iterations?.length ?? 0;
  const totalStages     = prod.stages?.length ?? 0;
  const allFiles        = Object.values(prod.filesByContainer || {}).flat();
  const totalFiles      = allFiles.length;

  const filesWithRevisions = allFiles.filter(f => f.revisions?.length > 0);
  const avgRevisions = filesWithRevisions.length
    ? (filesWithRevisions.reduce((sum, f) => sum + (f.revisions?.length ?? 0), 0) / filesWithRevisions.length).toFixed(1)
    : '—';

  const statusCounts = allFiles.reduce((acc, f) => {
    const s = (f.status || 'in_work').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const totalCost = allFiles
    .filter(f => f.price)
    .reduce((sum, f) => sum + (f.quantity || 1) * (parseFloat(f.price) || 0), 0);

  return (
    <div style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
      <h4 style={{ color: styles.colors.text.light, marginBottom: '1.5rem' }}>
        KPI Dashboard — {prod.name?.toUpperCase()}
      </h4>

      <section style={{ marginBottom: '2rem' }}>
        <h6 style={{ color: styles.colors.text.muted, marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: styles.fonts.size.xs, letterSpacing: '0.08em' }}>Overview</h6>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <KPICard label="Iterations"     value={totalIterations} color={styles.colors.iteration} />
          <KPICard label="Stages"         value={totalStages}     color={styles.colors.stage} />
          <KPICard label="Total Files"    value={totalFiles} />
          <KPICard label="Avg Revisions"  value={avgRevisions} />
          <KPICard label="Total BOM Cost" value={`₹${totalCost.toFixed(0)}`} color={styles.colors.success} />
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h6 style={{ color: styles.colors.text.muted, marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: styles.fonts.size.xs, letterSpacing: '0.08em' }}>File Status Distribution</h6>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <KPICard label="In-Work"  value={statusCounts['in_work']  || 0} color={styles.colors.warning} />
          <KPICard label="Review"   value={statusCounts['review']   || 0} color={styles.colors.primary} />
          <KPICard label="Released" value={statusCounts['released'] || 0} color={styles.colors.success} />
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h6 style={{ color: styles.colors.text.muted, marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: styles.fonts.size.xs, letterSpacing: '0.08em' }}>Iteration Timeline</h6>
        <div style={{ backgroundColor: styles.colors.darkAlt, border: `1px solid ${styles.colors.border}`, borderRadius: styles.borderRadius.md, padding: '1.25rem' }}>
          {prod.iterations?.length
            ? prod.iterations.map(iter => (
                <div key={iter.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: styles.colors.iteration, fontWeight: styles.fonts.weight.medium, minWidth: '40px' }}>{iter.iteration_id}</span>
                  <span style={{ color: styles.colors.text.light }}>{iter.name}</span>
                  <span style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.xs }}>
                    {iter.created_at ? new Date(iter.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            : <p style={{ color: styles.colors.text.muted, fontSize: styles.fonts.size.sm, margin: 0 }}>No iterations yet.</p>}
        </div>
      </section>

      <section>
        <h6 style={{ color: styles.colors.text.muted, marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: styles.fonts.size.xs, letterSpacing: '0.08em' }}>Cost Trend (Coming Soon)</h6>
        <div style={{ backgroundColor: styles.colors.darkAlt, border: `1px dashed ${styles.colors.border}`, borderRadius: styles.borderRadius.md, padding: '2rem', textAlign: 'center', color: styles.colors.text.muted, fontSize: styles.fonts.size.sm }}>
          Cost trend chart will render here once per-iteration BOM data is tracked.
        </div>
      </section>
    </div>
  );
}

export default KPIDashboard;
