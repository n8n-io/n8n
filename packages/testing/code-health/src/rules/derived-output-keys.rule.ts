import type { Violation } from '@n8n/rules-engine';
import { AstRule } from '@n8n/rules-engine/ast';
import type { AstProjectConfig } from '@n8n/rules-engine/ast';
import { Node, SyntaxKind } from 'ts-morph';
import type { Expression, Project, SourceFile } from 'ts-morph';

import type { CodeHealthContext } from '../context.js';

/** Functions that reshape a key. */
const KEY_TRANSFORMS = new Set([
	'camelCase',
	'capitalCase',
	'constantCase',
	'kebabCase',
	'paramCase',
	'pascalCase',
	'snakeCase',
	'encodeURIComponent',
	'normalize',
	'replace',
	'replaceAll',
	'slugify',
	'toLowerCase',
	'toUpperCase',
	'trim',
]);

/** Prefixes of local helpers that reshape keys, e.g. `normalizeFieldName`. */
const KEY_TRANSFORM_PREFIXES = ['normalize', 'sanitize', 'fold', 'toKey'];

/** Keys from this helper are not flagged: its strategies are frozen and tested. */
const SANCTIONED_HELPER = 'deriveOutputKey';

/** Calls whose argument becomes node output. */
const OUTPUT_SINKS = /\b(returnJsonArray|constructExecutionMetaData|prepareOutputData)$/;

/** Calls that send their argument to a provider. */
const REQUEST_SINKS = /(request|fetch|axios)/i;

/** Variables that hold node output by convention. */
const OUTPUT_NAMES = new Set([
	'returnData',
	'output',
	'result',
	'results',
	'newItem',
	'simplified',
]);

/** Variables that hold a request by convention. */
const REQUEST_NAMES = new Set([
	'body',
	'qs',
	'query',
	'headers',
	'formData',
	'requestOptions',
	'options',
	'params',
	'filter',
	'filters',
	'payload',
]);

interface KeyWrite {
	/** The assignment or property assignment that performs the write. */
	node: Node;
	/** The object that receives the key. */
	target: Expression;
	/** The expression that computes the key. */
	key: Expression;
}

/**
 * Flags output keys computed from data through a text transform. A change in
 * the transform renames the field for every user without a failing test.
 * Existing sites are grandfathered via the baseline.
 */
export class DerivedOutputKeysRule extends AstRule<CodeHealthContext> {
	readonly id = 'derived-output-keys';
	readonly name = 'Derived Output Keys';
	readonly description =
		'Node output keys computed from data through a text transform are an implicit contract; pin them with tests or pass the source key through unchanged';
	readonly severity = 'warning' as const;

	protected projectConfig(): AstProjectConfig {
		const packages = (this.getOptions().packages as string[]) ?? ['packages/nodes-base'];
		return {
			packages,
			spec: {
				globs: [
					'nodes/**/*.ts',
					'utils/**/*.ts',
					'!**/*.test.ts',
					'!**/test/**',
					'!**/__tests__/**',
					'!**/__schema__/**',
				],
			},
		};
	}

	analyze(context: CodeHealthContext): Violation[] {
		return this.projects(context).flatMap(({ project }) => this.analyzeProject(project));
	}

	/** Exposed for unit tests against an in-memory project. */
	analyzeProject(project: Project): Violation[] {
		return project.getSourceFiles().flatMap((file) => this.analyzeFile(file));
	}

	private analyzeFile(file: SourceFile): Violation[] {
		const violations: Violation[] = [];

		for (const write of findKeyWrites(file)) {
			if (isBinaryTarget(write.target)) continue;
			if (!isStringKey(write.key)) continue;

			const transform = findTransform(write.key);
			if (!transform) continue;

			if (flowOf(write.target) !== 'output') continue;

			const fn = enclosingFunctionName(write.node);
			const site = Node.isObjectLiteralExpression(write.target)
				? `{ [${write.key.getText()}]: … }`
				: `${write.target.getText()}[${write.key.getText()}]`;
			violations.push(
				this.nodeViolation(
					write.node,
					`${fn}: output key \`${site}\` is derived from data through \`${transform}\`. A change in the transform silently renames the field for every user.`,
					'Derive the key with `deriveOutputKey` from n8n-workflow, whose strategies are frozen and tested, or pass the source key through unchanged.',
				),
			);
		}

		return violations;
	}
}

