/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { DateTime } from 'luxon';
import { ExpressionExtensionError } from '../ExpressionError';
import { parse, visit, types, print } from 'recast';
import { getOption } from 'recast/lib/util';
import { parse as esprimaParse } from 'esprima-next';

import { arrayExtensions } from './ArrayExtensions';
import { dateExtensions } from './DateExtensions';
import { numberExtensions } from './NumberExtensions';
import { stringExtensions } from './StringExtensions';
import { objectExtensions } from './ObjectExtensions';
import type { ExpressionKind } from 'ast-types/gen/kinds';

const EXPRESSION_EXTENDER = 'extend';
const EXPRESSION_EXTENDER_OPTIONAL = 'extendOptional';

function isEmpty(value: unknown) {
	return value === null || value === undefined || !value;
}

function isNotEmpty(value: unknown) {
	return !isEmpty(value);
}

export const EXTENSION_OBJECTS = [
	arrayExtensions,
	dateExtensions,
	numberExtensions,
	objectExtensions,
	stringExtensions,
];

// eslint-disable-next-line @typescript-eslint/ban-types
const genericExtensions: Record<string, Function> = {
	isEmpty,
	isNotEmpty,
};

const EXPRESSION_EXTENSION_METHODS = Array.from(
	new Set([
		...Object.keys(stringExtensions.functions),
		...Object.keys(numberExtensions.functions),
		...Object.keys(dateExtensions.functions),
		...Object.keys(arrayExtensions.functions),
		...Object.keys(objectExtensions.functions),
		...Object.keys(genericExtensions),
	]),
);

const EXPRESSION_EXTENSION_REGEX = new RegExp(
	`(\\$if|\\.(${EXPRESSION_EXTENSION_METHODS.join('|')})\\s*(\\?\\.)?)\\s*\\(`,
);

const isExpressionExtension = (str: string) => EXPRESSION_EXTENSION_METHODS.some((m) => m === str);

export const hasExpressionExtension = (str: string): boolean =>
	EXPRESSION_EXTENSION_REGEX.test(str);

export const hasNativeMethod = (method: string): boolean => {
	if (hasExpressionExtension(method)) {
		return false;
	}
	const methods = method
		.replace(/[^\w\s]/gi, ' ')
		.split(' ')
		.filter(Boolean); // DateTime.now().toLocaleString().format() => [DateTime,now,toLocaleString,format]
	return methods.every((methodName) => {
		return [String.prototype, Array.prototype, Number.prototype, Date.prototype].some(
			(nativeType) => {
				if (methodName in nativeType) {
					return true;
				}

				return false;
			},
		);
	});
};

// /**
//  * recast's types aren't great and we need to use a lot of anys
//  */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWithEsprimaNext(source: string, options?: any): any {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	const ast = esprimaParse(source, {
		loc: true,
		locations: true,
		comment: true,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		range: getOption(options, 'range', false),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		tolerant: getOption(options, 'tolerant', true),
		tokens: true,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		jsx: getOption(options, 'jsx', false),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		sourceType: getOption(options, 'sourceType', 'module'),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any);

	return ast;
}

/**
 * A function to inject an extender function call into the AST of an expression.
 * This uses recast to do the transform.
 *
 * This function also polyfills optional chaining if using extended functions.
 *
 * ```ts
 * 'a'.method('x') // becomes
 * extend('a', 'method', ['x']);
 *
 * 'a'.first('x').second('y') // becomes
 * extend(extend('a', 'first', ['x']), 'second', ['y']));
 * ```
 */
