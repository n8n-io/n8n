import { UnrecognizedNodeTypeError } from 'n8n-core';
// The node sources predate strict mode or use path aliases, so all nodes come from dist.
import { If } from 'n8n-nodes-base/dist/nodes/If/If.node';
import { ManualTrigger } from 'n8n-nodes-base/dist/nodes/ManualTrigger/ManualTrigger.node';
import { Merge } from 'n8n-nodes-base/dist/nodes/Merge/Merge.node';
import { NoOp } from 'n8n-nodes-base/dist/nodes/NoOp/NoOp.node';
import { Set as SetNode } from 'n8n-nodes-base/dist/nodes/Set/Set.node';
import { SplitOut } from 'n8n-nodes-base/dist/nodes/Transform/SplitOut/SplitOut.node';
import type { IDataObject, INodeType, INodeTypes, IVersionedNodeType } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { catalogNodeTypes } from '../grammar/catalog';

const registry = new Map<string, INodeType | IVersionedNodeType>([
	['n8n-nodes-base.manualTrigger', new ManualTrigger()],
	['n8n-nodes-base.set', new SetNode()],
	['n8n-nodes-base.if', new If()],
	['n8n-nodes-base.merge', new Merge()],
	['n8n-nodes-base.splitOut', new SplitOut()],
	['n8n-nodes-base.noOp', new NoOp()],
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
