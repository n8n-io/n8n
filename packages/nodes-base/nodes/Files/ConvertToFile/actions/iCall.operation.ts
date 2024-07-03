import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import * as createEvent from '../../../ICalendar/createEvent.operation';

import { updateDisplayOptions } from '@utils/utilities';

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
