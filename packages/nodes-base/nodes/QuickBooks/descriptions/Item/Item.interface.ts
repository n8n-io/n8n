import {
	MetaData,
} from '../Shared.interface';

export interface Item {
	Active: true;
	domain: 'QBO';
	FullyQualifiedName: string;
	Id: string;
	MetaData: MetaData;
	Name: string;
	SyncToken: string;
	Type: string;
}
