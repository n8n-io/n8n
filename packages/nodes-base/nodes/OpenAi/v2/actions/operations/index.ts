import type { INodeProperties } from 'n8n-workflow';

import * as generateImage from './generateImage.operation';
import * as analyzeImage from './analyzeImage.operation';

export { generateImage, analyzeImage };

export const description: INodeProperties[] = [
	...generateImage.description,
	...analyzeImage.description,
];
