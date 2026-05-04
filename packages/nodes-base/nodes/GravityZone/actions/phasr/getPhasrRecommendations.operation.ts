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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1415156-getphasrrecommendations.html" target="_blank" rel="noopener noreferrer">Get PHASR Recommendations</a>',
		name: 'getPhasrRecommendationsDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Action Taken',
				name: 'actionTaken',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Action Needed', value: 0 },
					{ name: 'Applied', value: 1 },
					{ name: 'Partially Applied', value: 2 },
				],
				description: 'Filter by the action taken on the recommendation',
			},
			{
				displayName: 'Behavioral Profile Identities',
				name: 'behavioralProfileIdentities',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of identity IDs to filter recommendations by (e.g. "1234567890, 1234567891, 1234567892")',
			},
			{
				displayName: 'Behavioral Profile Resources',
				name: 'behavioralProfileResources',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of resource IDs to filter recommendations by (e.g. "1234567890, 1234567891, 1234567892")',
			},
			{
				displayName: 'Category IDs',
				name: 'categoryIds',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Hack Tool', value: 2 },
					{ name: 'Lol Bin', value: 5 },
					{ name: 'Miner', value: 4 },
					{ name: 'Remote Tool', value: 3 },
					{ name: 'Tampering Tool', value: 1 },
				],
				description: 'Filter recommendations by category type',
			},
			{
				displayName: 'Created On Min',
				name: 'createdOnMin',
				type: 'string',
				default: '',
				description:
					'Only include recommendations created after this ISO 8601 format date / time (e.g. "2025-05-07T13:21:00.704Z")',
			},
			{
				displayName: 'Created On Max',
				name: 'createdOnMax',
				type: 'string',
				default: '',
				description:
					'Only include recommendations created before this ISO 8601 format date / time (e.g. "2025-05-07T13:21:00.704Z")',
			},
			{
				displayName: 'Direction',
				name: 'dir',
				type: 'options',
				default: 'ASC',
				options: [
					{ name: 'Ascending', value: 'ASC' },
					{ name: 'Descending', value: 'DESC' },
				],
				description: 'The direction in which the results are sorted',
			},
			{
				displayName: 'Object ID',
				name: 'objectId',
				type: 'string',
				default: '',
				description: 'The ID of a specific recommendation to retrieve',
			},
			{
				displayName: 'Rule IDs',
				name: 'ruleIds',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of rule IDs to filter by, in "{ruleId}-{type}" format (e.g. "696-0, 596-1")',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				default: 'createdOn',
				options: [
					{ name: 'Attack Surface Reduction', value: 'attackSurfaceReduction' },
					{ name: 'Created On', value: 'createdOn' },
				],
				description: 'The basis on which the recommendations will be ordered',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Allow Access', value: 0 },
					{ name: 'Allow Access Request', value: 2 },
					{ name: 'Restrict Access', value: 1 },
				],
				description: 'Filter by recommendation type',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'The results page number',
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'The number of results displayed per page',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['phasr'], action: ['getPhasrRecommendations'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.objectId) params.objectId = options.objectId;
	if (options.sort) params.sort = options.sort;
	if (options.dir) params.dir = options.dir;
	if (options.createdOnMin) params.createdOnMin = options.createdOnMin;
	if (options.createdOnMax) params.createdOnMax = options.createdOnMax;
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;
	if (options.ruleIds) {
		const rawRuleIds = options.ruleIds as string;
		params.ruleIds = rawRuleIds
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
	}
	if ((options.categoryIds as number[])?.length) params.categoryIds = options.categoryIds;
	if ((options.actionTaken as number[])?.length) params.actionTaken = options.actionTaken;
	if ((options.type as number[])?.length) params.type = options.type;
	if (options.behavioralProfileIdentities) {
		const behavioralProfileIdentitiesRaw = options.behavioralProfileIdentities as string;
		params.behavioralProfileIdentities = behavioralProfileIdentitiesRaw
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
	}
	if (options.behavioralProfileResources) {
		const behavioralProfileResourcesRaw = options.behavioralProfileResources as string;
		params.behavioralProfileResources = behavioralProfileResourcesRaw
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'phasr',
		'getPhasrRecommendations',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
