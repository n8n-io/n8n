import type { PayloadSize } from '../../../../../utils/kafka-load-helper';

export interface LoadScenario {
	name: string;
	nodeCount: number;
	payloadSize: PayloadSize;
	loadType: 'steady' | 'preloaded';
	ratePerSecond?: number;
	durationSeconds?: number;
	messageCount?: number;
	partitions?: number;
	timeoutMs: number;
}

export const LOAD_SCENARIOS: LoadScenario[] = [
	{
		name: '10-nodes-1KB-10mps',
		nodeCount: 10,
		payloadSize: '1KB',
		loadType: 'steady',
		ratePerSecond: 10,
		durationSeconds: 30,
		timeoutMs: 120_000,
	},
	{
		name: '30-nodes-10KB-100mps',
		nodeCount: 30,
		payloadSize: '10KB',
		loadType: 'steady',
		ratePerSecond: 100,
		durationSeconds: 30,
		timeoutMs: 300_000,
	},
	{
		name: '60-nodes-1KB-preload-10k',
		nodeCount: 60,
		payloadSize: '1KB',
		loadType: 'preloaded',
		messageCount: 10_000,
		partitions: 3,
		timeoutMs: 600_000,
	},
	{
		name: '10-nodes-100KB-10mps',
		nodeCount: 10,
		payloadSize: '100KB',
		loadType: 'steady',
		ratePerSecond: 10,
		durationSeconds: 30,
		timeoutMs: 300_000,
	},
];
