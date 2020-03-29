import { IDataObject } from 'n8n-workflow';

export interface ICustomer {
	address?: IDataObject;
	age?: string;
	background?: string;
	chats?: IDataObject[];
	emails?: IDataObject[];
	firstName?: string;
	gender?: string;
	jobTitle?: string;
	lastName?: string;
	location?: string;
	organization?: string;
	phones?: IDataObject[];
	photoUrl?: string;
	properties?: IDataObject;
	socialProfiles?: IDataObject[];
	websites?: IDataObject[];
}
