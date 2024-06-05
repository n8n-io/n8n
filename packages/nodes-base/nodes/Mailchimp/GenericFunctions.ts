import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

async function getMetadata(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	oauthTokenData: IDataObject,
) {
	const credentials = await this.getCredentials('mailchimpOAuth2Api');
	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			Authorization: `OAuth ${oauthTokenData.access_token}`,
		},
		method: 'GET',
		url: credentials.metadataUrl as string,
		json: true,
	};
	return await this.helpers.request(options);
}

export async function mailchimpApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: IHttpRequestMethods,

	body: any = {},
	qs: IDataObject = {},
	_headers?: object,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	const host = 'api.mailchimp.com/3.0';

	const options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
		},
		method,
		qs,
		body,
		url: '',
		json: true,
	};

	if (Object.keys(body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		if (authenticationMethod === 'apiKey') {
			const credentials = await this.getCredentials('mailchimpApi');
			if (!(credentials.apiKey as string).includes('-')) {
				throw new NodeOperationError(this.getNode(), 'The API key is not valid!');
			}
			const datacenter = (credentials.apiKey as string).split('-').pop();
			options.url = `https://${datacenter}.${host}${endpoint}`;
			return await this.helpers.requestWithAuthentication.call(this, 'mailchimpApi', options);
		} else {
			const credentials = await this.getCredentials('mailchimpOAuth2Api');

			const { api_endpoint } = await getMetadata.call(
				this,
				credentials.oauthTokenData as IDataObject,
			);

			options.url = `${api_endpoint}/3.0${endpoint}`;
			return await this.helpers.requestOAuth2.call(this, 'mailchimpOAuth2Api', options, {
				tokenType: 'Bearer',
			});
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function mailchimpApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: IHttpRequestMethods,
	propertyName: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 500;

	do {
		responseData = await mailchimpApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		query.offset += query.count;
	} while (responseData[propertyName] && responseData[propertyName].length !== 0);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}

export const campaignFieldsMetadata = [
	'*',
	'campaigns.id',
	'campaigns.web_id',
	'campaigns.type',
	'campaigns.create_time',
	'campaigns.archive_url',
	'campaigns.long_archive_url',
	'campaigns.status',
	'campaigns.emails_sent',
	'campaigns.send_time',
	'campaigns.content_type',
	'campaigns.needs_block_refresh',
	'campaigns.resendable',
	'campaigns.recipients',
	'campaigns.recipients.list_id',
	'campaigns.recipients.list_is_active',
	'campaigns.recipients.list_name',
	'campaigns.recipients.segment_text',
	'campaigns.recipients.recipient_count',
	'campaigns.settings',
	'campaigns.settings.subject_line',
	'campaigns.settings.preview_text',
	'campaigns.settings.title',
	'campaigns.settings.from_name',
	'campaigns.settings.reply_to',
	'campaigns.settings.use_conversation',
	'campaigns.settings.to_name',
	'campaigns.settings.folder_id',
	'campaigns.settings.authenticate',
	'campaigns.settings.auto_footer',
	'campaigns.settings.inline_css',
	'campaigns.settings.auto_tweet',
	'campaigns.settings.fb_comments',
	'campaigns.settings.timewarp',
	'campaigns.settings.template_id',
	'campaigns.settings.drag_and_drop',
	'campaigns.tracking',
	'campaigns.tracking.opens',
	'campaigns.tracking.html_clicks',
	'campaigns.tracking.text_clicks',
	'campaigns.tracking.goal_tracking',
	'campaigns.tracking.ecomm360',
	'campaigns.tracking.google_analytics',
	'campaigns.tracking.clicktale',
	'campaigns.report_summary',
	'campaigns.report_summary.opens',
	'campaigns.report_summary.unique_opens',
	'campaigns.report_summary.open_rate',
	'campaigns.report_summary.clicks',
	'campaigns.report_summary.subscriber_clicks',
	'campaigns.report_summary.click_rate',
	'campaigns.report_summary.click_rate.ecommerce',
	'campaigns.report_summary.click_rate.ecommerce.total_orders',
	'campaigns.report_summary.click_rate.ecommerce.total_spent',
	'campaigns.report_summary.click_rate.ecommerce.total_revenue',
	'campaigns.report_summary.delivery_status.enabled',
	'campaigns._links',
];
