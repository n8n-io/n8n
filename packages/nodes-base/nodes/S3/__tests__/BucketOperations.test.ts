import { deleteBucket } from '../BucketOperations';

describe('deleteBucket', () => {
	it('looks up the bucket region before deleting the bucket', async () => {
		const request = jest
			.fn()
			.mockResolvedValueOnce({
				LocationConstraint: {
					_: 'eu-west-1',
				},
			})
			.mockResolvedValueOnce(undefined);

		await expect(deleteBucket(request, 'my-bucket')).resolves.toEqual({ deleted: true });

		expect(request).toHaveBeenNthCalledWith(1, 'my-bucket', 'GET', '', '', { location: '' });
		expect(request).toHaveBeenNthCalledWith(
			2,
			'my-bucket',
			'DELETE',
			'',
			'',
			{},
			{},
			{},
			'eu-west-1',
		);
	});
});