/** `obj[key] = value` and `{ [key]: value }` with a non-literal key. */
function findKeyWrites(file: SourceFile): KeyWrite[] {
	const writes: KeyWrite[] = [];

	for (const assignment of file.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
		if (assignment.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) continue;
		const left = assignment.getLeft();
		if (!Node.isElementAccessExpression(left)) continue;
		const key = left.getArgumentExpression();
		if (!key || isLiteral(key)) continue;
		writes.push({ node: assignment, target: left.getExpression(), key });
	}

	for (const property of file.getDescendantsOfKind(SyntaxKind.PropertyAssignment)) {
		const name = property.getNameNode();
		if (!Node.isComputedPropertyName(name)) continue;
		const key = name.getExpression();
		if (isLiteral(key)) continue;
		const literal = property.getParent();
		if (!Node.isObjectLiteralExpression(literal)) continue;
		writes.push({ node: property, target: literal, key });
	}

	return writes;
}

function isLiteral(expression: Expression): boolean {
	return (
		Node.isStringLiteral(expression) ||
		Node.isNoSubstitutionTemplateLiteral(expression) ||
		Node.isNumericLiteral(expression)
	);
}

/** Binary property names such as `attachment_0` are fixed prefixes plus an index, not data. */
function isBinaryTarget(target: Expression): boolean {
	if (targetPath(target).at(-1) === 'binary') return true;
	return /binary/i.test(rootIdentifier(target) ?? '');
}

/** Array indexes are not keys. Unresolved types count as strings. */
function isStringKey(key: Expression): boolean {
	const type = key.getType();
	if (type.isNumber() || type.isNumberLiteral()) return false;
	if (type.isUnion())
		return !type.getUnionTypes().every((t) => t.isNumber() || t.isNumberLiteral());
	return true;
}

/** The transform a key passes through, looking one variable back, or undefined. */
function findTransform(key: Expression): string | undefined {
	if (isSanctioned(key)) return undefined;
	const direct = transformIn(key);
	if (direct) return direct;

	for (const identifier of identifiersIn(key)) {
		for (const declaration of identifier.getSymbol()?.getDeclarations() ?? []) {
			if (!Node.isVariableDeclaration(declaration)) continue;
			const initializer = declaration.getInitializer();
			if (!initializer || isSanctioned(initializer)) continue;
			const viaVariable = transformIn(initializer);
			if (viaVariable) return viaVariable;
		}
	}

	return undefined;
}

/** True when the key comes out of the sanctioned helper. */
function isSanctioned(expression: Node): boolean {
	return [expression, ...expression.getDescendants()].some(
		(node) => Node.isCallExpression(node) && calleeName(node.getExpression()) === SANCTIONED_HELPER,
	);
}

function calleeName(callee: Node): string {
	return Node.isPropertyAccessExpression(callee) ? callee.getName() : callee.getText();
}

function transformIn(expression: Node): string | undefined {
	if (Node.isTemplateExpression(expression)) {
		return isCoercionOnly(expression) ? undefined : 'template literal';
	}

	for (const call of [expression, ...expression.getDescendants()]) {
		if (!Node.isCallExpression(call)) continue;
		const name = calleeName(call.getExpression());
		if (KEY_TRANSFORMS.has(name) || KEY_TRANSFORM_PREFIXES.some((p) => name.startsWith(p))) {
			return name;
		}
	}

	if (
		Node.isBinaryExpression(expression) &&
		expression.getOperatorToken().getKind() === SyntaxKind.PlusToken
	) {
		return 'string concatenation';
	}

	return undefined;
}

/** `${key}` alone converts to a string and changes nothing. */
function isCoercionOnly(template: Node): boolean {
	if (!Node.isTemplateExpression(template)) return false;
	const spans = template.getTemplateSpans();
	return (
		template.getHead().getLiteralText() === '' &&
		spans.length === 1 &&
		spans[0].getLiteral().getLiteralText() === ''
	);
}

function identifiersIn(expression: Node): Node[] {
	const own = Node.isIdentifier(expression) ? [expression] : [];
	return [...own, ...expression.getDescendantsOfKind(SyntaxKind.Identifier)];
}

type Flow = 'output' | 'request' | 'unclear';

/** Hops through variables, returns and callbacks before giving up. */
const MAX_DEPTH = 8;

