import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import sortBy from 'lodash.sortby';
import axios from 'axios';
import type { AxiosError } from 'axios';

import type { OptionsWithUri } from 'request';
import { messagingServiceValue } from './descriptions';
import type { MessagingService, MessagingServicesResponse } from './types';

/**
 * Make an API request to Twilio
 *
 */
export async function twilioApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const credentials = (await this.getCredentials('twilioApi')) as {
		accountSid: string;
		authType: 'authToken' | 'apiKey';
		authToken: string;
		apiKeySid: string;
		apiKeySecret: string;
	};

	if (query === undefined) {
		query = {};
	}

	const options: OptionsWithUri = {
		method,
		form: body,
		qs: query,
		uri: `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}${endpoint}`,
		json: true,
	};

	return this.helpers.requestWithAuthentication.call(this, 'twilioApi', options);
}

const XML_CHAR_MAP: { [key: string]: string } = {
	'<': '&lt;',
	'>': '&gt;',
	'&': '&amp;',
	'"': '&quot;',
	"'": '&apos;',
};

export function escapeXml(str: string) {
	return str.replace(/[<>&"']/g, (ch: string) => {
		return XML_CHAR_MAP[ch];
	});
}

export const findOptedOutChat = async (phone: string) => {
	const baseURL = process.env.DCS_NOCODB_BASE_URL;
	if (!baseURL) {
		throw new Error('No base URL configured!');
	}
	const route = '/api/v1/db/data/v1/CustomBackend/Chat';
	const where = `where=(Phone,eq,${phone})~and(~not(State,in,Soft_Opt_Out,Hard_Opt_Out))&limit=1&fields=Id`;
	const fields = 'fields=Id';
	const limit = 'limit=1';
	const url = `${baseURL}/${route}?${where}&${fields}&${limit}`;

	try {
		const response = await axios.get<{ list: any[] }>(url, {
			headers: {
				'xc-token': process.env.DCS_NOCODB_API_TOKEN,
			},
		});
		const list = response.data.list;
		if (list.length) {
			return list[0];
		}
		return null;
	} catch (e) {
		const error = e as AxiosError;
		throw new Error(`Failed to check opted out chats. ${error.message}. ${error.stack}`);
	}
};

export async function findAllMessagingServices(
	this: ILoadOptionsFunctions,
): Promise<MessagingService[]> {
	const credentials = (await this.getCredentials('twilioApi')) as {
		accountSid: string;
		authToken: string;
	};

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const { accountSid, authToken } = credentials;

	const url = 'https://messaging.twilio.com/v1/Services';
	const params = {
		PageSize: 1000,
	};
	const auth = {
		username: accountSid,
		password: authToken,
	};

	try {
		const response = await axios.get<MessagingServicesResponse>(url, {
			params,
			auth,
		});
		return response.data.services;
	} catch (e) {
		const error = e as AxiosError;
		throw new Error(`Failed to fetch messaging services. ${error.message}. ${error.stack}`);
	}
}

export function transformFromDataToSendSMS({
	from,
	messagingService,
	number,
}: {
	from: string;
	messagingService: string;
	number: string;
}) {
	if (from === messagingServiceValue) {
		return messagingService;
	}
	return number;
}

export function transformToDataToSendSMS({
	to,
	fallbackPhone,
	useFallbackPhone,
}: {
	to: string;
	fallbackPhone: string;
	useFallbackPhone: boolean;
}) {
	if (useFallbackPhone) {
		return fallbackPhone;
	}
	return to;
}

export function transformDataToSendSMS(
	{
		from,
		to,
		message,
		toWhatsapp,
		messagingService,
		number,
		mediaUrls,
		useFallbackPhone,
		fallbackPhone,
	}: {
		from: string;
		to: string;
		message: string;
		toWhatsapp: boolean;
		messagingService: string;
		fallbackPhone: string;
		number: string;
		mediaUrls: string[];
		useFallbackPhone: boolean;
	},
	body: IDataObject,
) {
	body.From = transformFromDataToSendSMS({
		from,
		messagingService,
		number,
	});
	body.To = transformToDataToSendSMS({
		to,
		fallbackPhone,
		useFallbackPhone,
	});
	body.Body = message;
	body.MediaUrl = mediaUrls;
	body.mediaUrl = mediaUrls;
	body.Media_Url = mediaUrls;

	if (toWhatsapp) {
		body.From = `whatsapp:${body.From}`;
		body.To = `whatsapp:${body.To}`;
	}
	return body;
}

/**
 * Retrieve all messages services, sorted alphabetically.
 */
export async function getMessagingServices(this: ILoadOptionsFunctions) {
	const messagingServices = await findAllMessagingServices.call(this);

	const options = messagingServices.map(({ sid, friendly_name }) => ({
		name: friendly_name,
		value: sid,
	}));

	return sortBy(options, (o) => o.name);
}
