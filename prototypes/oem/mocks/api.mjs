const now = new Date().toISOString();

const workflows = [
	{
		id: 'wf_oem_onboarding',
		name: '[OEM] Partner onboarding',
		active: true,
		createdAt: now,
		updatedAt: now,
		tags: [{ id: 'tag_oem', name: 'oem' }],
	},
	{
		id: 'wf_api_sync',
		name: '[API] Tenant sync',
		active: false,
		createdAt: now,
		updatedAt: now,
		tags: [{ id: 'tag_api', name: 'api' }],
	},
];

const projects = [
	{ id: 'proj_acme', name: 'Acme Corp', type: 'team' },
	{ id: 'proj_personal', name: 'Personal', type: 'personal' },
];

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @returns {boolean} true when the request was handled
 */
export function handleMockApi(req, res, url) {
	if (!url.pathname.startsWith('/api/v1/')) {
		return false;
	}

	const method = req.method ?? 'GET';
	const send = (status, body) => {
		res.writeHead(status, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(body, null, 2));
	};

	if (method === 'GET' && url.pathname === '/api/v1/health') {
		send(200, { status: 'ok', service: 'oem-prototype-mock', time: now });
		return true;
	}

	if (method === 'GET' && url.pathname === '/api/v1/workflows') {
		send(200, { data: workflows, nextCursor: null });
		return true;
	}

	if (method === 'GET' && url.pathname === '/api/v1/projects') {
		send(200, { data: projects, nextCursor: null });
		return true;
	}

	const workflowMatch = url.pathname.match(/^\/api\/v1\/workflows\/([^/]+)$/);
	if (method === 'GET' && workflowMatch) {
		const workflow = workflows.find((item) => item.id === workflowMatch[1]);
		if (!workflow) {
			send(404, { message: 'Workflow not found' });
			return true;
		}
		send(200, workflow);
		return true;
	}

	send(404, { message: `No mock for ${method} ${url.pathname}` });
	return true;
}
