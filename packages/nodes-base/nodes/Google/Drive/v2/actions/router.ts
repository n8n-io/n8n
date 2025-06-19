import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as drive from './drive/Drive.resource';
import * as file from './file/File.resource';
import * as fileFolder from './fileFolder/FileFolder.resource';
import * as folder from './folder/Folder.resource';
import type { GoogleDriveType } from './node.type';

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
			switch (googleDrive.resource) {
				case 'drive':
					returnData.push(...(await drive[googleDrive.operation].execute.call(this, i)));
					break;
				case 'file':
					returnData.push(...(await file[googleDrive.operation].execute.call(this, i, items[i])));
					break;
				case 'fileFolder':
					returnData.push(...(await fileFolder[googleDrive.operation].execute.call(this, i)));
					break;
				case 'folder':
					returnData.push(...(await folder[googleDrive.operation].execute.call(this, i)));
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

	return [returnData];
}
