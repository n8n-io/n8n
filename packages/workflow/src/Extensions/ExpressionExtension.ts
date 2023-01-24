/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { DateTime } from 'luxon';
import { ExpressionExtensionError } from '../ExpressionError';
import { parse, visit, types, print } from 'recast';

import { arrayExtensions } from './ArrayExtensions';
import { dateExtensions } from './DateExtensions';
import { numberExtensions } from './NumberExtensions';
import { stringExtensions } from './StringExtensions';
import { objectExtensions } from './ObjectExtensions';

const EXPRESSION_EXTENDER = 'extend';

function isBlank(value: unknown) {
	return value === null || value === undefined || !value;
}

function isPresent(value: unknown) {
	return !isBlank(value);
}

const EXTENSION_OBJECTS = [
	arrayExtensions,
	dateExtensions,
	numberExtensions,
	objectExtensions,
	stringExtensions,
];

// eslint-disable-next-line @typescript-eslint/ban-types
const genericExtensions: Record<string, Function> = {
	isBlank,
	isPresent,
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
	`(\\$if|\\.(${EXPRESSION_EXTENSION_METHODS.join('|')}))\\s*\\(`,
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

/**
 * A function to inject an extender function call into the AST of an expression.
 * This uses recast to do the transform.
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const ast = parse(expression);

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

/**
 * Extender function injected by expression extension plugin to allow calls to extensions.
 *
 * ```ts
 * extend(input, "functionName", [...args]);
 * ```
 */
export function extend(input: unknown, functionName: string, args: unknown[]) {
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
		// (e.g. toLocaleString). We'll just call it
		if (
			inputAny &&
			functionName &&
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			typeof inputAny[functionName] === 'function'
		) {
			// I was having weird issues with eslint not finding rules on this line.
			// Just disabling all eslint rules for now.
			// eslint-disable-next-line
			return inputAny[functionName](...args);
		}

		// Use a generic version if available
		foundFunction = genericExtensions[functionName];
	}

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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return foundFunction(input, args);
}
