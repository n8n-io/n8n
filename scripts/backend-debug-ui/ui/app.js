/** Backend bench page. State lives in the shell so a UI refresh can remount. */

const PAGE = 70;

function h(tag, props, ...children) {
	const node = document.createElement(tag);
	let selectValue = null;
	if (props) {
		for (const [key, value] of Object.entries(props)) {
			if (value == null || value === false) continue;
			if (key === 'class') node.className = value;
			else if (key.startsWith('on') && typeof value === 'function') {
				node.addEventListener(key.slice(2).toLowerCase(), value);
			} else if (key === 'value' && tag === 'select') selectValue = String(value);
			else if (key === 'value' && (tag === 'input' || tag === 'textarea')) node.value = String(value);
			else if (key === 'selected') node.selected = true;
			else node.setAttribute(key, value === true ? '' : String(value));
		}
	}
	for (const child of children.flat()) {
		if (child == null || child === false) continue;
		node.append(child instanceof Node ? child : document.createTextNode(String(child)));
	}
	if (selectValue != null) node.value = selectValue;
	return node;
}

function selectedRoute(state) {
	return state.catalog?.routes.find((route) => route.id === state.routeId) ?? null;
}

function selectedEntity(state) {
	return state.catalog?.entities.find((entity) => entity.name === state.entityId) ?? null;
}

function routeOnPath(route, selected) {
	return Boolean(selected) && route.id === selected.id;
}

function nameOnPath(name, selected, key) {
	return Boolean(selected) && selected[key].includes(name);
}

function routeMatchesDomain(route, domain) {
	if (!domain) return true;
	if (route.domain === domain.id) return true;
	return route.services.some((name) => domain.services.some((service) => service.name === name));
}

function dimRoute(route, state) {
	const selected = selectedRoute(state);
	const domain = state.catalog.domains.find((item) => item.id === state.domainId);
	const domainOk = routeMatchesDomain(route, domain);
	const pathOk = !selected || routeOnPath(route, selected);
	if (!domain && !selected) return false;
	if (domain && selected) return !(domainOk || pathOk);
	return domain ? !domainOk : !pathOk;
}

function dimNamed(name, domainId, state, key) {
	const selected = selectedRoute(state);
	const domainOk = !state.domainId || domainId === state.domainId;
	const pathOk = !selected || nameOnPath(name, selected, key);
	if (!state.domainId && !selected) return false;
	if (state.domainId && selected) return !(domainOk || pathOk);
	return state.domainId ? !domainOk : !pathOk;
}

function matches(filter, parts) {
	if (!filter) return true;
	const haystack = parts.filter(Boolean).join(' ').toLowerCase();
	return haystack.includes(filter.toLowerCase());
}

function authLabel(route) {
	if (route.open) return 'No session check';
	if (route.scope) return route.scope;
	if (route.layer === 'public') return 'API key';
	return 'Signed-in session';
}

function formatTime(iso) {
	if (!iso) return '';
	return new Date(iso).toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

function take(list, key, state) {
	const limit = PAGE + (state.extra[key] ?? 0);
	const shown = list.slice(0, limit);
	const more = list.length - shown.length;
	return { shown, more };
}

function rememberSecrets(state) {
	sessionStorage.setItem('n8n-backend-bench-cookie', state.cookie);
	sessionStorage.setItem('n8n-backend-bench-api-key', state.apiKey);
}

function parseJson(text, label) {
	const trimmed = text.trim();
	if (!trimmed) return { ok: true, value: undefined };
	try {
		return { ok: true, value: JSON.parse(trimmed) };
	} catch {
		return { ok: false, error: `${label} must be JSON.` };
	}
}

function pointerGet(value, pointer) {
	if (!pointer || pointer === '/') return { ok: true, value };
	if (!pointer.startsWith('/')) return { ok: false, error: 'Start the path with /' };
	let current = value;
	for (const raw of pointer.split('/').slice(1)) {
		const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
		if (current == null || (typeof current !== 'object' && !Array.isArray(current))) {
			return { ok: false, error: `Can't walk past ${key}` };
		}
		if (!(key in current)) return { ok: false, error: `${key} is missing` };
		current = current[key];
	}
	return { ok: true, value: current };
}

function diffValues(before, after) {
	if (typeof before !== 'object' || typeof after !== 'object' || before == null || after == null) {
		return { kind: 'replace', same: JSON.stringify(before) === JSON.stringify(after) };
	}
	if (Array.isArray(before) || Array.isArray(after)) {
		return {
			kind: 'array',
			before: Array.isArray(before) ? before.length : 0,
			after: Array.isArray(after) ? after.length : 0,
		};
	}
	const added = [];
	const removed = [];
	const changed = [];
	for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
		if (!(key in before)) added.push(key);
		else if (!(key in after)) removed.push(key);
		else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed.push(key);
	}
	return { kind: 'object', added, removed, changed };
}

