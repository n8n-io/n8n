import { getAutoCommitSettings, type KafkaTriggerOptions } from '../utils';

describe('Kafka Utils', () => {
	describe('getAutoCommitSettings', () => {
		it('should return autoCommit true for version < 1.2', () => {
			const options: KafkaTriggerOptions = {};
			const result = getAutoCommitSettings(options, 1);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});

		it('should return autoCommit true for version 1.1', () => {
			const options: KafkaTriggerOptions = {};
			const result = getAutoCommitSettings(options, 1.1);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});

		it('should return autoCommit false for version 1.2 when no autoCommit options provided', () => {
			const options: KafkaTriggerOptions = {};
			const result = getAutoCommitSettings(options, 1.2);

			expect(result).toEqual({
				autoCommit: false,
				eachBatchAutoResolve: false,
				autoCommitInterval: undefined,
				autoCommitThreshold: undefined,
			});
		});

		it('should return autoCommit true for version 1.2 when autoCommitInterval is provided', () => {
			const options: KafkaTriggerOptions = {
				autoCommitInterval: 5000,
			};
			const result = getAutoCommitSettings(options, 1.2);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: 5000,
				autoCommitThreshold: undefined,
			});
		});

		it('should return autoCommit true for version 1.2 when autoCommitThreshold is provided', () => {
			const options: KafkaTriggerOptions = {
				autoCommitThreshold: 100,
			};
			const result = getAutoCommitSettings(options, 1.2);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: undefined,
				autoCommitThreshold: 100,
			});
		});

		it('should return autoCommit true for version 1.2 when both autoCommit options are provided', () => {
			const options: KafkaTriggerOptions = {
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			};
			const result = getAutoCommitSettings(options, 1.2);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			});
		});

		it('should ignore autoCommit options for version < 1.2 and still return true', () => {
			const options: KafkaTriggerOptions = {
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			};
			const result = getAutoCommitSettings(options, 1);

			expect(result).toEqual({
				autoCommit: true,
				eachBatchAutoResolve: true,
				autoCommitInterval: 5000,
				autoCommitThreshold: 100,
			});
		});
	});
});
