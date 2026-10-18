import { once } from 'node:events';
import { createPlayground, localUrl } from './server.mjs';
import { createWorkflow } from './scenarios.mjs';

const servers = [];
afterEach(async () => {
	await Promise.all(
		servers.splice(0).map(
			(server) =>
				new Promise((resolve) => {
					server.closeAllConnections();
					server.close(resolve);
				}),
		),
	);
});

async function setup(fetchImpl, apiKey = 'test-key') {
	const server = createPlayground({ apiKey, fetchImpl });
	servers.push(server);
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const origin = `http://127.0.0.1:${server.address().port}`;
	return {
		origin,
		get: async (path) => await fetch(`${origin}/api/${path}`),
		post: async (path, body = {}) =>
			await fetch(`${origin}/api/${path}`, {
				method: 'POST',
				headers: { Origin: origin, 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			}),
	};
}

const json = (body) =>
	new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const publishedWorkflow = () => ({
	...createWorkflow('wrong-field'),
	id: 'wf1',
	versionId: 'v1',
	activeVersionId: 'v1',
});

describe('local playground boundary', () => {
	it.each([
		'https://example.com',
		'http://localhost.example.com',
		'file:///tmp/test',
		'http://user:password@localhost:5678',
		'http://localhost:5678?key=value',
	])('rejects unsupported instance URL %s', (url) => expect(() => localUrl(url)).toThrow());
	it('does not expose the API key in configuration', async () => {
		const { get } = await setup(vi.fn());
		const response = await get('config');
		expect(await response.text()).not.toContain('test-key');
	});
	it('rejects cross-origin mutations before calling n8n', async () => {
		const upstream = vi.fn();
		const { origin } = await setup(upstream);
		const response = await fetch(`${origin}/api/workflows`, {
			method: 'POST',
			headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' },
			body: '{}',
		});
		expect(response.status).toBe(403);
		expect(upstream).not.toHaveBeenCalled();
	});
	it('reports a missing API key without calling n8n', async () => {
		const upstream = vi.fn();
		const { get } = await setup(upstream, '');
		expect(await (await get('workflows')).json()).toMatchObject({
			error: expect.stringContaining('N8N_API_KEY'),
		});
		expect(upstream).not.toHaveBeenCalled();
	});
});

describe('workflow lifecycle', () => {
	it('creates in the selected project and publishes without triggering a failure', async () => {
		const upstream = vi
			.fn()
			.mockResolvedValueOnce(json({ id: 'new', versionId: 'v1' }))
			.mockResolvedValueOnce(json({}));
		const { post } = await setup(upstream);
		expect(
			(await post('workflows', { scenarioId: 'wrong-field', projectId: 'project1' })).status,
		).toBe(200);
		const [createUrl, createOptions] = upstream.mock.calls[0];
		expect(createUrl).toMatch(/\/api\/v1\/workflows$/);
		expect(JSON.parse(createOptions.body)).toMatchObject({
			projectId: 'project1',
			settings: { saveDataErrorExecution: 'all' },
		});
		expect(upstream.mock.calls[1][0]).toMatch(/\/api\/v1\/workflows\/new\/publish$/);
		expect(upstream).toHaveBeenCalledTimes(2);
	});
	it('returns the created workflow ID when publication fails', async () => {
		const upstream = vi
			.fn()
			.mockResolvedValueOnce(json({ id: 'new', versionId: 'v1' }))
			.mockResolvedValueOnce(new Response('', { status: 403 }));
		const { post } = await setup(upstream);
		expect(await (await post('workflows', { scenarioId: 'wrong-field' })).json()).toMatchObject({
			id: 'new',
			warning: expect.stringContaining('403'),
		});
	});
	it('finds playground workflows after the first API page', async () => {
		const upstream = vi
			.fn()
			.mockResolvedValueOnce(json({ data: [{ name: 'Unrelated' }], nextCursor: 'page2' }))
			.mockResolvedValueOnce(json({ data: [publishedWorkflow()] }));
		const { get } = await setup(upstream);
		expect((await (await get('workflows')).json()).workflows).toHaveLength(1);
		expect(upstream.mock.calls[1][0]).toContain('cursor=page2');
	});
	it.each([{ activeVersionId: null }, { versionId: 'draft' }, { isArchived: true }])(
		'blocks triggering an ineligible workflow: %j',
		async (changes) => {
			const upstream = vi.fn().mockResolvedValue(json({ ...publishedWorkflow(), ...changes }));
			const { post } = await setup(upstream);
			expect((await post('workflows/wf1/trigger', { input: 'original' })).status).toBe(400);
			expect(upstream).toHaveBeenCalledTimes(1);
		},
	);
	it('does not mutate unrelated workflows', async () => {
		const upstream = vi
			.fn()
			.mockResolvedValue(json({ ...publishedWorkflow(), name: 'User workflow' }));
		const { post } = await setup(upstream);
		expect((await post('workflows/wf1/publish')).status).toBe(400);
		expect(upstream).toHaveBeenCalledTimes(1);
	});
	it('sends alternate input through the production webhook without the API key', async () => {
		const upstream = vi
			.fn()
			.mockResolvedValueOnce(json(publishedWorkflow()))
			.mockResolvedValueOnce(new Response('Workflow failed', { status: 500 }));
		const { post } = await setup(upstream);
		const response = await post('workflows/wf1/trigger', { input: 'alternate' });
		expect(await response.json()).toMatchObject({ status: 500, body: 'Workflow failed' });
		const [url, options] = upstream.mock.calls[1];
		expect(url).toContain('/webhook/self-healing-playground/');
		expect(options.headers).not.toHaveProperty('X-N8N-API-KEY');
		expect(JSON.parse(options.body)).toMatchObject({ amount: 19 });
	});
});
