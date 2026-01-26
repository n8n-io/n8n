/**
 * Extract port from a URL string
 */
export function getPortFromUrl(url: string): string {
	const parsedUrl = new URL(url);
	return parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
}

/**
 * Get the backend URL from environment variables
 * Returns N8N_BASE_URL
 */
export function getBackendUrl(): string | undefined {
	return process.env.N8N_BASE_URL;
}

/**
 * Get the frontend URL from environment variables
 * When N8N_EDITOR_URL is set (dev mode), use it for the frontend
 * Otherwise, use the same URL as the backend
 */
export function getFrontendUrl(): string | undefined {
	return process.env.N8N_EDITOR_URL ?? process.env.N8N_BASE_URL;
}
