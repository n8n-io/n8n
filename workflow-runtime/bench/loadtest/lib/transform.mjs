// Turns a bundle of the engine test bed into the workflow that the load test
// runs on every engine: a Webhook trigger that responds when the last node
// ends, in place of the bundle's start trigger.
//
// The start trigger becomes a node with the same name that gives the trigger
// items, so the expressions that read it (`$('Schedule Trigger').item`) do
// not change:
//   - one trigger item: an Edit Fields (Set) node in JSON mode that returns
//     the request body;
//   - more than one: a Split Out node over `body.items`.
// The request body is the trigger item (or `{ items }`): the pinned data of
// the bundle, or the item that the trigger gave in a reference run.
//
// Other changes, the same for every engine:
//   - other trigger nodes are disabled, so that no engine starts them;
//   - Respond to Webhook nodes become No Op nodes of the same name (both
//     pass their input items on), so the webhook can respond at the end;
//   - the error workflow setting is removed.
// A bundle that this cannot run as a load test is excluded: see `exclusion`.
import crypto from 'node:crypto';

const TRIGGER = (n) =>
	/trigger$/i.test(n.type) || /\.(webhook|formTrigger|chatTrigger|start|cron|interval)$/.test(n.type);

/** Why the load test cannot run the bundle, or null. */
export function exclusion(bundle) {
	for (const n of bundle.workflow.nodes ?? []) {
		if (n.disabled) continue;
		const t = n.type.split('.').pop();
		if (t === 'wait') return 'wait node';
		if (t === 'form') return 'form node';
	}
	return null;
}

/** A stable UUID for the webhook of pool entry `key`. */
export function webhookId(key) {
	const h = crypto.createHash('sha256').update(`loadtest:${key}`).digest('hex');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * The load-test workflow of a bundle.
 * @param bundle    lib.mjs readBundle() result
 * @param key       a short unique key of the pool entry (used in the webhook path)
 * @param items     the trigger items (plain JSON objects)
 * @returns {{ workflow, path, body, webhookName }}
 */
export function wrap(bundle, key, items) {
	const wf = structuredClone(bundle.workflow);
	const trigger = bundle.run.trigger;
	const path = `lt-${key}`;
	let webhookName = 'LT Webhook';
	while (wf.nodes.some((n) => n.name === webhookName)) webhookName += ' 2';
	const incoming = new Set();
	for (const outs of Object.values(wf.connections ?? {}))
		for (const kind of Object.values(outs ?? {}))
			for (const list of kind ?? []) for (const c of list ?? []) if (c?.node) incoming.add(c.node);
	const nodes = [];
	for (const n of wf.nodes) {
		if (n.name === trigger) {
			const one = items.length === 1;
			nodes.push({
				id: crypto.randomUUID(),
				name: trigger,
				type: one ? 'n8n-nodes-base.set' : 'n8n-nodes-base.splitOut',
				typeVersion: one ? 3.4 : 1,
				position: n.position ?? [0, 0],
				parameters: one
					? { mode: 'raw', jsonOutput: '={{ JSON.stringify($json.body) }}', options: {} }
					: { fieldToSplitOut: 'body.items', options: {} },
			});
			continue;
		}
		const copy = { ...n };
		if (!copy.disabled && TRIGGER(copy) && !incoming.has(copy.name)) copy.disabled = true;
		if (/\.respondToWebhook$/.test(copy.type)) {
			// n8n rejects a Respond to Webhook node, even a disabled one, under a webhook
			// that responds at the end. A No Op node passes the items on, as this node does.
			copy.type = 'n8n-nodes-base.noOp';
			copy.typeVersion = 1;
			copy.parameters = {};
			delete copy.credentials;
		}
		nodes.push(copy);
	}
	const at = wf.nodes.find((n) => n.name === trigger)?.position ?? [0, 0];
	nodes.push({
		id: crypto.randomUUID(),
		name: webhookName,
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [at[0] - 220, at[1]],
		webhookId: webhookId(key),
		parameters: { httpMethod: 'POST', path, responseMode: 'lastNode', responseData: 'noData', options: {} },
	});
	const connections = { ...(wf.connections ?? {}) };
	connections[webhookName] = { main: [[{ node: trigger, type: 'main', index: 0 }]] };
	const settings = { executionOrder: 'v1', ...(wf.settings ?? {}) };
	delete settings.errorWorkflow;
	delete settings.callerPolicy;
	delete settings.callerIds;
	return {
		workflow: { name: wf.name ?? key, nodes, connections, settings },
		path,
		body: items.length === 1 ? items[0] : { items },
		webhookName,
	};
}

/** Trigger items that need no reference run, or null when the trigger polls a vendor. */
export function staticItems(bundle) {
	const trigger = bundle.run.trigger;
	const pin = bundle.run.pinData?.[trigger];
	if (Array.isArray(pin) && pin.length > 0) return pin.map((p) => p.json ?? {});
	return null;
}
