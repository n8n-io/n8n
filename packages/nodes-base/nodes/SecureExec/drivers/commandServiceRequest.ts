/**
 * Shared HTTP request helper for command-service driver and volume manager.
 */
export async function commandServiceRequest<T>(
	serviceUrl: string,
	method: string,
	path: string,
	body?: Record<string, unknown>,
): Promise<T> {
	const url = `${serviceUrl}${path}`;

	const headers: Record<string, string> = {};
	if (body) {
		headers['Content-Type'] = 'application/json';
	}

	const response = await fetch(url, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	// DELETE /volumes/:id returns 204 No Content
	if (response.status === 204) {
		return undefined as T;
	}

	if (!response.ok) {
		let errorMessage: string;
		try {
			const errorBody = (await response.json()) as { message?: string };
			errorMessage = errorBody.message ?? response.statusText;
		} catch {
			errorMessage = response.statusText;
		}
		throw new Error(
			`Command service request failed: ${method} ${path} → ${response.status} ${errorMessage}`,
		);
	}

	return (await response.json()) as T;
}
