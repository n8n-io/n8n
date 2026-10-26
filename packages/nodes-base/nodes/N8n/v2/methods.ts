import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { apiRequest } from '../shared/GenericFunctions';

interface ProjectRole {
	slug: string;
	displayName: string;
}

export async function getProjectRoles(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const roles: { project?: ProjectRole[] } = await apiRequest.call(this, 'GET', 'roles', {});
	return (roles.project ?? [])
		.filter((role) => role.slug !== 'project:personalOwner')
		.map((role) => ({ name: role.displayName, value: role.slug }));
}
