// Prints the pool keys whose load-test workflow avoids the features that
// engine-v2 in n8n 2.42.2 does not support: Code nodes (task runners),
// OAuth2 credentials (no token refresh), converging branches (more than one
// edge into one input) and onError=continueErrorOutput.
//
//   node subset-v2.mjs <pool.jsonl> > keys-v2-candidates.txt
import { readBundle } from './lib/bundle.mjs';
import { keyOf, readPool } from './lib/poolfile.mjs';
import { wrap } from './lib/transform.mjs';

const CODE = /\.(code|function|functionItem|pythonFunction)$/;
const why = {};
for (const r of readPool(process.argv[2])) {
	const key = keyOf(r.id);
	const b = readBundle(r.dir);
	const { workflow: wf } = wrap(b, key, r.items);
	const live = wf.nodes.filter((n) => !n.disabled);
	let reason = null;
	if (live.some((n) => CODE.test(n.type))) reason = 'code node';
	else if (live.some((n) => Object.keys(n.credentials ?? {}).some((t) => /oauth2/i.test(t))) || b.credentials.some((c) => c.data?.oauthTokenData)) reason = 'oauth2';
	else if (live.some((n) => n.onError === 'continueErrorOutput')) reason = 'continueErrorOutput';
	else {
		const into = new Map();
		for (const outs of Object.values(wf.connections ?? {}))
			for (const list of outs.main ?? [])
				for (const c of list ?? []) {
					const k = `${c.node}#${c.index ?? 0}`;
					into.set(k, (into.get(k) ?? 0) + 1);
				}
		if ([...into.values()].some((n) => n > 1)) reason = 'converging branches';
	}
	if (reason) why[reason] = (why[reason] ?? 0) + 1;
	else process.stdout.write(`${key}\n`);
}
console.error(JSON.stringify(why));
