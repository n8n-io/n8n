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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-924802-assignpolicy.html" target="_blank" rel="noopener noreferrer">Assign Policy</a>',
		name: 'assignPolicyDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Target IDs',
		name: 'targetIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of endpoint IDs to assign the policy to (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Policy ID',
				name: 'policyId',
				type: 'string',
				default: '',
				description:
					'The ID of the policy to assign. If not included, "Inherit From Above" must be set to true.',
			},
			{
				displayName: 'Inherit From Above',
				name: 'inheritFromAbove',
				type: 'boolean',
				default: true,
				description:
					'Whether target endpoints inherit the policy of the parent containers. Cannot be used with "Policy ID" or "Force Policy Inheritance".',
			},
			{
				displayName: 'Force Policy Inheritance',
				name: 'forcePolicyInheritance',
				type: 'boolean',
				default: false,
				description:
					'Whether the policy is also assigned to all child endpoints of the selected targets. Requires a valid "Policy ID".',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['assignPolicy'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const targetIdsRaw = this.getNodeParameter('targetIds', i) as string;
	const targetIds = targetIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { targetIds };

	if (options.policyId !== undefined && (options.policyId as string) !== '')
		params.policyId = options.policyId;
	if (options.inheritFromAbove !== undefined) params.inheritFromAbove = options.inheritFromAbove;
	if (options.forcePolicyInheritance !== undefined)
		params.forcePolicyInheritance = options.forcePolicyInheritance;

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'assignPolicy', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
