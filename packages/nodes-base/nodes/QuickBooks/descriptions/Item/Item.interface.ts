import {
	MetaData,
} from '../Shared.interface';

export interface Item {
	Active: boolean;
	FullyQualifiedName: string;
	Id: string; // system-defined
	MetaData: MetaData; // system-defined
	Name: string;
	SyncToken: string; // system-defined
	Type: string;
}
