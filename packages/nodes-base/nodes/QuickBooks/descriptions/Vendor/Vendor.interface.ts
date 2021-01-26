import {
	GeneralAddress,
	MetaData,
	PrimaryEmailAddr,
	PrimaryPhone
} from '../Shared/Shared.interface';

export interface Vendor {
	AcctNum: string;
	Active: boolean;
	Balance: number;
	BillAddr: GeneralAddress;
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
