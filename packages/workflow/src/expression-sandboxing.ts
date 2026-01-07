import { type ASTAfterHook, type ASTBeforeHook, astBuilders as b, astVisit } from '@n8n/tournament';

import { ExpressionDestructuringError, ExpressionError } from './errors';
import { isSafeObjectProperty } from './utils';

export const sanitizerName = '__sanitize';
const sanitizerIdentifier = b.identifier(sanitizerName);

export const DOLLAR_SIGN_ERROR = 'Cannot access "$" without calling it as a function';

const EMPTY_CONTEXT = b.objectExpression([
	b.property('init', b.identifier('process'), b.objectExpression([])),
]);

/**
 * Helper to check if an expression is a valid property access with $ as the property.
 * Returns true for obj.$ or obj.nested.$ but false for bare $ or other expression contexts.
 */
const isValidDollarPropertyAccess = (expr: unknown): boolean => {
	if (
		typeof expr !== 'object' ||
		expr === null ||
		!('type' in expr) ||
		expr.type !== 'MemberExpression' ||
		!('property' in expr) ||
		!('object' in expr)
	) {
		return false;
	}

	const property = expr.property;
	const object = expr.object;

	// $ must be the property
	const isPropertyDollar =
		typeof property === 'object' &&
		property !== null &&
		'name' in property &&
		property.name === '$';

	// $ must NOT be the object (to block $.something)
	const isObjectDollar =
		typeof object === 'object' && object !== null && 'name' in object && object.name === '$';

	// Object must be an Identifier (obj) or MemberExpression (obj.nested)
	// This excludes bare $ or $ in other expression contexts
	const isObjectValid =
		typeof object === 'object' &&
		object !== null &&
		'type' in object &&
		(object.type === 'Identifier' || object.type === 'MemberExpression');

	return isPropertyDollar && !isObjectDollar && isObjectValid;
};

/**
 * Prevents regular functions from binding their `this` to the Node.js global.
 */
export const FunctionThisSanitizer: ASTBeforeHook = (ast, dataNode) => {
	astVisit(ast, {
		visitCallExpression(path) {
			const { node } = path;

			if (node.callee.type !== 'FunctionExpression') {
				this.traverse(path);
				return;
			}

			const fnExpression = node.callee;

			/**
			 * Called function expressions (IIFEs) - both anonymous and named:
			 *
			 * ```js
			 * (function(x) { return x * 2; })(5)
			 * (function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); })(5)
			 *
			 * // become
			 *
			 * (function(x) { return x * 2; }).call({ process: {} }, 5)
			 * (function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }).call({ process: {} }, 5)
			 * ```
			 */
			this.traverse(path); // depth first to transform inside out
			const callExpression = b.callExpression(
				b.memberExpression(fnExpression, b.identifier('call')),
				[EMPTY_CONTEXT, ...node.arguments],
			);
			path.replace(callExpression);
			return false;
		},

		visitFunctionExpression(path) {
			const { node } = path;

			/**
			 * Callable function expressions (callbacks) - both anonymous and named:
			 *
			 * ```js
			 * [1, 2, 3].map(function(n) { return n * 2; })
			 * [1, 2, 3].map(function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); })
			 *
			 * // become
			 *
			 * [1, 2, 3].map((function(n) { return n * 2; }).bind({ process: {} }))
			 * [1, 2, 3].map((function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }).bind({ process: {} }))
			 * ```
			 */
			this.traverse(path);
			const boundFunction = b.callExpression(b.memberExpression(node, b.identifier('bind')), [
				EMPTY_CONTEXT,
			]);
			path.replace(boundFunction);
			return false;
		},
	});
};

/**
 * Validates that the $ identifier is only used in allowed contexts.
 * This prevents user errors like `{{ $ }}` which would return the function object itself.
 *
 * Allowed contexts:
 * - As a function call: $()
 * - As a property name: obj.$ (where $ is a valid property name in JavaScript)
 *
 * Disallowed contexts:
 * - Bare identifier: $
 * - As object in member expression: $.property
 * - In expressions: "prefix" + $, [1, 2, $], etc.
 */
