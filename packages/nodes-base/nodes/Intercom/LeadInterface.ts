import { IDataObject } from "n8n-workflow";

export interface ILeadCompany {
	company_id?: string;
}

export interface ILead {
	user_id?: string;
	id?: string;
	email: string;
	phone?: string;
	name?: string;
	custom_attributes?: IDataObject;
	companies?: ILeadCompany[];
	last_request_at?: number;
	unsubscribed_from_emails?: boolean;
	update_last_request_at?: boolean;
}
