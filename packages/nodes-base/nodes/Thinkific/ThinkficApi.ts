import { OptionsWithUri } from 'request';
import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export interface ThinkficCredentials {
	url: string;
	token: string;
	subdomin: string;
}

export class ThinkficApi {
	private credentials: ThinkficCredentials;
	private executeFunctions: IExecuteFunctions;


	constructor(executeFunctions: IExecuteFunctions) {
		const credentials = executeFunctions.getCredentials('thinkficApi');

		this.executeFunctions = executeFunctions;

		if (credentials === undefined) {
			throw new NodeOperationError(this.executeFunctions.getNode(), 'No credentials got returned!');
		}

		this.credentials = credentials as unknown as ThinkficCredentials;
	}


	protected async request(method: string, endpoint: string, body: IDataObject, query: object) {

		const options: OptionsWithUri = {
			headers: {
				'user-agent': 'n8n',
				'X-Auth-API-Key	': this.credentials.token,
				'X-Auth-Subdomain': this.credentials.subdomin,
			},
			rejectUnauthorized: false,
			method,
			qs: query,
			uri: this.credentials.url + endpoint,
			body,
			json: true,
		};

		try {
			return await this.executeFunctions.helpers.request!(options);
		} catch (error) {
			throw new NodeApiError(this.executeFunctions.getNode(), error);
		}
	}


	executeJob(jobId: string, args: IDataObject[]): Promise<IDataObject> {

		let params = '';

		if(args) {
			for(const arg of args) {
				params += '-' + arg.name + ' ' + arg.value + ' ';
			}
		}

		const body = {
			argString: params,
		};

		return this.request('POST', `/api/14/job/${jobId}/run`, body, {});
	}

	getJobMetadata(jobId: string): Promise<IDataObject> {
		return this.request('GET', `/api/18/job/${jobId}/info`, {}, {});
	}

}
