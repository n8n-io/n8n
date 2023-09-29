import type {
	IDataObject,
	IBinaryData,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Perform ...',
		name: 'perform',
		type: 'options',
		options: [
			{
				name: 'Merge Binaries Into a Single Item',
				value: 'merge',
			},
			{
				name: 'Split Each Binary Into a Separate Item',
				value: 'split',
			},
		],
		default: 'merge',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Include JSON Data',
				name: 'includeJson',
				type: 'boolean',
				default: false,
				description: 'Whether to include the JSON data in the new items',
				displayOptions: {
					show: {
						'/perform': ['split'],
					},
				},
			},
			{
				displayName: 'JSON Data',
				name: 'json',
				type: 'string',
				default: '{\n  "my_field_1": "value",\n  "my_field_2": 1\n}',
				typeOptions: {
					editor: 'json',
					editorLanguage: 'json',
					rows: 4,
				},
				displayOptions: {
					show: {
						'/perform': ['merge'],
					},
				},
				validateType: 'object',
			},
			{
				displayName: 'Keep Only Unique Binaries',
				name: 'keepOnlyUnique',
				type: 'boolean',
				default: false,
				description:
					'Whether to keep only unique binaries by comparing mime types, file types, file sizes and file extensions',
			},
			{
				displayName: 'Rename Binary Key',
				name: 'renameBinaryKey',
				type: 'string',
				default: '',
				description: 'If set, the binary key will be renamed to this value',
				displayOptions: {
					show: {
						'/perform': ['split'],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['itemList'],
		operation: ['manageBinaries'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

type PartialBinaryData = Omit<IBinaryData, 'data'>;
const isBinaryUniqueSetup = () => {
	const binaries: PartialBinaryData[] = [];
	return (binary: IBinaryData) => {
		for (const existingBinary of binaries) {
			if (
				existingBinary.mimeType === binary.mimeType &&
				existingBinary.fileType === binary.fileType &&
				existingBinary.fileSize === binary.fileSize &&
				existingBinary.fileExtension === binary.fileExtension
			) {
				return false;
			}
		}

		binaries.push({
			mimeType: binary.mimeType,
			fileType: binary.fileType,
			fileSize: binary.fileSize,
			fileExtension: binary.fileExtension,
		});

		return true;
	};
};

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData = [] as INodeExecutionData[];
	const perform = this.getNodeParameter('perform', 0) as string;
	const keepOnlyUnique = this.getNodeParameter('options.keepOnlyUnique', 0, false) as boolean;
	const isBinaryUnique = keepOnlyUnique ? isBinaryUniqueSetup() : undefined;

	if (perform === 'merge') {
		let jsonData = this.getNodeParameter('options.json', 0, {}) as IDataObject;
		if (jsonData && typeof jsonData === 'string') {
			jsonData = jsonParse(jsonData);
		}

		const newItem = {
			json: jsonData ? jsonData : {},
		} as INodeExecutionData;

		for (const item of items) {
			if (item.binary === undefined) continue;

			for (const key of Object.keys(item.binary)) {
				if (!newItem.binary) newItem.binary = {};
				let binaryKey = key;
				const binary = item.binary[key];

				if (isBinaryUnique && !isBinaryUnique(binary)) {
					continue;
				}

				// If the binary key already exists add a suffix to it
				let i = 1;
				while (newItem.binary[binaryKey] !== undefined) {
					binaryKey = `${key}_${i}`;
					i++;
				}

				newItem.binary[binaryKey] = binary;
			}
		}

		returnData.push(newItem);
	} else {
		const includeJson = this.getNodeParameter('options.includeJson', 0, false) as boolean;
		const renameBinaryKey = this.getNodeParameter('options.renameBinaryKey', 0, '') as string;

		for (const item of items) {
			if (item.binary === undefined) continue;

			for (const key of Object.keys(item.binary)) {
				const binary = item.binary[key];

				if (isBinaryUnique && !isBinaryUnique(binary)) {
					continue;
				}

				returnData.push({
					json: includeJson ? item.json : {},
					binary: {
						[renameBinaryKey || key]: binary,
					},
				} as INodeExecutionData);
			}
		}
	}

	return returnData;
}
