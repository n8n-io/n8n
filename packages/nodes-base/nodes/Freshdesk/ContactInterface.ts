import { IDataObject } from 'n8n-workflow';

export interface ICreateContactBody {
	address?: string;
	// avatar?: object;
	company_id?: number;
	custom_fields?: IDataObject;
	description?: string;
	email?: string;
	job_title?: string;
	language?: string;
	mobile?: string;
	name?: string;
	other_companies?: string[];
	other_emails?: string[];
	phone?: string;
	tags?: string[];
	time_zone?: string;
	twitter_id?: string;
	unique_external_id?: string;
	view_all_tickets?: boolean;
}
