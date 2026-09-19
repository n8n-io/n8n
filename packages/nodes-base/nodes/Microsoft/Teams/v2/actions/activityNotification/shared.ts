import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { type UserTargetMessages, validateUserTargetId } from '../../../../GenericFunctions';
import { readTextParameter } from '../../helpers/parameters';
import {
	ACTIVITY_PERMISSION_FORBIDDEN_DELEGATED,
	ACTIVITY_PERMISSION_MATCH,
	COMPANION_APP_FORBIDDEN,
	getTeamsCredentialType,
	SERVICE_PRINCIPAL_AUTH,
} from '../../transport';

const TEAMS_LINK_EXAMPLE = 'https://teams.microsoft.com/l/chat/0/0?users=someone@contoso.com';
const TEAMS_HOST =
	/^(?:[a-z0-9-]+\.)*teams\.(?:microsoft\.com|cloud\.microsoft|microsoft\.us|microsoftonline\.cn)$/;

const RECIPIENT_MESSAGES: UserTargetMessages = {
	required: {
		message: 'No recipient selected',
		description: 'Select the user from the list, or enter a user ID or user principal name.',
	},
	dotsOnly: {
		message: 'The Recipient is not valid',
		description: 'A user ID cannot consist only of dots.',
	},
	invalid: {
		message: 'The Recipient is not valid',
		description:
			'Enter a user ID or user principal name. Remove any slashes, backslashes, colons, commas, spaces, or encoded characters and try again.',
	},
};

export function recipientPath(this: IExecuteFunctions, i: number): string {
	const recipient = readTextParameter.call(this, 'recipientId', i, true);
	validateUserTargetId(recipient, this.getNode(), RECIPIENT_MESSAGES);
	return `/v1.0/users/${encodeURIComponent(recipient)}/teamwork/sendActivityNotification`;
}

function textParameter(this: IExecuteFunctions, name: string, i: number, label: string): string {
	const value = this.getNodeParameter(name, i);
	if (typeof value === 'object' && value !== null) {
		throw new NodeOperationError(this.getNode(), `The ${label} must be text`, {
			description: `Check that the '${label}' expression resolves to text`,
			itemIndex: i,
		});
	}
	return String(value ?? '').trim();
}

export function requiredText(
	this: IExecuteFunctions,
	name: string,
	i: number,
	label: string,
): string {
	const text = textParameter.call(this, name, i, label);
	if (text) return text;
	throw new NodeOperationError(this.getNode(), `The ${label} must not be empty`, {
		description: `Check that the '${label}' parameter is correctly set`,
		itemIndex: i,
	});
}

function isTeamsDeepLink(value: string): boolean {
	if (!URL.canParse(value)) return false;
	const url = new URL(value);
	return (
		url.protocol === 'https:' && TEAMS_HOST.test(url.hostname) && url.pathname.startsWith('/l/')
	);
}

export function topicLink(this: IExecuteFunctions, i: number): string {
	const link = textParameter.call(this, 'topicLink', i, 'Topic Link');
	if (!link) {
		throw new NodeOperationError(this.getNode(), 'The Topic Link is required', {
			description: `Enter a Microsoft Teams link that opens when the user selects the notification, for example ${TEAMS_LINK_EXAMPLE}`,
			itemIndex: i,
		});
	}
	if (!isTeamsDeepLink(link)) {
		throw new NodeOperationError(this.getNode(), 'The Topic Link must be a Microsoft Teams link', {
			description: `Use an https link on a Microsoft Teams domain with a path that starts with /l/, for example ${TEAMS_LINK_EXAMPLE}`,
			itemIndex: i,
		});
	}
	return link;
}

export function chainId(this: IExecuteFunctions, i: number): number | undefined {
	const raw = this.getNodeParameter('options', i, {}).chainId;
	if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
		return undefined;
	}
	const parsed = typeof raw === 'string' ? Number(raw) : raw;
	if (typeof parsed === 'number' && Number.isSafeInteger(parsed) && parsed >= 0) {
		return parsed === 0 ? undefined : parsed;
	}
	if (typeof parsed === 'number' && Number.isInteger(parsed) && parsed > Number.MAX_SAFE_INTEGER) {
		throw new NodeOperationError(this.getNode(), 'The Chain ID is too large to send exactly', {
			description: `Use a whole number up to ${Number.MAX_SAFE_INTEGER}`,
			itemIndex: i,
		});
	}
	throw new NodeOperationError(this.getNode(), 'The Chain ID must be a whole number of 0 or more', {
		description: "Check that the 'Chain ID' option is a whole number",
		itemIndex: i,
	});
}

function forbidden(
	this: IExecuteFunctions,
	copy: { message: string; description: string },
	graphText: string,
	i: number,
): NodeApiError {
	const { message, description } = copy;
	return new NodeApiError(
		this.getNode(),
		{ message: graphText },
		{ message, description, httpCode: '403', itemIndex: i },
	);
}

export function rewriteSendError(this: IExecuteFunctions, error: unknown, i: number): unknown {
	if (!(error instanceof NodeApiError)) return error;
	if (error.httpCode === '404') {
		return new NodeOperationError(this.getNode(), 'The recipient was not found', {
			description:
				'Select the user from the list, or check that the user ID or user principal name is correct and that the user exists in this Microsoft 365 tenant.',
			itemIndex: i,
		});
	}
	if (error.httpCode !== '403' || getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		return error;
	}
	const graphText = [...new Set([error.message, error.description ?? '', ...error.messages])]
		.filter(Boolean)
		.join(' ');
	if (graphText.includes(COMPANION_APP_FORBIDDEN.match)) {
		return forbidden.call(this, COMPANION_APP_FORBIDDEN, graphText, i);
	}
	if (graphText.includes(ACTIVITY_PERMISSION_MATCH)) {
		return forbidden.call(this, ACTIVITY_PERMISSION_FORBIDDEN_DELEGATED, graphText, i);
	}
	return error;
}
