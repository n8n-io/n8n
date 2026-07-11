import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../transport';

/**
 * Microsoft Outlook supports permanent deletions,
 * by skipping `Deleted Items` folder and placing items
 * directly into the `Purges` folder in the user's mailbox.
 */
export async function executeDeletion(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	itemIndex: number,
	resource: string,
) {
	const options = this.getNodeParameter('options', itemIndex, {}) as {
		permanentDelete?: boolean;
	};
	const isPermanentDelete = options?.permanentDelete || false;

	return await microsoftApiRequest.call(
		this,
		isPermanentDelete ? 'POST' : 'DELETE',
		`${resource}${isPermanentDelete ? '/permanentDelete' : ''}`,
	);
}
