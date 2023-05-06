import type { DateTime } from 'luxon';
import type { INodeCredentials } from './Interfaces';

// ===============================
// General Enums And Interfaces
// ===============================

export const enum EventMessageTypeNames {
	generic = '$$EventMessage',
	audit = '$$EventMessageAudit',
	confirm = '$$EventMessageConfirm',
	workflow = '$$EventMessageWorkflow',
	node = '$$EventMessageNode',
}

export const enum MessageEventBusDestinationTypeNames {
	abstract = '$$AbstractMessageEventBusDestination',
	webhook = '$$MessageEventBusDestinationWebhook',
	sentry = '$$MessageEventBusDestinationSentry',
	syslog = '$$MessageEventBusDestinationSyslog',
}

// ===============================
// Event Message Interfaces
// ===============================

export interface IAbstractEventMessage {
	__type: EventMessageTypeNames;

	id: string;

	ts: DateTime;

	eventName: string;

	message: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	payload: any;
}

// ===============================
// Event Destination Interfaces
// ===============================

export interface MessageEventBusDestinationOptions {
	__type?: MessageEventBusDestinationTypeNames;
	id?: string;
	label?: string;
	enabled?: boolean;
	subscribedEvents?: string[];
	credentials?: INodeCredentials;
	anonymizeAuditMessages?: boolean;
}

export interface MessageEventBusDestinationWebhookParameterItem {
	parameters: Array<{
		name: string;
		value: string | number | boolean | null | undefined;
	}>;
}

export interface MessageEventBusDestinationWebhookParameterOptions {
	batch?: {
		batchSize?: number;
		batchInterval?: number;
	};
	allowUnauthorizedCerts?: boolean;
	queryParameterArrays?: 'indices' | 'brackets' | 'repeat';
	redirect?: {
		followRedirects?: boolean;
		maxRedirects?: number;
	};
	response?: {
		response?: {
			fullResponse?: boolean;
			neverError?: boolean;
			responseFormat?: string;
			outputPropertyName?: string;
		};
	};
	proxy?: {
		protocol: 'https' | 'http';
		host: string;
		port: number;
	};
	timeout?: number;
}

export interface MessageEventBusDestinationWebhookOptions
	extends MessageEventBusDestinationOptions {
	url: string;
	responseCodeMustMatch?: boolean;
	expectedStatusCode?: number;
	method?: string;
	authentication?: 'predefinedCredentialType' | 'genericCredentialType' | 'none';
	sendQuery?: boolean;
	sendHeaders?: boolean;
	genericAuthType?: string;
	nodeCredentialType?: string;
	specifyHeaders?: string;
	specifyQuery?: string;
	jsonQuery?: string;
	jsonHeaders?: string;
	headerParameters?: MessageEventBusDestinationWebhookParameterItem;
	queryParameters?: MessageEventBusDestinationWebhookParameterItem;
	sendPayload?: boolean;
	options?: MessageEventBusDestinationWebhookParameterOptions;
}

export interface MessageEventBusDestinationSyslogOptions extends MessageEventBusDestinationOptions {
	expectedStatusCode?: number;
	host: string;
	port?: number;
	protocol?: 'udp' | 'tcp';
	facility?: number;
	app_name?: string;
	eol?: string;
}

export interface MessageEventBusDestinationSentryOptions extends MessageEventBusDestinationOptions {
	dsn: string;
	tracesSampleRate?: number;
	sendPayload?: boolean;
}

// ==================================
// Event Destination Default Settings
// ==================================

export const defaultMessageEventBusDestinationOptions: MessageEventBusDestinationOptions = {
	__type: MessageEventBusDestinationTypeNames.abstract,
	id: '',
	label: 'New Event Destination',
	enabled: true,
	subscribedEvents: ['n8n.audit', 'n8n.workflow'],
	credentials: {},
	anonymizeAuditMessages: false,
};

export const defaultMessageEventBusDestinationSyslogOptions: MessageEventBusDestinationSyslogOptions =
	{
		...defaultMessageEventBusDestinationOptions,
		__type: MessageEventBusDestinationTypeNames.syslog,
		label: 'Syslog Server',
		expectedStatusCode: 200,
		host: '127.0.0.1',
		port: 514,
		protocol: 'tcp',
		facility: 16,
		app_name: 'n8n',
		eol: '\n',
	};

export const defaultMessageEventBusDestinationWebhookOptions: MessageEventBusDestinationWebhookOptions =
	{
		...defaultMessageEventBusDestinationOptions,
		__type: MessageEventBusDestinationTypeNames.webhook,
		credentials: {},
		label: 'Webhook Endpoint',
		expectedStatusCode: 200,
		responseCodeMustMatch: false,
		url: 'https://',
		method: 'POST',
		authentication: 'none',
		sendQuery: false,
		sendHeaders: false,
		genericAuthType: '',
		nodeCredentialType: '',
		specifyHeaders: '',
		specifyQuery: '',
		jsonQuery: '',
		jsonHeaders: '',
		headerParameters: { parameters: [] },
		queryParameters: { parameters: [] },
		sendPayload: true,
		options: {},
	};

export const defaultMessageEventBusDestinationSentryOptions: MessageEventBusDestinationSentryOptions =
	{
		...defaultMessageEventBusDestinationOptions,
		__type: MessageEventBusDestinationTypeNames.sentry,
		label: 'Sentry DSN',
		dsn: 'https://',
		sendPayload: true,
	};
