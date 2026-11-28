import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';

import { N8nClient } from './n8n-client';

describe('webhookInBackground', () => {
	it('resolves with an error when the body cannot be read', async () => {
		const server = createServer((_req, res) => {
			res.writeHead(200, { 'content-length': '100' });
			res.write('partial');
			setTimeout(() => res.socket?.destroy(), 20);
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		try {
			const { port } = server.address() as AddressInfo;
			const client = new N8nClient(`http://127.0.0.1:${port}`);
			const response = await client.webhookInBackground('path').result;
			expect(response.status).toBe(0);
			expect(response.body).not.toBe('');
		} finally {
			server.close();
		}
	});
});
