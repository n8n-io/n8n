import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { assertParamIsNumber, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class TimeSaved implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Track Time Saved',
		name: 'timeSaved',
		icon: 'fa:timer',
		group: ['organization'],
		version: 1,
		description:
			'Dynamically track time saved based on the workflow’s execution path and the number of items processed',
		defaults: {
			name: 'Time Saved',
			color: '#1E90FF',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'For each run, time saved is the sum of all Time Saved nodes that execute. Use this when different execution paths or items save different amounts of time.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Calculation Mode',
				name: 'mode',
				type: 'options',
				default: 'once',
				noDataExpression: true,
				options: [
					{
						name: 'Once For All Items',
						value: 'once',
						description: 'Counts minutes saved once for all input items',
					},
					{
						name: 'Per Item',
						value: 'perItem',
						description: 'Multiply minutes saved by the number of input items',
					},
				],
			},
			{
				displayName: 'Minutes Saved',
				name: 'minutesSaved',
				type: 'number',
				default: 0,
				noDataExpression: true,
				typeOptions: {
					minValue: 0,
				},
				description: 'Number of minutes saved by this workflow execution',
			},
		],
		hints: [
			{
				type: 'info',
				message:
					'Multiple Saved Time nodes in the same workflow will have their values summed together.',
				displayCondition: '=true',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const mode = this.getNodeParameter('mode', 0) as 'fixed' | 'perItem' | 'expression';

		let timeSavedMinutes = this.getNodeParameter('minutesSaved', 0);
		assertParamIsNumber('minutesSaved', timeSavedMinutes, this.getNode());

		try {
			if (mode === 'perItem') {
				timeSavedMinutes = items.length * timeSavedMinutes;
			}

			// Ensure non-negative
			if (timeSavedMinutes < 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Time saved cannot be negative, got: ${timeSavedMinutes}`,
				);
			}

			// Set metadata using the clean API
			this.setMetadata({
				timeSaved: {
					minutes: timeSavedMinutes,
				},
			});

			// Pass through all items unchanged
			return [items];
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: error.message } }]];
			}
			throw error;
		}
	}
}
