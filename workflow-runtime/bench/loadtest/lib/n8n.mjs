// A small client of n8n's REST API (2.42.2), for one instance, and the
// loader that puts load-test workflows into it.
import { unflatten } from './bundle.mjs';

export class N8n {
	constructor(url) {
		this.url = url.replace(/\/$/, '');
		this.cookie = '';
	}

	async call(method, path, body) {
		const r = await fetch(this.url + path, {
			method,
			headers: { 'content-type': 'application/json', cookie: this.cookie, 'browser-id': 'loadtest' },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const sc = r.headers.get('set-cookie');
		if (sc) this.cookie = sc.split(';')[0];
		const text = await r.text();
		let json;
		try {
			json = text ? JSON.parse(text) : {};
		} catch {
			json = { raw: text };
		}
		return { ok: r.ok, status: r.status, body: json?.data ?? json, text };
	}

	async must(method, path, body) {
		let r = await this.call(method, path, body);
		if (r.status === 401) {
			await this.login();
			r = await this.call(method, path, body);
		}
		if (!r.ok) throw new Error(`${method} ${path}: HTTP ${r.status} ${r.text.slice(0, 300)}`);
		return r.body;
	}

	/** Sets up the owner on first use and logs in; retries for two minutes. */
	async login() {
		let last;
		for (let i = 0; i < 120; i++) {
			try {
				await this.call('POST', '/rest/owner/setup', { email: 'owner@gym.test', firstName: 'Gym', lastName: 'Runner', password: 'GymRunner123' });
				const r = await this.call('POST', '/rest/login', { emailOrLdapLoginId: 'owner@gym.test', password: 'GymRunner123' });
				// The REST routes come up after /rest/settings: check one that needs the session.
				if (r.ok && (await this.call('GET', '/rest/projects/personal')).ok) return;
				last = `HTTP ${r.status} ${r.text.slice(0, 200)}`;
			} catch (e) {
				last = e.message;
			}
			await new Promise((res) => setTimeout(res, 1000));
		}
		throw new Error(`n8n login failed: ${last}`);
	}

	async projectId() {
		this.pid ??= (await this.must('GET', '/rest/projects/personal')).id;
		return this.pid;
	}

	/**
	 * Creates the n8n side of a bundle: its credentials, the sub-workflow and
	 * the data tables, and puts their ids into `workflow`. Returns the workflow.
	 */
	async materialise(bundle, workflow, tag) {
		const credId = new Map();
		for (const c of bundle.credentials) {
			const r = await this.must('POST', '/rest/credentials', { name: `${c.key} (${tag})`.slice(0, 128), type: c.type, data: c.data });
			credId.set(c.key, { id: r.id, name: r.name });
		}
		let text = JSON.stringify(workflow);
		if (text.includes('GYM_STUB_SUBWORKFLOW')) {
			const sub = { ...bundle.resources.subworkflow, name: `${bundle.resources.subworkflow.name} ${tag}`, active: false };
			const r = await this.must('POST', '/rest/workflows', sub);
			// A published workflow can call only published sub-workflows.
			await this.must('POST', `/rest/workflows/${r.id}/activate`, { versionId: r.versionId });
			text = text.replaceAll('GYM_STUB_SUBWORKFLOW', r.id);
		}
		for (const dt of bundle.resources.dataTables ?? []) {
			const pid = await this.projectId();
			const r = await this.must('POST', `/rest/projects/${pid}/data-tables`, {
				name: `${dt.name} ${tag}`.slice(0, 120),
				columns: dt.columns.map((c) => ({ name: c, type: 'string' })),
			});
			if (dt.rows?.length) await this.must('POST', `/rest/projects/${pid}/data-tables/${r.id}/insert`, { data: dt.rows, returnType: 'count' });
			text = text.replaceAll(dt.key, r.id);
		}
		const wf = JSON.parse(text);
		for (const n of wf.nodes ?? [])
			for (const [type, ref] of Object.entries(n.credentials ?? {})) {
				const c = credId.get(ref?.id);
				if (c) n.credentials[type] = c;
			}
		return { workflow: wf, credentials: [...credId].map(([key, c]) => ({ key, id: c.id, name: c.name })) };
	}

	/** Imports a workflow; with `activate`, publishes it so its webhook is live. */
	async importWorkflow(wf, { activate = false, settings = {} } = {}) {
		const r = await this.must('POST', '/rest/workflows', {
			name: wf.name.slice(0, 120),
			nodes: wf.nodes,
			connections: wf.connections,
			settings: { ...wf.settings, ...settings },
			pinData: wf.pinData ?? {},
			active: false,
		});
		if (activate) await this.must('POST', `/rest/workflows/${r.id}/activate`, { versionId: r.versionId });
		return r;
	}

	/** Runs an imported workflow manually from `trigger` and returns the execution with its data. */
	async runManual(id, trigger, timeoutS) {
		const workflowData = await this.must('GET', `/rest/workflows/${id}`);
		const started = await this.call('POST', `/rest/workflows/${id}/run`, { workflowData, triggerToStartFrom: { name: trigger } });
		const executionId = started.body?.executionId;
		if (!started.ok || !executionId) return { status: 'not_started', error: started.text.slice(0, 300) };
		const end = Date.now() + timeoutS * 1000;
		let ex;
		while (Date.now() < end) {
			ex = (await this.call('GET', `/rest/executions/${executionId}?includeData=true`)).body;
			if (ex?.finished || ['success', 'error', 'crashed', 'canceled', 'waiting'].includes(ex?.status)) break;
			await new Promise((r) => setTimeout(r, 300));
		}
		const data = unflatten(ex?.data);
		return { status: ex?.status ?? 'timeout', resultData: (data?.data ?? data)?.resultData ?? {} };
	}
}
