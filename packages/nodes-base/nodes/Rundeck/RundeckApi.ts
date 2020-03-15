import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { Api } from "./Api";
import * as https from 'https';
import { Xml } from "../Xml.node";
import { IDataObject } from "n8n-workflow";

export interface RundeckCredentials {
	url: string;
	apiVersion: number;
	token: string;
}

function acceptVersion(credentialsApiVersion: number, apiVersion: number) {
	if(apiVersion > credentialsApiVersion) {
		throw Error('This endpoint is not supported for this version!');
	}
}

export class RundeckApi extends Api {
	
	private credentials: RundeckCredentials;

	constructor (credentials: RundeckCredentials) {

		const config: AxiosRequestConfig = {
			httpsAgent: new https.Agent({
				rejectUnauthorized: false
			}),
			headers: {
				'Accept': 'application/xml',
				'user-agent': 'n8n',
				'X-Rundeck-Auth-Token': credentials.token,
			}
		};

		super(config);
		this.credentials = credentials;

	}

	executeJob(jobId: string, args: IDataObject[]): Promise<Xml> {

		acceptVersion(this.credentials.apiVersion, 12);

		let params = '';

		if(args) {
			for(const arg of args) {
				params += "-" + arg.name + " " + arg.value + " ";
			}
		}
		
		return this.post<Xml>(this.credentials.url + '/api/12/job/' + jobId + '/run?argString=' + params)
			.then((response: AxiosResponse<Xml>) => {
				const { data } = response;
				return data;
			})
			.catch((error: AxiosError) => {
				throw error;
			});
	}

}