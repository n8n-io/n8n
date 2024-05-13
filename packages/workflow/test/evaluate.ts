import { workflow } from './ExpressionExtensions/Helpers';
import type { INodeExecutionData } from '@/Interfaces';

export const evaluate = (expression: string, data: INodeExecutionData[] = []) => {
	return workflow.expression.getParameterValue(expression, null, 0, 0, 'node', data, 'manual', {});
};
