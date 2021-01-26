import {
	AltBillAddr,
	MetaData,
	PrimaryEmailAddr,
	PrimaryPhone
} from '../Shared/Shared.interface';

export interface Vendor {
	AcctNum: string;
	Active: boolean;
	Balance: number;
	BillAddr: AltBillAddr;
	CompanyName: string;
	DisplayName: string; // required
	FamilyName: string;
	GivenName: string;
	Id: string; // system-defined
	MetaData: MetaData; // system-defined
	PrimaryEmailAddr: PrimaryEmailAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	SyncToken: string; // system-defined
	Vendor1099: boolean;
	WebAddr: {
		URI: string;
	};
}
