import type {
	IExecuteFunctions,
	INodeExecutionData,
	IProjectFileService,
	ProjectFileNodeInput,
} from 'n8n-workflow';

export async function execute(
	this: IExecuteFunctions,
	proxy: IProjectFileService,
	items: INodeExecutionData[],
	itemIndex: number,
): Promise<INodeExecutionData> {
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
	const fileName = this.getNodeParameter('fileName', itemIndex) as string;
	const overwrite = this.getNodeParameter('overwrite', itemIndex) as boolean;

	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

	// A persisted binary is streamed straight through; only binaries still held in
	// memory have to be buffered.
	const source: ProjectFileNodeInput['source'] = binaryData.id
		? { type: 'stream', stream: await this.helpers.getBinaryStream(binaryData.id) }
		: {
				type: 'buffer',
				buffer: await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName),
			};

	const file = await proxy.addFile(
		{
			name: fileName,
			mimeType: binaryData.mimeType,
			sizeBytes: binaryData.bytes ?? 0,
			source,
		},
		{ overwrite },
	);

	return {
		json: { ...file },
		// Passed through so a second node can store the same file under another name.
		binary: items[itemIndex].binary,
		pairedItem: { item: itemIndex },
	};
}
