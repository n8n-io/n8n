import type { namedTypes } from 'ast-types';
import type { ExpressionKind, SpreadElementKind } from 'ast-types/lib/gen/kinds';

import {
	BINARY_OPS,
	CALLABLE_METHODS,
	DATA_ROOTS,
	LEGACY_NODE_REF_MEMBERS,
	MAX_DEPTH,
	NODE_REF_MEMBERS,
	NODE_REF_METHODS,
	UNARY_OPS,
	isOneOf,
	type SimpleNode,
} from './grammar';
import { isSafeObjectProperty } from '../../utils';

// ── Parsing: esprima output → the subset grammar, or null. ────────────────
//
// Total (never throws), constructive (returns new objects; the esprima node
// is read and dropped, so no unvetted field survives), and recursive (one
// unsupported leaf makes the whole expression decline). The ast-types
// interfaces describe the ESTree shapes esprima emits; they are the same
// types tournament builds its AST with.

// Child parses go through the depth-tracking closure parseSimple builds.
type ParseChild = (node: AstNode) => SimpleNode | null;

type AstNode = ExpressionKind | SpreadElementKind;

function parseLiteral(node: namedTypes.Literal): SimpleNode | null {
	// Regex literals stay on the engine (backtracking blowup has no isolate
	// timeout here).
	if ('regex' in node && node.regex) return null;
	// BigInt literals carry `bigint` metadata; `value` is null where BigInt
	// is unsupported, so decline on the metadata rather than the value.
	if ('bigint' in node && node.bigint) return null;

	const value = node.value;
	const isPrimitiveLiteral =
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean';

	if (!isPrimitiveLiteral) return null;

	return { kind: 'literal', value };
}

function parseIdentifier(node: namedTypes.Identifier): SimpleNode | null {
	if (isOneOf(DATA_ROOTS, node.name)) {
		return { kind: 'root', name: node.name };
	}

	if (node.name === 'undefined') {
		return { kind: 'undefined' };
	}

	return null;
}

type NodeRef = Extract<SimpleNode, { kind: 'nodeRef' }>;

// A node name is a string literal (`$('Name')`, `$node['Name']`), vetted like
// an object key so a prototype name never reaches the node getters. Anything
// else is a dynamic name and stays on the engine.
function parseNodeName(node: AstNode | namedTypes.MemberExpression['property']): string | null {
	if (node.type !== 'Literal') return null;

	const { value } = node;
	return typeof value === 'string' && isSafeObjectProperty(value) ? value : null;
}

// `$node['Name']` or `$node.Name`: the dot form names the node by identifier.
function parseLegacyNodeName(node: namedTypes.MemberExpression): string | null {
	if (node.computed === true) return parseNodeName(node.property);

	const { property } = node;
	if (property.type !== 'Identifier' || !isSafeObjectProperty(property.name)) return null;

	return property.name;
}

// `$('Name')`, `$input` or `$node['Name']` in object/receiver position, or
// null when the AST is not a node reference. Only the member and call parsers
// ask, so a reference never stands alone in the grammar.
function parseNodeRef(node: AstNode): NodeRef | null {
	if (node.type === 'Identifier') {
		return node.name === '$input' ? { kind: 'nodeRef', ref: 'input' } : null;
	}

	if (node.type === 'CallExpression') {
		const { callee } = node;
		if (callee.type !== 'Identifier' || callee.name !== '$' || node.arguments.length !== 1) {
			return null;
		}

		const name = parseNodeName(node.arguments[0]);
		return name === null ? null : { kind: 'nodeRef', ref: 'node', name };
	}

	if (node.type === 'MemberExpression') {
		const { object } = node;
		if (object.type !== 'Identifier' || object.name !== '$node' || node.optional === true) {
			return null;
		}

		const name = parseLegacyNodeName(node);
		return name === null ? null : { kind: 'nodeRef', ref: 'legacy', name };
	}

	return null;
}

// Only static keys are representable. Dynamic keys ($json[$json.key]) need
// the sandbox's PrototypeSanitizer, so they stay on the engine. String keys
// are vetted at parse time (isSafeObjectProperty), which keeps prototype
// names unrepresentable. An own-property-only lookup would make that vetting
// unnecessary, but $json/$parameter are get-trap proxies for which
// Object.hasOwn misreports every key, so the parse-time vet is the boundary.
function parseMember(node: namedTypes.MemberExpression, parse: ParseChild): SimpleNode | null {
	const key =
		node.computed === true ? parseComputedKey(node.property) : parseStaticKey(node.property);
	if (key === null) return null;

	const ref = parseNodeRef(node.object);
	if (ref !== null) {
		const allowed = ref.ref === 'legacy' ? LEGACY_NODE_REF_MEMBERS : NODE_REF_MEMBERS;
		if (typeof key !== 'string' || !allowed.has(key)) return null;

		return { kind: 'member', object: ref, key, optional: node.optional === true };
	}

	const object = parse(node.object);
	if (object === null) return null;

	return { kind: 'member', object, key, optional: node.optional === true };
}

