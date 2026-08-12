import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as file from './actions/file/File.resource';
import { router } from './actions/router';
import { fileSearch } from './common/methods';

export class Files implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Files',
		name: 'files',
		icon: { light: 'file:files.svg', dark: 'file:files.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Store files in the project and read or write them from any of its workflows',
		defaults: {
			name: 'Files',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		builderHint: {
			searchHint:
				'Store persistent, project-scoped files and read or write them from workflows. Use Download to read a stored file into binary data, Upload to persist binary data across executions.',
			extraTypeDefContent: [
				{
					displayOptions: { show: { resource: ['file'], operation: ['download'] } },
					content: `<patterns>
<pattern title="Download a stored file by name">
const readConfig = node({
  type: 'n8n-nodes-base.files',
  version: 1,
  config: {
    name: 'Download Pricing',
    parameters: {
      resource: 'file',
      operation: 'download',
      fileId: { __rl: true, mode: 'name', value: 'pricing.csv' },
      binaryPropertyOutput: 'data'
    }
  }
});
</pattern>
</patterns>`,
				},
				{
					displayOptions: { show: { resource: ['file'], operation: ['upload'] } },
					content: `<patterns>
<pattern title="Persist binary data as a project file">
const saveReport = node({
  type: 'n8n-nodes-base.files',
  version: 1,
  config: {
    name: 'Save Report',
    parameters: {
      resource: 'file',
      operation: 'upload',
      binaryPropertyName: 'data',
      fileName: 'report-latest.xlsx',
      conflictMode: 'replace'
    }
  }
});
</pattern>
</patterns>`,
				},
			],
		},
		properties: [
			// Single resource in MVP; the hidden selector keeps stored workflows
			// stable if more resources arrive later.
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				noDataExpression: true,
				default: 'file',
			},
			...file.description,
		],
	};

	methods = {
		listSearch: {
			fileSearch,
		},
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
