import type { SimpleNode } from './grammar';

// The expression's shape without its user data, for verify-mode reports.
// The grammar is closed, so every method, root and operator here comes from
// an allowlist; only literals, field names and node names are user text, and
// those are masked. This masking is the user-data boundary for what verify
// mode sends to Sentry, so extend it rather than redacting the raw text.
export function skeletonOf(node: SimpleNode): string {
	switch (node.kind) {
		case 'literal':
			if (typeof node.value === 'string') return '<str>';
			if (typeof node.value === 'number') return '<num>';
			return String(node.value);
		case 'root':
		case 'timeRoot':
			return node.name;
		case 'nodeRef':
			if (node.ref === 'input') return '$input';
			return node.ref === 'node' ? '$(<str>)' : '$node[<str>]';
		case 'undefined':
			return 'undefined';
		case 'param':
			return 'x';
		case 'member':
			return `${skeletonOf(node.object)}${access(node.optional)}${memberKey(node)}`;
		case 'chain':
			return skeletonOf(node.expression);
		case 'unary':
			return `${node.op}${skeletonOf(node.argument)}`;
		case 'binary':
		case 'logical':
			return `(${skeletonOf(node.left)} ${node.op} ${skeletonOf(node.right)})`;
		case 'conditional':
			return `(${skeletonOf(node.test)} ? ${skeletonOf(node.consequent)} : ${skeletonOf(node.alternate)})`;
		case 'call':
			return `${skeletonOf(node.receiver)}${access(node.optional)}${node.method}(${node.args.map(skeletonOf).join(', ')})`;
		case 'array':
			return `[${node.elements.map(skeletonOf).join(', ')}]`;
		case 'iterate':
			return `${skeletonOf(node.receiver)}${access(node.optional)}${node.method}(x => ${skeletonOf(node.body)})`;
	}
}

const access = (optional: boolean) => (optional ? '?.' : '.');

// n8n's own item keys. `length` tells a string or array read apart.
const KNOWN_KEYS = new Set(['json', 'binary', 'length']);

// Keys off node references and time roots come from allowlists; any other
// key is a field name from workflow data.
function memberKey(node: Extract<SimpleNode, { kind: 'member' }>): string {
	if (typeof node.key === 'number') return '<num>';
	if (node.object.kind === 'nodeRef' || node.object.kind === 'timeRoot') return node.key;
	return KNOWN_KEYS.has(node.key) ? node.key : '<id>';
}

// The engine reads its own clock, and a `$parameter` read evaluates that
// parameter again, which can read the clock too. Two evaluations of such an
// expression can differ without a bug.
export function readsClockOrParameter(node: SimpleNode): boolean {
	return (
		node.kind === 'timeRoot' ||
		(node.kind === 'root' && node.name === '$parameter') ||
		childrenOf(node).some(readsClockOrParameter)
	);
}

function childrenOf(node: SimpleNode): SimpleNode[] {
	switch (node.kind) {
		case 'member':
			return [node.object];
		case 'chain':
			return [node.expression];
		case 'unary':
			return [node.argument];
		case 'binary':
		case 'logical':
			return [node.left, node.right];
		case 'conditional':
			return [node.test, node.consequent, node.alternate];
		case 'call':
			return [node.receiver, ...node.args];
		case 'iterate':
			return [node.receiver, node.body];
		default:
			return [];
	}
}
