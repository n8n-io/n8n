import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import * as createEvent from '../../../ICalendar/createEvent.operation';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['iCal'],
		},
	},
	createEvent.description,
);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData = await createEvent.execute.call(this, items);

	return returnData;
}
