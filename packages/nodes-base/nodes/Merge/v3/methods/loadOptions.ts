import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export async function getResolveClashOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const numberOfInputs = this.getNodeParameter('numberInputs', 2) as number;

	if (numberOfInputs <= 2) {
		return [
			{
				name: 'Always Add Input Number to Field Names',
				value: 'addSuffix',
			},
			{
				name: 'Prefer Input 1 Version',
				value: 'preferInput1',
			},
			{
				name: 'Prefer Input 2 Version',
				value: 'preferLast',
			},
		];
	} else {
		return [
			{
				name: 'Always Add Input Number to Field Names',
				value: 'addSuffix',
			},
			{
				name: 'Use Earliest Version',
				value: 'preferInput1',
			},
		];
	}
}
