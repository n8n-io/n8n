import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	INodeTypeBaseDescription,
	INodeTypeDescription,
	INodeType,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeOperationError, TriggerCloseError } from 'n8n-workflow';

import { setSchemaRegistry, type KafkaCredentials } from '../utils';
import { consumeTopic, createDataEmitter, createMessageParser } from './consumer';
import type { KafkaConsumerHandle } from './consumer';
import { versionDescription } from './KafkaTriggerV2Description';
import { createKafkaConsumer } from './transport';
import { explainManualRunGroupDenial, getSettings } from './TriggerSettings';

export class KafkaTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const settings = getSettings.call(this);
		const credentials = await this.getCredentials<KafkaCredentials>('kafka');

		// Resolved before the consumer connects: a bad Schema Registry credential
		// must fail activation rather than leave a connected consumer behind. Shared
		// with v1: config/credential problems (NodeOperationError) fail activation
		// loudly, but a registry that is merely unreachable only logs a warning, so
		// a transient outage does not block the trigger from starting.
		const registry = await setSchemaRegistry(this);

		const parseMessage = createMessageParser(
			settings.parser,
			this.logger,
			registry,
			this.helpers.prepareBinaryData,
		);

		// Aborted before the consumer disconnects, so an execution the emitter is
		// still waiting on cannot hold teardown open.
		const closeController = new AbortController();
		const emit = createDataEmitter(this, settings.emitter, closeController.signal);

		let handle: KafkaConsumerHandle | undefined;
		// A manual run starts the consumer from `manualTriggerFunction`, so unlike an
		// activated workflow the start is not awaited before n8n can call close.
		// Cancelling the test run mid-start would otherwise find `handle` still unset
		// and leave a consumer connected with nothing left holding it.
		let startup: Promise<void> | undefined;

		const startConsumer = async () => {
			startup = startConsumerOnce();
			await startup;
		};

		const startConsumerOnce = async () => {
			// Where a fatal consumer error goes depends on when it arrives (ENT-340):
			// - during startup: reject this gate → activation fails and n8n retries
			//   with backoff, instead of flapping through emitError every second
			// - after a successful start: emitError → n8n restarts the dead trigger
			// - after a failed start: log it; nothing activated, nothing to restart
			let reportFatal!: (error: Error) => void;
			const startupFailure = new Promise<never>((_, reject) => (reportFatal = reject));
			// A rejection that loses the startup race would otherwise be unhandled.
			void startupFailure.catch(() => {});

			try {
				const consumer = await createKafkaConsumer(credentials, settings.consumer, {
					logger: this.logger,
					// v1 routes non-restartable consumer crashes to emitError so n8n
					// re-activates the trigger. Errors caused by our own teardown are
					// not failures, so they stay quiet.
					onFatalError: (error) => {
						if (closeController.signal.aborted) return;
						reportFatal(
							explainManualRunGroupDenial(error, settings.configuredGroupId, settings.isManualRun),
						);
					},
				});

				handle = await consumeTopic(consumer, {
					topic: settings.topic,
					parseMessage,
					emit,
					logger: this.logger,
					batchSize: settings.batchSize,
					partitionsConsumedConcurrently: settings.partitionsConsumedConcurrently,
					errorRetryDelay: settings.errorRetryDelay,
					startupFailure,
					closeSignal: closeController.signal,
				});
				// Startup succeeded. No gap here: a fatal always arrives from a fresh
				// macrotask, so it cannot land between the await and this re-point.
				reportFatal = (error) => this.emitError(error);
			} catch (error) {
				// Startup failed.
				reportFatal = (fatal) =>
					this.logger.error('Kafka consumer reported a fatal error after startup had failed', {
						error: fatal,
					});
				throw new NodeOperationError(this.getNode(), error);
			}
		};

		const closeFunction = async () => {
			closeController.abort();
			try {
				// Let an in-flight start finish so its consumer is closed rather than
				// leaked. Its own failure is not a teardown failure, and it has already
				// been reported to whoever awaited the start.
				await startup?.catch(() => {});
				await handle?.close();
			} catch (error) {
				// A disconnect that overruns its bound is reported the way v1 reports
				// teardown failures, rather than as an unattributed rejection. It happens
				// in practice: a consumer fenced by the processing deadline does not
				// disconnect within the bound.
				throw new TriggerCloseError(this.getNode(), {
					cause: ensureError(error),
					level: 'warning',
				});
			}
		};

		if (this.getMode() !== 'manual') {
			await startConsumer();
			return { closeFunction };
		}

		return {
			closeFunction,
			manualTriggerFunction: startConsumer,
		};
	}
}
