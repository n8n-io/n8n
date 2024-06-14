import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export async function getResolveClashOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const numberOfInputs = this.getNodeParameter('numberInputs', 2) as number;

	const outputOptions: INodePropertyOptions[] = [
		{
			name: 'Always Add Input Number to Field Names',
			value: 'addSuffix',
		},
		{
			name: `Prefer Last Input(${numberOfInputs}) Version`,
			value: 'preferLast',
		},
	];

	for (let i = 0; i < numberOfInputs - 1; i++) {
		outputOptions.push({
			name: `Prefer Input ${i + 1} Version`,
			value: `preferInput${i + 1}`,
		});
	}

	return outputOptions;
}