async function sendCall(state) {
	if (state.sending) return;
	const query = parseJson(state.draft.query, 'Query');
	if (!query.ok) {
		state.error = query.error;
		state.render?.();
		return;
	}
	if (query.value != null && (typeof query.value !== 'object' || Array.isArray(query.value))) {
		state.error = 'Query must be a JSON object.';
		state.render?.();
		return;
	}
	const body = parseJson(state.draft.body, 'Body');
	if (!body.ok) {
		state.error = body.error;
		state.render?.();
		return;
	}
	state.sending = true;
	state.error = '';
	state.render?.();
	try {
		const response = await fetch('/api/call', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				method: state.draft.method,
				path: state.draft.path,
				query: query.value,
				body: body.value,
				cookie: state.cookie || undefined,
				apiKey: state.apiKey || undefined,
			}),
		});
		const payload = await response.json();
		if (!response.ok || payload.error) {
			state.error = payload.error || `The bench returned ${response.status}.`;
			return;
		}
		state.previousBody = state.response?.body ?? null;
		state.response = payload;
		state.history = [
			{
				method: payload.method,
				path: payload.path,
				query: state.draft.query,
				body: state.draft.body,
				status: payload.status,
				elapsedMs: payload.elapsedMs,
			},
			...state.history,
		].slice(0, 8);
	} catch {
		state.error = "The bench didn't answer. Reload this page.";
	} finally {
		state.sending = false;
		state.render?.();
	}
}

function routeButton(route, state) {
	const on = route.id === state.routeId;
	return h(
		'button',
		{
			type: 'button',
			class: `chip${on ? ' on' : ''}${dimRoute(route, state) ? ' dim' : ''}`,
			'aria-pressed': on ? 'true' : 'false',
			onclick: () => {
				state.routeId = on ? null : route.id;
				if (!on) {
					state.draft.method = route.method;
					state.draft.path = route.fullPath;
				}
				state.render?.();
			},
		},
		h('span', { class: `method ${route.method.toLowerCase()}` }, route.method),
		h('span', { class: 'path' }, route.fullPath),
	);
}

function showMore(key, more, state) {
	if (more <= 0) return null;
	return h(
		'button',
		{
			type: 'button',
			class: 'more',
			onclick: () => {
				state.extra[key] = (state.extra[key] ?? 0) + PAGE;
				state.render?.();
			},
		},
		`Show ${Math.min(more, PAGE)} more`,
	);
}

function layer(className, index, title, count, body) {
	return h(
		'section',
		{ class: `layer ${className}${document.body.dataset.pulse === '1' ? ' flash' : ''}` },
		h(
			'div',
			{ class: 'rail' },
			h('div', null, h('span', null, index), h('strong', null, title)),
			h('span', { class: 'count' }, String(count)),
		),
		h('div', { class: 'layer-body' }, body),
	);
}

