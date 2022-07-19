/* eslint-disable import/no-cycle */
/* eslint-disable no-param-reassign */

import * as BabelCore from '@babel/core';
import * as BabelTypes from '@babel/types';
import { ExpressionError } from './ExpressionError';

const EXPRESSION_EXTENDER = 'extend';

const EXPRESSION_EXTENSION_METHODS = ['sayHi', 'toDecimal', 'getOnlyFirstCharacters', 'gimmeFive'];

const isExpressionExtension = (str: string) => EXPRESSION_EXTENSION_METHODS.some((m) => m === str);

export const hasExpressionExtension = (str: string): boolean =>
	EXPRESSION_EXTENSION_METHODS.some((m) => str.includes(m));

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
		Identifier(path: BabelCore.NodePath<BabelTypes.Identifier>): void;
	};
} {
	return {
		visitor: {
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

export class ExpressionExtensionError extends ExpressionError {
	constructor(message: string) {
		super(message);
		this.context.failExecution = true;
	}
}

/**
 * Extender function injected by expression extension plugin to allow calls to extensions.
 *
 * ```ts
 * extend(mainArg, ...extraArgs).method();
 * ```
 */
export function extend(
	mainArg: unknown,
	...extraArgs: unknown[]
): { [methodName: string]: () => string | number } {
	return {
		sayHi() {
			if (typeof mainArg !== 'string') {
				throw new ExpressionExtensionError('sayHi() requires a string-type main arg');
			}

			if (extraArgs.length > 0) {
				throw new ExpressionExtensionError('sayHi() does not allow extra args');
			}

			return `hi ${mainArg}`;
		},
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
		getOnlyFirstCharacters() {
			if (typeof mainArg !== 'string') {
				throw new ExpressionExtensionError(
					'getOnlyFirstCharacters() requires a string-type main arg',
				);
			}

			if (!extraArgs || extraArgs.length > 1) {
				throw new ExpressionExtensionError('getOnlyFirstCharacters() requires a single extra arg');
			}

			const [extraArg] = extraArgs;

			if (typeof extraArg !== 'number') {
				throw new ExpressionExtensionError('toDecimal() requires a number-type extra arg');
			}

			return mainArg.slice(0, extraArg);
		},
		gimmeFive() {
			return 5;
		},
	};
}
