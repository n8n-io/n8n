/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as mode from './mode';
import { configuredInputs } from '../helpers/utils';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Merge',
	name: 'merge',
	group: ['transform'],
	description: 'Merges data of multiple streams once data from both is available',
	version: [3, 3.1, 3.2],
	defaults: {
		name: 'Merge',
	},
	builderHint: {
		message:
			'Mode selection is the single most consequential decision on this node — the wrong mode silently drops or duplicates items rather than erroring. Pick by data shape: `append` to concatenate items from parallel branches; `combineByPosition` only when both branches emit the same number of items in the same order; `combineByFields` to join by a matching key (default; usually correct for "merge by ID"); `combineBySql` for >2 inputs or aggregation; `chooseBranch` to discard all but one input. Read each mode\'s @builderHint before picking.',
	},
	inputs: `={{(${configuredInputs})($parameter)}}`,
	outputs: [NodeConnectionTypes.Main],
	// If mode is chooseBranch data from both branches is required
	// to continue, else data from any input suffices
	requiredInputs: '={{ $parameter["mode"] === "chooseBranch" ? [0, 1] : 1 }}',
	properties: [...mode.description],
};
