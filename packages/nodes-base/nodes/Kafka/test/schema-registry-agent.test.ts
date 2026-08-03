import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import nock from 'nock';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

// This suite exercises the real, un-mocked registry client to prove the agent
// (and therefore its configured DNS lookup) is honored for an outbound request.
describe('Schema Registry agent integration', () => {
	let server: http.Server;
	let port: number;

	beforeAll(async () => {
		// The shared setup calls nock.disableNetConnect(); this suite drives a real
		// loopback server. nock matches the request host (here `my-registry.test`),
		// while the custom agent lookup routes the connection to 127.0.0.1, so both
		// hosts are allowed for the duration of this suite.
		nock.enableNetConnect((host) => /(^|:)127\.0\.0\.1(:|$)|my-registry\.test/.test(host));

		server = http.createServer((req, res) => {
			if (req.url === '/subjects/test-value/versions/latest') {
				res.writeHead(200, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ id: 42 }));
				return;
			}
			res.writeHead(404);
			res.end();
		});

		await new Promise<void>((resolve) => {
			server.listen(0, '127.0.0.1', () => {
				port = (server.address() as AddressInfo).port;
				resolve();
			});
		});
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		nock.disableNetConnect();
	});

	it('consults the configured DNS lookup when making a registry request', async () => {
		const lookup = vi.fn(
			(
				_hostname: string,
				options: { all?: boolean },
				onResult: (
					lookupError: NodeJS.ErrnoException | null,
					address: string | Array<{ address: string; family: number }>,
					family?: number,
				) => void,
			) => {
				if (options.all === true) {
					onResult(null, [{ address: '127.0.0.1', family: 4 }]);
				} else {
					onResult(null, '127.0.0.1', 4);
				}
			},
		);

		const agent = new http.Agent({ lookup });
		const registry = new SchemaRegistry({ host: `http://my-registry.test:${port}`, agent });

		const schemaId = await registry.getLatestSchemaId('test-value');

		expect(schemaId).toBe(42);
		expect(lookup).toHaveBeenCalledWith(
			'my-registry.test',
			expect.objectContaining({ all: true }),
			expect.any(Function),
		);
	});
});
