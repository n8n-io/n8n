import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Content',
		name: 'content',
		typeOptions: {
			rows: 5,
		},
		type: 'string',
		default: '',
		required: true,
		description: 'The content of the note to create',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Deal ID',
				name: 'deal_id',
				type: 'number',
				default: 0,
				description: 'ID of the deal this note will be associated with',
			},
			{
				displayName: 'Lead ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				description: 'ID of the lead this note will be associated with',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'org_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizationIds',
				},
				default: '',
				description:
					'ID of the organization this note will be associated with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				description: 'ID of the person this note will be associated with',
			},
			{
				displayName: 'Pinned to Deal',
				name: 'pinned_to_deal_flag',
				type: 'boolean',
				default: false,
				description: 'Whether the note is pinned to the deal',
			},
			{
				displayName: 'Pinned to Organization',
				name: 'pinned_to_organization_flag',
				type: 'boolean',
				default: false,
				description: 'Whether the note is pinned to the organization',
			},
			{
				displayName: 'Pinned to Person',
				name: 'pinned_to_person_flag',
				type: 'boolean',
				default: false,
				description: 'Whether the note is pinned to the person',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['note'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = {
				content: this.getNodeParameter('content', i) as string,
			};

			const additionalFields = this.getNodeParameter('additionalFields', i);
			for (const key of Object.keys(additionalFields)) {
				body[key] = additionalFields[key];
			}

			// Convert boolean pin flags to 0/1 for v1 API
			for (const flag of [
				'pinned_to_deal_flag',
				'pinned_to_person_flag',
				'pinned_to_organization_flag',
			]) {
				if (body[flag] !== undefined) {
					body[flag] = body[flag] ? 1 : 0;
				}
			}

			const responseData = await pipedriveApiRequest.call(
				this,
				'POST',
				'/notes',
				body,
				{},
				{ apiVersion: 'v1' },
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.data as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
