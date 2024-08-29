/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionType, type INodeTypeDescription } from 'n8n-workflow';

import { configuredInputs } from '../helpers/utils';
import * as mode from './mode';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Merge',
	name: 'merge',
	group: ['transform'],
	description: 'Merges data of multiple streams once data from both is available',
	version: [3],
	defaults: {
		name: 'Merge',
	},
	inputs: `={{(${configuredInputs})($parameter)}}`,
	outputs: [NodeConnectionType.Main],
	// If mode is chooseBranch data from both branches is required
	// to continue, else data from any input suffices
	requiredInputs: '={{ $parameter["mode"] === "chooseBranch" ? [0, 1] : 1 }}',
	properties: [...mode.description],
};
