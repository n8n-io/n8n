import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SplitInBatchesV1 } from './v1/SplitInBatchesV1.node';

export class SplitInBatches extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Split In Batches',
			name: 'splitInBatches',
			icon: 'fa:th-large',
			group: ['organization'],
			description: 'Split data into batches and iterate over each batch',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SplitInBatchesV1(),
			2: new SplitInBatchesV1(),
		};

		super(nodeVersions, baseDescription);
	}
}
