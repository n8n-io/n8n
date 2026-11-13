import { engineHostname } from './engine';
import {
	startTaskRunnerContainer,
	type TaskRunnerConfig,
	type TaskRunnerResult,
} from './task-runner';
import type { Service } from './types';

/**
 * The runner for the engine container. The data plane runs the nodes, so the
 * Code node's work goes to a broker the engine hosts, not the main's.
 */
export const engineTaskRunner: Service<TaskRunnerResult> = {
	description: 'Engine Task Runner',
	shouldStart: (ctx) => ctx.config.engine === 'container',

	getOptions(ctx) {
		return { taskBrokerUri: `http://${engineHostname(ctx.projectName)}:5679` };
	},

	async start(network, projectName, config?: unknown): Promise<TaskRunnerResult> {
		const { taskBrokerUri } = config as TaskRunnerConfig;
		return await startTaskRunnerContainer(network, projectName, {
			taskBrokerUri,
			serviceName: 'engine-task-runner',
		});
	},
};
