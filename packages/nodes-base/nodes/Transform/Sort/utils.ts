import { NodeVM } from '@n8n/vm2';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, randomInt } from 'n8n-workflow';

export const shuffleArray = (array: any[]) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[array[i], array[j]] = [array[j], array[i]];
	}
};

const returnRegExp = /\breturn\b/g;
export function sortByCode(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): INodeExecutionData[] {
	const code = this.getNodeParameter('code', 0) as string;
	if (!returnRegExp.test(code)) {
		throw new NodeOperationError(
			this.getNode(),
			"Sort code doesn't return. Please add a 'return' statement to your code",
		);
	}

	const mode = this.getMode();
	const vm = new NodeVM({
		console: mode === 'manual' ? 'redirect' : 'inherit',
		sandbox: { items },
	});

	return vm.run(`module.exports = items.sort((a, b) => { ${code} })`);
}
