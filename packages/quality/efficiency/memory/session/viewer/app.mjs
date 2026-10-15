import { createMemoryChart } from './chart.mjs';
import { endpointKey, memoryKeys, profileForRequest, requestKey } from './chart-data.mjs';
import { initializeDashboard } from './dashboard.mjs';
import { readPreferences, savePreferences } from './preferences.mjs';

const stringsResponse = await fetch('api/strings');
const strings = await stringsResponse.json();
const t = (key) => strings[key] ?? key;
const element = (id) => document.getElementById(id);
const mib = (bytes) =>
	(bytes / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 });
const seconds = (ms) => (ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 });
let report;
let selectedRequest;
let controlPending = false;
const preferences = readPreferences();
const favorites = new Set(preferences.favorites);
let hideGaps = preferences.hideGaps;

document.title = t('title');
for (const node of document.querySelectorAll('[data-i18n]'))
	node.textContent = t(node.dataset.i18n);
element('chart').setAttribute('aria-label', t('timeline'));
element('marker').placeholder = t('markerPlaceholder');
element('request-search').placeholder = t('searchAllColumns');

function list(id, items) {
	const target = element(id);
	target.replaceChildren();
	for (const item of items) {
		const node = document.createElement('li');
		node.textContent = item;
		target.append(node);
	}
}

function highlightMatches(node, query) {
	if (!query) return;
	const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const text of nodes) {
		const value = text.textContent;
		const lower = value.toLowerCase();
		if (!lower.includes(query)) continue;
		const fragment = document.createDocumentFragment();
		let start = 0;
		let index;
		while ((index = lower.indexOf(query, start)) !== -1) {
			fragment.append(value.slice(start, index));
			const mark = document.createElement('mark');
			mark.textContent = value.slice(index, index + query.length);
			fragment.append(mark);
			start = index + query.length;
		}
		fragment.append(value.slice(start));
		text.replaceWith(fragment);
	}
}

function table(id, headers, rows, { query = '', emptyText = t('noSamples') } = {}) {
	const target = element(id);
	target.replaceChildren();
	if (!rows.length) {
		target.textContent = emptyText;
		return;
	}
	const tableNode = document.createElement('table');
	const head = document.createElement('thead');
	const headerRow = document.createElement('tr');
	for (const header of headers) {
		const th = document.createElement('th');
		th.scope = 'col';
		th.textContent = header;
		headerRow.append(th);
	}
	head.append(headerRow);
	tableNode.append(head);
	const body = document.createElement('tbody');
	for (const row of rows) {
		const tr = document.createElement('tr');
		for (const value of row) {
			const td = document.createElement('td');
			if (value instanceof Node) {
				td.append(value);
				if (
					query &&
					value instanceof HTMLElement &&
					value.dataset.searchValue?.toLowerCase().includes(query)
				)
					value.classList.add('search-match');
			} else td.textContent = value;
			highlightMatches(td, query);
			tr.append(td);
		}
		body.append(tr);
	}
	tableNode.append(body);
	target.append(tableNode);
}

const chart = createMemoryChart(element('chart'), { t, onSelectRequest: selectRequest });
const dashboard = initializeDashboard({ t, onLayoutChange: () => chart.resize() });
element('hide-gaps').checked = hideGaps;

function drawSessionTimeline() {
	if (!report?.session) return;
	element('all-requests').hidden = !selectedRequest;
	chart.render({ report, favorites, selectedRequest, hideGaps });
}

async function selectRequest(request) {
	selectedRequest = requestKey(request);
	const checkpoint = profileForRequest(report.session.profiles, request);
	element('profile').value = checkpoint
		? String(report.session.profiles.indexOf(checkpoint))
		: 'none';
	drawSessionTimeline();
	try {
		await showAllocations();
	} catch (error) {
		element('error').textContent = error.message;
	}
}

function toggleFavorite(key) {
	if (favorites.has(key)) favorites.delete(key);
	else favorites.add(key);
	savePreferences({ favorites: [...favorites], hideGaps });
	showRequests();
	drawSessionTimeline();
}

