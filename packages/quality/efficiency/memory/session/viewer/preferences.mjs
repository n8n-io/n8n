const storageKey = 'n8n-memory-chart-v1';

export function normalizePreferences(saved) {
	const favorites = saved?.version === 1 && Array.isArray(saved.favorites) ? saved.favorites : [];
	return {
		favorites: [
			...new Set(
				favorites.filter((key) => {
					if (typeof key !== 'string') return false;
					try {
						const endpoint = JSON.parse(key);
						return (
							Array.isArray(endpoint) &&
							endpoint.length === 3 &&
							['internal', 'public'].includes(endpoint[0]) &&
							endpoint.slice(1).every((part) => typeof part === 'string')
						);
					} catch {
						return false;
					}
				}),
			),
		],
		hideGaps: saved?.version === 1 && saved.hideGaps === true,
	};
}

export function readPreferences() {
	try {
		return normalizePreferences(JSON.parse(localStorage.getItem(storageKey)));
	} catch {
		return normalizePreferences();
	}
}

export function savePreferences(preferences) {
	try {
		localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...preferences }));
	} catch {
		// Keep the controls usable when browser storage is unavailable.
	}
}
