import type { IWorkflowDataProxyAdditionalKeys } from './interfaces';

// A non-enumerable symbol key stays out of the arguments the tool sees, and model output cannot set it.
const TOOL_EXPRESSION_VARIABLES = Symbol.for('n8n.toolExpressionVariables');

/** Attaches expression variables that the tool node can use in its parameters for this call. */
export function attachToolExpressionVariables<T extends object>(
	args: T,
	variables: IWorkflowDataProxyAdditionalKeys,
): T {
	Object.defineProperty(args, TOOL_EXPRESSION_VARIABLES, { value: variables, enumerable: false });
	return args;
}

/** Returns the expression variables attached to tool arguments, if any. */
export function getToolExpressionVariables(
	args: unknown,
): IWorkflowDataProxyAdditionalKeys | undefined {
	if (typeof args !== 'object' || args === null) return undefined;
	const variables: unknown = Reflect.get(args, TOOL_EXPRESSION_VARIABLES);
	if (typeof variables !== 'object' || variables === null || Array.isArray(variables)) {
		return undefined;
	}
	return { ...variables };
}
