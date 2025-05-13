export const configuredOutputs = (version: number) => {
	if (version >= 1.3) {
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
