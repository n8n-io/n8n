import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import * as readRows from './actions/worksheet/readRows.operation';
import { listSearch } from './methods';

// Shell for the Excel-on-SharePoint build. Registered but hidden: workflows
// using it always work; the launch ticket removes the `hidden` flag.
export class MicrosoftExcelSharePoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Excel (SharePoint)',
		name: 'microsoftExcelSharePoint',
		icon: 'file:excelSharePoint.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Read and write Excel workbooks stored in SharePoint document libraries',
		defaults: {
			name: 'Microsoft Excel (SharePoint)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		hidden: true,
		// Legacy credentials deliberately excluded: the SharePoint one targets
		// the old _api host (not Graph); the Excel one has no Sites.* scopes.
		credentials: [
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftEntraServicePrincipalApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftEntraServicePrincipalApi'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
						description:
							'Generic Microsoft Graph credential. Enable the scopes this node needs (e.g. Sites.ReadWrite.All) on the credential.',
					},
					{
						name: 'Microsoft Entra Service Principal (App-Only)',
						value: 'microsoftEntraServicePrincipalApi',
						description:
							'App-only access via a Microsoft Entra app registration with admin-consented SharePoint application permissions',
					},
				],
				default: 'microsoftOAuth2Api',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Sheet',
						value: 'worksheet',
					},
				],
				default: 'worksheet',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['worksheet'],
					},
				},
				options: [
					{
						name: 'Get Rows',
						value: 'readRows',
						description: 'Read rows from a range or the used range of a sheet',
						action: 'Get rows in sheet',
					},
				],
				default: 'readRows',
			},

			...readRows.description,
		],
	};

	methods = {
		listSearch,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		if (resource === 'worksheet' && operation === 'readRows') {
			return [await readRows.execute.call(this, items)];
		}

		throw new NodeOperationError(
			this.getNode(),
			`The operation "${String(operation)}" is not supported!`,
		);
	}
}
