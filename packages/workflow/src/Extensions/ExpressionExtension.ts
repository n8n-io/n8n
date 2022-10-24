/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { DateTime } from 'luxon';
import { ExpressionExtensionError } from '../ExpressionError';
import { parse, visit, types, print } from 'recast';

import { arrayExtensions } from './ArrayExtensions';
import { dateExtensions } from './DateExtensions';
import { numberExtensions } from './NumberExtensions';
import { stringExtensions } from './StringExtensions';

const EXPRESSION_EXTENDER = 'extend';

function isBlank(value: unknown) {
	return value === null || value === undefined || !value;
}

function isPresent(value: unknown) {
	return !isBlank(value);
}

const EXTENSION_OBJECTS = [arrayExtensions, dateExtensions, numberExtensions, stringExtensions];

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
		...Object.keys(genericExtensions),
	]),
);

const isExpressionExtension = (str: string) => EXPRESSION_EXTENSION_METHODS.some((m) => m === str);

export const hasExpressionExtension = (str: string): boolean =>
	EXPRESSION_EXTENSION_METHODS.some((m) => str.includes(m));

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
 * recast's types aren't great and we need to use a lot of anys
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findParent = <T>(path: T, matcher: (path: T) => boolean): T | undefined => {
	// @ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	let parent = path.parentPath;
	while (parent) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		if (matcher(parent)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return parent;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		parent = parent.parentPath;
	}
	return;
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
			visitIdentifier(path) {
				this.traverse(path);
				if (
					isExpressionExtension(path.node.name) &&
					// types.namedTypes.MemberExpression.check(path.parent)
					path.parentPath?.value?.type === 'MemberExpression'
				) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const callPath: any = findParent(path, (p) => p.value?.type === 'CallExpression');

					if (!callPath || callPath.value?.type !== 'CallExpression') {
						return;
					}

					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					callPath.replace(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
						types.builders.callExpression(types.builders.identifier(EXPRESSION_EXTENDER), [
							path.parentPath.value.object,
							types.builders.stringLiteral(path.node.name),
							// eslint-disable-next-line
							types.builders.arrayExpression(callPath.node.arguments),
						]),
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
	if (typeof input !== 'string') {
		return false;
	}
	return DateTime.fromISO(input).isValid;
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
	} else if (isDate(input)) {
		// If it's a string date (from $json), convert it to a Date object
		input = new Date(input as string);
		foundFunction = dateExtensions.functions[functionName];
	} else if (typeof input === 'string') {
		foundFunction = stringExtensions.functions[functionName];
	} else if (typeof input === 'number') {
		foundFunction = numberExtensions.functions[functionName];
	} else if (input && (DateTime.isDateTime(input) || input instanceof Date)) {
		foundFunction = dateExtensions.functions[functionName];
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
			functionName in inputAny &&
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
