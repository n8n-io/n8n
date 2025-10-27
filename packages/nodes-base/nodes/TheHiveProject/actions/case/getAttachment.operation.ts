import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	caseRLC,
	{
		displayName: 'Attachment Name or ID',
		name: 'attachmentId',
		type: 'options',
		default: '',
		required: true,
		description:
			'ID of the attachment. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'loadCaseAttachments',
			loadOptionsDependsOn: ['caseId.value'],
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Rename the file when downloading',
			},
			{
				displayName: 'Data Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				description: 'Name of the binary property to which write the data of the attachment',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['getAttachment'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;
	const options = this.getNodeParameter('options', i);
	const attachmentId = this.getNodeParameter('attachmentId', i) as string;

	const requestOptions = {
		useStream: true,
		resolveWithFullResponse: true,
		encoding: null,
		json: false,
	};

	const response = await theHiveApiRequest.call(
		this,
		'GET',
		`/v1/case/${caseId}/attachment/${attachmentId}/download`,
		undefined,
		undefined,
		undefined,
		requestOptions,
	);

	const mimeType = (response.headers as IDataObject)?.['content-type'] ?? undefined;

	let fileName = (options.fileName as string) || 'attachment';

	if (!options.fileName && response.headers['content-disposition'] !== undefined) {
		const contentDisposition = response.headers['content-disposition'] as string;
		const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
		if (fileNameMatch !== null) {
			fileName = fileNameMatch[1];
		}
	}

	const newItem: INodeExecutionData = {
		json: {
			_id: attachmentId,
			caseId,
			fileName,
			mimeType,
		},
		binary: {},
	};

	newItem.binary![(options.dataPropertyName as string) || 'data'] =
		await this.helpers.prepareBinaryData(response.body as Buffer, fileName, mimeType as string);

	const executionData = this.helpers.constructExecutionMetaData([newItem], {
		itemData: { item: i },
	});

	return executionData;
}
