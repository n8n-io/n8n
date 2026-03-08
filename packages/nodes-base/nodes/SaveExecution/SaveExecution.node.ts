import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class SaveExecution implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Save Execution',
		name: 'saveExecution',
		icon: 'fa:floppy-disk',
		group: ['organization'],
		version: 1,
		description: 'Override execution save behavior for this run',
		defaults: {
			name: 'Save Execution',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Save This Execution',
				name: 'saveExecution',
				type: 'boolean',
				default: true,
				description:
					'Whether to save this execution to the database. Overrides the workflow-level "Save successful executions" setting for this run.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const save = this.getNodeParameter('saveExecution', 0) as boolean;

		this.setMetadata({ saveExecution: save });

		return [items];
	}
}
