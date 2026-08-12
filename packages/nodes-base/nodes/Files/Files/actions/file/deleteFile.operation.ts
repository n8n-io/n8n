import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { FILE_RESOURCE_LOCATOR_BASE } from '../../common/fields';
import { getProjectFilesProxy, resolveFileId } from '../../common/utils';

export const FIELD = 'deleteFile';

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
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getProjectFilesProxy(this);
	const fileId = await resolveFileId(this, proxy, index);

	const { name } = await proxy.deleteFile(fileId);

	return [
		{
			json: { deleted: true, name },
			pairedItem: { item: index },
		},
	];
}
