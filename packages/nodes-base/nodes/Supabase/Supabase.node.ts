import { VersionedNodeType } from 'n8n-workflow';
import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';

import { SupabaseV1 } from './v1/SupabaseV1.node';
import { SupabaseV2 } from './v2/SupabaseV2.node';

export class Supabase extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Supabase',
			name: 'supabase',
			icon: 'file:supabase.svg',
			group: ['input'],
			description: 'Add, get, delete and update data in a table',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SupabaseV1(baseDescription),
			2: new SupabaseV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
