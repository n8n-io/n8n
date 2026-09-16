import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { isResourceLocatorValue } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { credentials } from '../credentials';

// `getNodeParameter` takes no item index here, and `extractValue` unwraps a locator.
export const createLoadOptionsFunctions = (parameters: Record<string, unknown>, request: Mock) => {
	const loadOptionsFunctions = mock<ILoadOptionsFunctions>();
	loadOptionsFunctions.helpers.request = request;
	loadOptionsFunctions.getCredentials.mockResolvedValue(credentials.gristApi);
	loadOptionsFunctions.getNodeParameter.mockImplementation(((
		name: string,
		fallback?: unknown,
		options?: { extractValue?: boolean },
	) => {
		const value = parameters[name] ?? fallback;
		if (options?.extractValue && isResourceLocatorValue(value)) {
			return value.value;
		}
		return value;
	}) as ILoadOptionsFunctions['getNodeParameter']);
	return loadOptionsFunctions;
};
