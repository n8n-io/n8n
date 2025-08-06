import glob from 'fast-glob';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { generatePairedItemData } from '../../utils/utilities';

export class ReadBinaryFiles implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: 'Read Binary Files',
		name: 'readBinaryFiles',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
		description: 'Reads binary files from disk',
		defaults: {
			name: 'Read Binary Files',
			color: '#44AA44',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'File Selector',
				name: 'fileSelector',
				type: 'string',
				default: '',
				required: true,
				placeholder: '*.jpg',
				description: 'Pattern for files to read',
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property to which to write the data of the read files',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const fileSelector = this.getNodeParameter('fileSelector', 0) as string;
		const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);
		const pairedItem = generatePairedItemData(this.getInputData().length);

		const files = await glob(fileSelector);

		const items: INodeExecutionData[] = [];
		for (const filePath of files) {
			const stream = await this.helpers.createReadStream(filePath);
			items.push({
				binary: {
					[dataPropertyName]: await this.helpers.prepareBinaryData(stream, filePath),
				},
				json: {},
				pairedItem,
			});
		}

		return [items];
	}
}
