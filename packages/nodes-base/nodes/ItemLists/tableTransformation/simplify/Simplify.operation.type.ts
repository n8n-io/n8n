import { IExecuteFunctions } from 'n8n-workflow';
import { SimplifyOperation } from '../resource.type';
import * as combineRows from './combineRows.operation';

const operationMap = {
	combineRows,
};

export async function simplify(this: IExecuteFunctions, operation: SimplifyOperation) {
	return operationMap[operation].execute.call(this);
}