export const DollarSignValidator: ASTAfterHook = (ast, _dataNode) => {
	astVisit(ast, {
		visitIdentifier(path) {
			this.traverse(path);
			const node = path.node;

			// Only check for the exact identifier '$'
			if (node.name !== '$') return;

			// Runtime type checking since path properties are typed as 'any'
			const parent: unknown = path.parent;

			// Check if parent is a path object with a 'name' property
			if (typeof parent !== 'object' || parent === null || !('name' in parent)) {
				throw new ExpressionError(DOLLAR_SIGN_ERROR);
			}

			// Allow $ when it's the callee: $()
			// parent.name === 'callee' means the parent path represents the callee field
			if (parent.name === 'callee') {
				return;
			}

			// Block when $ is the object in a MemberExpression: $.something
			// parent.name === 'object' means the parent path represents the object field
			if (parent.name === 'object') {
				throw new ExpressionError(DOLLAR_SIGN_ERROR);
			}

			// Check if $ is the property of a MemberExpression: obj.$
			// For obj.$: parent.name is 'expression' and grandparent has ExpressionStatement
			// The ExpressionStatement should contain a MemberExpression with $ as property
			if ('parent' in parent && typeof parent.parent === 'object' && parent.parent !== null) {
				const grandparent = parent.parent;
				if (
					'value' in grandparent &&
					typeof grandparent.value === 'object' &&
					grandparent.value !== null
				) {
					const gpNode = grandparent.value;
					// ExpressionStatement has an 'expression' field containing the actual expression
					if ('type' in gpNode && gpNode.type === 'ExpressionStatement' && 'expression' in gpNode) {
						// Check if this is a valid property access like obj.$
						if (isValidDollarPropertyAccess(gpNode.expression)) {
							return;
						}
					}
				}
			}

			// Disallow all other cases (bare $, $ in expressions, etc.)
			throw new ExpressionError(DOLLAR_SIGN_ERROR);
		},
	});
};

export const PrototypeSanitizer: ASTAfterHook = (ast, dataNode) => {
	astVisit(ast, {
		visitMemberExpression(path) {
			this.traverse(path);
			const node = path.node;
			if (!node.computed) {
				// This is static, so we're safe to error here
				if (node.property.type !== 'Identifier') {
					throw new ExpressionError(
						`Unknown property type ${node.property.type} while sanitising expression`,
					);
				}

				if (!isSafeObjectProperty(node.property.name)) {
					throw new ExpressionError(
						`Cannot access "${node.property.name}" due to security concerns`,
					);
				}
			} else if (node.property.type === 'StringLiteral' || node.property.type === 'Literal') {
				// Check any static strings against our forbidden list
				if (!isSafeObjectProperty(node.property.value as string)) {
					throw new ExpressionError(
						`Cannot access "${node.property.value as string}" due to security concerns`,
					);
				}
			} else {
				path.replace(
					b.memberExpression(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
						node.object as any,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
						b.callExpression(b.memberExpression(dataNode, sanitizerIdentifier), [
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							node.property as any,
						]),
						true,
					),
				);
			}
		},

		visitObjectPattern(path) {
			this.traverse(path);
			const node = path.node;

			for (const prop of node.properties) {
				if (prop.type === 'Property') {
					let keyName: string | undefined;

					if (prop.key.type === 'Identifier') {
						keyName = prop.key.name;
					} else if (prop.key.type === 'StringLiteral' || prop.key.type === 'Literal') {
						keyName = String(prop.key.value);
					}

					if (keyName !== undefined && !isSafeObjectProperty(keyName)) {
						throw new ExpressionDestructuringError(keyName);
					}
				}
			}
		},
	});
};

export const sanitizer = (value: unknown): unknown => {
	const propertyKey = String(value);
	if (!isSafeObjectProperty(propertyKey)) {
		throw new ExpressionError(`Cannot access "${propertyKey}" due to security concerns`);
	}
	return value;
};
