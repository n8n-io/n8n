export const configuredOutputs = (
	version: number,
	parameters: { enableResponseOutput?: boolean },
) => {
	const multipleOutputs = version === 1.3 || (version >= 1.4 && parameters.enableResponseOutput);
	if (multipleOutputs) {
		return [
			{
				type: 'main',
				displayName: 'Input Data',
			},
			{
				type: 'main',
				displayName: 'Response',
			},
		];
	}

	return ['main'];
};
