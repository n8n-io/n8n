import type { SimpleNode } from './grammar';

// The expression's shape without its user data, for verify-mode reports.
// The grammar is closed, so every method, root and operator here comes from
// an allowlist; only literals, field names and node names are user text, and
// those are masked.
// TODO(native-evaluation verify, CAT-4777): this masking is the user-data
// boundary for anything sent off the instance, Sentry included. To send a
// masked expression instead of a skeleton, extend this function rather than
// redacting the raw text.
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
			return `${skeletonOf(node.object)}${node.optional ? '?.' : '.'}${memberKey(node)}`;
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
			return `${skeletonOf(node.receiver)}${node.optional ? '?.' : '.'}${node.method}(${node.args.map(skeletonOf).join(', ')})`;
		case 'array':
			return `[${node.elements.map(skeletonOf).join(', ')}]`;
		case 'iterate':
			return `${skeletonOf(node.receiver)}${node.optional ? '?.' : '.'}${node.method}(x => ${skeletonOf(node.body)})`;
	}
}

// n8n's own item keys. `length` tells a string or array read apart.
const KNOWN_KEYS = new Set(['json', 'binary', 'length']);

// Keys off node references and time roots come from allowlists; any other
// key is a field name from workflow data.
function memberKey(node: Extract<SimpleNode, { kind: 'member' }>): string {
	if (typeof node.key === 'number') return '<num>';
	if (node.object.kind === 'nodeRef' || node.object.kind === 'timeRoot') return node.key;
	return KNOWN_KEYS.has(node.key) ? node.key : '<id>';
}

export function readsClock(node: SimpleNode): boolean {
	switch (node.kind) {
		case 'timeRoot':
			return true;
		case 'member':
			return readsClock(node.object);
		case 'chain':
			return readsClock(node.expression);
		case 'unary':
			return readsClock(node.argument);
		case 'binary':
		case 'logical':
			return readsClock(node.left) || readsClock(node.right);
		case 'conditional':
			return readsClock(node.test) || readsClock(node.consequent) || readsClock(node.alternate);
		case 'call':
			return readsClock(node.receiver) || node.args.some(readsClock);
		case 'iterate':
			return readsClock(node.receiver) || readsClock(node.body);
		default:
			return false;
	}
}
