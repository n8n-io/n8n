// The node compiler for the load test: gives the converter the source of each
// n8n node, as n8n does at publish (packages/cli compiled-node-sources.ts).
// A node runs compiled only when its operation is in the verified list of the
// tree (src/node-compile/verified.generated.ts); every other node stays as it
// was (library node or fallback host).
//
//   const nc = await nodeCompiler(SRC);
//   const converted = nc.convert(convertWorkflow, workflow, options, bundle);
//   compile(converted.source, { fileName, extraNodes: converted.nodes });
//   nc.derived(derivations, data)   // the n8nDerived member of a credential slot
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PREFIX = 'n8n-nodes-base.';
const FLAG_NAME = /^f[0-9a-f]{8}$/;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
// n8n gives the converter its instance id and base URL at publish; a node that reads them compiles only with them.
const INSTANCE = { baseUrl: 'http://127.0.0.1:5678/', id: 'c0de'.repeat(16) };

export async function nodeCompiler(SRC) {
	const imp = (p) => import(pathToFileURL(path.join(SRC, p)).href);
	const W = 'packages/@n8n/workflow-lang/';
	const { evaluateInSandbox, evaluateDerivation, evaluateCredentialFlags, unprovenFlagNodes } = await imp(`${W}src/node-compile/evaluate-node.ts`);
	const { publicCredential } = await imp(`${W}src/credentials/public.ts`);
	const { loadCredentialTypes, registryOf } = await imp(`${W}src/credentials/types.ts`);
	const { resolveCredentialData } = await imp(`${W}scripts/gym/v1-credentials.ts`);
	const base = path.join(SRC, 'packages/nodes-base');
	const load = createRequire(path.join(base, 'package.json'));
	const known = JSON.parse(fs.readFileSync(path.join(base, 'dist/known/nodes.json'), 'utf8'));
	const knownCredentials = JSON.parse(fs.readFileSync(path.join(base, 'dist/known/credentials.json'), 'utf8'));
	const registry = registryOf(loadCredentialTypes().types);

	// The verified list comes from the TypeScript source of the nodes, so the load test reads it too.
	const classFile = new Map();
	const findClasses = (dir) => {
		for (const entry of fs.readdirSync(dir)) {
			const file = path.join(dir, entry);
			if (fs.statSync(file).isDirectory()) {
				if (!/^(test|__tests__|__schema__)$/.test(entry)) findClasses(file);
			} else if (entry.endsWith('.node.ts')) {
				for (const m of fs.readFileSync(file, 'utf8').matchAll(/^(?:export )?class (\w+)/gm)) classFile.set(m[1], file);
			}
		}
	};
	findClasses(path.join(base, 'nodes'));

	const loaded = new Map();
	const nodeOf = (type, version) => {
		const key = `${type}@${version}`;
		if (loaded.has(key)) return loaded.get(key);
		let node;
		try {
			const entry = type.startsWith(PREFIX) ? known[type.slice(PREFIX.length)] : undefined;
			if (entry) {
				const top = new (load(path.join(base, entry.sourcePath))[entry.className])();
				node = top.nodeVersions ? top.nodeVersions[String(version)] : top;
			}
		} catch {
			node = undefined;
		}
		loaded.set(key, node);
		return node;
	};

	const credentialOf = (bundle, type, id) =>
		bundle.credentials.find((x) => x.key === id) ?? bundle.credentials.find((x) => x.type === type);
	const dataOf = (c) => resolveCredentialData(c.type, c.data);

	const sourcesFor = (bundle, hostNodes) => ({
		entry: (type, version) => {
			const node = nodeOf(type, version);
			return node ? classFile.get(node.constructor.name) : undefined;
		},
		readFile: (file) => {
			if (!fs.existsSync(file)) return undefined;
			const stat = fs.statSync(file);
			return stat.isFile() && stat.size <= MAX_FILE_BYTES ? fs.readFileSync(file, 'utf8') : undefined;
		},
		description: (type, version) => nodeOf(type, version)?.description,
		aliases: { '@utils/': `${base}/utils/` },
		evaluate: evaluateInSandbox,
		publicCredential: (type, id) => {
			const c = credentialOf(bundle, type, id);
			const info = c ? registry.get(c.type) : undefined;
			if (!c || !info) return undefined;
			try {
				return publicCredential(info, dataOf(c));
			} catch {
				return undefined;
			}
		},
		runsInHost: (name) => hostNodes.has(name),
		credentialEntry: (type) => {
			const entry = knownCredentials[type];
			return entry ? path.join(base, entry.sourcePath) : undefined;
		},
	});

	/** Nodes that must stay in the host: a credential needs a token that n8n makes, or gives unchecked conditions. */
	const hostNodesOf = (converted, workflow, bundle) => {
		const host = new Set();
		const slots = converted.credentials ?? {};
		const mintSlots = Object.entries(converted.credentialMints ?? {}).filter(([, list]) => list.length > 0).map(([slot]) => slots[slot]).filter(Boolean);
		if (mintSlots.length > 0) {
			for (const node of workflow.nodes ?? []) {
				for (const [type, use] of Object.entries(node.credentials ?? {})) {
					if (mintSlots.some((s) => s.type === type && (s.id == null || s.id === use?.id))) host.add(node.name);
				}
			}
		}
		for (const [slot, list] of Object.entries(converted.credentialDerivations ?? {})) {
			const use = slots[slot];
			const c = use ? credentialOf(bundle, use.type, use.id) : undefined;
			let data;
			try {
				data = c ? dataOf(c) : undefined;
			} catch {
				data = undefined;
			}
			for (const name of unprovenFlagNodes(list, data)) host.add(name);
		}
		return host;
	};

	return {
		convert(convertWorkflow, workflow, options, bundle) {
			const plain = () => convertWorkflow(workflow, options);
			let converted;
			try {
				converted = convertWorkflow(workflow, { instance: INSTANCE, ...options, nodeSources: sourcesFor(bundle, new Set()) });
			} catch {
				return plain();
			}
			if (!converted.ok) return plain();
			const host = hostNodesOf(converted, workflow, bundle);
			if (host.size > 0) {
				converted = convertWorkflow(workflow, { instance: INSTANCE, ...options, nodeSources: sourcesFor(bundle, host) });
				if (!converted.ok) return plain();
				const still = hostNodesOf(converted, workflow, bundle);
				if ([...still].some((name) => !host.has(name))) return plain();
				if (Object.values(converted.credentialMints ?? {}).some((list) => list.length > 0)) return plain();
			}
			return converted;
		},
		/** The `n8nDerived` member of a slot, as n8n builds it (compiled-engine-credentials.ts). */
		derived(derivations, data) {
			const out = {};
			for (const { name, code, kind } of derivations ?? []) {
				if (kind !== undefined || FLAG_NAME.test(name)) continue;
				const value = evaluateDerivation(code, { ...data });
				if (value !== undefined) out[name] = value;
			}
			Object.assign(out, evaluateCredentialFlags(derivations ?? [], { ...data }).flags);
			return out;
		},
	};
}
