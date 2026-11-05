import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { type UserTargetMessages, validateUserTargetId } from '../../../../GenericFunctions';
import { optionalText, readTextParameter } from '../../helpers/parameters';

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

export const RECIPIENT_NOT_FOUND = {
	message: 'The recipient was not found',
	description:
		'Select the user from the list, or check that the user ID or user principal name is correct and that the user exists in this Microsoft 365 tenant.',
};

export function recipientPath(this: IExecuteFunctions, i: number): string {
	const recipient = readTextParameter.call(this, 'recipientId', i, true);
	validateUserTargetId(recipient, this.getNode(), RECIPIENT_MESSAGES);
	return `/v1.0/users/${encodeURIComponent(recipient)}/teamwork/sendActivityNotification`;
}

function isTeamsLink(value: string): boolean {
	if (!URL.canParse(value)) return false;
	const url = new URL(value);
	return url.protocol === 'https:' && TEAMS_HOST.test(url.hostname);
}

export function topicLink(this: IExecuteFunctions, i: number): string {
	const link = optionalText.call(this, this.getNodeParameter('topicLink', i), 'Topic Link');
	if (!link) {
		throw new NodeOperationError(this.getNode(), 'The Topic Link is required', {
			description: `Enter a Microsoft Teams link that opens when the user selects the notification, for example ${TEAMS_LINK_EXAMPLE}`,
		});
	}
	if (!isTeamsLink(link)) {
		throw new NodeOperationError(this.getNode(), 'The Topic Link must be a Microsoft Teams link', {
			description: `Use an https link on a Microsoft Teams domain, for example ${TEAMS_LINK_EXAMPLE}`,
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
		});
	}
	throw new NodeOperationError(this.getNode(), 'The Chain ID must be a whole number of 0 or more', {
		description: "Check that the 'Chain ID' option is a whole number",
	});
}
