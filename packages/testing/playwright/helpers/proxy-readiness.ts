export async function waitUntilProxyReady(proxyUrl: string, timeoutMs = 6_000): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`${proxyUrl}/mockserver/status`, {
				method: 'PUT',
				signal: AbortSignal.timeout(2_000),
			});
			if (response.ok) {
				return true;
			}
		} catch {
			// Proxy may still be starting; keep polling until the deadline.
		}
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	return false;
}
