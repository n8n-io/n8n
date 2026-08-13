import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	ProjectFilesConflictMode,
} from 'n8n-workflow';
import { BINARY_ENCODING } from 'n8n-workflow';

import { getProjectFilesProxy } from '../../common/utils';

export const FIELD = 'upload';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['file'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The name of the input binary field containing the file to upload',
		displayOptions,
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. report-latest.xlsx',
		description:
			'Name to store the file under, unique within the project. Leave empty to use the incoming binary file name.',
		displayOptions,
	},
	{
		displayName: 'If File Exists',
		name: 'conflictMode',
		type: 'options',
		default: 'replace',
		description: 'What to do when a file with this name already exists in the project',
		options: [
			{
				name: 'Replace',
				value: 'replace',
				description: 'Swap the content; name, ID, and references stay unchanged',
			},
			{
				name: 'Keep Both',
				value: 'keepBoth',
				description: 'Store under an auto-suffixed name, e.g. "report (1).csv"',
			},
			{
				name: 'Error',
				value: 'error',
				description: 'Fail the operation',
			},
		],
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getProjectFilesProxy(this);
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index);
	const fileName = this.getNodeParameter('fileName', index, '') as string;
	const conflictMode = this.getNodeParameter(
		'conflictMode',
		index,
		'replace',
	) as ProjectFilesConflictMode;

	const binaryData = this.helpers.assertBinaryData(index, binaryPropertyName);
	const body = binaryData.id
		? await this.helpers.getBinaryStream(binaryData.id)
		: Buffer.from(binaryData.data, BINARY_ENCODING);

	const name = fileName !== '' ? fileName : (binaryData.fileName ?? 'file');
	const metadata = await proxy.upload(name, body, { mimeType: binaryData.mimeType }, conflictMode);

	return [
		{
			json: {
				id: metadata.id,
				name: metadata.name,
				mimeType: metadata.mimeType,
				sizeBytes: metadata.sizeBytes,
				updatedAt: metadata.updatedAt,
			},
			pairedItem: { item: index },
		},
	];
}
