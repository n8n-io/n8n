import { vi } from 'vitest';

let accessCount = 0;

/** vi.mock factory for '@confluentinc/kafka-javascript'. */
export function confluentKafkaModuleMock(): { readonly KafkaJS: unknown } {
	return {
		get KafkaJS() {
			accessCount += 1;
			return {
				Kafka: vi.fn().mockImplementation((config?: unknown) => ({
					config,
					connect: vi.fn(),
					disconnect: vi.fn(),
					producer: vi.fn(),
					consumer: vi.fn(),
					admin: vi.fn(),
				})),
				logLevel: { NOTHING: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 },
			};
		},
	};
}

export function getConfluentKafkaAccessCount(): number {
	return accessCount;
}

export function resetConfluentKafkaAccessCount(): void {
	accessCount = 0;
}
