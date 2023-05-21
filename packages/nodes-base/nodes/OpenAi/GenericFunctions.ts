import type {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { createWriteStream } from 'fs';

import axios from 'axios';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		throw new NodeApiError(this.getNode(), response as unknown as JsonObject);
	}
	return data;
}
export async function prepareAwesomePromps(
	this: IExecuteSingleFunctions,
): Promise<INodeExecutionData[]> {
	return await awesomePrompts();
}

export async function awesomePrompts() {
	const result = [];
	try {
		const response = await axios.get(
			'https://github.com/f/awesome-chatgpt-prompts/raw/main/prompts.csv',
			{ responseType: 'stream' },
		);
		const writer = createWriteStream('prompts.csv');

		response.data.pipe(writer);

		const csv = await new Promise((resolve, reject) => {
			writer.on('finish', resolve);
			writer.on('error', reject);
		});

		const lines = (csv as string).split('\n');

		for (let i = 1; i < lines.length; i++) {
			const currentLine = lines[i].split(',');

			result.push({
				act: currentLine[0],
				prompt: currentLine[1],
			});
		}
	} catch (error) {
		throw error;
	}
	return result;
}
