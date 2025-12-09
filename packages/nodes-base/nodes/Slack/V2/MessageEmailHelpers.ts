import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { slackApiRequest } from './GenericFunctions';

const USER_ID_TYPE: 'user' = 'user';
const EMAIL_MODE = 'email';

interface SlackUserLookupResponse {
	user?: {
		id?: unknown;
	};
}

interface UserEmailLocator {
	mode: typeof EMAIL_MODE;
	value: unknown;
}

function isUserEmailLocator(param: unknown): param is UserEmailLocator {
	if (typeof param !== 'object' || param === null) return false;

	const candidate = param as { mode?: unknown; value?: unknown };

	return candidate.mode === EMAIL_MODE && typeof candidate.value !== 'undefined';
}

function getUserIdFromLookupResponse(response: unknown): string | undefined {
	if (typeof response !== 'object' || response === null) {
		return undefined;
	}

	const typedResponse = response as SlackUserLookupResponse;
	const userId = typedResponse.user?.id;

	return typeof userId === 'string' ? userId : undefined;
}

export async function resolveTargetForEmailIfNeeded(
	context: IExecuteFunctions,
	itemIndex: number,
	idType: 'user' | 'channel',
	currentTarget: string,
): Promise<string> {
	if (idType !== USER_ID_TYPE) {
		return currentTarget;
	}

	const userParam = context.getNodeParameter('user', itemIndex);

	if (!isUserEmailLocator(userParam)) {
		return currentTarget;
	}

	const email = String(userParam.value).trim();

	if (!email) {
		throw new NodeOperationError(
			context.getNode(),
			'Email is required when using "By Email" mode for User.',
		);
	}

	const response = await slackApiRequest.call(
		context,
		'GET',
		'/users.lookupByEmail',
		{},
		{ email },
	);

	const userId = getUserIdFromLookupResponse(response);

	if (!userId) {
		throw new NodeOperationError(context.getNode(), `No Slack user found for email "${email}".`);
	}

	return userId;
}
