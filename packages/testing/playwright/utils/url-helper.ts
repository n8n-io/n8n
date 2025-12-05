/**
 * Extract port from a URL string
 */
export function getPortFromUrl(url: string): string {
	const parsedUrl = new URL(url);
	return parsedUrl.port || (parsedUrl.protocol === 'https:' ? '443' : '80');
}
