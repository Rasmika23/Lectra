
interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export function getToken(): string | null {
    const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            return user.token || null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

export async function authenticatedFetch(url: string, options: FetchOptions = {}) {
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        // Optional: Handle logout or refresh here
        console.warn('Unauthorized access - token might be invalid or expired');
    }

    return response;
}
