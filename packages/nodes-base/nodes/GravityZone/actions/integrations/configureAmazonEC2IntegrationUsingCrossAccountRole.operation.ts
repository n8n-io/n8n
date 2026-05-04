import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135308-configureamazonec2integrationusingcrossaccountrole.html" target="_blank" rel="noopener noreferrer">Configure Amazon EC2 Integration Using Cross-Account Role</a>',
		name: 'configureAmazonEC2IntegrationUsingCrossAccountRoleDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Cross-Account Role ARN',
		name: 'crossAccountRoleArn',
		type: 'string',
		required: true,
		default: '',
		description: 'The Amazon Resource Name of a valid AWS Cross-Account Role',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Integration Name',
				name: 'integrationName',
				type: 'string',
				default: '',
				description:
					'A name to identify this specific integration. Defaults to the AWS account ID.',
			},
		],
	},
];

const displayOptions = {
	show: {
		category: ['integrations'],
		action: ['configureAmazonEC2IntegrationUsingCrossAccountRole'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const crossAccountRoleArn = this.getNodeParameter('crossAccountRoleArn', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { crossAccountRoleArn };

	if (options.integrationName) params.integrationName = options.integrationName;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'integrations',
		'configureAmazonEC2IntegrationUsingCrossAccountRole',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
