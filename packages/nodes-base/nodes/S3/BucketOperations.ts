type LocationResponse = {
	LocationConstraint?: {
		_: string;
	};
};

type S3SoapRequest = (
	bucketName: string,
	method: string,
	path: string,
	body?: string,
	qs?: Record<string, string>,
	headers?: Record<string, string>,
	options?: Record<string, string>,
	region?: string,
) => Promise<unknown>;

export const deleteBucket = async (request: S3SoapRequest, bucketName: string) => {
	const responseData = (await request(bucketName, 'GET', '', '', { location: '' })) as LocationResponse;
	const region = responseData.LocationConstraint?._;

	await request(bucketName, 'DELETE', '', '', {}, {}, {}, region);

	return { deleted: true };
};
