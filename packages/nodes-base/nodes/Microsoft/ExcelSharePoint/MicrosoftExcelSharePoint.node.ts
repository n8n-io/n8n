import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

// Shell for the Excel-on-SharePoint build. Registered but hidden: workflows
// using it always work; the launch ticket removes the `hidden` flag.
export class MicrosoftExcelSharePoint implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Excel (SharePoint)',
		name: 'microsoftExcelSharePoint',
		icon: 'file:excelSharePoint.svg',
		group: ['transform'],
		version: 1,
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
		],
	};

	// Pass-through until the first action arrives with the router.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
