import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1223938-runlivesearchquery.html" target="_blank" rel="noopener noreferrer">Run Live Search Query</a>',
		name: 'runLiveSearchQueryDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the company that the target endpoints belong to',
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		description: 'The OSQuery SQL query that will run on all target endpoints',
	},
	{
		displayName: 'S3 Upload Config (JSON)',
		name: 's3UploadConfig',
		type: 'json',
		required: true,
		default: '{}',
		description: 'An S3 upload config object',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Endpoints',
				name: 'endpoints',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of endpoint IDs where the query is run (e.g. "id1, id2, id3"). Leave empty for all endpoints in the company.',
			},
			{
				displayName: 'Operating Systems',
				name: 'operatingSystems',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of operating systems to target (e.g. "windows, linux"). Leave empty for all operating systems.',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['runLiveSearchQuery'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const companyId = this.getNodeParameter('companyId', i) as string;
	const query = this.getNodeParameter('query', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const s3UploadConfig = processJsonInput(
		this.getNodeParameter('s3UploadConfig', i),
		'S3 Upload Config',
	) as IDataObject;

	const endpoints =
		options.endpoints && (options.endpoints as string) !== ''
			? (options.endpoints as string)
					.split(',')
					.map((e) => e.trim())
					.filter(Boolean)
			: [];

	const operatingSystems =
		options.operatingSystems && (options.operatingSystems as string) !== ''
			? (options.operatingSystems as string)
					.split(',')
					.map((os) => os.trim())
					.filter(Boolean)
			: [];

	const params: IDataObject = {
		companyId,
		query,
		endpoints,
		operatingSystems,
		s3UploadConfig,
	};

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'runLiveSearchQuery',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
