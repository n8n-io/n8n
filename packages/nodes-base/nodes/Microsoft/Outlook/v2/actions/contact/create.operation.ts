import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { prepareContactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { contactFields } from './descriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'givenName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		options: [...contactFields],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const givenName = this.getNodeParameter('givenName', index) as string;

	const body: IDataObject = {
		givenName,
		...prepareContactFields(additionalFields),
	};

	const responseData = await microsoftApiRequest.call(this, 'POST', '/contacts', body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
