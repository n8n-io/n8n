import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type SyncroMspMap = {
	customer: 'getAll';
	ticket: 'getAll';
};

export type SyncroMsp = AllEntities<SyncroMspMap>;

export type SyncroMspMapCustomer = Entity<SyncroMspMap, 'customer'>;
export type SyncroMspMapTicket = Entity<SyncroMspMap, 'ticket'>;

export type CustomerProperties = PropertiesOf<SyncroMspMapCustomer>;
export type TicketProperties = PropertiesOf<SyncroMspMapTicket>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
