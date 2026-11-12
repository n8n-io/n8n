import type { HookSpec } from './spec';
import { FILES } from './spec';

type HookedMethod = Pick<HookSpec, 'file' | 'target' | 'method'> & {
	/** First release that has the method; scenarios on older images do not hook it. */
	since?: string;
};

/** Methods the scenarios hook, so a contract test can check they exist in each image. */
export const HOOKED_METHODS: HookedMethod[] = [
	{ file: FILES.bullJob, target: 'prototype', method: 'moveToCompleted' },
	{ file: FILES.bullScripts, target: '', method: 'extendLock' },
	{ file: FILES.taskBroker, target: 'TaskBroker.prototype', method: 'sendTaskSettings' },
	{ file: FILES.taskRequester, target: 'TaskRequester.prototype', method: 'startTask' },
	{
		file: FILES.workflowExecute,
		target: 'WorkflowExecute.prototype',
		method: 'processRunExecutionData',
	},
];

const release = (version: string) => version.split('.').map(Number);

/** Whether an image tag is a release older than `version`. Tags that are not releases count as new. */
export function olderThan(tag: string, version: string): boolean {
	if (!/^\d+\.\d+\.\d+$/.test(tag)) return false;
	const [a, b] = [release(tag), release(version)];
	const index = a.findIndex((part, i) => part !== b[i]);
	return index !== -1 && a[index] < b[index];
}

/** An observe hook for every method hooked on this image tag, named after its position in the list. */
export const observeHookedMethods = (tag: string): HookSpec[] =>
	HOOKED_METHODS.flatMap(({ since, ...ref }, index) =>
		since && olderThan(tag, since)
			? []
			: [{ ...ref, point: `method-${index}`, kind: 'observe' as const, lazy: true }],
	);
