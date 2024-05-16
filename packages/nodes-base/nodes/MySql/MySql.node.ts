import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MySqlV1 } from './v1/MySqlV1.node';
import { MySqlV2 } from './v2/MySqlV2.node';

export class MySql extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'MySQL',
			name: 'mySql',
			icon: 'file:mysql.svg',
			group: ['input'],
			defaultVersion: 2.4,
			description: 'Get, add and update data in MySQL',
			parameterPane: 'wide',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MySqlV1(baseDescription),
			2: new MySqlV2(baseDescription),
			2.1: new MySqlV2(baseDescription),
			2.2: new MySqlV2(baseDescription),
			2.3: new MySqlV2(baseDescription),
			2.4: new MySqlV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
