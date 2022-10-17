import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { DateTime } from 'luxon';
import { ExpressionExtensionError } from '../ExpressionError';

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
 * Babel plugin to inject an extender function call into the AST of an expression.
 * After doing that it will collapse all nested extend calls into 1 call.
 *
 * ```ts
 * 'a'.method('x') // becomes
 * extend('a', 'method', ['x']);
 *
 * 'a'.first('x').second('y') // becomes
 * extend(extend('a', 'first', ['x']), 'second', ['y']));
 * ```
 */
export function expressionExtensionPlugin(): {
	visitor: {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Identifier(path: BabelCore.NodePath<BabelTypes.Identifier>): void;
	};
} {
	return {
		visitor: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Identifier(path: BabelCore.NodePath<BabelTypes.Identifier>) {
				if (isExpressionExtension(path.node.name) && BabelTypes.isMemberExpression(path.parent)) {
					const callPath = path.findParent((p) => p.isCallExpression());

					if (!callPath || !BabelTypes.isCallExpression(callPath.node)) return;

					callPath.replaceWith(
						BabelTypes.callExpression(BabelTypes.identifier(EXPRESSION_EXTENDER), [
							path.parent.object,
							BabelTypes.stringLiteral(path.node.name),
							BabelTypes.arrayExpression(callPath.node.arguments as BabelTypes.Expression[]),
						]),
					);
				}
			},
		},
	};
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
	} else if (typeof input === 'string') {
		foundFunction = stringExtensions.functions[functionName];
	} else if (typeof input === 'number') {
		foundFunction = numberExtensions.functions[functionName];
	} else if ('isLuxonDateTime' in (input as DateTime) || input instanceof Date) {
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
