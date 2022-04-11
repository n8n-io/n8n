import {buildOptionWithUri,} from './helpers';
import {IDataObject} from 'n8n-workflow';
import {GllueAPIIssueResponse} from './interfaces';

// tslint:disable-next-line:no-any
export type N8nRequest = (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;

export class Hasura {
	apiHost = 'http://localhost:8083/api/rest';
	resource = 'default-resource';
	action = 'default-action';
	request: N8nRequest;

	constructor(request: N8nRequest) {
		this.request = request;
	}

	getUrl(id?: string) {
		const normalUri = `${this.apiHost}/${this.resource}/${this.action}`;
		const idUri = `${this.apiHost}/${this.resource}/${id}/${this.action}`;
		return id ? idUri : normalUri;
	}

	async post(payload: IDataObject) {
		const uri = this.getUrl(payload.id as string);
		const options = buildOptionWithUri(uri, 'POST', payload);
		return await this.request(options);
	}

	async get(id?: string){
		const uri = this.getUrl(id);
		const options = buildOptionWithUri(uri, 'GET');
		const data = await this.request(options);
		return data.email_notification[0];
	}
}


export function isResponseIssue(data: GllueAPIIssueResponse) {
		return 'status' in data && !data.status;
}
