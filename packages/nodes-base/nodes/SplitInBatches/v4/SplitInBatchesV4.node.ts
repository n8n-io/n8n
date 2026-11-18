import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SplitInBatchesV3 } from '../v3/SplitInBatchesV3.node';

const v3 = new SplitInBatchesV3();

const parallelProperties: INodeProperties[] = [
	{
		displayName: 'Run in Parallel',
		name: 'runInParallel',
		type: 'boolean',
		default: false,
		description:
			'Whether to process the batches at the same time instead of one after another. Only workflows that run on engine v2 support this.',
	},
	{
		displayName:
			'Each batch runs on its own. Nodes in the loop cannot read data from other batches, for example with <code>$runIndex</code>.',
		name: 'parallelNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { runInParallel: [true] } },
	},
	{
		displayName: 'Max Concurrency',
		name: 'maxConcurrency',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 5,
		description: 'The maximum number of batches to process at the same time',
		displayOptions: { show: { runInParallel: [true] } },
	},
];

export class SplitInBatchesV4 implements INodeType {
	description: INodeTypeDescription = {
		...v3.description,
		version: 4,
		properties: [
			...v3.description.properties.filter((property) => property.name !== 'options'),
			...parallelProperties,
			...v3.description.properties.filter((property) => property.name === 'options'),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		// Engine v2 runs this node itself, so only engine v1 reaches this code.
		if (this.getNodeParameter('runInParallel', 0, false) === true) {
			throw new NodeOperationError(
				this.getNode(),
				'Running batches in parallel is only supported on engine v2',
				{
					description:
						'Turn off "Run in Parallel", or run this workflow on engine v2 in the workflow settings.',
				},
			);
		}

		return await v3.execute.call(this);
	}
}
