import {
	AltBillAddr,
	MetaData,
	PrimaryPhone,
} from '../Shared.interface';

export interface Employee {
	Active: boolean;
	BillableTime: boolean;
	DisplayName: string;
	domain: 'QBO';
	FamilyName: string;
	GivenName: string;
	Id: string;
	MetaData: MetaData;
	PrimaryAddr: AltBillAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	SSN: string;
	SyncToken: string;
}
