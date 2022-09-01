import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type SyncroMspMap = {
	contact: 'create'|'delete'|'get'|'getAll'|'update';
	customer: 'create'|'delete'|'get'|'getAll'|'update';
	rmm: 'create'|'delete'|'get'|'getAll'|'mute' ;
	ticket: 'create'|'delete'|'get'|'getAll'|'update';
};

export type SyncroMsp = AllEntities<SyncroMspMap>;

export type SyncroMspMapContact = Entity<SyncroMspMap, 'contact'>;
export type SyncroMspMapCustomer = Entity<SyncroMspMap, 'customer'>;
export type SyncroMspMapRmm = Entity<SyncroMspMap, 'rmm'>;
export type SyncroMspMapTicket = Entity<SyncroMspMap, 'ticket'>;

export type ContactProperties = PropertiesOf<SyncroMspMapContact>;
export type CustomerProperties = PropertiesOf<SyncroMspMapCustomer>;
export type RmmProperties = PropertiesOf<SyncroMspMapRmm>;
export type TicketProperties = PropertiesOf<SyncroMspMapTicket>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
