import { MergeClient } from '@mergeapi/merge-node-client';
import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { type MergeCredentials } from '../utils';

export async function getMergeDevCategory(this: ILoadOptionsFunctions): Promise<string> {
	const { apiKey, accountToken } = await this.getCredentials<MergeCredentials>('mergeDevApi');
	const merge = new MergeClient({ apiKey, accountToken });
	const details = await merge.filestorage.accountDetails.retrieve();
	return details.category ?? 'filestorage';
}
