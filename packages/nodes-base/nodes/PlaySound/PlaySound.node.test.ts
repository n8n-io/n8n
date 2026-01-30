import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { PlaySound } from './PlaySound.node';

describe('PlaySound Node', () => {
	const executeFunctions = mock<IExecuteFunctions>({
		getNode: jest.fn().mockReturnValue({ name: 'Play Sound Test Node' }),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		executeFunctions.getInputData.mockReturnValue([{ json: { test: true } }]);
	});

	describe('execute', () => {
		it('should set metadata for preset sound', async () => {
			executeFunctions.getNodeParameter.calledWith('sound', 0).mockReturnValue('success');
			executeFunctions.getNodeParameter.calledWith('volume', 0).mockReturnValue(100);

			const result = await new PlaySound().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'playSound',
					playSound: {
						sound: 'success',
						url: undefined,
						volume: 1,
					},
				},
			});
			expect(result[0][0].json).toMatchObject({
				playSound: {
					sound: 'success',
					soundUrl: null,
					volume: 100,
					status: 'sent',
				},
			});
		});

		it('should set metadata for custom sound with URL', async () => {
			executeFunctions.getNodeParameter.calledWith('sound', 0).mockReturnValue('custom');
			executeFunctions.getNodeParameter.calledWith('volume', 0).mockReturnValue(50);
			executeFunctions.getNodeParameter
				.calledWith('soundUrl', 0)
				.mockReturnValue('https://example.com/sound.mp3');

			const result = await new PlaySound().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'playSound',
					playSound: {
						sound: 'custom',
						url: 'https://example.com/sound.mp3',
						volume: 0.5,
					},
				},
			});
			expect(result[0][0].json).toMatchObject({
				playSound: {
					sound: 'custom',
					soundUrl: 'https://example.com/sound.mp3',
					volume: 50,
					status: 'sent',
				},
			});
		});

		it('should convert volume from percentage to decimal', async () => {
			executeFunctions.getNodeParameter.calledWith('sound', 0).mockReturnValue('warning');
			executeFunctions.getNodeParameter.calledWith('volume', 0).mockReturnValue(75);

			await new PlaySound().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'playSound',
					playSound: {
						sound: 'warning',
						url: undefined,
						volume: 0.75,
					},
				},
			});
		});

		it('should handle multiple input items', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: { item: 1 } }, { json: { item: 2 } }]);
			executeFunctions.getNodeParameter.calledWith('sound', 0).mockReturnValue('info');
			executeFunctions.getNodeParameter.calledWith('volume', 0).mockReturnValue(100);

			const result = await new PlaySound().execute.call(executeFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toMatchObject({ item: 1, playSound: expect.any(Object) });
			expect(result[0][1].json).toMatchObject({ item: 2, playSound: expect.any(Object) });
		});

		it('should handle error sound type', async () => {
			executeFunctions.getNodeParameter.calledWith('sound', 0).mockReturnValue('error');
			executeFunctions.getNodeParameter.calledWith('volume', 0).mockReturnValue(100);

			await new PlaySound().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'playSound',
					playSound: {
						sound: 'error',
						url: undefined,
						volume: 1,
					},
				},
			});
		});
	});
});
