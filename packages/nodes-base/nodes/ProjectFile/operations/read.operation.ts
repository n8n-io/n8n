import type { IExecuteFunctions, INodeExecutionData, IProjectFileService } from 'n8n-workflow';

import { toFileRef } from '../common/utils';

export async function execute(
	this: IExecuteFunctions,
	proxy: IProjectFileService,
	_items: INodeExecutionData[],
	itemIndex: number,
): Promise<INodeExecutionData> {
	const outputFieldName = this.getNodeParameter('outputFieldName', itemIndex) as string;

	const { file, stream } = await proxy.getFile(toFileRef.call(this, itemIndex));

	/**
	 * The bytes are copied into execution-scoped binary storage rather than
	 * referencing the stored blob: `GET /rest/binary-data?id=` performs no
	 * ownership check, so putting the project file's reference into execution data
	 * would expose a cross-project read to anyone who can view this execution.
	 *
	 * Copying also gets the lifecycle right — this copy is pruned with the
	 * execution, while the project file is untouched. The stream keeps it off the
	 * heap.
	 */
	const binary = await this.helpers.prepareBinaryData(stream, file.name, file.mimeType);

	return {
		json: { ...file },
		binary: { [outputFieldName]: binary },
		pairedItem: { item: itemIndex },
	};
}
