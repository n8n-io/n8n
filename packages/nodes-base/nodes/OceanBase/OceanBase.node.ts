import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { OceanBaseMySQLV1 } from './v1/OceanBaseMysqlV1.node';
import { OceanBaseMySQLV2 } from './v2/OceanBaseMySqlV2.node';

export class OceanBaseMySQL extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'OceanBase MySQL',
			name: 'oceanBaseMySQL',
			icon: 'file:oceanbase.svg',
			group: ['input'],
			defaultVersion: 2.4,
			description: 'Get, add and update data in OceanBase MySQL',
			parameterPane: 'wide',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new OceanBaseMySQLV1(baseDescription),
			2: new OceanBaseMySQLV2(baseDescription),
			2.1: new OceanBaseMySQLV2(baseDescription),
			2.2: new OceanBaseMySQLV2(baseDescription),
			2.3: new OceanBaseMySQLV2(baseDescription),
			2.4: new OceanBaseMySQLV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
