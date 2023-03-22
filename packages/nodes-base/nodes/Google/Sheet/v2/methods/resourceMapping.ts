import type { ResourceMapperFields } from 'n8n-workflow';

export async function getMappingColumns(): Promise<ResourceMapperFields> {
	return {
		fields: [
			{
				id: 'firstName',
				displayName: 'First name',
				match: true,
				defaultMatch: true,
				required: false,
				display: true,
			},
			{
				id: 'lastName',
				displayName: 'Last name',
				match: true,
				defaultMatch: true,
				required: false,
				display: true,
			},
			{
				id: 'username',
				displayName: 'Username',
				match: true,
				defaultMatch: true,
				required: false,
				display: true,
			},
		],
	};
}
