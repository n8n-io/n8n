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
		properties: [],
	};

	// Pass-through until the first action arrives with the router.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
