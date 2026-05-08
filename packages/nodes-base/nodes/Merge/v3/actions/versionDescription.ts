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
		searchHint:
			'Mode selection is the single most consequential decision on this node — the wrong mode silently drops or duplicates items rather than erroring. Pick by data shape: `append` to concatenate items from parallel branches; `combineByPosition` only when both branches emit the same number of items in the same order; `combineByFields` to join by a matching key (default; usually correct for "merge by ID"); `combineBySql` for >2 inputs or aggregation; `chooseBranch` to discard all but one input. Read each mode\'s @builderHint before picking.',
		extraTypeDefContent: [
			{
				content: `<patterns>
<pattern title="Combine two branches by matching key (combineByFields, default)">
const usersApi = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Fetch Users', parameters: { url: 'https://api.example.com/users' } }
});

const ordersApi = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Fetch Orders', parameters: { url: 'https://api.example.com/orders' } }
});

const mergeNode = merge({
  type: 'n8n-nodes-base.merge',
  version: 3.2,
  config: {
    name: 'Merge by ID',
    parameters: {
      mode: 'combine',
      combineBy: 'combineByFields',
      fieldsToMatchString: 'id',
      joinMode: 'keepMatches',
      outputDataFrom: 'both'
    }
  }
});

// Wire each upstream branch to a specific merge input slot.
usersApi.to(mergeNode.input(0));
ordersApi.to(mergeNode.input(1));
</pattern>

<pattern title="Append items from parallel branches (append)">
const branchA = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Branch A', parameters: {} }
});

const branchB = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Branch B', parameters: {} }
});

const mergeNode = merge({
  type: 'n8n-nodes-base.merge',
  version: 3.2,
  config: {
    name: 'Append',
    parameters: { mode: 'append', numberInputs: 2 }
  }
});

branchA.to(mergeNode.input(0));
branchB.to(mergeNode.input(1));
</pattern>

<pattern title="Three or more inputs with SQL (combineBySql)">
const mergeNode = merge({
  type: 'n8n-nodes-base.merge',
  version: 3.2,
  config: {
    name: 'SQL Merge',
    parameters: {
      mode: 'combineBySql',
      numberInputs: 3,
      query: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.id = input2.userId LEFT JOIN input3 ON input1.id = input3.userId'
    }
  }
});

input1Node.to(mergeNode.input(0));
input2Node.to(mergeNode.input(1));
input3Node.to(mergeNode.input(2));
</pattern>
</patterns>`,
			},
		],
	},
	inputs: `={{(${configuredInputs})($parameter)}}`,
	outputs: [NodeConnectionTypes.Main],
	// If mode is chooseBranch data from both branches is required
	// to continue, else data from any input suffices
	requiredInputs: '={{ $parameter["mode"] === "chooseBranch" ? [0, 1] : 1 }}',
	properties: [...mode.description],
};
