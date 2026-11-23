import { isRecord } from '@n8n/utils/is-record';
import type { Result } from '@n8n/utils/result';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { createContext, runInContext } from 'node:vm';

/**
 * An in-process stand-in for the JavaScript task runner, so that Code nodes run
 * without a runner process. Both engines call it through `startRunnerTask`, so
 * the Code node itself is the same on both. Like the real runner, it reads the
 * workflow data proxy of the item, and pairs each output of "run once for each
 * item" mode with its input item.
 *
 * It runs only code that the generator writes. It is not a sandbox.
 */

type CodeSettings = {
	code: string;
	nodeMode: 'runOnceForAllItems' | 'runOnceForEachItem';
	chunk?: { startIndex: number; count: number };
};

function isCodeSettings(value: unknown): value is CodeSettings {
	return (
		isRecord(value) &&
		typeof value.code === 'string' &&
		(value.nodeMode === 'runOnceForAllItems' || value.nodeMode === 'runOnceForEachItem')
	);
}

/** The real runner sends the result to the main process as JSON. */
function asJson(value: unknown): unknown {
	const text = JSON.stringify(value);
	return text === undefined ? undefined : jsonParse<unknown>(text);
}

async function runCode(code: string, context: Record<string, unknown>): Promise<unknown> {
	const sandbox = createContext({ ...context, module: { exports: {} } });
	const wrapped = `module.exports = (async function () {${code}\n})()`;
	const result: unknown = runInContext(wrapped, sandbox);
	return asJson(await result);
}

function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

function proxyContext(executeFunctions: IExecuteFunctions, itemIndex: number) {
	return { ...executeFunctions.getWorkflowDataProxy(itemIndex) };
}

function toErrorData(error: unknown) {
	return error instanceof Error
		? { message: error.message, stack: error.stack ?? '' }
		: { message: String(error), stack: '' };
}

async function runTask(
	settings: unknown,
	executeFunctions: IExecuteFunctions,
	connectionInputData: INodeExecutionData[],
): Promise<Result<unknown, unknown>> {
	if (!isCodeSettings(settings)) {
		return { ok: false, error: { message: 'Unsupported task settings', stack: '' } };
	}
	try {
		if (settings.nodeMode === 'runOnceForAllItems') {
			const context = { ...proxyContext(executeFunctions, 0), items: connectionInputData };
			return { ok: true, result: await runCode(settings.code, context) };
		}

		const start = settings.chunk?.startIndex ?? 0;
		const end = start + (settings.chunk?.count ?? connectionInputData.length);
		const results: INodeExecutionData[] = [];
		for (let index = start; index < end; index++) {
			const context = {
				...proxyContext(executeFunctions, index),
				item: connectionInputData[index],
			};
			const result = await runCode(settings.code, context);
			if (result === null || result === undefined) continue;
			const json = isRecord(result) && isDataObject(result.json) ? result.json : result;
			results.push({ json: isDataObject(json) ? json : {}, pairedItem: { item: index } });
		}
		return { ok: true, result: results };
	} catch (error) {
		return { ok: false, error: toErrorData(error) };
	}
}

export const startRunnerTask: IWorkflowExecuteAdditionalData['startRunnerTask'] = async <T, E>(
	_additionalData: IWorkflowExecuteAdditionalData,
	jobType: string,
	settings: unknown,
	executeFunctions: IExecuteFunctions,
	_inputData: unknown,
	_node: unknown,
	_workflow: unknown,
	_runExecutionData: unknown,
	_runIndex: number,
	_itemIndex: number,
	_activeNodeName: string,
	connectionInputData: INodeExecutionData[],
): Promise<Result<T, E>> => {
	const result =
		jobType === 'javascript'
			? await runTask(settings, executeFunctions, connectionInputData)
			: { ok: false as const, error: { message: `Unsupported task type ${jobType}`, stack: '' } };
	// The caller names the result type. The task returns what the generated code returns.
	return result as Result<T, E>;
};
