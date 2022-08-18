import { IDataObject } from 'n8n-workflow';

export interface IIncident {
	assignments?: IDataObject[];
	body?: IDataObject;
	conference_bridge?: IDataObject;
	escalation_level?: number;
	escalation_policy?: IDataObject;
	incident_key?: string;
	priority?: IDataObject;
	resolution?: string;
	status?: string;
	service?: IDataObject;
	title?: string;
	type?: string;
	urgency?: string;
}