function favoriteButton(key, label, compact = false, focusKey = `favorite:${key}`) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'favorite-endpoint';
	button.dataset.focusKey = focusKey;
	button.setAttribute('aria-pressed', String(favorites.has(key)));
	button.setAttribute('aria-label', `${t('favoriteEndpoint')}: ${label}`);
	button.title = t(favorites.has(key) ? 'removeFavorite' : 'addFavorite');
	button.dataset.searchValue = t(favorites.has(key) ? 'pinned' : 'notPinned');
	const pin = document.createElement('span');
	pin.className = 'endpoint-pin';
	pin.setAttribute('aria-hidden', 'true');
	button.append(pin);
	if (!compact) button.append(document.createTextNode(label));
	button.addEventListener('click', () => toggleFavorite(key));
	return button;
}

function showRequests() {
	if (!report) return;
	const focused = document.activeElement?.dataset.focusKey;
	const requests = report.requests;
	const query = element('request-search').value.trim().toLowerCase();
	element('favorite-endpoints').replaceChildren();
	for (const key of favorites) {
		const [api, method, route] = JSON.parse(key);
		const label = `${t(api === 'public' ? 'publicApi' : 'internalApi')}: ${method} ${route}`;
		element('favorite-endpoints').append(favoriteButton(key, label));
	}
	element('requests-status').textContent = t(
		report.live && report.status?.capture?.requests === false
			? 'requestCaptureDisabled'
			: requests?.enabled
				? 'requestHistory'
				: 'requestCaptureUnavailable',
	);
	table(
		'requests',
		[
			t('favorite'),
			t('requestStart'),
			t('requestApi'),
			t('requestMethod'),
			t('requestRoute'),
			t('requestStatus'),
			t('requestDuration'),
		],
		(requests?.recent ?? [])
			.slice(-200)
			.reverse()
			.map((request) => {
				const focus = document.createElement('button');
				focus.type = 'button';
				focus.className = 'request-start';
				focus.dataset.focusKey = `request:${requestKey(request)}`;
				focus.textContent = seconds(request.elapsedMs);
				focus.setAttribute('aria-label', `${request.method} ${request.route}`);
				focus.addEventListener('click', async () => await selectRequest(request));
				return [
					favoriteButton(
						endpointKey(request),
						`${request.api}: ${request.method} ${request.route}`,
						true,
						`favorite:${requestKey(request)}`,
					),
					focus,
					t(request.api === 'public' ? 'publicApi' : 'internalApi'),
					request.method,
					request.route,
					request.aborted ? t('requestAborted') : (request.statusCode ?? t('requestUnfinished')),
					Number.isFinite(request.durationMs)
						? Math.round(request.durationMs).toLocaleString()
						: '—',
				];
			})
			.filter((row) =>
				row.some((value) =>
					(value instanceof HTMLElement
						? (value.dataset.searchValue ?? value.textContent)
						: String(value)
					)
						.toLowerCase()
						.includes(query),
				),
			),
		{ query, emptyText: t(query ? 'noMatchingRequests' : 'noSamples') },
	);
	if (focused) {
		const replacement = [...document.querySelectorAll('[data-focus-key]')].find(
			(node) => node.dataset.focusKey === focused,
		);
		replacement?.focus({ preventScroll: true });
	}
}

async function showAllocations() {
	let sites = element('profile').value === 'none' ? [] : (report.allocationSites ?? []);
	if (report.session && !['latest', 'none'].includes(element('profile').value)) {
		const response = await fetch(
			`api/profile?index=${encodeURIComponent(element('profile').value)}`,
		);
		if (!response.ok) throw new Error(t('readError'));
		sites = await response.json();
	}
	table(
		'allocations',
		[t('function'), t('sampledMemory'), t('source')],
		sites.map((site) => [
			site.functionName,
			mib(site.bytes),
			`${site.url}:${site.line}:${site.column}`,
		]),
		{
			emptyText: t(
				report.live && report.status?.capture?.allocations === false
					? 'allocationCaptureDisabled'
					: 'noSamples',
			),
		},
	);
}

