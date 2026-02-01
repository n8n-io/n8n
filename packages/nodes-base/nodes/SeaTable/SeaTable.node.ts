import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SeaTableV1 } from './v1/SeaTableV1.node';
import { SeaTableV2 } from './v2/SeaTableV2.node';

export class SeaTable extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'SeaTable',
			name: 'seaTable',
			icon: 'file:seaTable.svg',
			group: ['output'],
			subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
			description: 'Read, update, write and delete data from SeaTable',
			defaultVersion: 2,
			usableAsTool: true,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SeaTableV1(baseDescription),
			2: new SeaTableV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