/**
 * Where the written object ends up, following it through assignments, pushes,
 * `json` properties, calls and returns. A callback's return value flows into the
 * call that received the callback.
 */
function flowOf(target: Expression): Flow {
	if (targetPath(target).includes('json')) return 'output';
	if (Node.isObjectLiteralExpression(target)) return flowOfExpression(target, 0);

	const root = rootIdentifierNode(target);
	if (!root) return 'unclear';
	return flowOfName(root.getText(), declarationScope(root), 0);
}

/** Scope of the variable's declaration, so uses outside the writing callback are seen. */
function declarationScope(identifier: Node): Node {
	const declaration = identifier.getSymbol()?.getDeclarations()[0];
	return enclosingScope(declaration ?? identifier);
}

function flowOfName(name: string, scope: Node, depth: number): Flow {
	if (depth > MAX_DEPTH) return 'unclear';
	if (REQUEST_NAMES.has(name)) return 'request';
	if (OUTPUT_NAMES.has(name)) return 'output';

	const flows = new Set<Flow>();
	for (const reference of referencesTo(name, scope)) {
		flows.add(flowOfExpression(reference, depth + 1));
	}
	for (const alias of aliasesOf(name, scope)) {
		flows.add(flowOfName(alias, scope, depth + 1));
	}
	return combine(flows);
}

function combine(flows: Set<Flow>): Flow {
	if (flows.has('request')) return 'request';
	if (flows.has('output')) return 'output';
	return 'unclear';
}

/** Follows one expression to the place that consumes its value. */
function flowOfExpression(expression: Node, depth: number): Flow {
	if (depth > MAX_DEPTH) return 'unclear';

	let node: Node = expression;
	let parent = node.getParent();
	while (
		parent &&
		(Node.isParenthesizedExpression(parent) ||
			Node.isAsExpression(parent) ||
			Node.isNonNullExpression(parent) ||
			Node.isAwaitExpression(parent) ||
			Node.isSpreadAssignment(parent) ||
			Node.isSpreadElement(parent) ||
			Node.isConditionalExpression(parent) ||
			Node.isArrayLiteralExpression(parent))
	) {
		node = parent;
		parent = parent.getParent();
	}
	if (!parent) return 'unclear';

	if (Node.isVariableDeclaration(parent)) {
		return flowOfName(parent.getName(), enclosingScope(parent), depth + 1);
	}

	if (Node.isBinaryExpression(parent) && parent.getRight() === node) {
		const left = parent.getLeft();
		if (targetPath(left).includes('json')) return 'output';
		const root = rootIdentifier(left);
		return root ? flowOfName(root, enclosingScope(parent), depth + 1) : 'unclear';
	}

	if (Node.isReturnStatement(parent)) {
		return flowOfReturn(enclosingScope(parent), depth + 1);
	}
	if (Node.isArrowFunction(parent) && parent.getBody() === node) {
		return flowOfReturn(parent, depth + 1);
	}

	if (Node.isPropertyAssignment(parent)) {
		if (parent.getName() === 'json') return 'output';
		return flowOfExpression(parent.getParentOrThrow(), depth + 1);
	}
	if (Node.isShorthandPropertyAssignment(parent)) {
		if (parent.getName() === 'json') return 'output';
		return flowOfExpression(parent.getParentOrThrow(), depth + 1);
	}

	if (Node.isCallExpression(parent) && parent.getArguments().includes(node)) {
		return flowOfCallArgument(parent, node, depth);
	}

	return 'unclear';
}

function flowOfCallArgument(call: Node, argument: Node, depth: number): Flow {
	if (!Node.isCallExpression(call)) return 'unclear';
	const callee = call.getExpression();
	const calleeText = callee.getText();

	if (OUTPUT_SINKS.test(calleeText)) return 'output';
	if (REQUEST_SINKS.test(calleeText)) return 'request';

	if (Node.isPropertyAccessExpression(callee)) {
		const method = callee.getName();
		if (method === 'push' || method === 'unshift') {
			const array = rootIdentifier(callee.getExpression());
			return array ? flowOfName(array, enclosingScope(call), depth + 1) : 'unclear';
		}
		// `Object.assign(acc, { [k]: v })` writes into `acc`.
		if (calleeText === 'Object.assign' && call.getArguments()[0] !== argument) {
			const receiver = rootIdentifier(call.getArguments()[0]);
			return receiver ? flowOfName(receiver, enclosingScope(call), depth + 1) : 'unclear';
		}
	}

	// Any other call: the value travels on with the call result.
	return flowOfExpression(call, depth + 1);
}

