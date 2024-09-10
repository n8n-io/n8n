import { readFileSync } from 'fs';
import path from 'path';
import { mock } from 'jest-mock-extended';
import get from 'lodash/get';

import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INode,
	INodeTypes,
	IRunExecutionData,
} from '@/Interfaces';
import type { Workflow } from '@/Workflow';
import { NodeTypes as NodeTypesClass } from './NodeTypes';

export function getExecuteSingleFunctions(
	workflow: Workflow,
	runExecutionData: IRunExecutionData,
	runIndex: number,
	node: INode,
	itemIndex: number,
): IExecuteSingleFunctions {
	return mock<IExecuteSingleFunctions>({
		getItemIndex: () => itemIndex,
		getNodeParameter: (parameterName: string) => {
			return workflow.expression.getParameterValue(
				get(node.parameters, parameterName),
				runExecutionData,
				runIndex,
				itemIndex,
				node.name,
				[],
				'internal',
				{},
			);
		},
		getWorkflow: () => ({
			id: workflow.id,
			name: workflow.name,
			active: workflow.active,
		}),
		helpers: mock<IExecuteSingleFunctions['helpers']>({
			async httpRequest(
				requestOptions: IHttpRequestOptions,
			): Promise<IN8nHttpFullResponse | IN8nHttpResponse> {
				return {
					body: {
						headers: {},
						statusCode: 200,
						requestOptions,
					},
				};
			},
		}),
	});
}

let nodeTypesInstance: NodeTypesClass | undefined;

export function NodeTypes(): INodeTypes {
	if (nodeTypesInstance === undefined) {
		nodeTypesInstance = new NodeTypesClass();
	}

	return nodeTypesInstance;
}

const BASE_DIR = path.resolve(__dirname, '..');
export const readJsonFileSync = <T>(filePath: string) =>
	JSON.parse(readFileSync(path.join(BASE_DIR, filePath), 'utf-8')) as T;
