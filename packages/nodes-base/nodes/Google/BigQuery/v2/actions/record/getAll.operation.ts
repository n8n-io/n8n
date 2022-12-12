import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { simplify } from '../../helpers/utils';
import { googleApiRequest, googleApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['record'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['record'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getAll'],
			},
		},
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['record'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'selectedFields',
				type: 'string',
				default: '',
				description:
					'Subset of fields to return, supports select into sub fields. Example: <code>selectedFields = "a,e.d.f"</code>',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/tables/get
	let responseData;
	const returnAll = this.getNodeParameter('returnAll', index);
	const projectId = this.getNodeParameter('projectId', index) as string;
	const datasetId = this.getNodeParameter('datasetId', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const simple = this.getNodeParameter('simple', index) as boolean;

	let fields;

	if (simple) {
		const { schema } = await googleApiRequest.call(
			this,
			'GET',
			`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}`,
			{},
		);

		// console.log(JSON.stringify(schema, null, 2));

		const extractFields = (entry: IDataObject): string | IDataObject => {
			const name = entry.name as string;
			const entryFields = entry.fields as IDataObject[];
			if (!entryFields) {
				return name;
			}
			return { [name]: entryFields.map(extractFields) };
		};

		fields = (schema.fields || []).map((field: IDataObject) => extractFields(field));
	}

	const qs: IDataObject = {};

	const options = this.getNodeParameter('options', index);
	Object.assign(qs, options);

	if (qs.selectedFields) {
		fields = (qs.selectedFields as string).split(',');
	}

	if (returnAll) {
		responseData = await googleApiRequestAllItems.call(
			this,
			'rows',
			'GET',
			`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`,
			{},
			qs,
		);
	} else {
		qs.maxResults = this.getNodeParameter('limit', index);
		responseData = await googleApiRequest.call(
			this,
			'GET',
			`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/data`,
			{},
			qs,
		);
	}

	if (!returnAll) {
		responseData = responseData.rows;
	}

	if (!responseData?.length) {
		return [];
	}
	responseData = simple ? simplify(responseData, fields) : responseData;

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
