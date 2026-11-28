import { UnrecognizedNodeTypeError } from 'n8n-core';
// The node sources predate strict mode or use path aliases, so all nodes come from dist.
import { Code } from 'n8n-nodes-base/dist/nodes/Code/Code.node';
import { ExecuteWorkflow } from 'n8n-nodes-base/dist/nodes/ExecuteWorkflow/ExecuteWorkflow/ExecuteWorkflow.node';
import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/dist/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';
import { Filter } from 'n8n-nodes-base/dist/nodes/Filter/Filter.node';
import { If } from 'n8n-nodes-base/dist/nodes/If/If.node';
import { ManualTrigger } from 'n8n-nodes-base/dist/nodes/ManualTrigger/ManualTrigger.node';
import { Merge } from 'n8n-nodes-base/dist/nodes/Merge/Merge.node';
import { NoOp } from 'n8n-nodes-base/dist/nodes/NoOp/NoOp.node';
import { Set as SetNode } from 'n8n-nodes-base/dist/nodes/Set/Set.node';
import { SplitInBatches } from 'n8n-nodes-base/dist/nodes/SplitInBatches/SplitInBatches.node';
import { Switch } from 'n8n-nodes-base/dist/nodes/Switch/Switch.node';
import { Aggregate } from 'n8n-nodes-base/dist/nodes/Transform/Aggregate/Aggregate.node';
import { Limit } from 'n8n-nodes-base/dist/nodes/Transform/Limit/Limit.node';
import { Sort } from 'n8n-nodes-base/dist/nodes/Transform/Sort/Sort.node';
import { SplitOut } from 'n8n-nodes-base/dist/nodes/Transform/SplitOut/SplitOut.node';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { catalogNodeTypes } from '../grammar/catalog';

const registry = new Map<string, INodeType | IVersionedNodeType>([
	['n8n-nodes-base.manualTrigger', new ManualTrigger()],
	['n8n-nodes-base.executeWorkflowTrigger', new ExecuteWorkflowTrigger()],
	['n8n-nodes-base.set', new SetNode()],
	['n8n-nodes-base.if', new If()],
	['n8n-nodes-base.switch', new Switch()],
	['n8n-nodes-base.merge', new Merge()],
	['n8n-nodes-base.splitOut', new SplitOut()],
	['n8n-nodes-base.filter', new Filter()],
	['n8n-nodes-base.aggregate', new Aggregate()],
	['n8n-nodes-base.sort', new Sort()],
	['n8n-nodes-base.limit', new Limit()],
	['n8n-nodes-base.noOp', new NoOp()],
	['n8n-nodes-base.splitInBatches', new SplitInBatches()],
	['n8n-nodes-base.code', new Code()],
	['n8n-nodes-base.executeWorkflow', new ExecuteWorkflow()],
]);

for (const { type } of catalogNodeTypes()) {
	if (!registry.has(type))
		throw new Error(`The node registry has no node for catalog type ${type}`);
}

/** One node registry for both runners, so a difference comes from the engine and not from the setup. */
export const parityNodeTypes: INodeTypes = {
	getByName: (type) => {
		const found = registry.get(type);
		if (!found) throw new UnrecognizedNodeTypeError('n8n-nodes-base', type);
		return found;
	},
	getByNameAndVersion: (type, version) => {
		const found = registry.get(type);
		if (!found) throw new UnrecognizedNodeTypeError('n8n-nodes-base', type);
		return NodeHelpers.getVersionedNodeType(found, version);
	},
	getKnownTypes: (): IDataObject => ({}),
};
