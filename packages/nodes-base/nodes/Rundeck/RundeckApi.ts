import type {
	IDataObject,
	IExecuteFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';

export interface RundeckCredentials {
	url: string;
	token: string;
}

export class RundeckApi {
	private credentials?: RundeckCredentials;

	private executeFunctions: IExecuteFunctions;

	constructor(executeFunctions: IExecuteFunctions) {
		this.executeFunctions = executeFunctions;
	}

	protected async request(
		method: IHttpRequestMethods,
		endpoint: RequestPath,
		body: IDataObject,
		query: IDataObject,
	) {
		const credentialType = 'rundeckApi';

		const options: WithRequestTarget<IRequestOptions, 'uri'> = {
			rejectUnauthorized: false,
			method,
			qs: query,
			uri: requestUrl`${this.credentials?.url}${endpoint}`,
			body,
			json: true,
		};

		try {
			return await this.executeFunctions.helpers.requestWithAuthentication.call(
				this.executeFunctions,
				credentialType,
				options,
			);
		} catch (error) {
			throw new NodeApiError(this.executeFunctions.getNode(), error as JsonObject);
		}
	}

	async init() {
		const credentials = await this.executeFunctions.getCredentials('rundeckApi');

		if (credentials === undefined) {
			throw new NodeOperationError(this.executeFunctions.getNode(), 'No credentials got returned!');
		}

		this.credentials = credentials as unknown as RundeckCredentials;
	}

	async executeJob(jobId: string, args: IDataObject[], filter?: string): Promise<IDataObject> {
		let params = '';

		if (args) {
			for (const arg of args) {
				params += '-' + (arg.name as string) + ' ' + (arg.value as string) + ' ';
			}
		}

		const body = {
			argString: params,
		};

		const query: IDataObject = {};
		if (filter) {
			query.filter = filter;
		}

		return await this.request('POST', requestPath`/api/14/job/${jobId}/run`, body, query);
	}

	async getJobMetadata(jobId: string): Promise<IDataObject> {
		return await this.request('GET', requestPath`/api/18/job/${jobId}/info`, {}, {});
	}
}
