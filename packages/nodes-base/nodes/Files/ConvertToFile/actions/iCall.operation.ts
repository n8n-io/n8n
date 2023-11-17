import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import * as createEvent from '../../../ICalendar/createEvent.operation';

import { updateDisplayOptions } from '@utils/utilities';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['iCal'],
		},
	},
	createEvent.description.filter((property) => property.name !== 'binaryPropertyName'),
);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
