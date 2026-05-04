import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1385902-setpolicymodulesstate.html" target="_blank" rel="noopener noreferrer">Set Policy Modules State</a>',
		name: 'setPolicyModulesStateDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Policy ID',
		name: 'policyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the policy you want to modify',
	},
	{
		displayName: 'Settings (JSON)',
		name: 'settings',
		type: 'json',
		required: true,
		default: '{}',
		description: 'A settings object',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
];

const displayOptions = {
	show: { category: ['policies'], action: ['setPolicyModulesState'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const policyId = this.getNodeParameter('policyId', i) as string;
	const settings = processJsonInput(
		this.getNodeParameter('settings', i),
		'Settings',
	) as IDataObject;

	const params: IDataObject = {
		policyId,
		settings,
	};

	const responseData = await gravityZoneApiRequest.call(
		this,
		'policies',
		'setPolicyModulesState',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
