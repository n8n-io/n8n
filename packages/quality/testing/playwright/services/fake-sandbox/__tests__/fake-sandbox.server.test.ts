import { createServer } from 'node:net';
import { afterEach, describe, expect, test } from 'vitest';

import { matchRoute, startFakeSandbox, type FakeSandboxService } from '../fake-sandbox.server';

const services: FakeSandboxService[] = [];

async function start(port?: number): Promise<FakeSandboxService> {
	const service = await startFakeSandbox({ port });
	services.push(service);
	return service;
}

async function portIsFree(port: number): Promise<boolean> {
	return await new Promise((resolve) => {
		const probe = createServer();
		probe.once('error', () => resolve(false));
		probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
	});
}

async function call(
	service: FakeSandboxService,
	method: string,
	path: string,
	body?: string | Uint8Array<ArrayBuffer>,
): Promise<Response> {
	return await fetch(`${service.url}${path}`, { method, body });
}

async function createSandbox(service: FakeSandboxService, id = 'sbx-1'): Promise<string> {
	const response = await call(service, 'POST', '/sandboxes', JSON.stringify({ id }));
	if (response.status !== 201) throw new Error(`Sandbox creation failed: ${response.status}`);
	return id;
}

function filesPath(id: string, path: string, extra = ''): string {
	return `/sandboxes/${id}/files?path=${encodeURIComponent(path)}${extra}`;
}

afterEach(async () => {
	await Promise.all(services.splice(0).map(async (service) => await service.stop()));
});

describe('matchRoute', () => {
	const routes = [
		['POST', '/sandboxes', 'POST /sandboxes', ''],
		['GET', '/sandboxes/abc', 'GET /sandboxes/:id', 'abc'],
		['POST', '/sandboxes/abc/executions', 'POST /sandboxes/:id/executions', 'abc'],
		['DELETE', '/sandboxes/abc/executions/e1', 'DELETE /sandboxes/:id/executions/:exec', 'abc'],
		['GET', '/sandboxes/abc/files/content', 'GET /sandboxes/:id/files/content', 'abc'],
		['GET', '/sandboxes//abc/stat/', 'GET /sandboxes/:id/stat', 'abc'],
	] as const;
	for (const [method, path, key, sandboxId] of routes) {
		test(`maps ${method} ${path} to ${key}`, () => {
			expect(matchRoute(method, path)).toEqual({ key, sandboxId });
		});
	}

	for (const path of ['/', '/v1/sandboxes', '/sandboxes/a/files/content/extra']) {
		test(`does not match ${path}`, () => {
			expect(matchRoute('GET', path)).toBeUndefined();
		});
	}
});

