import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const qs: IDataObject = {};

	const calendarId = this.getNodeParameter('calendarId', index) as string;

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
