import { IDataObject } from 'n8n-workflow';

export type FreshserviceCredentials = {
	apiKey: string;
	domain: string;
};

export type LoadedResource = {
	id: string;
	name: string;
};

export type LoadedUser = {
	active: boolean;
	id: string;
	first_name: string;
	last_name?: string;
};

export type RolesParameter = IDataObject & {
	roleProperties: Array<{
		role: number;
		assignment_scope: 'entire_helpdesk' | 'member_groups' | 'specified_groups' | 'assigned_items';
		groups?: number[];
	}>
};

export type AddressFixedCollection = {
	address?: {
		addressFields: object
	}
}
