import type { IDataObject, IExecuteFunctions, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { slackApiRequest } from './GenericFunctions';

const USER_ID_TYPE: 'user' = 'user';
const EMAIL_MODE = 'email';

export async function resolveTargetForEmailIfNeeded(
	context: IExecuteFunctions,
	itemIndex: number,
	idType: 'user' | 'channel',
	currentTarget: string,
): Promise<string> {
	if (idType !== USER_ID_TYPE) {
		return currentTarget;
	}

	const userParam = context.getNodeParameter('user', itemIndex) as
		| INodeParameterResourceLocator
		| IDataObject;

	const mode = (userParam as IDataObject).mode as string | undefined;

	if (mode !== EMAIL_MODE) {
		return currentTarget;
	}

	const email = (userParam as INodeParameterResourceLocator).value?.toString().trim();

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

	const userId = (response.user?.id as string | undefined) ?? undefined;

	if (!userId) {
		throw new NodeOperationError(context.getNode(), `No Slack user found for email "${email}".`);
	}

	return userId;
}
