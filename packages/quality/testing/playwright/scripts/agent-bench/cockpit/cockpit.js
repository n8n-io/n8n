// Agent bench cockpit. Plain browser JS, no build. The bench pushes its whole
// state over /events. Set window.COCKPIT_DEMO before this script to feed
// states yourself through window.cockpit.render(state).
//
// The page answers four questions, in order: what the agent is, what the
// bench sends it, how CPU and memory of the main move during each run, and
// which settings each run used.
(() => {
	const KIND_COLORS = {
		plain: 'var(--plain)',
		tool: 'var(--tool)',
		long: 'var(--long)',
		webhook: 'var(--webhook)',
		workflow: 'var(--workflow)',
	};
	const app = document.getElementById('app');
	let last = null;
	// Chart under the pointer and the x (seconds) there.
	let hover = null;
	const charts = {};

	const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
	const pct = (v) => (v == null ? '–' : `${Math.round(v)}%`);
	const mb = (v) =>
		v == null ? '–' : v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`;

	function quantile(values, q) {
		const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b);
		if (!sorted.length) return null;
		return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
	}

	function duration(msTotal) {
		const s = Math.max(0, Math.round(msTotal / 1000));
		return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
	}

	// ---- chart ----------------------------------------------------------

	function niceMax(v) {
		if (!v || v <= 0) return 1;
		const p = 10 ** Math.floor(Math.log10(v));
		const n = v / p;
		return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
	}

	/**
	 * series: [{ name, color, points: [[x, y]], width?, dash? }]. x is seconds
	 * since measuring started. `limit` draws a labelled line, e.g. the container
	 * limit. Hovering shows the values at that time.
	 */
	function chart(series, { id, height = 180, yFormat, xMax, limit }) {
		const W = 600;
		const H = height;
		const L = 48;
		const B = 18;
		const all = series.flatMap((s) => s.points);
		const xm = Math.max(xMax ?? 0, ...all.map((p) => p[0]), 10);
		const top = Math.max(0, ...all.map((p) => p[1] ?? 0), limit?.value ?? 0);
		const ym = niceMax(top * 1.05);
		const x = (v) => L + (v / xm) * (W - L - 6);
		const y = (v) => H - B - (v / ym) * (H - B - 8);
		let out = '';
		for (let i = 0; i <= 4; i++) {
			const v = (ym / 4) * i;
			out += `<line class="grid" x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}"/>`;
			out += `<text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${esc(yFormat(v))}</text>`;
		}
		for (let i = 0; i <= 5; i++) {
			const v = (xm / 5) * i;
			out += `<text x="${x(v)}" y="${H - 4}" text-anchor="middle">${duration(v * 1000)}</text>`;
		}
		if (limit) {
			out += `<line class="limit" x1="${L}" x2="${W - 6}" y1="${y(limit.value)}" y2="${y(limit.value)}"/>`;
			out += `<text class="limit-label" x="${W - 8}" y="${y(limit.value) - 4}" text-anchor="end">${esc(limit.label)}</text>`;
		}
		for (const s of series) {
			const pts = s.points.filter((p) => p[1] != null);
			if (!pts.length) continue;
			const d = pts
				.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`)
				.join('');
			out += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width ?? 2}" stroke-linejoin="round" vector-effect="non-scaling-stroke"${s.dash ? ' stroke-dasharray="5 4"' : ''}/>`;
		}
		charts[id] = { xm, L, W };
		let tip = '';
		if (hover?.id === id) {
			const rows = series
				.map((s) => [s, nearest(s.points, hover.x)])
				.filter(([, p]) => p && p[1] != null);
			if (rows.length) {
				const px = x(hover.x);
				out += `<line class="cursor" x1="${px}" x2="${px}" y1="4" y2="${H - B}"/>`;
				const left = (px / W) * 100;
				tip = `<div class="tip" style="${left > 60 ? `right:${100 - left + 1}%` : `left:${left + 1}%`}"><div class="tip-t">${duration(hover.x * 1000)}</div>${rows
					.map(
						([s, p]) =>
							`<div><span style="--c:${s.color}">${esc(s.name)}</span><b>${esc(yFormat(p[1]))}</b></div>`,
					)
					.join('')}</div>`;
			}
		}
		const legend = series
			.map(
				(s) => `<span class="${s.dash ? 'dash' : ''}" style="--c:${s.color}">${esc(s.name)}</span>`,
			)
			.join('');
		return `<div class="chart-wrap" data-chart="${esc(id)}"><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${out}</svg>${tip}</div><div class="legend">${legend}</div>`;
	}

	function nearest(points, x) {
		let best = null;
		for (const p of points) {
			if (p[1] == null) continue;
			if (!best || Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
		}
		return best;
	}

	// ---- sections -------------------------------------------------------

	function section(n, title, body, hint = '') {
		return `<section><h2><span class="n">${n}</span>${esc(title)}${hint ? `<span class="hint">${hint}</span>` : ''}</h2>${body}</section>`;
	}

	function agentSection(state) {
		const a = state.agent;
		if (!a) return '';
		const tools = a.tools
			.map(
				(t) => `<div class="row"><span class="label">Tool</span><div>
					<code>${esc(t.name)}</code> runs a workflow:
					<div class="flow">${t.steps.map((s) => `<span>${esc(s)}</span>`).join('<i>→</i>')}</div></div></div>`,
			)
			.join('');
		return section(
			1,
			'The agent',
			`<div class="rows">
				<div class="row"><span class="label">Name</span><div>${esc(a.name)}</div></div>
				<div class="row"><span class="label">Model</span><div><code>${esc(a.model)}</code></div></div>
				<div class="row"><span class="label">Instructions</span><div class="quote">${esc(a.instructions)}</div></div>
				${tools}
			</div>`,
		);
	}

	function scenarioSection(state) {
		if (!state.scenarios?.length) return '';
		const rows = state.scenarios
			.map(
				(s) => `<div class="scenario">
					<div class="head"><span class="kind" style="--c:${KIND_COLORS[s.kind]}">${esc(s.kind)}</span>
						<b>${Math.round(s.share * 100)}%</b><span class="muted">of turns</span></div>
					<div>${esc(s.path)}</div>
					<details><summary>“${esc(s.prompts[0])}”${s.prompts.length > 1 ? ` <span class="muted">+${s.prompts.length - 1} more</span>` : ''}</summary>
						<ul>${s.prompts
							.slice(1)
							.map((p) => `<li>“${esc(p)}”</li>`)
							.join('')}</ul></details>
				</div>`,
			)
			.join('');
		return section(
			2,
			'Scenarios',
			`<p class="muted lead">Every run sends the same turns in the same order. Each turn is a new chat. Prompts rotate through the list.</p>${rows}`,
		);
	}

	/** Sum of `key` over the mains at one sample, or null when one did not report. */
	function mainsAt(sample, mains, key) {
		let total = 0;
		for (const name of mains) {
			const v = sample.processes[name]?.[key];
			if (typeof v !== 'number') return null;
			total += v;
		}
		return mains.length ? total : null;
	}

	function runCard(t, now) {
		const c = t.config;
		const done = t.turns.length;
		const errors = t.turns.filter((x) => !x.ok).length;
		const t0 = t.measureStartedAt;
		const end = t.finishedAt ?? now;
		const tpm = t.result?.turnsPerMinute ?? (t0 && done ? done / ((end - t0) / 60000) : null);
		const shape = c
			? `${c.mains} main · ${c.workers} worker${c.workers === 1 ? '' : 's'}${c.agentQueue && c.slotsPerWorker ? ` × ${c.slotsPerWorker} slots` : ''} · agent turns on ${c.agentQueue ? 'workers' : 'main'}`
			: '';
		const head = `<div class="run-head">
			<b>${esc(t.name)}</b><span class="pill ${t.status}">${t.status}</span>
			<span class="muted">${esc(shape)}</span>
			<span class="facts">${t0 ? `${done} / ${t.planned} turns · ${errors} error${errors === 1 ? '' : 's'}${tpm ? ` · ${tpm.toFixed(0)} turns/min` : ''} · ${duration(end - t0)}` : esc(t.status === 'pending' ? 'not started' : t.status)}</span>
		</div>`;
		if (t.error) return `<div class="run">${head}<p class="bad">${esc(t.error)}</p></div>`;
		if (!t0) return `<div class="run">${head}</div>`;

		const mains = t.processes.filter((p) => p.role === 'main').map((p) => p.name);
		const samples = t.samples.filter((x) => x.t >= t0 && x.t <= end);
		const sec = (ts) => (ts - t0) / 1000;
		const cpu = samples.map((x) => [sec(x.t), mainsAt(x, mains, 'cpu')]);
		const rss = samples.map((x) => [sec(x.t), mainsAt(x, mains, 'rssMb')]);
		const heap = samples.map((x) => [sec(x.t), mainsAt(x, mains, 'heapUsedMb')]);
		const cpuValues = cpu.map((p) => p[1]);
		const rssValues = rss.map((p) => p[1]).filter((v) => v != null);
		const peakMem = rssValues.length ? Math.max(...rssValues) : null;
		const peakCpu = quantile(cpuValues, 1);
		const label = mains.length > 1 ? `${mains.length} mains, summed` : 'main';
		const workers = t.processes
			.filter((p) => p.role === 'worker')
			.map((p) => p.name)
			.sort();
		const workerColors = ['#3b82f6', '#14b8a6', '#a855f7', '#f59e0b'];
		const workerSeries = (key, dash) =>
			workers.map((name, i) => ({
				name: `${key === 'cpu' ? 'CPU' : 'memory'} · worker ${i + 1}`,
				color: workerColors[i % workerColors.length],
				width: 1.6,
				dash,
				points: samples.map((x) => [sec(x.t), x.processes[name]?.[key] ?? null]),
			}));
		const workerCpu = workers.flatMap((name) => samples.map((x) => x.processes[name]?.cpu ?? null));
		const workerRss = workers
			.flatMap((name) => samples.map((x) => x.processes[name]?.rssMb))
			.filter((v) => v != null);
		const workerStat = (kind) =>
			workers.length
				? kind === 'cpu'
					? `<div class="stat"><span>Workers</span><b>${pct(quantile(workerCpu, 0.5))}</b><span class="muted">typical</span><b>${pct(quantile(workerCpu, 1))}</b><span class="muted">peak, each</span></div>`
					: `<div class="stat"><span>Workers</span><b>${mb(workerRss.length ? Math.max(...workerRss) : null)}</b><span class="muted">peak, largest</span></div>`
				: '';

		const memLimit = c?.limits?.main?.memory ? c.limits.main.memory * 1024 * mains.length : null;
		const cpuLimit = c?.limits?.main?.cpu ? c.limits.main.cpu * 100 * mains.length : null;
		const xMax = sec(end);
		const cpuChart = chart(
			[{ name: `CPU · ${label}`, color: 'var(--accent)', points: cpu }, ...workerSeries('cpu')],
			{
				id: `cpu-${t.name}`,
				yFormat: pct,
				xMax,
				limit: cpuLimit ? { value: cpuLimit, label: `limit ${pct(cpuLimit)}` } : undefined,
			},
		);
		const memChart = chart(
			[
				{ name: `memory · ${label}`, color: 'var(--ink)', points: rss },
				{
					name: 'live JS heap · main',
					color: 'var(--muted)',
					dash: true,
					width: 1.6,
					points: heap,
				},
				...workerSeries('rssMb'),
			],
			{
				id: `mem-${t.name}`,
				yFormat: mb,
				xMax,
				limit: memLimit ? { value: memLimit, label: `limit ${mb(memLimit)}` } : undefined,
			},
		);
		const share = (v, limit) =>
			v != null && limit
				? ` <span class="muted">· ${Math.round((v / limit) * 100)}% of limit</span>`
				: '';
		return `<div class="run">${head}
			<div class="pair">
				<div><div class="stat"><span>CPU</span><b>${pct(quantile(cpuValues, 0.5))}</b><span class="muted">typical</span><b>${pct(peakCpu)}</b><span class="muted">peak${share(peakCpu, cpuLimit)}</span></div>${workerStat('cpu')}${cpuChart}</div>
				<div><div class="stat"><span>Memory</span><b>${mb(rssValues[0] ?? null)}</b><span class="muted">at start</span><b>${mb(peakMem)}</b><span class="muted">peak${share(peakMem, memLimit)}</span></div>${workerStat('mem')}${memChart}</div>
			</div></div>`;
	}

	function runsSection(state, now) {
		return section(
			3,
			'CPU and memory, per run',
			state.topologies.map((t) => runCard(t, now)).join(''),
			'x = time since measuring started · CPU in % of one core · hover for values',
		);
	}

	const limitText = (l) =>
		l
			? [l.memory ? mb(l.memory * 1024) : null, l.cpu ? `${l.cpu} CPU` : null]
					.filter(Boolean)
					.join(' · ') || 'none'
			: 'none';

	function configSection(state) {
		const runs = state.topologies.filter((t) => t.config);
		if (!runs.length) return '';
		const rows = [
			['Mains', (c) => c.mains],
			['Workers', (c) => c.workers],
			['Agent turns run on', (c) => (c.agentQueue ? 'workers (agent queue on)' : 'main')],
			['Slots per worker', (c) => (c.agentQueue ? (c.slotsPerWorker ?? '–') : '–')],
			['Measured turns', (c) => c.turns],
			['Turns at once', (c) => c.concurrency],
			['Warmup turns', (c) => c.warmup],
			['Main limit', (c) => limitText(c.limits?.main)],
			['Worker limit', (c) => (c.workers ? limitText(c.limits?.worker) : '–')],
		];
		const head = `<div class="cfg-row cfg-head"><span></span>${runs.map((t) => `<b>${esc(t.name)}</b>`).join('')}</div>`;
		const body = rows
			.map(
				([label, get]) =>
					`<div class="cfg-row"><span class="label">${label}</span>${runs.map((t) => `<span>${esc(get(t.config))}</span>`).join('')}</div>`,
			)
			.join('');
		const envKeys = [...new Set(runs.flatMap((t) => Object.keys(t.config.env)))].sort();
		const env = `<div class="cfg-row"><span class="label">n8n env</span>${runs
			.map(
				(t) =>
					`<span class="env">${envKeys
						.filter((k) => k in t.config.env)
						.map((k) => `<code>${esc(k)}=${esc(t.config.env[k])}</code>`)
						.join('')}</span>`,
			)
			.join('')}</div>`;
		const shared = `<div class="rows shared">
			<div class="row"><span class="label">Model</span><div><code>${esc(state.model)}</code></div></div>
			<div class="row"><span class="label">Image</span><div><code>${esc(state.image)}</code></div></div>
			<div class="row"><span class="label">Database</span><div>Postgres, one per run</div></div>
		</div>`;
		return section(
			4,
			'Run config',
			`${shared}<div class="cfg" style="--cols:${runs.length}">${head}${body}${env}</div>`,
		);
	}

	/** Where to try the benchmarked instance, and how to log in. */
	function tryLine(state) {
		const current =
			state.topologies.find((t) => ['starting', 'warmup', 'running'].includes(t.status)) ??
			[...state.topologies].reverse().find((t) => t.kept);
		const login = `<span>email <code>${esc(state.owner.email)}</code></span><span>password <code>${esc(state.owner.password)}</code></span>`;
		if (!current?.baseUrl)
			return `<div class="try muted">Try it in n8n once a stack is up. ${login}</div>`;
		const agent = current.agentUrl
			? `<a target="_blank" rel="noreferrer" href="${esc(current.agentUrl)}">open the agent ↗</a>`
			: '';
		return `<div class="try">Try it in n8n: <a target="_blank" rel="noreferrer" href="${esc(current.baseUrl)}">${esc(current.baseUrl)} ↗</a>${agent}${login}</div>`;
	}

	function render(state) {
		last = state;
		const now = state.finished
			? Math.max(...state.topologies.map((t) => t.finishedAt ?? 0), state.startedAt)
			: Date.now();
		const live = state.topologies.some((t) => ['starting', 'warmup', 'running'].includes(t.status));
		const status = state.finished ? 'done' : live ? 'running' : 'starting';
		app.innerHTML = `<header>
				<h1>Agent bench</h1><span class="pill ${status}">${state.finished ? 'finished' : 'live'}</span>
				<span class="muted">${duration(now - state.startedAt)}</span>
			</header>
			${tryLine(state)}
			${agentSection(state)}
			${scenarioSection(state)}
			${runsSection(state, now)}
			${configSection(state)}`;
	}

	let frame = 0;
	const rerender = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			if (last) renderKeepingOpen(last);
		});
	};
	app.addEventListener('mouseleave', () => {
		hover = null;
		rerender();
	});
	app.addEventListener('mousemove', (event) => {
		const wrap = event.target.closest('[data-chart]');
		const c = wrap && charts[wrap.dataset.chart];
		const next = c
			? (() => {
					const box = wrap.getBoundingClientRect();
					const vx = ((event.clientX - box.left) / box.width) * c.W;
					return { id: wrap.dataset.chart, x: Math.max(0, ((vx - c.L) / (c.W - c.L - 6)) * c.xm) };
				})()
			: null;
		if (!next && !hover) return;
		hover = next;
		rerender();
	});
	// Keep <details> open across re-renders.
	const open = new Set();
	app.addEventListener(
		'toggle',
		(event) => {
			const key = event.target.querySelector('summary')?.textContent;
			if (!key) return;
			event.target.open ? open.add(key) : open.delete(key);
		},
		true,
	);
	const baseRender = render;
	const renderKeepingOpen = (state) => {
		baseRender(state);
		for (const d of app.querySelectorAll('details')) {
			if (open.has(d.querySelector('summary')?.textContent)) d.open = true;
		}
	};

	// Re-render each second so durations move between pushes.
	setInterval(() => last && !last.finished && renderKeepingOpen(last), 1000);

	window.cockpit = { render: renderKeepingOpen };
	if (window.COCKPIT_DEMO) return;
	const source = new EventSource('/events');
	source.onmessage = (event) => renderKeepingOpen(JSON.parse(event.data));
	source.onerror = () => {
		if (last) {
			last.finished = true;
			renderKeepingOpen(last);
		}
	};
})();
