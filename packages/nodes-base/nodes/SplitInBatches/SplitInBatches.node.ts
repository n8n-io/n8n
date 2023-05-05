import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SplitInBatchesV1 } from './v1/SplitInBatchesV1.node';
import { SplitInBatchesV2 } from './v2/SplitInBatchesV2.node';

export class SplitInBatches extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Split In Batches',
			name: 'splitInBatches',
			icon: 'fa:th-large',
			group: ['organization'],
			description: 'Split data into batches and iterate over each batch',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SplitInBatchesV1(),
			2: new SplitInBatchesV2(),
		};

		super(nodeVersions, baseDescription);
	}
}
