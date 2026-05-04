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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135297-getinstallationlinks.html" target="_blank" rel="noopener noreferrer">Get Installation Links</a>',
		name: 'getInstallationLinksDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'string',
				default: '',
				description:
					'The ID of the managed company. If not included, the installation links available for all managed companies will be returned.',
			},
			{
				displayName: 'Package Name',
				name: 'packageName',
				type: 'string',
				default: '',
				description: 'The name of the package. If not included, all packages will be returned.',
			},
			{
				displayName: 'Ring ID',
				name: 'ringId',
				type: 'options',
				options: [
					{ name: 'Slow Ring', value: 0 },
					{ name: 'Production Ring', value: 3 },
					{ name: 'Test 1 Ring', value: 4 },
					{ name: 'Test 2 Ring', value: 5 },
				],
				default: 0,
				description:
					'When included, the method will return the installation package associated with a specific staging ring',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['packages'], action: ['getInstallationLinks'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.companyId !== undefined && options.companyId !== '')
		params.companyId = options.companyId;
	if (options.packageName !== undefined && options.packageName !== '')
		params.packageName = options.packageName;
	if (options.ringId !== undefined) params.ringId = options.ringId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'packages',
		'getInstallationLinks',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