function header(state) {
	const catalog = state.catalog;
	const checkout = catalog?.checkout;
	const ports = catalog?.ports;
	const where = checkout?.kind === 'worktree' ? 'Worktree' : 'Main checkout';
	let n8nClass = 'pill';
	let n8nText = 'Checking n8n…';
	if (state.n8n.up === true) {
		n8nClass = 'pill up';
		n8nText = `n8n is up on ${state.n8n.port}`;
	} else if (state.n8n.up === false) {
		n8nClass = 'pill down';
		n8nText = `n8n is not running on ${ports?.n8n ?? ''}`;
	}
	return h(
		'header',
		{ class: 'top' },
		h(
			'div',
			{ class: 'brand' },
			h('span', { class: 'mark', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')),
			h(
				'div',
				null,
				h('h1', null, 'Backend bench'),
				h('p', { class: 'lede' }, 'Inspect layers, call the API, and slice the response'),
			),
		),
		h(
			'div',
			{ class: 'meta' },
			h(
				'span',
				{ class: 'pill' },
				`${where} ${checkout?.name ?? ''}${checkout?.branch ? ` · ${checkout.branch}` : ''}`,
			),
			h('span', { class: 'pill' }, `Bench ${ports?.ui ?? '…'} · n8n ${ports?.n8n ?? '…'}`),
			h('span', { class: n8nClass }, n8nText),
			h(
				'span',
				{ class: 'pill live' },
				h('span', { class: 'dot', 'aria-hidden': 'true' }),
				`Watching sources${catalog?.generatedAt ? ` · ${formatTime(catalog.generatedAt)}` : ''}`,
			),
		),
	);
}

function routeLayer(layerName, title, index, state) {
	const routes = state.catalog.routes.filter(
		(route) =>
			route.layer === layerName &&
			matches(state.filter, [
				route.method,
				route.fullPath,
				route.handler,
				route.controller,
				route.domain,
				route.scope,
				route.summary,
				...route.services,
			]),
	);
	const { shown, more } = take(routes, layerName === 'public' ? 'public' : 'rest', state);
	const key = layerName === 'public' ? 'public' : 'rest';
	const body = h(
		'div',
		null,
		shown.length
			? h('div', { class: 'chips' }, shown.map((route) => routeButton(route, state)))
			: h('p', { class: 'empty' }, 'No routes match.'),
		showMore(key, more, state),
	);
	return layer(layerName === 'public' ? 'public' : 'rest', index, title, routes.length, body);
}

function serviceLayer(state) {
	const domains = state.catalog.domains.filter((domain) =>
		matches(state.filter, [domain.id, ...domain.services.map((service) => service.name)]),
	);
	const selected = selectedRoute(state);
	const serviceCount = domains.reduce((sum, domain) => sum + domain.services.length, 0);
	const cards = domains.map((domain) => {
		const on = state.domainId === domain.id;
		const linked =
			selected &&
			(selected.domain === domain.id ||
				selected.services.some((name) => domain.services.some((service) => service.name === name)));
		const dim = state.domainId && !on && !linked;
		return h(
			'article',
			{ class: `card${on ? ' on' : ''}${dim ? ' dim' : ''}${linked && !on ? ' linked' : ''}` },
			h(
				'header',
				null,
				h(
					'button',
					{
						type: 'button',
						'aria-pressed': on ? 'true' : 'false',
						onclick: () => {
							state.domainId = on ? null : domain.id;
							state.render?.();
						},
					},
					domain.id,
				),
				h('span', { class: 'hint' }, `${domain.services.length} services`),
			),
			on
				? h(
						'ul',
						null,
						domain.services.slice(0, 12).map((service) =>
							h(
								'li',
								null,
								`${service.name} · ${service.methodCount} methods`,
							),
						),
						domain.services.length > 12
							? h('li', null, `${domain.services.length - 12} more in this domain`)
							: null,
					)
				: null,
		);
	});
	return layer(
		'service',
		'03',
		'Services',
		serviceCount,
		h('div', { class: 'cards' }, cards.length ? cards : h('p', { class: 'empty' }, 'No domains match.')),
	);
}

function databaseLayer(state) {
	const entities = state.catalog.entities.filter((entity) =>
		matches(state.filter, [
			entity.name,
			entity.table,
			entity.domain,
			...entity.columns.map((column) => column.name),
		]),
	);
	const { shown, more } = take(entities, 'entities', state);
	const selected = selectedRoute(state);
	const chips = shown.map((entity) => {
		const on = state.entityId === entity.name;
		const linked = nameOnPath(entity.name, selected, 'entities');
		const dim = dimNamed(entity.name, entity.domain, state, 'entities');
		return h(
			'button',
			{
				type: 'button',
				class: `chip${on ? ' on' : ''}${dim ? ' dim' : ''}${linked && !on ? ' linked' : ''}`,
				'aria-pressed': on ? 'true' : 'false',
				onclick: () => {
					state.entityId = on ? null : entity.name;
					state.render?.();
				},
			},
			h('span', { class: 'path' }, entity.name),
			h('span', { class: 'hint' }, ` ${entity.table}`),
		);
	});
	const repositories = state.showRepositories
		? state.catalog.repositories
				.filter((repository) => matches(state.filter, [repository.name, repository.domain]))
				.slice(0, 80)
				.map((repository) => {
					const linked = nameOnPath(repository.name, selected, 'repositories');
					const dim = dimNamed(repository.name, repository.domain, state, 'repositories');
					return h(
						'span',
						{ class: `chip${dim ? ' dim' : ''}${linked ? ' linked' : ''}` },
						repository.name,
					);
				})
		: [];
	return layer(
		'db',
		'04',
		'Database',
		entities.length,
		h(
			'div',
			null,
			h(
				'div',
				{ class: 'row' },
				h(
					'button',
					{
						type: 'button',
						'aria-pressed': state.showRepositories ? 'true' : 'false',
						onclick: () => {
							state.showRepositories = !state.showRepositories;
							state.render?.();
						},
					},
					state.showRepositories ? 'Hide repositories' : 'Show repositories',
				),
				h('span', { class: 'hint' }, `${state.catalog.counts.repositories} repositories`),
			),
			h('div', { class: 'chips' }, chips.length ? chips : h('p', { class: 'empty' }, 'No entities match.')),
			repositories.length ? h('div', { class: 'chips' }, repositories) : null,
			showMore('entities', more, state),
		),
	);
}

function flow(route, state) {
	const bits = [h('span', { class: 'path' }, `${route.method} ${route.fullPath}`)];
	for (const name of route.services) {
		bits.push(h('span', null, '→'), h('span', null, name));
	}
	for (const name of route.repositories) {
		bits.push(h('span', null, '→'), h('span', null, name));
	}
	for (const name of route.entities) {
		bits.push(h('span', null, '→'));
		bits.push(
			h(
				'button',
				{
					type: 'button',
					onclick: () => {
						state.entityId = name;
						state.render?.();
					},
				},
				name,
			),
		);
	}
	return h('div', { class: 'flow' }, bits);
}

function responseView(state) {
	const payload = state.response;
	if (!payload) return h('p', { class: 'hint' }, 'Send a request to see the response and its shape.');
	let parsed = null;
	let json = false;
	try {
		parsed = JSON.parse(payload.body);
		json = true;
	} catch {
		json = false;
	}
	const extracted = json ? pointerGet(parsed, state.pointer) : null;
	let previous = null;
	if (json && state.previousBody) {
		try {
			const before = pointerGet(JSON.parse(state.previousBody), state.pointer);
			if (before.ok && extracted?.ok) previous = diffValues(before.value, extracted.value);
		} catch {
			previous = null;
		}
	}
	const statusClass = payload.status >= 200 && payload.status < 300 ? 'status-ok' : 'status-bad';
	const width = Math.max(4, Math.min(100, payload.elapsedMs / 10));
	return h(
		'div',
		{ class: 'stack' },
		h(
			'div',
			{ class: 'row' },
			h('strong', { class: statusClass }, String(payload.status)),
			h('span', { class: 'path' }, payload.path),
			h('span', { class: 'hint' }, `${payload.elapsedMs} ms`),
		),
		h('div', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: `width: ${width}%` })),
		payload.truncated ? h('p', { class: 'hint' }, 'The bench kept the first 500,000 characters.') : null,
		json
			? h(
					'div',
					{ class: 'stack' },
					h('p', { class: 'hint' }, 'Click a field to slice the response.'),
					h('div', { class: 'keys' }, fieldButtons(parsed, state)),
					h('label', { class: 'field' }, 'JSON pointer', h('input', {
						id: 'pointer',
						class: 'field',
						value: state.pointer,
						spellcheck: 'false',
						placeholder: '/data/0/name',
						oninput: (event) => {
							state.pointer = event.target.value;
							state.render?.();
						},
					})),
					extracted?.ok
						? h('pre', null, typeof extracted.value === 'string' ? extracted.value : JSON.stringify(extracted.value, null, 2))
						: h('p', { class: 'hint' }, extracted?.error ?? ''),
					previous ? diffView(previous) : null,
				)
			: h('p', { class: 'hint' }, 'This response is not JSON.'),
		h('details', null, h('summary', null, 'Raw response'), h('pre', null, payload.body || '(empty)')),
	);
}

