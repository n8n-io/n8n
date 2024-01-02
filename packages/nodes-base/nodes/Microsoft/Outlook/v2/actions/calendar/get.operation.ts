import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';
import { calendarRLC } from '../../descriptions';
import { updateDisplayOptions } from '@utils/utilities';

export const properties: INodeProperties[] = [calendarRLC];

const displayOptions = {
	show: {
		resource: ['calendar'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const qs: IDataObject = {};

	const calendarId = this.getNodeParameter('calendarId', index, undefined, {
		extractValue: true,
	}) as string;

	const responseData = await microsoftApiRequest.call(
		this,
		'GET',
		`/calendars/${calendarId}`,
		undefined,
		qs,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
