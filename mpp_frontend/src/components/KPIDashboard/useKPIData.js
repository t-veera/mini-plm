import { useState, useEffect } from 'react';
import authenticatedFetch from '../../utils/authenticatedFetch';

/**
 * useKPIData
 *
 * Scaffold hook for KPI dashboard data. Currently derives metrics from
 * local product state. When the backend KPI endpoint is ready, replace
 * the local derivation with the authenticatedFetch call below.
 *
 * Backend endpoint (planned): GET /api/products/{id}/kpis/
 */
function useKPIData(product) {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product?.id) return;

    const allFiles = Object.values(product.filesByContainer || {}).flat();

    setKpiData({
      totalIterations: product.iterations?.length ?? 0,
      totalStages: product.stages?.length ?? 0,
      totalFiles: allFiles.length,
      avgRevisions: allFiles.filter(f => f.revisions?.length > 0).length
        ? (allFiles.reduce((s, f) => s + (f.revisions?.length ?? 0), 0) / allFiles.length).toFixed(1)
        : 0,
      statusDistribution: allFiles.reduce((acc, f) => {
        const s = (f.status || 'in_work').toLowerCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {}),
      totalBOMCost: allFiles
        .filter(f => f.price)
        .reduce((sum, f) => sum + (f.quantity || 1) * (parseFloat(f.price) || 0), 0),
    });

    // Uncomment when backend endpoint exists:
    // setLoading(true);
    // authenticatedFetch(`/api/products/${product.id}/kpis/`)
    //   .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
    //   .then(data => setKpiData(data))
    //   .catch(err => setError(err.message))
    //   .finally(() => setLoading(false));
  }, [product?.id]);

  return { kpiData, loading, error };
}

export default useKPIData;
