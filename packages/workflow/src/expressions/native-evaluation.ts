import {
	CALLABLE_METHODS,
	EXTENSION_METHODS,
	ITERATOR_METHODS,
	MAX_DEPTH,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
	MAX_WORK,
	NativeVerifier,
	RESERVED_NAMES,
	TIME_METHODS,
	canVerifyNatively,
	evaluateNatively as evaluateNativelyWithHost,
	isNativelyEvaluable,
	nativeSkeleton,
	type NativeEvaluationHost,
} from '@n8n/expression-runtime/native-evaluation';

import { ExpressionExtensionError } from '../errors/expression-extension.error';
import { ExpressionError } from '../errors/expression.error';
import { extend } from '../extensions';
import type { IWorkflowDataProxyData } from '../interfaces';

export {
	CALLABLE_METHODS,
	EXTENSION_METHODS,
	ITERATOR_METHODS,
	MAX_DEPTH,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
	MAX_WORK,
	NativeVerifier,
	RESERVED_NAMES,
	TIME_METHODS,
	canVerifyNatively,
	isNativelyEvaluable,
	nativeSkeleton,
};
export type {
	NativeFallbackReason,
	NativeVerifyMismatch,
} from '@n8n/expression-runtime/native-evaluation';

// The legacy engine calls the same dispatch and surfaces the same errors.
const host: NativeEvaluationHost = {
	extend,
	isExpressionError: (error) =>
		error instanceof ExpressionError || error instanceof ExpressionExtensionError,
};

/**
 * Evaluates an expression in-process. The leading `=` must already be stripped.
 * `handled` is false when the expression or a runtime value is outside the native subset.
 */
export function evaluateNatively(expression: string, data: IWorkflowDataProxyData) {
	return evaluateNativelyWithHost(expression, data, host);
}
