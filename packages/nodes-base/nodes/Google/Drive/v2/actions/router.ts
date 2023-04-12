import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { GoogleDriveType } from './node.type';

import * as drive from './drive/Drive.resource';
import * as file from './file/File.resource';
import * as fileFolder from './fileFolder/FileFolder.resource';
import * as folder from './folder/Folder.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const resource = this.getNodeParameter<GoogleDriveType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	const googleDrive = {
		resource,
		operation,
	} as GoogleDriveType;

	for (let i = 0; i < items.length; i++) {
		try {
			const options = this.getNodeParameter('options', i, {});

			switch (googleDrive.resource) {
				case 'drive':
					returnData.push(...(await drive[googleDrive.operation].execute.call(this, i, options)));
					break;
				case 'file':
					returnData.push(
						...(await file[googleDrive.operation].execute.call(this, i, options, items[i])),
					);
					break;
				case 'fileFolder':
					returnData.push(
						...(await fileFolder[googleDrive.operation].execute.call(this, i, options)),
					);
					break;
				case 'folder':
					returnData.push(...(await folder[googleDrive.operation].execute.call(this, i, options)));
					break;
				default:
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				if (resource === 'file' && operation === 'download') {
					items[i].json = { error: error.message };
				} else {
					returnData.push({ json: { error: error.message } });
				}
				continue;
			}
			throw error;
		}
	}
	if (resource === 'file' && operation === 'download') {
		// For file downloads the files get attached to the existing items
		return this.prepareOutputData(items);
	} else {
		// For all other ones does the output items get replaced
		return this.prepareOutputData(returnData);
	}
}
