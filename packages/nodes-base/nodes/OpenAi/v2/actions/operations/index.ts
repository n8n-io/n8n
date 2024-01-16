import type { INodeProperties } from 'n8n-workflow';

import * as generateImage from './generateImage.operation';
import * as analyzeImage from './analyzeImage.operation';
import * as createModeration from './createModeration.operation';
import * as generateAudio from './generateAudio.operation';

export { generateImage, analyzeImage, createModeration, generateAudio };

export const description: INodeProperties[] = [
	...generateImage.description,
	...analyzeImage.description,
	...createModeration.description,
	...generateAudio.description,
];
