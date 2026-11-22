// Единый API-клиент:
// - добавляет Bearer-токен, если он в localStorage;
// - при 401/403 — центральный выход на страницу входа;
// - ошибки возвращают data.error сервера.

export const getToken = () => localStorage.getItem('token');

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

async function apiFetch(url, options = {}) {
    const token = getToken();

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Необходимо войти в систему заново');
    }

    if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера (${response.status})`);
    }

    return data;
}

export const apiGet = (url) => apiFetch(url);

export const apiPost = (url, body) => apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

export const apiPatch = (url, body) => apiFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

export const apiDelete = (url) => apiFetch(url, { method: 'DELETE' });
