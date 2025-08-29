/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { ExpressionKind } from 'ast-types/gen/kinds';
import type { Config as EsprimaConfig } from 'esprima-next';
import { parse as esprimaParse } from 'esprima-next';
import { DateTime } from 'luxon';
import { parse, visit, types, print } from 'recast';
import { getOption } from 'recast/lib/util';

import { arrayExtensions } from './array-extensions';
import { booleanExtensions } from './boolean-extensions';
import { dateExtensions } from './date-extensions';
import { joinExpression, splitExpression } from './expression-parser';
import type { ExpressionChunk, ExpressionCode } from './expression-parser';
import type { ExtensionMap } from './extensions';
import { numberExtensions } from './number-extensions';
import { objectExtensions } from './object-extensions';
import { stringExtensions } from './string-extensions';
import { checkIfValueDefinedOrThrow } from './utils';
import { ExpressionExtensionError } from '../errors/expression-extension.error';

const EXPRESSION_EXTENDER = 'extend';
const EXPRESSION_EXTENDER_OPTIONAL = 'extendOptional';

function isEmpty(value: unknown) {
	return value === null || value === undefined || !value;
}

function isNotEmpty(value: unknown) {
	return !isEmpty(value);
}

export const EXTENSION_OBJECTS: ExtensionMap[] = [
	arrayExtensions,
	dateExtensions,
	numberExtensions,
	objectExtensions,
	stringExtensions,
	booleanExtensions,
];

// eslint-disable-next-line @typescript-eslint/no-restricted-types
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
		...Object.keys(booleanExtensions.functions),
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
	const ast = esprimaParse(source, {
		loc: true,
		locations: true,
		comment: true,
		range: getOption(options, 'range', false) as boolean,
		tolerant: getOption(options, 'tolerant', true) as boolean,
		tokens: true,
		jsx: getOption(options, 'jsx', false) as boolean,
		sourceType: getOption(options, 'sourceType', 'module') as string,
	} as EsprimaConfig);

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

		// Polyfill optional chaining
		visit(ast, {
			// eslint-disable-next-line complexity
			visitChainExpression(path) {
				this.traverse(path);
				const chainNumber = currentChain;
				currentChain += 1;

				// This is to match behavior in our original expression evaluator (tmpl)
				const globalIdentifier = types.builders.identifier(
					typeof window !== 'object' ? 'global' : 'window',
				);
				// We want to define all of our commonly used identifiers and member
				// expressions now so we don't have to create multiple instances
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

				// This builds the cancel check. This lets us slide to the end of the expression
				// if it's undefined/null at any of the optional points of the chain.
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

				// This is just a quick small wrapper to create the assignment expression
				// for the running value.
				const buildValueAssignWrapper = (node: ExpressionKind): ExpressionKind => {
					return types.builders.assignmentExpression('=', valueMemberExpression, node);
				};

				// This builds what actually does the comparison. It wraps the current
				// chunk of the expression with a nullish coalescing operator that returns
				// undefined if it's null or undefined. We do this because optional chains
				// always return undefined if they fail part way, even if the value they
				// fail on is null.
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

				// Another small wrapper, but for assigning to the cancel token this time.
				const buildCancelAssignWrapper = (node: ExpressionKind): ExpressionKind => {
					return types.builders.assignmentExpression('=', cancelMemberExpression, node);
				};

				let currentNode: ExpressionKind = path.node.expression;
				let currentPatch: ExpressionKind | null = null;
				let patchTop: ExpressionKind | null = null;
				let wrapNextTopInOptionalExtend = false;

				// This patches the previous node to use our current one as it's left hand value.
				// It takes `window.chainValue1.test1` and `window.chainValue1.test2` and turns it
				// into `window.chainValue1.test2.test1`.
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

				// This loop walks down an optional chain from the top. This will walk
				// from right to left through an optional chain. We keep track of our current
				// top of the chain (furthest right) and create a chain below it. This chain
				// contains all of the (member and call) expressions that we need. These are
				// patched versions that reference our current chain value. We then push this
				// chain onto a stack when we hit an optional point in our chain.
				while (true) {
					// This should only ever be these types but you can optional chain on
					// JSX nodes, which we don't support.
					if (
						currentNode.type === 'MemberExpression' ||
						currentNode.type === 'OptionalMemberExpression' ||
						currentNode.type === 'CallExpression' ||
						currentNode.type === 'OptionalCallExpression'
					) {
						let patchNode: ExpressionKind;
						// Here we take the current node and extract the parts we actually care
						// about.
						// In the case of a member expression we take the property it's trying to
						// access and make the object it's accessing be our chain value.
						if (
							currentNode.type === 'MemberExpression' ||
							currentNode.type === 'OptionalMemberExpression'
						) {
							patchNode = types.builders.memberExpression(
								valueMemberExpression,
								currentNode.property,
							);
							// In the case of a call expression we take the arguments and make the
							// callee our chain value.
						} else {
							patchNode = types.builders.callExpression(
								valueMemberExpression,
								currentNode.arguments,
							);
						}

						// If we have a previous node we patch it here.
						if (currentPatch) {
							updatePatch(currentPatch, patchNode);
						}

						// If we have no top patch (first run, or just pushed onto the stack) we
						// note it here.
						if (!patchTop) {
							patchTop = patchNode;
						}

						currentPatch = patchNode;

						// This is an optional in our chain. In here we'll push the node onto the
						// stack. We also do a polyfill if the top of the stack is function call
						// that might be a extended function.
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

						// Finally we get the next point AST to walk down.
						if (
							currentNode.type === 'MemberExpression' ||
							currentNode.type === 'OptionalMemberExpression'
						) {
							currentNode = currentNode.object;
						} else {
							currentNode = currentNode.callee;
						}
					} else {
						// We update the final patch to point to the first part of the optional chain
						// which is probably an identifier for an object.
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

						// Push the first part of our chain to stack.
						if (patchTop) {
							patchedStack.push(patchTop);
						} else {
							patchedStack.push(currentNode);
						}
						break;
					}
				}

				// Since we're working from right to left we need to flip the stack
				// for the correct order of operations
				patchedStack.reverse();

				// Walk the node stack and wrap all our expressions in cancel/assignment
				// wrappers.
				for (let i = 0; i < patchedStack.length; i++) {
					let node = patchedStack[i];

					// We don't wrap the last expression in an assignment wrapper because
					// it's going to be returned anyway. We just wrap it in a cancel check
					// wrapper.
					if (i !== patchedStack.length - 1) {
						node = buildCancelAssignWrapper(buildOptionalWrapper(node));
					}

					// Don't wrap the first part in a cancel wrapper because the cancel
					// token will always be undefined.
					if (i !== 0) {
						node = buildCancelCheckWrapper(node);
					}

					// Replace the node in the stack with our wrapped one
					patchedStack[i] = node;
				}

				// Put all our expressions in a sequence expression (also called a
				// group operator). These will all be executed in order and the value
				// of the final expression will be returned.
				const sequenceNode = types.builders.sequenceExpression(patchedStack);

				path.replace(sequenceNode);
			},
		});

		// Extended functions
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
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	function: Function;
}

