import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const SECURITY_SCORECARD_API_BASE_URL = 'https://api.securityscorecard.io';
const SECURITY_SCORECARD_REPORT_FILES_PATH = '/reports/files/';
const URL_PROTOCOL_PATTERN = /^[a-z][a-z\d+\-.]*:/i;

export function resolveReportDownloadUrl(reportUrlOrPath: string): string {
	const trimmed = reportUrlOrPath.trim();

	if (!trimmed) {
		throw new Error('Report URL is required');
	}

	const reportFilePath = trimmed.replace(/^\/+/, '').replace(/^reports\/files\/?/, '');
	const resolvedUrl = new URL(
		URL_PROTOCOL_PATTERN.test(trimmed) ? trimmed : reportFilePath,
		`${SECURITY_SCORECARD_API_BASE_URL}${SECURITY_SCORECARD_REPORT_FILES_PATH}`,
	);

	if (
		resolvedUrl.origin !== SECURITY_SCORECARD_API_BASE_URL ||
		!resolvedUrl.pathname.startsWith(SECURITY_SCORECARD_REPORT_FILES_PATH)
	) {
		throw new Error('Report URL must point to SecurityScorecard report files');
	}

	return resolvedUrl.toString();
}

export async function scorecardApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('securityScorecardApi');

	const headerWithAuthentication = { Authorization: `Token ${credentials.apiKey}` };

	let options: IRequestOptions = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://api.securityscorecard.io/${resource}`,
		body,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		options = Object.assign({}, options, option);
	}

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function simplify(data: IDataObject[]) {
	const results = [];
	for (const record of data) {
		const newRecord: IDataObject = { date: record.date };
		for (const factor of record.factors as IDataObject[]) {
			newRecord[factor.name as string] = factor.score;
		}
		results.push(newRecord);
	}
	return results;
}