/** A value returned from a callback flows into the call that received the callback. */
function flowOfReturn(scope: Node, depth: number): Flow {
	if (Node.isSourceFile(scope)) return 'unclear';
	const parent = scope.getParent();
	if (parent && Node.isCallExpression(parent) && parent.getArguments().includes(scope)) {
		return flowOfExpression(parent, depth + 1);
	}
	// Returned from a named function or method: the caller receives it as data.
	return 'output';
}

/** Identifier uses of `name` in the scope, excluding its own declaration sites. */
function referencesTo(name: string, scope: Node): Node[] {
	return scope.getDescendantsOfKind(SyntaxKind.Identifier).filter((identifier) => {
		if (identifier.getText() !== name) return false;
		const parent = identifier.getParent();
		if (Node.isVariableDeclaration(parent) || Node.isParameterDeclaration(parent)) {
			return parent.getNameNode() !== identifier;
		}
		if (Node.isBindingElement(parent)) return false;
		if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === identifier)
			return false;
		return true;
	});
}

/** `for (const element of elements)` → `elements`. Also `const element = elements[i]`. */
function aliasesOf(name: string, scope: Node): string[] {
	const aliases: string[] = [];
	for (const loop of scope.getDescendantsOfKind(SyntaxKind.ForOfStatement)) {
		const declaration = loop.getInitializer();
		if (!Node.isVariableDeclarationList(declaration)) continue;
		if (declaration.getDeclarations().some((d) => d.getName() === name)) {
			const source = rootIdentifier(loop.getExpression());
			if (source) aliases.push(source);
		}
	}
	for (const declaration of scope.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
		if (declaration.getName() !== name) continue;
		const initializer = declaration.getInitializer();
		if (initializer && Node.isElementAccessExpression(initializer)) {
			const source = rootIdentifier(initializer.getExpression());
			if (source) aliases.push(source);
		}
	}
	return aliases;
}

/** Property names along an access chain, e.g. `item.json.data` → ['json', 'data']. */
function targetPath(target: Node): string[] {
	const names: string[] = [];
	let current: Node = target;
	while (true) {
		if (Node.isPropertyAccessExpression(current)) {
			names.unshift(current.getName());
			current = current.getExpression();
		} else if (Node.isElementAccessExpression(current)) {
			current = current.getExpression();
		} else if (Node.isNonNullExpression(current) || Node.isAsExpression(current)) {
			current = current.getExpression();
		} else if (Node.isParenthesizedExpression(current)) {
			current = current.getExpression();
		} else {
			return names;
		}
	}
}

function rootIdentifier(node: Node | undefined): string | undefined {
	return rootIdentifierNode(node)?.getText();
}

function rootIdentifierNode(node: Node | undefined): Node | undefined {
	let current: Node | undefined = node;
	while (current) {
		if (Node.isIdentifier(current)) return current;
		if (
			Node.isPropertyAccessExpression(current) ||
			Node.isElementAccessExpression(current) ||
			Node.isNonNullExpression(current) ||
			Node.isAsExpression(current) ||
			Node.isParenthesizedExpression(current)
		) {
			current = current.getExpression();
		} else {
			return undefined;
		}
	}
	return undefined;
}

function enclosingScope(node: Node): Node {
	const fn = node.getFirstAncestor(
		(ancestor) =>
			Node.isFunctionDeclaration(ancestor) ||
			Node.isFunctionExpression(ancestor) ||
			Node.isArrowFunction(ancestor) ||
			Node.isMethodDeclaration(ancestor),
	);
	return fn ?? node.getSourceFile();
}

/** Nearest named function, method, or variable-assigned arrow that contains the node. */
function enclosingFunctionName(node: Node): string {
	let fn = enclosingScope(node);
	while (!Node.isSourceFile(fn)) {
		if (Node.isFunctionDeclaration(fn) || Node.isMethodDeclaration(fn)) {
			return fn.getName() ?? '<anonymous>';
		}
		const parent = fn.getParent();
		if (!parent) return '<module>';
		if (Node.isVariableDeclaration(parent)) return parent.getName();
		if (Node.isPropertyAssignment(parent)) return parent.getName();
		fn = enclosingScope(parent);
	}
	return '<module>';
}
