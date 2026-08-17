import { useCallback, useEffect, useRef, useState } from 'react';
import authenticatedFetch from '../../utils/authenticatedFetch';

const SAVE_DEBOUNCE_MS = 400;

/**
 * Loads the traceability graph for a product/container and the user's persisted matrix
 * layout, and writes the layout back when it changes.
 *
 * The preset lives on the server (not localStorage) so it survives a relogin and
 * follows the user to another device; GET returns the default preset when nothing has
 * been saved, so this hook never has to know what the defaults are.
 */
function useTraceMatrix(productId, containerKey) {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Bumped after a manual link changes. Statuses are computed server-side from the whole
  // edge set, so a link can turn a node from orphan to valid several hops away -- there
  // is nothing sensible to patch locally, and refetching is one small request.
  const [reloadToken, setReloadToken] = useState(0);

  const [preference, setPreference] = useState(null);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    if (!productId || !containerKey) { setGraph(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    authenticatedFetch(`/api/traceability/${productId}/?container=${encodeURIComponent(containerKey)}`)
      .then(async response => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(data => { if (!cancelled) setGraph(data); })
      .catch(err => { if (!cancelled) { setError(err.message); setGraph(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [productId, containerKey, reloadToken]);

  // Preferences are per product, not per container - switching container keeps them.
  useEffect(() => {
    if (!productId) return undefined;
    let cancelled = false;
    setPreferenceLoaded(false);

    authenticatedFetch(`/api/traceability/${productId}/preference/`)
      .then(async response => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(data => { if (!cancelled) { setPreference(data); setPreferenceLoaded(true); } })
      .catch(() => { if (!cancelled) setPreferenceLoaded(true); });

    return () => { cancelled = true; };
  }, [productId]);

  const saveTimer = useRef(null);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  /** Apply a layout change locally, then persist it. Debounced so dragging a checkbox
   *  set around doesn't fire a PUT per click. */
  const updatePreference = useCallback((patch) => {
    setPreference(previous => {
      const next = { ...(previous || {}), ...patch, is_default: false };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        authenticatedFetch(`/api/traceability/${productId}/preference/`, {
          method: 'PUT',
          body: JSON.stringify({
            columns: next.columns,
            status_filter: next.status_filter,
            subsystem_filter: next.subsystem_filter,
          }),
        }).catch(err => console.error('Failed to save matrix layout', err));
      }, SAVE_DEBOUNCE_MS);
      return next;
    });
  }, [productId]);

  /** Draw or remove a manual link. Applied immediately -- there is no draft state and no
   *  save step, the same as every other edit in the app. Resolves to an error message
   *  when the server refuses (unlinking a parsed edge), else null. */
  const setLink = useCallback(async (parent, child, linked) => {
    try {
      const response = await authenticatedFetch(`/api/traceability/${productId}/link/`, {
        method: linked ? 'POST' : 'DELETE',
        body: JSON.stringify({ parent, child }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        return (detail && detail.error) || `${response.status} ${response.statusText}`;
      }
      setReloadToken(token => token + 1);
      return null;
    } catch (err) {
      return err.message || 'Could not reach the server.';
    }
  }, [productId]);

  return { graph, loading, error, preference, preferenceLoaded, updatePreference, setLink };
}

export default useTraceMatrix;
