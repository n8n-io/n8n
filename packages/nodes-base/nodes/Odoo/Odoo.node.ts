import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { OdooV1 } from './v1/OdooV1.node';
import { OdooV2 } from './v2/OdooV2.node';

export class Odoo extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Odoo',
			name: 'odoo',
			icon: 'file:odoo.svg',
			group: ['transform'],
			defaultVersion: 2,
			description: 'Consume Odoo API',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new OdooV1(baseDescription),
			2: new OdooV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
