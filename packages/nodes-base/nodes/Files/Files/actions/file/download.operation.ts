import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { FILE_RESOURCE_LOCATOR_BASE } from '../../common/fields';
import { getProjectFilesProxy, resolveFileId } from '../../common/utils';

export const FIELD = 'download';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['file'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	{
		...FILE_RESOURCE_LOCATOR_BASE,
		displayOptions,
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyOutput',
		type: 'string',
		default: 'data',
		description: 'The name of the output binary field to put the file in',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getProjectFilesProxy(this);
	const fileId = await resolveFileId(this, proxy, index);
	const binaryPropertyOutput = this.getNodeParameter('binaryPropertyOutput', index, 'data');

	// Copy-on-read: the stream lands in execution binary data, so in-flight
	// executions never see a replace happening underneath them.
	const { metadata, stream } = await proxy.download(fileId);
	const binary = await this.helpers.prepareBinaryData(stream, metadata.name, metadata.mimeType);

	return [
		{
			json: {
				id: metadata.id,
				name: metadata.name,
				mimeType: metadata.mimeType,
				sizeBytes: metadata.sizeBytes,
				updatedAt: metadata.updatedAt,
			},
			binary: { [String(binaryPropertyOutput)]: binary },
			pairedItem: { item: index },
		},
	];
}