function findExtendedFunction(input: unknown, functionName: string): FoundFunction | undefined {
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
	let foundFunction: Function | undefined;
	if (Array.isArray(input)) {
		foundFunction = arrayExtensions.functions[functionName];
	} else if (isDate(input) && functionName !== 'toDate' && functionName !== 'toDateTime') {
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
	} else if (typeof input === 'boolean') {
		foundFunction = booleanExtensions.functions[functionName];
	}

	// Look for generic or builtin
	if (!foundFunction) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const inputAny: any = input;
		// This is likely a builtin we're implementing for another type
		// (e.g. toLocaleString). We'll return that instead
		if (inputAny && functionName && typeof inputAny[functionName] === 'function') {
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
	const foundFunction = findExtendedFunction(input, functionName);

	// No type specific or generic function found. Check to see if
	// any types have a function with that name. Then throw an error
	// letting the user know the available types.
	if (!foundFunction) {
		checkIfValueDefinedOrThrow(input, functionName);
		const haveFunction = EXTENSION_OBJECTS.filter((v) => functionName in v.functions);
		if (!haveFunction.length) {
			// This shouldn't really be possible but we should cover it anyway
			throw new ExpressionExtensionError(`Unknown expression function: ${functionName}`);
		}

		if (haveFunction.length > 1) {
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
	// eslint-disable-next-line @typescript-eslint/no-restricted-types
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

const EXTENDED_SYNTAX_CACHE: Record<string, string> = {};

export function extendSyntax(bracketedExpression: string, forceExtend = false): string {
	const chunks = splitExpression(bracketedExpression);

	const codeChunks = chunks
		.filter((c) => c.type === 'code')
		.map((c) => c.text.replace(/("|').*?("|')/, '').trim());

	if (
		(!codeChunks.some(hasExpressionExtension) || hasNativeMethod(bracketedExpression)) &&
		!forceExtend
	) {
		return bracketedExpression;
	}

	// If we've seen this expression before grab it from the cache
	if (bracketedExpression in EXTENDED_SYNTAX_CACHE) {
		return EXTENDED_SYNTAX_CACHE[bracketedExpression];
	}

	const extendedChunks = chunks.map((chunk): ExpressionChunk => {
		if (chunk.type === 'code') {
			let output = extendTransform(chunk.text);

			// esprima fails to parse bare objects (e.g. `{ data: something }`), we can
			// work around this by wrapping it in an parentheses
			if (!output?.code && chunk.text.trim()[0] === '{') {
				output = extendTransform(`(${chunk.text})`);
			}

			if (!output?.code) {
				throw new ExpressionExtensionError('invalid syntax');
			}

			let text = output.code;

			// We need to cut off any trailing semicolons. These cause issues
			// with certain types of expression and cause the whole expression
			// to fail.
			if (text.trim().endsWith(';')) {
				text = text.trim().slice(0, -1);
			}

			return {
				...chunk,
				text,
			} as ExpressionCode;
		}
		return chunk;
	});

	const expression = joinExpression(extendedChunks);
	// Cache the expression so we don't have to do this transform again
	EXTENDED_SYNTAX_CACHE[bracketedExpression] = expression;
	return expression;
}
