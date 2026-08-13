import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { fileSearch } from './common/methods';
import { getProjectFileProxy } from './common/utils';
import * as del from './operations/delete.operation';
import * as read from './operations/read.operation';
import * as write from './operations/write.operation';

const operations = { write: write.execute, read: read.execute, delete: del.execute };

type Operation = keyof typeof operations;

function isOperation(value: string): value is Operation {
	return value in operations;
}

export class ProjectFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Project file',
		name: 'projectFile',
		icon: 'fa:file-import',
		iconColor: 'orange-red',
		group: ['input', 'output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: "Read, save and delete files stored on this workflow's project",
		defaults: {
			name: 'Project file',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'write',
				options: [
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a file from the project',
						description: 'Permanently remove a file from the project',
					},
					{
						name: 'Read',
						value: 'read',
						action: 'Read a file from the project',
						description: 'Get a project file as binary data',
					},
					{
						name: 'Write',
						value: 'write',
						action: 'Save a file to the project',
						description: 'Save binary data to the project as a file',
					},
				],
			},

			// ----------------------------------
			//               write
			// ----------------------------------
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the input binary field containing the file to save',
				displayOptions: { show: { operation: ['write'] } },
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
				displayOptions: { show: { operation: ['write'] } },
			},
			{
				displayName: 'Replace Existing File',
				name: 'overwrite',
				type: 'boolean',
				default: true,
				description:
					'Whether to replace the file when one with the same name already exists. When turned off, the node fails instead.',
				displayOptions: { show: { operation: ['write'] } },
			},

			// ----------------------------------
			//          read and delete
			// ----------------------------------
			{
				displayName: 'File',
				name: 'file',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				displayOptions: { show: { operation: ['read', 'delete'] } },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'fileSearch',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. rates-latest.csv',
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. zLNH7LmLgHbgwO5X',
					},
				],
			},
			{
				displayName: 'Put Output File in Field',
				name: 'outputFieldName',
				type: 'string',
				default: 'data',
				required: true,
				hint: 'The name of the output binary field to put the file in',
				displayOptions: { show: { operation: ['read'] } },
			},
		],
	};

	methods = {
		listSearch: { fileSearch },
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		if (!isOperation(operation)) {
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}

		const proxy = await getProjectFileProxy(this, this.getNode());

		for (let i = 0; i < items.length; i++) {
			try {
				returnData.push(await operations[operation].call(this, proxy, items, i));
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