async function refresh() {
	const response = await fetch('api/report');
	if (!response.ok) throw new Error(t('readError'));
	report = await response.json();
	element('error').textContent = '';
	const phase = report.status?.phase ?? report.session?.status ?? 'replay';
	element('phase').textContent = t(phase);
	element('phase').dataset.phase = phase;
	element('description').textContent = report.session
		? t('scopeDescription')
		: t('standaloneDescription');
	const backendReady = report.live && report.status?.ready && report.status.backendUrl;
	element('backend').hidden = !backendReady;
	if (backendReady) element('backend').href = report.status.editorUrl ?? report.status.backendUrl;
	else element('backend').removeAttribute('href');
	const backendFailed = report.session?.status === 'failed' || phase === 'failed';
	const backendWaiting = report.live && !report.status?.ready && !backendFailed;
	element('backend-spinner').hidden = !backendWaiting;
	element('backend-status-message').textContent = backendFailed
		? t('backendFailed')
		: backendWaiting
			? t('backendWaiting')
			: '';
	dashboard.setAvailable('controls', Boolean(report.live));
	element('recording-actions').hidden = !report.live;
	element('capture-options').hidden = !report.live;
	for (const id of [
		'timeline-section',
		'statistics-section',
		'markers-section',
		'requests-section',
	])
		dashboard.setAvailable(id, Boolean(report.session));
	dashboard.setAvailable('allocations-section', report.kind !== 'heapsnapshot');
	dashboard.setAvailable('constructors-section', report.kind === 'heapsnapshot');
	updateControls();
	const selected = element('profile').value;
	element('profile').replaceChildren();
	const latest = document.createElement('option');
	latest.value = 'latest';
	latest.textContent = t('latest');
	element('profile').append(latest);
	const none = document.createElement('option');
	none.value = 'none';
	none.textContent = t('noRequestCheckpoint');
	none.disabled = true;
	element('profile').append(none);
	for (const [index, profile] of (report.session?.profiles ?? []).entries()) {
		const option = document.createElement('option');
		option.value = String(index);
		option.textContent = `${seconds(profile.elapsedMs)} s · ${profile.segmentId}`;
		element('profile').append(option);
	}
	element('profile').value = selected || 'latest';
	await showAllocations();
	if (report.session) {
		drawSessionTimeline();
		showRequests();
		table(
			'statistics',
			[t('metric'), t('initial'), t('peak'), t('final'), t('change')],
			memoryKeys
				.filter((key) => report.memory[key])
				.map((key) => {
					const stats = report.memory[key];
					return [
						t(key),
						...['initialMedian', 'peak', 'finalMedian', 'change'].map((stat) => mib(stats[stat])),
					];
				}),
		);
		list(
			'markers',
			report.session.markers.map((marker) => `${seconds(marker.elapsedMs)} s · ${marker.label}`),
		);
		list('issues', [
			...report.comparison.issues,
			...report.session.errors.map((error) => error.message),
			...report.session.gaps.map((gap) => `${seconds(gap.elapsedMs)} s · ${gap.message}`),
		]);
		element('details').textContent = JSON.stringify(
			{
				metadata: report.session.metadata,
				segments: report.session.segments,
				settings: report.session.settings,
				recordingIntervals: report.session.recordingIntervals,
				pauses: report.session.pauses,
				captureChanges: report.session.captureChanges,
			},
			null,
			2,
		);
	} else {
		element('details').textContent = report.filename;
		table(
			'constructors',
			[t('constructor'), t('count'), t('shallowMemory')],
			(report.constructors ?? []).map((group) => [group.name, group.count, mib(group.bytes)]),
		);
	}
	const files = report.session
		? [
				'session.json',
				report.session.timeline,
				...(report.session.requests ? [report.session.requests] : []),
				...report.session.profiles.map((profile) => profile.file),
				...report.session.snapshots.map((snapshot) => snapshot.file),
			]
		: [report.filename];
	element('artifacts').replaceChildren();
	for (const file of files) {
		const li = document.createElement('li');
		const link = document.createElement('a');
		link.textContent = file;
		link.href = `artifact/${encodeURIComponent(file)}`;
		link.download = file.split('/').at(-1);
		li.append(link);
		element('artifacts').append(li);
	}
}

