function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
}

async function authenticatedFetch(url, options = {}) {
  const defaultOptions = {
    headers: {
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
  };

  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return fetch(url, mergedOptions);
}

export default authenticatedFetch;
