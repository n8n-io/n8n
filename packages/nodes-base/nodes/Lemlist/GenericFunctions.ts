import { capitalCase } from 'change-case';
import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { decodePathValue, requestUrl } from 'n8n-workflow';

export const toPathValue = (version: number, value: string) =>
	version < 2.1 ? decodePathValue(value) : value;

/**
 * Make an authenticated API request to Lemlist.
 */
export async function lemlistApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {},
		method,
		uri: requestUrl`https://api.lemlist.com/api${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	return await this.helpers.requestWithAuthentication.call(this, 'lemlistApi', options);
}

/**
 * Make an authenticated API request to Lemlist and return all results.
 */
export async function lemlistApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	qs: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	qs.limit = 100;
	qs.offset = 0;
	//when using v2, the pagination is different
	if (qs.version && qs.version === 'v2') {
		qs.page = 1;
		do {
			responseData = await lemlistApiRequest.call(this, method, endpoint, {}, qs);
			returnData.push(...(responseData as IDataObject[]));
			qs.page++;
		} while (responseData.totalPage && qs.page < responseData.totalPage);
		return returnData;
	} else {
		do {
			responseData = await lemlistApiRequest.call(this, method, endpoint, {}, qs);
			returnData.push(...(responseData as IDataObject[]));
			qs.offset += qs.limit;
		} while (responseData.length !== 0);
		return returnData;
	}
}

export function getEvents() {
	const events = [
		'*',
		'contacted',
		'hooked',
		'attracted',
		'warmed',
		'interested',
		'skipped',
		'notInterested',
		'emailsSent',
		'emailsOpened',
		'emailsClicked',
		'emailsReplied',
		'emailsBounced',
		'emailsSendFailed',
		'emailsFailed',
		'emailsUnsubscribed',
		'emailsInterested',
		'emailsNotInterested',
		'opportunitiesDone',
		'aircallCreated',
		'aircallEnded',
		'aircallDone',
		'aircallInterested',
		'aircallNotInterested',
		'apiDone',
		'apiInterested',
		'apiNotInterested',
		'apiFailed',
		'linkedinVisitDone',
		'linkedinVisitFailed',
		'linkedinInviteDone',
		'linkedinInviteFailed',
		'linkedinInviteAccepted',
		'linkedinReplied',
		'linkedinSent',
		'linkedinVoiceNoteDone',
		'linkedinVoiceNoteFailed',
		'linkedinInterested',
		'linkedinNotInterested',
		'linkedinSendFailed',
		'manualInterested',
		'manualNotInterested',
		'paused',
		'resumed',
		'customDomainErrors',
		'connectionIssue',
		'sendLimitReached',
		'lemwarmPaused',
	];

	return events.map((event: string) => ({
		name: event === '*' ? '*' : capitalCase(event).replace('Linkedin', 'LinkedIn'),
		value: event,
	}));
}
