import type { SASLMechanism } from 'kafkajs';

export type KafkaCredential = {
	clientId: string;
	brokers: string;
	ssl: boolean;
	authentication: boolean;
} & (
	| {
			authentication: true;
			username: string;
			password: string;
			saslMechanism: SASLMechanism;
	  }
	| {
			authentication: false;
	  }
);

export interface TriggerNodeOptions {
	allowAutoTopicCreation: boolean;
	autoCommitThreshold: number;
	autoCommitInterval: number;
	heartbeatInterval: number;
	maxInFlightRequests: number;
	fromBeginning: boolean;
	jsonParseMessage: boolean;
	parallelProcessing: boolean;
	onlyMessage: boolean;
	returnHeaders: boolean;
	sessionTimeout: number;
}
