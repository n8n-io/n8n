import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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

export async function awesomePrompts() {
	const result = [];
	try {
		const response = await axios.get(
			'https://github.com/f/awesome-chatgpt-prompts/raw/main/prompts.csv',
			{ responseType: 'arraybuffer' },
		);
		const csv = response.data.toString('utf8');

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

export async function preparePromt(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const actAs = this.getNodeParameter('actAs', 0) as string;

	if (actAs === 'noAttunment') {
		return requestOptions;
	} else {
		if (!((requestOptions.body as IDataObject) || {})?.messages) {
			return requestOptions;
		}

		const promts = await awesomePrompts();
		const promtEntry = promts.find((entry) => entry.act === actAs);

		if (promtEntry === undefined) {
			throw new Error('Attunment not found');
		}

		const promt = promtEntry.prompt.split('My first ')[0];
		const messages = (requestOptions.body as IDataObject).messages as IDataObject[];
		const updatedMessages = messages.map((message) => {
			return {
				...message,
				content: `${promt} My first question is: ${message.content}`,
			};
		});

		return {
			...requestOptions,
			body: {
				...(requestOptions.body as IDataObject),
				messages: updatedMessages,
			},
		};
	}
}
