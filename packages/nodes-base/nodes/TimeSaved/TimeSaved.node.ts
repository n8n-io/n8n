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
		description: 'Track dynamic time savings for this workflow execution',
		defaults: {
			name: 'Time Saved',
			color: '#1E90FF',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Calculate time saved dynamically based on execution data. This allows you to track variable time savings (e.g., 5 minutes per item processed) instead of using a fixed value in workflow settings.',
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
		// TODO: see if we can use posthog here
		hidden: true,
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
