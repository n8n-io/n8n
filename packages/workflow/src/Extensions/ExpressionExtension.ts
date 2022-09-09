/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable import/first */
/* eslint-disable max-classes-per-file */
/* eslint-disable import/no-cycle */
/* eslint-disable no-param-reassign */

import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { DateTime, Interval, Duration } from 'luxon';
import { ExpressionExtensionError } from '../ExpressionError';

import { DateExtensions } from './DateExtensions';
import { StringExtensions } from './StringExtensions';

const EXPRESSION_EXTENDER = 'extend';

const stringExtensions = new StringExtensions();
const dateExtensions = new DateExtensions();

const EXPRESSION_EXTENSION_METHODS = Array.from(
	new Set([
		...stringExtensions.listMethods(),
		...dateExtensions.listMethods(),
		'toDecimal',
		'isBlank',
		'toLocaleString',
	]),
);

const isExpressionExtension = (str: string) => EXPRESSION_EXTENSION_METHODS.some((m) => m === str);

export const hasExpressionExtension = (str: string): boolean =>
	EXPRESSION_EXTENSION_METHODS.some((m) => str.includes(m));

export const hasNativeMethod = (method: string): boolean => {
	if (hasExpressionExtension(method)) {
		return false;
	}
	const [methods] = method.split('(');
	return [methods]
		.join('.')
		.split('.')
		.every((methodName) => {
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
 *
 * ```ts
 * 'a'.method('x') // becomes
 * extend('a', 'x').method();
 *
 * 'a'.first('x').second('y') // becomes
 * extend(extend('a', 'x').first(), 'y').second();
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

					path.parent.object = BabelTypes.callExpression(
						BabelTypes.identifier(EXPRESSION_EXTENDER),
						[path.parent.object, ...callPath.node.arguments],
					);

					callPath.node.arguments = [];
				}
			},
		},
	};
}

/**
 * Extender function injected by expression extension plugin to allow calls to extensions.
 *
 * ```ts
 * extend(mainArg, ...extraArgs).method();
 * ```
 */
type StringExtMethods = (value: string) => string;
type UtilityExtMethods = () => boolean;
type DateTimeMethods = () => typeof DateTime;
type IntervalMethods = () => Interval | typeof Interval;
type DurationMethods = () => Duration | typeof Duration;
type ExtMethods = {
	[k: string]:
		| StringExtMethods
		| UtilityExtMethods
		| DateTimeMethods
		| IntervalMethods
		| DurationMethods;
};

export function extend(mainArg: unknown, ...extraArgs: unknown[]): ExtMethods {
	const extensions: ExtMethods = {
		toDecimal() {
			if (typeof mainArg !== 'number') {
				throw new ExpressionExtensionError('toDecimal() requires a number-type main arg');
			}

			if (!extraArgs || extraArgs.length > 1) {
				throw new ExpressionExtensionError('toDecimal() requires a single extra arg');
			}

			const [extraArg] = extraArgs;

			if (typeof extraArg !== 'number') {
				throw new ExpressionExtensionError('toDecimal() requires a number-type extra arg');
			}

			return mainArg.toFixed(extraArg);
		},
		isBlank(): boolean {
			if (typeof mainArg === 'string') {
				return stringExtensions.isBlank(mainArg);
			}

			return true;
		},
		toLocaleString(): string {
			return dateExtensions.toLocaleString(new Date(mainArg as string), extraArgs);
		},
		...stringExtensions.bind(mainArg as string, extraArgs as string[] | undefined),
		...dateExtensions.bind(
			new Date(mainArg as string),
			extraArgs as number[] | string[] | boolean[] | undefined,
		),
	};

	return extensions;
}
