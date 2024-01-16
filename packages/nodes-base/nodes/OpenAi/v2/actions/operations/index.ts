import type { INodeProperties } from 'n8n-workflow';

import * as generateImage from './generateImage.operation';
import * as analyzeImage from './analyzeImage.operation';
import * as createModeration from './createModeration.operation';
import * as generateAudio from './generateAudio.operation';
import * as transcribeRecording from './transcribeRecording.operation';
import * as translateRecording from './translateRecording.operation';
import * as uploadFile from './uploadFile.operation';
import * as deleteFile from './deleteFile.operation';
import * as listFiles from './listFiles.operation';

export {
	generateImage,
	analyzeImage,
	createModeration,
	generateAudio,
	transcribeRecording,
	translateRecording,
	uploadFile,
	deleteFile,
	listFiles,
};

export const description: INodeProperties[] = [
	...generateImage.description,
	...analyzeImage.description,
	...createModeration.description,
	...generateAudio.description,
	...transcribeRecording.description,
	...translateRecording.description,
	...uploadFile.description,
	...deleteFile.description,
	...listFiles.description,
];
