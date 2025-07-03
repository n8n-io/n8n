import { createServer } from 'net';

/**
 * Get an available port on the host system
 */
export function getAvailablePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, () => {
			const port = (server.address() as any).port;
			server.close(() => resolve(port));
		});
		server.on('error', reject);
	});
}
