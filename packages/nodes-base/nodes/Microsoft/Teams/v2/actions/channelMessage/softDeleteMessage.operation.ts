import type { IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	messageActionDisplayOptions,
	messageActionProperties,
	runMessageAction,
} from './messageActions';

export const description = updateDisplayOptions(
	messageActionDisplayOptions('softDeleteMessage'),
	messageActionProperties('The ID of the message to delete'),
);

export async function execute(this: IExecuteFunctions, i: number) {
	return await runMessageAction.call(this, i, 'softDelete');
}
