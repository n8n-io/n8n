import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import {
	publishAtRate,
	preloadQueue,
	waitForExecutions,
	attachLoadTestResults,
} from '../../../../../utils/kafka-load-helper';
import { buildKafkaTriggeredWorkflow } from '../../../../../utils/kafka-workflow-builder';
import { LOAD_SCENARIOS } from '../scenarios/load-scenarios';

export interface LoadConfig {
	tags: string;
	workers?: number;
	resourceLabel: string;
}

export function registerLoadTests(config: LoadConfig) {
	const { tags, workers = 0, resourceLabel } = config;
	const isQueue = workers > 0;
	const logPrefix = isQueue ? `LOAD-Q${workers}w` : 'LOAD';
	const topicPrefix = isQueue ? `load-q${workers}w` : 'load';
	const credPrefix = isQueue ? `Kafka Load Q${workers}w` : 'Kafka Load';
	const testSuffix = isQueue ? `-queue-${workers}w` : '';
	const descLabel = isQueue ? ` (Queue ${workers}w)` : '';

	test.describe(
		`Kafka Load Tests${descLabel} ${tags}`,
		{
			annotation: [{ type: 'owner', description: 'Catalysts' }],
		},
		() => {
			for (const scenario of LOAD_SCENARIOS) {
				test(`${scenario.name}${testSuffix}`, async ({ api, services }, testInfo) => {
					test.setTimeout(scenario.timeoutMs + 120_000);

					const kafka = services.kafka;
					const topic = `${topicPrefix}-${scenario.name}-${nanoid()}`;
					const groupId = `load-group-${nanoid()}`;

					await kafka.createTopic(topic, scenario.partitions ?? 1);

					const credential = await api.credentials.createCredential({
						name: `${credPrefix} ${nanoid()}`,
						type: 'kafka',
						data: {
							brokers: 'kafka:9092',
							clientId: `load-${nanoid()}`,
							ssl: false,
							authentication: false,
						},
					});

					const workflowDef = buildKafkaTriggeredWorkflow({
						topic,
						groupId,
						credentialId: credential.id,
						credentialName: credential.name,
						nodeCount: scenario.nodeCount,
					});

					const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
						workflowDef,
						{
							makeUnique: true,
						},
					);

					let expectedExecutions: number;

					// eslint-disable-next-line playwright/no-conditional-in-test
					if (scenario.loadType === 'preloaded') {
						const publishResult = await preloadQueue(kafka, topic, {
							messageCount: scenario.messageCount!,
							payloadSize: scenario.payloadSize,
						});
						console.log(
							`[${logPrefix}] Preloaded ${publishResult.totalPublished} messages in ${publishResult.publishDurationMs}ms`,
						);
						expectedExecutions = scenario.messageCount!;

						await api.workflows.activate(workflowId, createdWorkflow.versionId!);
						await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });
					} else {
						await api.workflows.activate(workflowId, createdWorkflow.versionId!);
						await kafka.waitForConsumerGroup(groupId, { timeoutMs: 30_000 });

						const publishResult = await publishAtRate(kafka, topic, {
							ratePerSecond: scenario.ratePerSecond!,
							durationSeconds: scenario.durationSeconds!,
							payloadSize: scenario.payloadSize,
						});
						console.log(
							`[${logPrefix}] Published ${publishResult.totalPublished} messages in ${publishResult.actualDurationMs}ms`,
						);
						expectedExecutions = publishResult.totalPublished;
					}

					console.log(
						`[${logPrefix}] Waiting for ${expectedExecutions} executions (timeout: ${scenario.timeoutMs}ms)`,
					);
					const metrics = await waitForExecutions(api.workflows, workflowId, kafka, {
						expectedCount: expectedExecutions,
						groupId,
						topic,
						timeoutMs: scenario.timeoutMs,
					});

					const resultLabel = `${scenario.name}${testSuffix}`;
					await attachLoadTestResults(testInfo, resultLabel, metrics);

					console.log(
						`[${logPrefix} RESULT] ${resultLabel}\n` +
							`  Resources: ${resourceLabel}\n` +
							`  Completed: ${metrics.totalCompleted}/${expectedExecutions}\n` +
							`  Errors: ${metrics.totalErrors}\n` +
							`  Throughput: ${metrics.throughputPerSecond.toFixed(2)} exec/s\n` +
							`  Duration avg: ${metrics.avgDurationMs.toFixed(0)}ms | ` +
							`p50: ${metrics.p50DurationMs.toFixed(0)}ms | ` +
							`p95: ${metrics.p95DurationMs.toFixed(0)}ms | ` +
							`p99: ${metrics.p99DurationMs.toFixed(0)}ms`,
					);

					expect(metrics.totalCompleted).toBeGreaterThan(0);
					expect(metrics.totalCompleted).toBeGreaterThanOrEqual(
						Math.floor(expectedExecutions * 0.5),
					);

					await api.workflows.deactivate(workflowId);
				});
			}
		},
	);
}