export const extendTransform = (expression: string): { code: string } | undefined => {
	try {
		const ast = parse(expression, { parser: { parse: parseWithEsprimaNext } }) as types.ASTNode;

		let currentChain = 1;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		visit(ast, {
			// Polyfill optional chaining
			visitChainExpression(path) {
				this.traverse(path);
				const chainNumber = currentChain;
				currentChain += 1;

				// This is to match our fork of tmpl
				const globalIdentifier = types.builders.identifier(
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					typeof window !== 'object' ? 'global' : 'window',
				);
				const undefinedIdentifier = types.builders.identifier('undefined');
				const cancelIdentifier = types.builders.identifier(`chainCancelToken${chainNumber}`);
				const valueIdentifier = types.builders.identifier(`chainValue${chainNumber}`);
				const cancelMemberExpression = types.builders.memberExpression(
					globalIdentifier,
					cancelIdentifier,
				);
				const valueMemberExpression = types.builders.memberExpression(
					globalIdentifier,
					valueIdentifier,
				);

				const patchedStack: ExpressionKind[] = [];

				const buildCancelCheckWrapper = (node: ExpressionKind): ExpressionKind => {
					return types.builders.conditionalExpression(
						types.builders.binaryExpression(
							'===',
							cancelMemberExpression,
							types.builders.booleanLiteral(true),
						),
						undefinedIdentifier,
						node,
					);
				};

				const buildValueAssignWrapper = (node: ExpressionKind): ExpressionKind => {
					return types.builders.assignmentExpression('=', valueMemberExpression, node);
				};

				const buildOptionalWrapper = (node: ExpressionKind): ExpressionKind => {
					return types.builders.binaryExpression(
						'===',
						types.builders.logicalExpression(
							'??',
							buildValueAssignWrapper(node),
							undefinedIdentifier,
						),
						undefinedIdentifier,
					);
				};

				const buildCancelAssignWrapper = (node: ExpressionKind): ExpressionKind => {
					return types.builders.assignmentExpression('=', cancelMemberExpression, node);
				};

				let currentNode: ExpressionKind = path.node.expression;
				let currentPatch: ExpressionKind | null = null;
				let patchTop: ExpressionKind | null = null;
				let wrapNextTopInOptionalExtend = false;

				const updatePatch = (toPatch: ExpressionKind, node: ExpressionKind) => {
					if (toPatch.type === 'MemberExpression' || toPatch.type === 'OptionalMemberExpression') {
						toPatch.object = node;
					} else if (
						toPatch.type === 'CallExpression' ||
						toPatch.type === 'OptionalCallExpression'
					) {
						toPatch.callee = node;
					}
				};

				while (true) {
					if (
						currentNode.type === 'MemberExpression' ||
						currentNode.type === 'OptionalMemberExpression' ||
						currentNode.type === 'CallExpression' ||
						currentNode.type === 'OptionalCallExpression'
					) {
						let patchNode: ExpressionKind;
						if (
							currentNode.type === 'MemberExpression' ||
							currentNode.type === 'OptionalMemberExpression'
						) {
							patchNode = types.builders.memberExpression(
								valueMemberExpression,
								currentNode.property,
							);
						} else {
							patchNode = types.builders.callExpression(
								valueMemberExpression,
								currentNode.arguments,
							);
						}

						if (currentPatch) {
							updatePatch(currentPatch, patchNode);
						}

						if (!patchTop) {
							patchTop = patchNode;
						}

						currentPatch = patchNode;

						if (currentNode.optional) {
							// Implement polyfill described below
							if (wrapNextTopInOptionalExtend) {
								wrapNextTopInOptionalExtend = false;
								// This shouldn't ever happen
								if (
									patchTop.type === 'MemberExpression' &&
									patchTop.property.type === 'Identifier'
								) {
									patchTop = types.builders.callExpression(
										types.builders.identifier(EXPRESSION_EXTENDER_OPTIONAL),
										[patchTop.object, types.builders.stringLiteral(patchTop.property.name)],
									);
								}
							}

							patchedStack.push(patchTop);
							patchTop = null;
							currentPatch = null;

							// Attempting to optional chain on an extended function. If we don't
							// polyfill this most calls will always be undefined. Marking that the
							// next part of the chain should be wrapped in our polyfill.
							if (
								(currentNode.type === 'CallExpression' ||
									currentNode.type === 'OptionalCallExpression') &&
								(currentNode.callee.type === 'MemberExpression' ||
									currentNode.callee.type === 'OptionalMemberExpression') &&
								currentNode.callee.property.type === 'Identifier' &&
								isExpressionExtension(currentNode.callee.property.name)
							) {
								wrapNextTopInOptionalExtend = true;
							}
						}

						if (
							currentNode.type === 'MemberExpression' ||
							currentNode.type === 'OptionalMemberExpression'
						) {
							currentNode = currentNode.object;
						} else {
							currentNode = currentNode.callee;
						}
					} else {
						if (currentPatch) {
							updatePatch(currentPatch, currentNode);
							if (!patchTop) {
								patchTop = currentPatch;
							}
						}

						if (wrapNextTopInOptionalExtend) {
							wrapNextTopInOptionalExtend = false;
							// This shouldn't ever happen
							if (
								patchTop?.type === 'MemberExpression' &&
								patchTop.property.type === 'Identifier'
							) {
								patchTop = types.builders.callExpression(
									types.builders.identifier(EXPRESSION_EXTENDER_OPTIONAL),
									[patchTop.object, types.builders.stringLiteral(patchTop.property.name)],
								);
							}
						}

						if (patchTop) {
							patchedStack.push(patchTop);
						} else {
							patchedStack.push(currentNode);
						}
						break;
					}
				}

				patchedStack.reverse();

				for (let i = 0; i < patchedStack.length; i++) {
					let node = patchedStack[i];

					if (i !== patchedStack.length - 1) {
						node = buildCancelAssignWrapper(buildOptionalWrapper(node));
					}

					if (i !== 0) {
						node = buildCancelCheckWrapper(node);
					}
					patchedStack[i] = node;
				}

				const sequenceNode = types.builders.sequenceExpression(patchedStack);

				path.replace(sequenceNode);
			},
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		visit(ast, {
			visitCallExpression(path) {
				this.traverse(path);

				if (
					path.node.callee.type === 'MemberExpression' &&
					path.node.callee.property.type === 'Identifier' &&
					isExpressionExtension(path.node.callee.property.name)
				) {
					path.replace(
						types.builders.callExpression(types.builders.identifier(EXPRESSION_EXTENDER), [
							path.node.callee.object,
							types.builders.stringLiteral(path.node.callee.property.name),
							types.builders.arrayExpression(path.node.arguments),
						]),
					);
				} else if (
					path.node.callee.type === 'Identifier' &&
					path.node.callee.name === '$if' &&
					path.node.arguments.every((v) => v.type !== 'SpreadElement')
				) {
					if (path.node.arguments.length < 2) {
						throw new ExpressionExtensionError(
							'$if requires at least 2 parameters: test, value_if_true[, and value_if_false]',
						);
					}

					const test = path.node.arguments[0];
					const consequent = path.node.arguments[1];
					const alternative =
						path.node.arguments[2] === undefined
							? types.builders.booleanLiteral(false)
							: path.node.arguments[2];

					path.replace(
						types.builders.conditionalExpression(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
							test as any,
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
							consequent as any,
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
							alternative as any,
						),
					);
				}
			},
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
		return print(ast);
	} catch (e) {
		return;
	}
};

function isDate(input: unknown): boolean {
	if (typeof input !== 'string' || !input.length) {
		return false;
	}
	if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(input)) {
		return false;
	}
	const d = new Date(input);
	return d instanceof Date && !isNaN(d.valueOf()) && d.toISOString() === input;
}

interface FoundFunction {
	type: 'native' | 'extended';
	// eslint-disable-next-line @typescript-eslint/ban-types
	function: Function;
}

// eslint-disable-next-line @typescript-eslint/ban-types
function findExtendedFunction(input: unknown, functionName: string): FoundFunction | undefined {
	// eslint-disable-next-line @typescript-eslint/ban-types
	let foundFunction: Function | undefined;
	if (Array.isArray(input)) {
		foundFunction = arrayExtensions.functions[functionName];
	} else if (isDate(input) && functionName !== 'toDate') {
		// If it's a string date (from $json), convert it to a Date object,
		// unless that function is `toDate`, since `toDate` does something
		// very different on date objects
		input = new Date(input as string);
		foundFunction = dateExtensions.functions[functionName];
	} else if (typeof input === 'string') {
		foundFunction = stringExtensions.functions[functionName];
	} else if (typeof input === 'number') {
		foundFunction = numberExtensions.functions[functionName];
	} else if (input && (DateTime.isDateTime(input) || input instanceof Date)) {
		foundFunction = dateExtensions.functions[functionName];
	} else if (input !== null && typeof input === 'object') {
		foundFunction = objectExtensions.functions[functionName];
	}

	// Look for generic or builtin
	if (!foundFunction) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inputAny: any = input;
		// This is likely a builtin we're implementing for another type
		// (e.g. toLocaleString). We'll return that instead
		if (
			inputAny &&
			functionName &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			typeof inputAny[functionName] === 'function'
		) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			return { type: 'native', function: inputAny[functionName] };
		}

		// Use a generic version if available
		foundFunction = genericExtensions[functionName];
	}

	if (!foundFunction) {
		return undefined;
	}

	return { type: 'extended', function: foundFunction };
}

/**
 * Extender function injected by expression extension plugin to allow calls to extensions.
 *
 * ```ts
 * extend(input, "functionName", [...args]);
 * ```
 */
export function extend(input: unknown, functionName: string, args: unknown[]) {
	// eslint-disable-next-line @typescript-eslint/ban-types
	const foundFunction = findExtendedFunction(input, functionName);

	// No type specific or generic function found. Check to see if
	// any types have a function with that name. Then throw an error
	// letting the user know the available types.
	if (!foundFunction) {
		const haveFunction = EXTENSION_OBJECTS.filter((v) => functionName in v.functions);
		if (!haveFunction.length) {
			// This shouldn't really be possible but we should cover it anyway
			throw new ExpressionExtensionError(`Unknown expression function: ${functionName}`);
		}

		if (haveFunction.length > 1) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const lastType = `"${haveFunction.pop()!.typeName}"`;
			const typeNames = `${haveFunction.map((v) => `"${v.typeName}"`).join(', ')}, and ${lastType}`;
			throw new ExpressionExtensionError(
				`${functionName}() is only callable on types ${typeNames}`,
			);
		} else {
			throw new ExpressionExtensionError(
				`${functionName}() is only callable on type "${haveFunction[0].typeName}"`,
			);
		}
	}

	if (foundFunction.type === 'native') {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return foundFunction.function.apply(input, args);
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return foundFunction.function(input, args);
}

export function extendOptional(
	input: unknown,
	functionName: string,
	// eslint-disable-next-line @typescript-eslint/ban-types
): Function | undefined {
	const foundFunction = findExtendedFunction(input, functionName);

	if (!foundFunction) {
		return undefined;
	}

	if (foundFunction.type === 'native') {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return foundFunction.function.bind(input);
	}

	return (...args: unknown[]) => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return foundFunction.function(input, args);
	};
}
