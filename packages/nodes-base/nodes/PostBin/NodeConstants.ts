export const NODE_SETTINGS = Object.freeze({
	DESCRIPTION: 'Consume PostBin API',
	BASE_URL: 'https://www.toptal.com',
	BIN_URL: 'developers/postbin',
	API_URL: 'developers/postbin/api/bin',
});

export const POSTBIN_VALUES = Object.freeze({
	DISPLAY_NAME: 'PostBin',
	BRAND_COLOR: '#4dc0b5'
});

export const RESOURCES = Object.freeze({
	BIN: {
		name: 'Bin',
		value: 'bin',
	},
	REQUEST: {
		name: 'Request',
		value: 'request',
	}
});

export const BIN_OPERATIONS = Object.freeze({
	CREATE: {
		name: 'Create',
		value: 'create',
		description: 'Create new bin',
	},
	GET: {
		name: 'Get',
		value: 'get',
		description: 'Returns information based on the binId you provide.',
	},
	DELETE: {
		name: 'Delete',
		value: 'delete',
		description: `Deletes this bin and all of it's posts.`,
	},
	TEST: {
		name: 'Test',
		value: 'test',
		description: 'Test your API by sending a request to the bin.'
	}
});

export const BIN_FIELDS = Object.freeze({
	BIN_ID: {
		displayName: 'Bin ID',
		name: 'binId'
	},
	BIN_CONTENT: {
		displayName: 'Bin content',
		name: 'binContent'
	},
});

export const REQUEST_OPERATIONS = Object.freeze({
	GET: {
		name: 'Get',
		value: 'get',
		description: 'Returns information based on the binId and reqId you provide.',
	},
	SHIFT: {
		name: 'Shift',
		value: 'shift',
		description: 'Removes the first request form the bin.'
	},
});

export const REQUEST_FIELDS = Object.freeze({
	REQ_ID: {
		displayName: 'Request ID',
		name: 'requestId'
	},
})
