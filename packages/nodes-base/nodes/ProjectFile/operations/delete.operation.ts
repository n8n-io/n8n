import type { IExecuteFunctions, INodeExecutionData, IProjectFileService } from 'n8n-workflow';

import { toFileRef } from '../common/utils';

export async function execute(
	this: IExecuteFunctions,
	proxy: IProjectFileService,
	_items: INodeExecutionData[],
	itemIndex: number,
): Promise<INodeExecutionData> {
	const { id, name } = await proxy.deleteFile(toFileRef.call(this, itemIndex));

	return {
		json: { id, name, deleted: true },
		pairedItem: { item: itemIndex },
	};
}
