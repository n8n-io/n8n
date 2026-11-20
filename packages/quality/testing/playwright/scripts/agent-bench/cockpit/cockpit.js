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
		datatable: 'var(--datatable)',
		long: 'var(--long)',
		webhook: 'var(--webhook)',
		workflow: 'var(--workflow)',
		multitool: 'var(--multitool)',
		slowtool: 'var(--slowtool)',
		multiturn: 'var(--multiturn)',
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

	function ms(v) {
		if (v == null) return '–';
		return v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(1)} s`;
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
			`<div class="block rows">
				<div class="row"><span class="label">Name</span><div class="strong">${esc(a.name)}</div></div>
				<div class="row"><span class="label">Model</span><div><code>${esc(a.model)}</code></div></div>
				<div class="row"><span class="label">Instructions</span><div class="quote">${esc(a.instructions)}</div></div>
				${tools}
			</div>`,
		);
	}

	function scenarioSection(state) {
		if (!state.scenarios?.length) return '';
		const planned = state.topologies[0]?.planned ?? 0;
		const count = (s) => Math.round(planned * s.share);
		const total = state.scenarios.reduce((sum, s) => sum + count(s), 0);
		const cards = state.scenarios
			.map(
				(s) => `<div class="block scenario">
					<div class="scenario-head">
						<span class="name"><i class="dot" style="background:${KIND_COLORS[s.kind]}"></i>${esc(s.kind)}</span>
						<span class="count"><b>${count(s)}</b> of ${total} messages to the agent</span>
					</div>
					<p class="path">${esc(s.path)}</p>
					<ol class="prompts">${s.prompts.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
				</div>`,
			)
			.join('');
		const summary = `<div class="scenario-total"><span><b>${state.scenarios.length}</b> kinds of message</span><span><b>${total}</b> messages sent to the agent in each run (each one a new chat)</span></div>`;
		return section(
			2,
			'Scenarios',
			`<p class="muted lead">Every run sends the same messages to the agent in the same order. Each message starts a new chat and gets one reply. Prompts rotate through the list.</p>${summary}<div class="scenario-grid">${cards}</div>`,
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
		const config = c
			? `<details class="run-config"><summary>Config<span hidden>${esc(t.name)}</span></summary><div class="rows">${configRows(t)}</div></details>`
			: '';
		if (t.error) return `<div class="run">${head}<p class="bad">${esc(t.error)}</p></div>`;
		if (!t0) return `<div class="run">${head}${config}</div>`;

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
		const workerColors = ['#ff91ac', '#8ec5ff', '#b9a3ff', '#ffc56b'];
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
		const workerPeakCpu = quantile(workerCpu, 1);
		const workerPeakMem = workerRss.length ? Math.max(...workerRss) : null;
		const wMemLimit = c?.limits?.worker?.memory ? c.limits.worker.memory * 1024 : null;
		const wCpuLimit = c?.limits?.worker?.cpu ? c.limits.worker.cpu * 100 : null;

		const memLimit = c?.limits?.main?.memory ? c.limits.main.memory * 1024 * mains.length : null;
		const cpuLimit = c?.limits?.main?.cpu ? c.limits.main.cpu * 100 * mains.length : null;
		const xMax = sec(end);
		const cpuChart = chart([{ name: `CPU · ${label}`, color: 'var(--accent)', points: cpu }], {
			id: `cpu-${t.name}`,
			yFormat: pct,
			xMax,
			limit: cpuLimit ? { value: cpuLimit, label: `limit ${pct(cpuLimit)}` } : undefined,
		});
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
			],
			{
				id: `mem-${t.name}`,
				yFormat: mb,
				xMax,
				limit: memLimit ? { value: memLimit, label: `limit ${mb(memLimit)}` } : undefined,
			},
		);
		// Each point is one finished message, smoothed over the last 10 so the line shows the trend.
		const finished = t.turns
			.filter((x) => x.ok && x.finishedAt >= t0)
			.sort((a, b) => a.finishedAt - b.finishedAt);
		const rolling = (key) =>
			finished.map((x, i) => [
				sec(x.finishedAt),
				quantile(
					finished.slice(Math.max(0, i - 9), i + 1).map((y) => y[key] ?? null),
					0.5,
				),
			]);
		const startValues = finished.map((x) => x.startMs ?? null);
		const totalValues = finished.map((x) => x.totalMs);
		const latencyChart = chart(
			[
				{ name: 'full reply', color: 'var(--ink)', points: rolling('totalMs') },
				{ name: 'until the agent starts', color: 'var(--accent)', points: rolling('startMs') },
			],
			{ id: `lat-${t.name}`, yFormat: ms, xMax },
		);
		const latency = `<h4 class="proc">Agent latency</h4>
			<div class="stat"><span>Until the agent starts</span><b>${ms(quantile(startValues, 0.5))}</b><span class="muted">typical</span><b>${ms(quantile(startValues, 0.95))}</b><span class="muted">slowest 5%</span>
			<span>Full reply</span><b>${ms(quantile(totalValues, 0.5))}</b><span class="muted">typical</span><b>${ms(quantile(totalValues, 0.95))}</b><span class="muted">slowest 5%</span></div>
			${latencyChart}`;
		const share = (v, limit) =>
			v != null && limit
				? ` <span class="muted">· ${Math.round((v / limit) * 100)}% of limit</span>`
				: '';
		const lim = (v, f) => (v ? { value: v, label: `limit ${f(v)}` } : undefined);
		const workerPair = workers.length
			? `<h4 class="proc">Workers</h4>
			<div class="pair">
				<div><div class="stat"><span>CPU</span><b>${pct(quantile(workerCpu, 0.5))}</b><span class="muted">typical</span><b>${pct(workerPeakCpu)}</b><span class="muted">peak, each${share(workerPeakCpu, wCpuLimit)}</span></div>${chart(workerSeries('cpu'), { id: `wcpu-${t.name}`, yFormat: pct, xMax, limit: lim(wCpuLimit, pct) })}</div>
				<div><div class="stat"><span>Memory</span><b>${mb(workerPeakMem)}</b><span class="muted">peak, largest${share(workerPeakMem, wMemLimit)}</span></div>${chart(workerSeries('rssMb'), { id: `wmem-${t.name}`, yFormat: mb, xMax, limit: lim(wMemLimit, mb) })}</div>
			</div>`
			: '';
		return `<div class="run">${head}${config}
			${latency}
			<h4 class="proc">Main</h4>
			<div class="pair">
				<div><div class="stat"><span>CPU</span><b>${pct(quantile(cpuValues, 0.5))}</b><span class="muted">typical</span><b>${pct(peakCpu)}</b><span class="muted">peak${share(peakCpu, cpuLimit)}</span></div>${cpuChart}</div>
				<div><div class="stat"><span>Memory</span><b>${mb(rssValues[0] ?? null)}</b><span class="muted">at start</span><b>${mb(peakMem)}</b><span class="muted">peak${share(peakMem, memLimit)}</span></div>${memChart}</div>
			</div>${workerPair}</div>`;
	}

	function runsSection(state, now) {
		return section(
			4,
			'Latency, CPU and memory, per run',
			state.topologies.map((t) => runCard(t, now)).join(''),
			'x = time since measuring started · latency = median of the last 10 replies · CPU in % of one core · hover for values',
		);
	}

	const limitText = (l) =>
		l
			? [l.memory ? mb(l.memory * 1024) : null, l.cpu ? `${l.cpu} CPU` : null]
					.filter(Boolean)
					.join(' · ') || 'none'
			: 'none';

	const CONFIG_ROWS = [
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

	/** One run's settings as label rows; shared by section 3 and the button on each run. */
	function configRows(t) {
		const env = Object.keys(t.config.env).sort();
		return `${CONFIG_ROWS.map(([label, get]) => `<div class="row"><span class="label">${label}</span><div>${esc(get(t.config))}</div></div>`).join('')}
				<div class="row"><span class="label">n8n env</span><div class="env">${env.length ? env.map((k) => `<code>${esc(k)}=${esc(t.config.env[k])}</code>`).join('') : '<span class="muted">none</span>'}</div></div>`;
	}

	function configSection(state) {
		const runs = state.topologies.filter((t) => t.config);
		if (!runs.length) return '';
		// Runs are setups × load steps. Show each setup once, with the loads it ran at.
		const setupKey = (c) =>
			JSON.stringify([c.mains, c.workers, c.agentQueue, c.slotsPerWorker, c.limits]);
		const setups = new Map();
		for (const t of runs) {
			const key = setupKey(t.config);
			if (!setups.has(key)) setups.set(key, { name: t.name.replace(/-\d+$/, ''), c: t.config, runs: [] });
			setups.get(key).runs.push(t);
		}
		const proc = (n, word, limit) =>
			`<div class="proc-line"><b>${n}</b> ${word}${n === 1 ? '' : 's'}<span class="muted">${esc(limitText(limit))}</span></div>`;
		const card = ({ name, c, runs: rs }) => `<div class="block setup">
			<div class="setup-head"><b>${esc(name)}</b><span class="pill">agent turns on ${c.agentQueue ? 'workers' : 'main'}</span></div>
			${proc(c.mains, 'main', c.limits?.main)}
			${c.workers ? proc(c.workers, 'worker', c.limits?.worker) + `<div class="proc-line"><b>${c.agentQueue ? (c.slotsPerWorker ?? '–') : '–'}</b> slots per worker</div>` : ''}
			<div class="loads"><span class="muted">Chats at once</span>${rs
				.map((t) => `<span class="load ${t.status}" title="${esc(`${t.name} · ${t.config.turns} turns`)}">${t.config.concurrency}</span>`)
				.join('')}</div>
		</div>`;
		const c0 = runs[0].config;
		const perChat = c0.concurrency ? Math.round(c0.turns / c0.concurrency) : null;
		return section(
			3,
			'Run config',
			`<div class="cards wide">${[...setups.values()].map(card).join('')}</div>
			<h4 class="proc">How each run works</h4>
			<div class="block rows">
				<div class="row"><span class="label">1. Start</span><div>A fresh n8n with the setup above. The bench creates the agent and its tools.</div></div>
				<div class="row"><span class="label">2. Warm up</span><div>Sends ${c0.warmup} message${c0.warmup === 1 ? '' : 's'} first. They are not counted.</div></div>
				<div class="row"><span class="label">3. Load</span><div>Keeps the given number of chats open at once. When a reply ends, the next message goes out${perChat ? `, until ${perChat}× that number are done. For example, 10 chats at once sends ${10 * perChat} messages` : ''}.</div></div>
				<div class="row"><span class="label">4. Messages</span><div>Each message starts a new chat, taken from the scenarios above, and goes to <code>${esc(state.model)}</code>.</div></div>
				<div class="row"><span class="label">5. Stop</span><div>Tears n8n down and starts the next run. The last one stays up to try.</div></div>
			</div>
			<h4 class="proc">What slots are</h4>
			<div class="block rows">
				<div class="row"><span class="label">Slot</span><div>Room for one agent reply on a worker. A worker with 10 slots writes at most 10 replies at the same time.</div></div>
				<div class="row"><span class="label">Total</span><div>Workers × slots. 2 workers with 10 slots each run at most 20 replies at once.</div></div>
				<div class="row"><span class="label">When full</span><div>Extra messages wait in line until a slot frees up. That wait shows up as a longer time until the agent starts.</div></div>
				<div class="row"><span class="label">Main only</span><div>Main has no slots. It starts every message right away, until its CPU runs out.</div></div>
				<div class="row"><span class="label">Setting</span><div><code>N8N_AGENTS_WORKER_CONCURRENCY</code>. n8n's default is 30.</div></div>
			</div>`,
		);
	}

	/** Where to try the benchmarked instance, and how to log in. */
	function tryLine(state) {
		const current =
			state.topologies.find((t) => ['starting', 'warmup', 'running'].includes(t.status)) ??
			[...state.topologies].reverse().find((t) => t.kept);
		const row = (label, value) =>
			`<div class="row"><span class="label">${label}</span><div>${value}</div></div>`;
		const link = (href, text) =>
			`<a target="_blank" rel="noreferrer" href="${esc(href)}">${esc(text)} ↗</a>`;
		const rows = [
			row(
				'n8n',
				current?.baseUrl
					? link(current.baseUrl, current.baseUrl)
					: '<span class="muted">Starts once a stack is up</span>',
			),
			current?.agentUrl ? row('Agent', link(current.agentUrl, 'Open the agent')) : '',
			row('Email', `<code class="copy">${esc(state.owner.email)}</code>`),
			row('Password', `<code class="copy">${esc(state.owner.password)}</code>`),
		];
		return `<div class="try"><div class="block rows">${rows.join('')}</div></div>`;
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
			${configSection(state)}
			${runsSection(state, now)}`;
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