describe('startFakeSandbox', () => {
	test('binds to 127.0.0.1 on a port that the OS picks', async () => {
		const service = await start();

		expect(service.host).toBe('127.0.0.1');
		expect(service.port).toBeGreaterThan(0);
		expect(service.url).toBe(`http://127.0.0.1:${service.port}`);
	});

	test('creates a sandbox with a generated id', async () => {
		const service = await start();

		const response = await call(service, 'POST', '/sandboxes', '');
		const record = (await response.json()) as Record<string, unknown>;

		expect(response.status).toBe(201);
		expect(record).toMatchObject({ status: 'running', ephemeral: false });
		expect(record.id).toEqual(expect.stringMatching(/^fake-sandbox-[0-9a-f-]{36}$/));
		expect(record.created_at).toBe(record.last_active_at);
		expect(Math.abs(Number(record.created_at) - Date.now() / 1000)).toBeLessThan(60);
		expect(service.sandboxIds()).toEqual([record.id]);
	});

	test('returns the existing sandbox when the id is known', async () => {
		const service = await start();
		const body = JSON.stringify({ id: 'thread-1', ephemeral: true });

		const first = await call(service, 'POST', '/sandboxes', body);
		const second = await call(service, 'POST', '/sandboxes', body);

		expect([first.status, second.status]).toEqual([201, 200]);
		expect(await second.json()).toMatchObject({ id: 'thread-1', ephemeral: true });
		expect(service.sandboxIds()).toEqual(['thread-1']);
	});

	test('gets and deletes a sandbox, then answers 404 for it', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const found = await call(service, 'GET', `/sandboxes/${id}`);
		const deleted = await call(service, 'DELETE', `/sandboxes/${id}`);
		const missing = await call(service, 'GET', `/sandboxes/${id}`);

		expect(found.status).toBe(200);
		expect(await found.json()).toMatchObject({ id, status: 'running' });
		expect(deleted.status).toBe(204);
		expect(missing.status).toBe(404);
		expect(await missing.json()).toEqual({ error: `Sandbox ${id} does not exist` });
		expect(service.sandboxIds()).toEqual([]);
	});

	test('answers a command with an NDJSON stream that ends with exit code 0', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const response = await call(
			service,
			'POST',
			`/sandboxes/${id}/executions`,
			JSON.stringify({ command: 'echo $HOME', exec_id: 'exec-1', timeout_ms: 1000 }),
		);
		const lines = (await response.text()).trimEnd().split('\n');

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/x-ndjson');
		expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
			{ type: 'started', seq: 0, exec_id: 'exec-1' },
			{
				type: 'exit',
				seq: 1,
				exit_code: 0,
				success: true,
				execution_time_ms: 0,
				timed_out: false,
				killed: false,
			},
		]);
		expect(service.commands()).toEqual(['echo $HOME']);
	});

	test('generates an execution id when the request has none, and deletes executions', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const response = await call(
			service,
			'POST',
			`/sandboxes/${id}/executions`,
			JSON.stringify({ command: 'ls' }),
		);
		const started = JSON.parse((await response.text()).split('\n')[0]) as { exec_id: string };
		const deleted = await call(service, 'DELETE', `/sandboxes/${id}/executions/${started.exec_id}`);

		expect(started.exec_id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
		expect(deleted.status).toBe(204);
	});

	test('rejects a command for an unknown sandbox and a body without a command', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const unknown = await call(
			service,
			'POST',
			'/sandboxes/nope/executions',
			JSON.stringify({ command: 'ls' }),
		);
		const invalid = await call(service, 'POST', `/sandboxes/${id}/executions`, '{}');
		const malformed = await call(service, 'POST', `/sandboxes/${id}/executions`, '{"command":');

		expect(unknown.status).toBe(404);
		expect(invalid.status).toBe(400);
		expect(await invalid.json()).toEqual({
			error: expect.stringContaining('Invalid request body'),
		});
		expect(malformed.status).toBe(400);
		expect(await malformed.json()).toEqual({ error: 'Request body is not valid JSON' });
		expect(service.commands()).toEqual([]);
	});

	test('writes, appends, reads, lists, stats and deletes files', async () => {
		const service = await start();
		const id = await createSandbox(service);
		const file = '/home/user/workspace/a.txt';

		const written = await call(service, 'PUT', filesPath(id, file), 'hello');
		const appended = await call(service, 'POST', filesPath(id, file), ' world');
		const read = await call(service, 'GET', `/sandboxes/${id}/files/content?path=${file}`);
		const listed = await call(service, 'GET', filesPath(id, '/home/user'));
		const stat = await call(service, 'GET', `/sandboxes/${id}/stat?path=${file}`);
		const deleted = await call(service, 'DELETE', filesPath(id, file));
		const gone = await call(service, 'GET', `/sandboxes/${id}/files/content?path=${file}`);

		expect([written.status, appended.status, deleted.status]).toEqual([204, 204, 204]);
		expect(read.headers.get('content-type')).toBe('application/octet-stream');
		expect(await read.text()).toBe('hello world');
		expect(await listed.json()).toEqual([
			expect.objectContaining({ name: 'workspace', is_dir: true }),
		]);
		expect(await stat.json()).toMatchObject({ path: file, type: 'file', size: 11 });
		expect(gone.status).toBe(404);
		expect(await gone.json()).toEqual({ error: `${file} does not exist` });
	});

	test('keeps binary file content unchanged', async () => {
		const service = await start();
		const id = await createSandbox(service);
		const bytes = Buffer.from([0, 255, 10, 128]);

		await call(service, 'PUT', filesPath(id, '/bin.dat'), new Uint8Array(bytes));
		const read = await call(service, 'GET', `/sandboxes/${id}/files/content?path=/bin.dat`);

		expect(Buffer.from(await read.arrayBuffer())).toEqual(bytes);
	});

	test('honours `overwrite=false`, `recursive` and `force`', async () => {
		const service = await start();
		const id = await createSandbox(service);
		await call(service, 'PUT', filesPath(id, '/d/a.txt'), 'one');

		const noOverwrite = await call(
			service,
			'PUT',
			filesPath(id, '/d/a.txt', '&overwrite=false'),
			'two',
		);
		const overwrite = await call(
			service,
			'PUT',
			filesPath(id, '/d/a.txt', '&overwrite=true'),
			'three',
		);
		const notEmpty = await call(service, 'DELETE', filesPath(id, '/d'));
		const recursive = await call(service, 'DELETE', filesPath(id, '/d', '&recursive=true'));
		const missing = await call(service, 'DELETE', filesPath(id, '/d'));
		const forced = await call(service, 'DELETE', filesPath(id, '/d', '&force=true'));

		expect(noOverwrite.status).toBe(409);
		expect(overwrite.status).toBe(204);
		expect(notEmpty.status).toBe(409);
		expect(recursive.status).toBe(204);
		expect(missing.status).toBe(404);
		expect(forced.status).toBe(204);
	});

	test('creates directories and lists the root by default, also recursively', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const flat = await call(service, 'POST', `/sandboxes/${id}/mkdir?path=/a/b`);
		const nested = await call(service, 'POST', `/sandboxes/${id}/mkdir?path=/a/b&recursive=true`);
		const root = await call(service, 'GET', `/sandboxes/${id}/files`);
		const all = await call(service, 'GET', `/sandboxes/${id}/files?recursive=true`);

		expect([flat.status, nested.status]).toEqual([404, 204]);
		expect(((await root.json()) as Array<{ name: string }>).map((entry) => entry.name)).toEqual([
			'a',
		]);
		expect(((await all.json()) as Array<{ name: string }>).map((entry) => entry.name)).toEqual([
			'a',
			'a/b',
		]);
	});

	test('answers file calls without `path` with 400 and for an unknown sandbox with 404', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const noPath = await call(service, 'PUT', `/sandboxes/${id}/files`, 'x');
		const unknown = await call(service, 'GET', filesPath('nope', '/a.txt'));

		expect(noPath.status).toBe(400);
		expect(await noPath.json()).toEqual({ error: 'Query parameter "path" is required' });
		expect(unknown.status).toBe(404);
	});

	const unknownRoutes = [
		['GET', '/'],
		['GET', '/sandboxes'],
		['PATCH', '/sandboxes/sbx-1'],
		['POST', '/sandboxes/sbx-1/files/copy'],
		['GET', '/sandboxes/sbx-1/executions/e1'],
	] as const;
	for (const [method, path] of unknownRoutes) {
		test(`answers ${method} ${path} with 404`, async () => {
			const service = await start();

			const response = await call(service, method, path);

			expect(response.status).toBe(404);
			expect(await response.json()).toEqual({ error: `No route for ${method} ${path}` });
		});
	}

	test('answers a body over 20 MB with 413', async () => {
		const service = await start();
		const id = await createSandbox(service);

		const response = await call(
			service,
			'PUT',
			filesPath(id, '/big.bin'),
			new Uint8Array(20 * 1024 * 1024 + 1),
		);

		expect(response.status).toBe(413);
		expect(await response.json()).toEqual({ error: 'Request body is too large' });
	});

	test('frees the port on stop, also when stop runs twice', async () => {
		const service = await start();
		await createSandbox(service);

		await Promise.all([service.stop(), service.stop()]);

		expect(await portIsFree(service.port)).toBe(true);
		const again = await start(service.port);
		expect(again.port).toBe(service.port);
		expect(again.sandboxIds()).toEqual([]);
	});

	test('rejects when the port is in use', async () => {
		const service = await start();

		await expect(startFakeSandbox({ port: service.port })).rejects.toThrow(/EADDRINUSE/);
	});

	test('reports each request to `log`', async () => {
		const lines: string[] = [];
		const service = await startFakeSandbox({ log: (line) => lines.push(line) });
		services.push(service);

		await call(service, 'POST', '/sandboxes', '');

		expect(lines).toEqual(['[fake-sandbox] POST /sandboxes']);
	});
});
