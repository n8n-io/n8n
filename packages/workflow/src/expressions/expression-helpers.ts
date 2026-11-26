import type { IWorkflowDataProxyAdditionalKeys } from '../interfaces';

/**
 * Expression globals that only a node description may read. A node parameter is
 * author-owned, so its expressions resolve without these keys, even when the
 * description-owned expression that reads `$parameter` has them in scope.
 */
export const DESCRIPTION_ONLY_ADDITIONAL_KEYS = ['$credentials'] as const;

/** Returns the additional keys a node parameter expression may use. */
export const toParameterAdditionalKeys = (
	keys: IWorkflowDataProxyAdditionalKeys,
): IWorkflowDataProxyAdditionalKeys => {
	const parameterKeys = { ...keys };
	for (const key of DESCRIPTION_ONLY_ADDITIONAL_KEYS) delete parameterKeys[key];
	return parameterKeys;
};

/**
 * Checks if the given value is an expression. An expression is a string that
 * starts with '='.
 */
export const isExpression = (expr: unknown): expr is string => {
	if (typeof expr !== 'string') return false;

	return expr.charAt(0) === '=';
};
