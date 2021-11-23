import {
	AllEntities,
	Entity,
	PropertiesOf,
} from 'n8n-workflow';

type SyncroMspMap = {
	customer: 'getAll';
};

export type SyncroMsp = AllEntities<SyncroMspMap>;

export type SyncroMspMapCustomer = Entity<SyncroMspMap, 'customer'>;

export type CustomerProperties = PropertiesOf<SyncroMspMapCustomer>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
