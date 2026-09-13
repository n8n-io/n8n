import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

export function createExecuteContext(): MockProxy<IExecuteFunctions> {
	const ctx = mock<IExecuteFunctions>();
	ctx.getInputData.mockReturnValue([{ json: {} }]);
	ctx.getInstanceId.mockReturnValue('instanceId');
	ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
	ctx.getTimezone.mockReturnValue('UTC');
	ctx.continueOnFail.mockReturnValue(false);
	ctx.helpers.returnJsonArray = returnJsonArray;
	ctx.helpers.constructExecutionMetaData = constructExecutionMetaData;
	return ctx;
}

export function setParams(ctx: MockProxy<IExecuteFunctions>, params: Record<string, unknown>) {
	ctx.getNodeParameter.mockImplementation(
		(name: string, _itemIndex?: number, fallback?: unknown) =>
			(name in params ? params[name] : fallback) as NodeParameterValueType,
	);
}

export const meetingHeaders = { Prefer: 'include-unknown-enum-members' };