// `a[0]` or `a['b']`: the key is a literal.
function parseComputedKey(
	property: namedTypes.MemberExpression['property'],
): string | number | null {
	if (property.type !== 'Literal') return null;

	const value = property.value;

	if (typeof value === 'number') {
		return value;
	}

	if (typeof value === 'string' && isSafeObjectProperty(value)) {
		return value;
	}

	return null;
}

// `a.b`: the key is an identifier.
function parseStaticKey(property: namedTypes.MemberExpression['property']): string | null {
	if (property.type !== 'Identifier' || !isSafeObjectProperty(property.name)) return null;

	return property.name;
}

function parseCall(node: namedTypes.CallExpression, parse: ParseChild): SimpleNode | null {
	const callee = node.callee;
	if (callee.type !== 'MemberExpression' || callee.computed === true) return null;

	const property = callee.property;
	if (property.type !== 'Identifier') return null;

	// `$('Name').first()` and friends: the proxy's own methods, no arguments.
	// Branch and run indexes stay on the engine.
	const ref = parseNodeRef(callee.object);
	if (ref !== null) {
		if (ref.ref === 'legacy' || !NODE_REF_METHODS.has(property.name) || node.arguments.length > 0) {
			return null;
		}

		const optional = node.optional === true || callee.optional === true;
		return { kind: 'call', receiver: ref, method: property.name, args: [], optional };
	}

	if (!CALLABLE_METHODS.has(property.name)) return null;

	const receiver = parse(callee.object);
	if (receiver === null) return null;

	const args: SimpleNode[] = [];
	for (const argument of node.arguments) {
		const parsed = parse(argument);
		if (parsed === null) return null;

		args.push(parsed);
	}

	// `a?.m()` marks the member optional, `a.m?.()` marks the call optional;
	// both short-circuit on a missing receiver, so one flag carries both.
	const optional = node.optional === true || callee.optional === true;

	return { kind: 'call', receiver, method: property.name, args, optional };
}

// The wrapper esprima puts around every optional chain. It is the boundary an
// optional hop short-circuits to: `a?.b.c` yields undefined for a missing
// `a`, while `(a?.b).c` throws. Parentheses end the chain in the AST too.
function parseChain(node: namedTypes.ChainExpression, parse: ParseChild): SimpleNode | null {
	const expression = parse(node.expression);
	if (expression === null) return null;

	return { kind: 'chain', expression };
}

function parseBranches(
	node: namedTypes.ConditionalExpression,
	parse: ParseChild,
): SimpleNode | null {
	const test = parse(node.test);
	const consequent = parse(node.consequent);
	const alternate = parse(node.alternate);

	if (test === null || consequent === null || alternate === null) return null;

	return { kind: 'conditional', test, consequent, alternate };
}

function parseUnary(node: namedTypes.UnaryExpression, parse: ParseChild): SimpleNode | null {
	if (node.prefix !== true || !isOneOf(UNARY_OPS, node.operator)) return null;

	const argument = parse(node.argument);
	if (argument === null) return null;

	return { kind: 'unary', op: node.operator, argument };
}

function parseBinary(node: namedTypes.BinaryExpression, parse: ParseChild): SimpleNode | null {
	if (!isOneOf(BINARY_OPS, node.operator)) return null;

	const left = parse(node.left);
	const right = parse(node.right);

	if (left === null || right === null) return null;

	return { kind: 'binary', op: node.operator, left, right };
}

function parseLogical(node: namedTypes.LogicalExpression, parse: ParseChild): SimpleNode | null {
	const left = parse(node.left);
	const right = parse(node.right);

	if (left === null || right === null) return null;

	return { kind: 'logical', op: node.operator, left, right };
}

export function parseSimple(node: AstNode, depth = 0): SimpleNode | null {
	if (depth > MAX_DEPTH) return null;
	const parse: ParseChild = (child) => parseSimple(child, depth + 1);

	switch (node.type) {
		case 'Literal':
			return parseLiteral(node);
		case 'Identifier':
			return parseIdentifier(node);
		case 'MemberExpression':
			return parseMember(node, parse);
		case 'ChainExpression':
			return parseChain(node, parse);
		case 'UnaryExpression':
			return parseUnary(node, parse);
		case 'BinaryExpression':
			return parseBinary(node, parse);
		case 'LogicalExpression':
			return parseLogical(node, parse);
		case 'ConditionalExpression':
			return parseBranches(node, parse);
		case 'CallExpression':
			return parseCall(node, parse);
		default:
			// Everything else (functions, templates, object/array literals,
			// regex, dynamic keys, spread, ...) is outside the subset.
			return null;
	}
}
