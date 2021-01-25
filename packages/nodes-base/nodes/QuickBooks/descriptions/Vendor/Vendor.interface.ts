import {
	AltBillAddr,
	MetaData,
	PrimaryEmailAddr,
	PrimaryPhone
} from '../Shared.interface';

export interface Vendor {
	AcctNum: string;
	Active: boolean;
	Balance: number;
	BillAddr: AltBillAddr;
	CompanyName: string;
	DisplayName: string;
	domain: 'QBO';
	FamilyName: string;
	GivenName: string;
	Id: string;
	MetaData: MetaData;
	PrimaryEmailAddr: PrimaryEmailAddr;
	PrimaryPhone: PrimaryPhone;
	PrintOnCheckName: string;
	SyncToken: '0';
	Vendor1099: boolean;
	WebAddr: {
		URI: string;
	};
}
