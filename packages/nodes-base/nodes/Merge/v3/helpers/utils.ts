import type { INodeParameters } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export const configuredInputs = (parameters: INodeParameters) => {
	return Array.from({ length: parameters.numberInputs as number }, (_, i) => ({
		type: `${NodeConnectionType.Main}`,
		displayName: `Input ${(i + 1).toString()}`,
	}));
};
