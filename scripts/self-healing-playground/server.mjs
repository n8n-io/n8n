import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isLoopbackHost } from '../instance-seeding/inspectActivity.mjs';
import { createWorkflow, identifyWorkflow, scenarios } from './scenarios.mjs';

export function localUrl(value) {
	const url = new URL(value);
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		!isLoopbackHost(url.host) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error('Use a local n8n URL, such as http://localhost:5678.');
	}
	return url.href.replace(/\/$/, '');
}

export function createPlayground({
	baseUrl = 'http://localhost:5678',
	editorUrl = baseUrl,
	webhookUrl = baseUrl,
	apiKey = '',
	fetchImpl = fetch,
} = {}) {
	const base = localUrl(baseUrl);
	const editor = localUrl(editorUrl);
	const webhookBase = localUrl(webhookUrl);
	const busy = new Set();

	async function api(path, method = 'GET', body) {
		if (!apiKey)
			throw new Error(
				'Set N8N_API_KEY in the dashboard terminal, then restart pnpm dev:self-healing. Create the key in n8n Settings → n8n API.',
			);
		const response = await fetchImpl(`${base}/api/v1/${path}`, {
			method,
			headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
			signal: AbortSignal.timeout(15000),
			redirect: 'error',
		});
		if (!response.ok) {
			// Status and operation are enough to diagnose setup without exposing response data.
			throw new Error(
				`n8n ${method} ${path.split('?')[0]} returned ${response.status}. Check the API key permissions and the n8n server log.`,
			);
		}
		return response.status === 204 ? null : await response.json();
	}

	function describe(workflow) {
		const identity = identifyWorkflow(workflow);
		if (!identity) throw new Error('This workflow is not a playground workflow.');
		const id = encodeURIComponent(workflow.id);
		const projectId = workflow.shared?.find((share) => share.role === 'workflow:owner')?.projectId;
		return {
			id: workflow.id,
			name: workflow.name,
			createdAt: workflow.createdAt,
			scenarioId: identity.scenario.id,
			published: Boolean(workflow.activeVersionId),
			fullyPublished: Boolean(
				workflow.activeVersionId && workflow.activeVersionId === workflow.versionId,
			),
			archived: Boolean(workflow.isArchived),
			workflowUrl: `${editor}/workflow/${id}`,
			executionsUrl: `${editor}/workflow/${id}/executions`,
			settingsUrl: projectId
				? `${editor}/projects/${encodeURIComponent(projectId)}/settings`
				: null,
		};
	}

	async function listWorkflows() {
		const workflows = [];
		let cursor;
		do {
			const query = new URLSearchParams({ limit: '250' });
			if (cursor) query.set('cursor', cursor);
			const page = await api(`workflows?${query}`);
			workflows.push(...page.data.filter(identifyWorkflow).map(describe));
			cursor = page.nextCursor;
		} while (cursor);
		return workflows.sort((left, right) =>
			(right.createdAt ?? '').localeCompare(left.createdAt ?? ''),
		);
	}

	async function action(id, actionName, body) {
		const workflow = await api(`workflows/${encodeURIComponent(id)}`);
		const identity = identifyWorkflow(workflow);
		if (!identity) throw new Error('This workflow is not a playground workflow.');
		if (actionName === 'publish') {
			await api(`workflows/${encodeURIComponent(id)}/publish`, 'POST', {
				versionId: workflow.versionId,
			});
			return {
				message: 'Workflow published. Configure self-healing in n8n before sending an input.',
			};
		}
		if (actionName !== 'trigger') throw new Error('Unknown action. Refresh the dashboard.');
		if (
			!workflow.activeVersionId ||
			workflow.activeVersionId !== workflow.versionId ||
			workflow.isArchived
		) {
			throw new Error(
				'Publish the current draft before sending an input. Self-healing requires a fully published workflow.',
			);
		}
		if (!['original', 'alternate'].includes(body.input))
			throw new Error('Select the original or alternate input.');
		const input =
			body.input === 'alternate' ? identity.scenario.alternateInput : identity.scenario.input;
		// Webhooks run without the API key. A failed workflow can return HTTP 500.
		const response = await fetchImpl(`${webhookBase}/webhook/${identity.path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
			signal: AbortSignal.timeout(30000),
			redirect: 'error',
		});
		return { status: response.status, body: (await response.text()).slice(0, 6000), input };
	}

	const staticFiles = new Map([
		['/', ['index.html', 'text/html']],
		['/app.js', ['app.js', 'text/javascript']],
		['/style.css', ['style.css', 'text/css']],
	]);
	const server = http.createServer(async (request, response) => {
		const send = (status, data) => {
			response.writeHead(status, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store',
			});
			response.end(JSON.stringify(data));
		};
		const origin = `http://${request.headers.host}`;
		if (
			!isLoopbackHost(request.headers.host) ||
			(request.headers.origin && request.headers.origin !== origin) ||
			request.headers['sec-fetch-site'] === 'cross-site'
		) {
			send(403, { error: 'Open the dashboard from its local URL.' });
			return;
		}
		const url = new URL(request.url, origin);
		try {
			if (request.method === 'GET' && staticFiles.has(url.pathname)) {
				const [file, type] = staticFiles.get(url.pathname);
				response.writeHead(200, {
					'Content-Type': `${type}; charset=utf-8`,
					'Cache-Control': 'no-store',
					'X-Content-Type-Options': 'nosniff',
					'Content-Security-Policy':
						"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'",
				});
				response.end(await readFile(new URL(file, import.meta.url)));
				return;
			}
			if (request.method === 'GET' && url.pathname === '/api/config') {
				send(200, { baseUrl: base, editorUrl: editor, scenarios, hasApiKey: Boolean(apiKey) });
				return;
			}
			if (request.method === 'GET' && url.pathname === '/api/workflows') {
				send(200, { workflows: await listWorkflows() });
				return;
			}
			const match = /^\/api\/workflows\/([^/]+)\/(executions|publish|trigger)$/.exec(url.pathname);
			if (request.method === 'GET' && match?.[2] === 'executions') {
				const workflow = await api(`workflows/${encodeURIComponent(match[1])}`);
				describe(workflow);
				const executions = await api(
					`executions?${new URLSearchParams({ workflowId: match[1], limit: '5', includeData: 'false' })}`,
				);
				send(200, {
					executions: executions.data.map(({ id, status, mode, startedAt }) => ({
						id,
						status,
						mode,
						startedAt,
						url: `${editor}/workflow/${encodeURIComponent(match[1])}/executions/${encodeURIComponent(id)}`,
					})),
				});
				return;
			}
			if (request.method !== 'POST' || (url.pathname !== '/api/workflows' && !match)) {
				send(404, { error: 'Route not found.' });
				return;
			}
			if (
				request.headers.origin !== origin ||
				request.headers['content-type'] !== 'application/json'
			) {
				send(403, { error: 'Use the dashboard to start this action.' });
				return;
			}
			let raw = '';
			for await (const chunk of request) {
				raw += chunk;
				if (raw.length > 4096) throw new Error('Request is too large. Refresh the dashboard.');
			}
			const body = JSON.parse(raw || '{}');
			const lock = match?.[1] ?? 'create';
			if (busy.has(lock)) {
				send(409, { error: 'An action is already running. Wait for it to finish.' });
				return;
			}
			busy.add(lock);
			try {
				if (!match) {
					if (
						body.projectId &&
						(typeof body.projectId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(body.projectId))
					)
						throw new Error('Copy the project ID from the n8n project URL.');
					const workflow = await api(
						'workflows',
						'POST',
						createWorkflow(body.scenarioId, body.projectId),
					);
					// Keep a created draft visible if publication needs attention.
					let warning;
					try {
						await api(`workflows/${encodeURIComponent(workflow.id)}/publish`, 'POST', {
							versionId: workflow.versionId,
						});
					} catch (error) {
						warning = error.message;
					}
					send(200, { id: workflow.id, warning });
				} else send(200, await action(match[1], match[2], body));
			} finally {
				busy.delete(lock);
			}
		} catch (error) {
			send(400, {
				error:
					error.name === 'TimeoutError'
						? 'The request timed out. Check Executions before sending another input.'
						: error.message,
			});
		}
	});
	return server;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
	const port = Number(process.env.SELF_HEALING_PLAYGROUND_PORT ?? 5698);
	const server = createPlayground({
		baseUrl: process.env.N8N_BASE_URL,
		editorUrl: process.env.N8N_EDITOR_BASE_URL ?? process.env.N8N_BASE_URL,
		webhookUrl: process.env.N8N_WEBHOOK_BASE_URL ?? process.env.N8N_BASE_URL,
		apiKey: process.env.N8N_API_KEY,
	});
	server.on('error', (error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
	server.listen(port, '127.0.0.1', () =>
		console.log(
			`Self-healing playground: http://127.0.0.1:${port}\nGuide: ${fileURLToPath(new URL('README.md', import.meta.url))}`,
		),
	);
}
