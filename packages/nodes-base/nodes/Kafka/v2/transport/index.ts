export { toKafkaJSConfig } from './config';
export { getKafkaLibrary, createKafkaClient } from './client';
export { assertTopicExists } from './admin';
export { createKafkaProducer, type KafkaProducerOptions } from './producer';
export {
	createKafkaConsumer,
	CONSUMER_DEFAULTS,
	type KafkaConsumerLogging,
	type KafkaConsumerOptions,
} from './consumer';
export { createLibraryLogger, type FatalErrorHandler } from './LibraryLogger';
