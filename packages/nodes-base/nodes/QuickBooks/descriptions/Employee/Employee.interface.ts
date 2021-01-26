import {
	AltBillAddr,
	MetaData,
	PrimaryPhone,
} from '../Shared/Shared.interface';

export interface Employee {
	Active: boolean;
	BillableTime: boolean;
	DisplayName: string; // required
	FamilyName: string;
	GivenName: string;
	Id: string; // system-defined
	MetaData: MetaData; // system-defined
	PrimaryAddr: AltBillAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	SSN: string;
	SyncToken: string; // system-defined
}
