import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ProjectFileNodeInput,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class ProjectFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Add file to project',
		name: 'projectFile',
		icon: 'fa:file-import',
		iconColor: 'orange-red',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["fileName"]}}',
		description: 'Save a file to this project so other workflows can use it',
		defaults: {
			name: 'Add file to project',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the input binary field containing the file to save',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '={{ $binary[$parameter.binaryPropertyName].fileName }}',
				required: true,
				placeholder: 'e.g. report.csv',
				description:
					'Name to store the file under. Names are unique per project, so reusing one replaces that file.',
			},
			{
				displayName: 'Replace Existing File',
				name: 'overwrite',
				type: 'boolean',
				default: true,
				description:
					'Whether to replace the file when one with the same name already exists. When turned off, the node fails instead.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const getProjectFileProxy = this.helpers.getProjectFileProxy;

		if (getProjectFileProxy === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				'Project files are not available on this instance',
				{
					description:
						'The project-files module is disabled. Remove it from N8N_DISABLED_MODULES to use this node.',
				},
			);
		}

		const proxy = await getProjectFileProxy();

		for (let i = 0; i < items.length; i++) {
			try {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const fileName = this.getNodeParameter('fileName', i) as string;
				const overwrite = this.getNodeParameter('overwrite', i) as boolean;

				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

				// A persisted binary is streamed straight through; only binaries still
				// held in memory have to be buffered.
				const source: ProjectFileNodeInput['source'] = binaryData.id
					? { type: 'stream', stream: await this.helpers.getBinaryStream(binaryData.id) }
					: {
							type: 'buffer',
							buffer: await this.helpers.getBinaryDataBuffer(i, binaryPropertyName),
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

				returnData.push({
					json: { ...file },
					// Passed through so a second node can store the same file under
					// another name.
					binary: items[i].binary,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
					continue;
				}

				throw error;
			}
		}

		return [returnData];
	}
}