async function control(action, body = {}) {
	const response = await fetch(`api/${action}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result.error ?? t('controlError'));
	return result;
}

element('profile').addEventListener('change', async () => {
	try {
		await showAllocations();
	} catch (error) {
		element('error').textContent = error.message;
	}
});
element('request-search').addEventListener('input', showRequests);
element('all-requests').addEventListener('click', () => {
	selectedRequest = undefined;
	drawSessionTimeline();
});
element('marker-form').addEventListener('submit', async (event) => {
	event.preventDefault();
	try {
		await control('mark', { label: element('marker').value });
		element('marker').value = '';
		await refresh();
	} catch (error) {
		element('error').textContent = error.message;
	}
});
element('snapshot').addEventListener('click', async () => {
	if (!window.confirm(t('snapshotWarning'))) return;
	controlPending = true;
	updateControls();
	try {
		await control('snapshot');
		await refresh();
	} catch (error) {
		element('error').textContent = error.message;
	} finally {
		controlPending = false;
		updateControls();
	}
});
function updateControls() {
	const phase = report.status?.phase ?? report.session?.status ?? 'replay';
	const ready = report.live && report.status?.ready && !controlPending;
	const capture = report.status?.capture;
	const disabled =
		capture &&
		!['metrics', 'requests', 'allocations'].some(
			(key) => capture[key] && report.status?.capabilities?.[key],
		);
	element('phase').textContent = t(phase === 'measurement' && disabled ? 'captureDisabled' : phase);
	element('start-recording').disabled = !ready || phase !== 'paused';
	element('pause-recording').disabled = !ready || phase !== 'measurement';
	element('finish-session').disabled = !report.live || controlPending;
	element('snapshot').disabled = !ready || !report.status?.capabilities?.snapshots;
	element('recording-status').textContent = t(
		phase === 'paused'
			? 'recordingPaused'
			: disabled
				? 'captureDisabledDescription'
				: 'recordingActive',
	);
	for (const key of ['metrics', 'requests', 'allocations']) {
		const input = element(`capture-${key}`);
		if (!controlPending)
			input.checked = Boolean(capture?.[key] && report.status?.capabilities?.[key]);
		input.disabled = !ready || !report.status?.capabilities?.[key];
	}
	const interval = element('metrics-interval');
	if (capture && !controlPending) {
		if (![...interval.options].some((option) => option.value === String(capture.intervalMs))) {
			const option = document.createElement('option');
			option.value = String(capture.intervalMs);
			option.textContent = `${seconds(capture.intervalMs)} s`;
			interval.append(option);
		}
		interval.value = String(capture.intervalMs);
	}
	interval.disabled = !ready || !capture?.metrics;
	const unavailable = !report.status?.capabilities?.allocations
		? 'captureInspectorUnavailable'
		: !report.status?.capabilities?.requests
			? 'captureRequestsUnavailable'
			: undefined;
	element('capture-unavailable').hidden = !report.live || !report.status?.ready || !unavailable;
	element('capture-unavailable').textContent = unavailable ? t(unavailable) : '';
}
for (const key of ['metrics', 'requests', 'allocations', 'intervalMs']) {
	const input = element(key === 'intervalMs' ? 'metrics-interval' : `capture-${key}`);
	input.addEventListener('change', async () => {
		const value = key === 'intervalMs' ? Number(input.value) : input.checked;
		controlPending = true;
		updateControls();
		try {
			const result = await control('configure', { [key]: value });
			report.status.capture = result.capture;
			await refresh();
		} catch (error) {
			element('error').textContent = error.message;
		} finally {
			controlPending = false;
			updateControls();
		}
	});
}
for (const [id, action] of [
	['start-recording', 'resume'],
	['pause-recording', 'pause'],
	['finish-session', 'stop'],
]) {
	element(id).addEventListener('click', async () => {
		controlPending = true;
		updateControls();
		try {
			await control(action);
			await refresh();
		} catch (error) {
			element('error').textContent = error.message;
		} finally {
			controlPending = false;
			updateControls();
		}
	});
}
element('hide-gaps').addEventListener('change', () => {
	hideGaps = element('hide-gaps').checked;
	savePreferences({ favorites: [...favorites], hideGaps });
	drawSessionTimeline();
});

async function poll() {
	try {
		await refresh();
	} catch {
		element('error').textContent = t('readError');
	}
	if (!report || report.live || report.status?.phase === 'stopping') setTimeout(poll, 1000);
}
await poll();
