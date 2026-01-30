import { getAutoCommitSettings, type KafkaTriggerOptions } from '../utils';

describe('Kafka Utils', () => {
	describe('getAutoCommitSettings', () => {
		it('should return autoCommit true for version 1.1', () => {
			const options: KafkaTriggerOptions = {};
			const result = getAutoCommitSettings(options);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});
	});
});
