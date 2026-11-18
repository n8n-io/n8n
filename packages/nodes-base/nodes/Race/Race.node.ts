import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, READ_ONLY_ANNOTATIONS } from 'n8n-workflow';

export class Race implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Race',
		name: 'race',
		icon: 'fa:flag',
		iconColor: 'neutral',
		group: ['transform'],
		version: 1,
		description:
			'Continues with the first connected branch that delivers data, and ignores the others',
		annotations: READ_ONLY_ANNOTATIONS,
		defaults: {
			name: 'Race',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Connect each branch you want to race to the input. This node only works when the workflow runs on engine v2. Set the engine in the workflow settings.',
				name: 'engineV2Notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Cancel Other Branches',
				name: 'cancelOtherBranches',
				type: 'boolean',
				noDataExpression: true,
				default: false,
				description:
					'Whether to cancel the nodes that only feed this node once one branch wins. A node that is already running finishes, but its result is ignored.',
			},
		],
	};

	// Engine v2 runs this node itself, so this method only runs on the v1 engine.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		throw new NodeOperationError(
			this.getNode(),
			'The Race node only works on engine v2. Set the engine in the workflow settings.',
		);
	}
}
