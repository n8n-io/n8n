import { workflow } from './ExpressionExtensions/Helpers';
import type { INodeExecutionData } from '@/Interfaces';

export const evaluate = (value: string, data: INodeExecutionData[]) => {
	const itemIndex = data.length === 0 ? -1 : 0;
	return workflow.expression.getParameterValue(
		value,
		null,
		0,
		itemIndex,
		'node',
		data,
		'manual',
		{},
	);
};
