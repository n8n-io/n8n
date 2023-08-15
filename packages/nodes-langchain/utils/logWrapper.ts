import { IExecuteFunctions } from 'n8n-workflow';

import { Tool } from 'langchain/tools';

export function logWrapper(originalInstance: Tool, executeFunctions: IExecuteFunctions) {
	return new Proxy(originalInstance, {
		get: (target, prop) => {
			if (prop === '_call') {
				return async (query: string): Promise<string> => {
					executeFunctions.addInputData('tool', [[{ json: { query } }]]);
					const response = await target[prop](query);
					executeFunctions.addOutputData('tool', [[{ json: { response } }]]);
					return response;
				};
			} else {
				// @ts-ignore
				return target[prop];
			}
		},
	});
}