function fieldButtons(value, state) {
	if (value == null || typeof value !== 'object') return [];
	const entries = Array.isArray(value)
		? value.slice(0, 20).map((item, index) => [String(index), item])
		: Object.entries(value).slice(0, 24);
	return entries.map(([key, child]) =>
		h(
			'button',
			{
				type: 'button',
				class: 'key',
				onclick: () => {
					const token = String(key).replace(/~/g, '~0').replace(/\//g, '~1');
					state.pointer = `${state.pointer === '/' ? '' : state.pointer}/${token}`;
					state.render?.();
				},
			},
			`${key}${child != null && typeof child === 'object' ? ' {}' : ''}`,
		),
	);
}

function diffView(diff) {
	if (diff.kind === 'replace') {
		return h('p', { class: 'hint' }, diff.same ? 'The slice matches the previous response.' : 'The slice changed.');
	}
	if (diff.kind === 'array') {
		return h('p', { class: 'hint' }, `Length ${diff.before} → ${diff.after}`);
	}
	const line = (label, keys, className) =>
		keys.length
			? h('p', { class: 'hint' }, `${label}: `, ...keys.map((key) => h('span', { class: `key ${className}` }, `${key} `)))
			: null;
	return h(
		'div',
		null,
		h('p', { class: 'hint' }, 'Compared with the previous response'),
		line('Added', diff.added, 'added'),
		line('Removed', diff.removed, 'removed'),
		line('Changed', diff.changed, 'changed'),
		!diff.added.length && !diff.removed.length && !diff.changed.length
			? h('p', { class: 'hint' }, 'The object matches the previous response.')
			: null,
	);
}

function callPanel(state) {
	const route = selectedRoute(state);
	const entity = selectedEntity(state);
	const blocks = [];
	if (!route && !entity && !state.domainId) {
		blocks.push(
			h(
				'div',
				{ class: 'stack' },
				h('h2', null, 'Pick a layer'),
				h('p', { class: 'hint' }, 'Select a route to call it.'),
				h('p', { class: 'hint' }, 'Select a domain to fade the other layers.'),
				h('p', { class: 'hint' }, 'Select an entity to read its columns.'),
			),
		);
	}
	if (route) {
		blocks.push(
			h(
				'div',
				{ class: 'stack' },
				h('h2', null, route.summary || route.handler || route.controller),
				h('p', { class: 'hint' }, `${route.controller} · ${route.file}:${route.line}`),
				h('p', { class: 'hint' }, authLabel(route)),
				flow(route, state),
				route.mappers.length
					? h(
							'details',
							null,
							h('summary', null, 'Transforms in this file'),
							route.mappers.map((mapper) =>
								h('div', null, h('p', { class: 'path' }, mapper.name), h('pre', null, mapper.source)),
							),
						)
					: null,
			),
		);
	}
	blocks.push(
		h(
			'div',
			{ class: 'stack' },
			h('h2', null, 'Call'),
			h(
				'div',
				{ class: 'row' },
				h(
					'button',
					{
						type: 'button',
						onclick: () => {
							state.draft.method = 'GET';
							state.draft.path = '/rest/tags';
							state.render?.();
						},
					},
					'Fill GET /rest/tags',
				),
				h(
					'button',
					{
						type: 'button',
						onclick: () => {
							state.draft.method = 'GET';
							state.draft.path = '/api/v1/tags';
							state.render?.();
						},
					},
					'Fill GET /api/v1/tags',
				),
			),
			h(
				'label',
				{ class: 'field' },
				'Method',
				h(
					'select',
					{
						id: 'method',
						class: 'field',
						value: state.draft.method,
						onchange: (event) => {
							state.draft.method = event.target.value;
							state.render?.();
						},
					},
					...['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((method) =>
						h('option', { value: method, selected: method === state.draft.method }, method),
					),
				),
			),
			h('label', { class: 'field' }, 'Path', h('input', {
				id: 'path',
				class: 'field',
				value: state.draft.path,
				spellcheck: 'false',
				placeholder: '/api/v1/workflows',
				oninput: (event) => {
					state.draft.path = event.target.value;
					state.render?.();
				},
			})),
			h('label', { class: 'field' }, 'Query JSON', h('textarea', {
				id: 'query',
				class: 'field',
				value: state.draft.query,
				spellcheck: 'false',
				placeholder: '{"limit":"10"}',
				oninput: (event) => {
					state.draft.query = event.target.value;
					state.render?.();
				},
			})),
			h('label', { class: 'field' }, 'JSON body', h('textarea', {
				id: 'body',
				class: 'field',
				value: state.draft.body,
				spellcheck: 'false',
				placeholder: '{"name":"alpha"}',
				oninput: (event) => {
					state.draft.body = event.target.value;
					state.render?.();
				},
			})),
			h('label', { class: 'field' }, 'Session cookie', h('input', {
				id: 'cookie',
				class: 'field',
				value: state.cookie,
				spellcheck: 'false',
				autocomplete: 'off',
				placeholder: 'n8n-auth=paste-the-cookie-value',
				oninput: (event) => {
					state.cookie = event.target.value;
					rememberSecrets(state);
					state.render?.();
				},
			})),
			h('label', { class: 'field' }, 'API key', h('input', {
				id: 'api-key',
				class: 'field',
				value: state.apiKey,
				spellcheck: 'false',
				autocomplete: 'off',
				placeholder: 'eyJhbGciOiJIUzI1NiJ9.example',
				oninput: (event) => {
					state.apiKey = event.target.value;
					rememberSecrets(state);
					state.render?.();
				},
			})),
			h('p', { class: 'hint' }, 'Stored in this browser tab only. Ctrl+Enter sends the request.'),
			state.error ? h('p', { class: 'status-bad' }, state.error) : null,
			h(
				'button',
				{
					type: 'button',
					class: 'send',
					disabled: state.sending ? 'true' : null,
					onclick: () => state.send?.(),
				},
				state.sending ? 'Sending…' : `Send ${state.draft.method}`,
			),
		),
	);
	blocks.push(responseView(state));
	if (state.history.length) {
		blocks.push(
			h(
				'div',
				{ class: 'stack' },
				h('h2', null, 'Recent calls'),
				...state.history.map((entry) =>
					h(
						'button',
						{
							type: 'button',
							onclick: () => {
								state.draft.method = entry.method;
								state.draft.path = entry.path.split('?')[0];
								state.draft.query = entry.query;
								state.draft.body = entry.body;
								state.render?.();
							},
						},
						`${entry.method} ${entry.path} · ${entry.status} · ${entry.elapsedMs} ms`,
					),
				),
			),
		);
	}
	if (entity) {
		blocks.push(
			h(
				'div',
				{ class: 'stack' },
				h('h2', null, entity.name),
				h(
					'p',
					{ class: 'hint' },
					entity.tableExplicit ? `Table ${entity.table}` : `Table name defaults to ${entity.table}`,
				),
				h('p', { class: 'hint' }, `${entity.file} · ${entity.domain}`),
				h(
					'ul',
					null,
					entity.columns.map((column) =>
						h(
							'li',
							null,
							column.inherited
								? `${column.name} · from base class`
								: `${column.name} · ${column.decorator}`,
						),
					),
				),
			),
		);
	}
	if (state.domainId) {
		const domain = state.catalog.domains.find((item) => item.id === state.domainId);
		if (domain) {
			blocks.push(
				h(
					'div',
					{ class: 'stack' },
					h('h2', null, domain.id),
					...domain.services.map((service) =>
						h(
							'details',
							null,
							h('summary', null, `${service.name} · ${service.file}`),
							h(
								'ul',
								null,
								service.methods.map((method) => h('li', { class: 'mono' }, method)),
							),
							service.methodCount > service.methods.length
								? h('p', { class: 'hint' }, `${service.methodCount} methods in this class`)
								: null,
						),
					),
				),
			);
		}
	}
	return h('div', { class: 'stack' }, blocks);
}

export function mount(root, state) {
	state.render = () => mount(root, state);
	state.send = () => sendCall(state);
	const active = document.activeElement;
	const activeId = active?.id;
	const caret = active && 'selectionStart' in active ? active.selectionStart : null;
	const boardScroll = document.querySelector('.board')?.scrollTop ?? 0;
	const panelScroll = document.querySelector('.panel')?.scrollTop ?? 0;
	document.body.dataset.pulse = state.pulse ? '1' : '0';

	const catalog = state.catalog;
	root.replaceChildren(
		h(
			'div',
			{ class: 'shell' },
			header(state),
			h('div', { class: `sweep${state.pulse ? ' on' : ''}` }),
			h('div', { class: 'notice', role: 'status' }, state.notice || ''),
			catalog
				? h(
						'div',
						{ class: 'workspace' },
						h(
							'div',
							{ class: 'board' },
							h('input', {
								id: 'search',
								class: 'search',
								type: 'search',
								value: state.filter,
								placeholder: 'Filter by path, domain, or class',
								'aria-label': 'Filter the map',
								oninput: (event) => {
									state.filter = event.target.value;
									state.extra = { public: 0, rest: 0, entities: 0 };
									state.render?.();
								},
							}),
							h(
								'div',
								{ class: 'layers' },
								routeLayer('public', 'Public API', '01', state),
								routeLayer('rest', 'CLI REST', '02', state),
								serviceLayer(state),
								databaseLayer(state),
							),
						),
						h('aside', { class: 'panel' }, callPanel(state)),
					)
				: h('p', { class: 'empty' }, 'Reading the checkout…'),
		),
	);

	if (activeId) {
		const next = document.getElementById(activeId);
		if (next) {
			next.focus();
			if (caret != null && next.setSelectionRange) {
				const pos = Math.min(caret, next.value.length);
				next.setSelectionRange(pos, pos);
			}
		}
	}
	const board = document.querySelector('.board');
	if (board) board.scrollTop = boardScroll;
	const panel = document.querySelector('.panel');
	if (panel) panel.scrollTop = panelScroll;
}
