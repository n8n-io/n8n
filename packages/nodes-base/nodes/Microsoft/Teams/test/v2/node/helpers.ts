import get from 'lodash/get';
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
			get(params, name, fallback) as NodeParameterValueType,
	);
}

/** A raw Graph error, in the shape the delegated request helper rejects with. */
export function graphError(statusCode: number, code: string, message: string) {
	return Object.assign(
		new Error(`${statusCode} - ${JSON.stringify({ error: { code, message } })}`),
		{
			statusCode,
			error: { error: { code, message } },
		},
	);
}

export const meetingHeaders = { Prefer: 'include-unknown-enum-members' };
