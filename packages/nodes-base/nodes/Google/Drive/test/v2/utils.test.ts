import {
	prepareQueryString,
	setFileProperties,
	setUpdateCommonParams,
} from '../../v2/helpers/utils';

describe('test GoogleDriveV2, prepareQueryString', () => {
	it('should return id, name', () => {
		const fields = undefined;

		const result = prepareQueryString(fields);

		expect(result).toEqual('id, name');
	});

	it('should return *', () => {
		const fields = ['*'];

		const result = prepareQueryString(fields);

		expect(result).toEqual('*');
	});

	it('should return string joined by ,', () => {
		const fields = ['id', 'name', 'mimeType'];

		const result = prepareQueryString(fields);

		expect(result).toEqual('id, name, mimeType');
	});
});

describe('test GoogleDriveV2, setFileProperties', () => {
	it('should return empty object', () => {
		const body = {};
		const options = {};

		const result = setFileProperties(body, options);

		expect(result).toEqual({});
	});

	it('should return object with properties', () => {
		const body = {};
		const options = {
			propertiesUi: {
				propertyValues: [
					{
						key: 'propertyKey1',
						value: 'propertyValue1',
					},
					{
						key: 'propertyKey2',
						value: 'propertyValue2',
					},
				],
			},
		};

		const result = setFileProperties(body, options);

		expect(result).toEqual({
			properties: {
				propertyKey1: 'propertyValue1',
				propertyKey2: 'propertyValue2',
			},
		});
	});

	it('should return object with appProperties', () => {
		const body = {};
		const options = {
			appPropertiesUi: {
				appPropertyValues: [
					{
						key: 'appPropertyKey1',
						value: 'appPropertyValue1',
					},
					{
						key: 'appPropertyKey2',
						value: 'appPropertyValue2',
					},
				],
			},
		};

		const result = setFileProperties(body, options);

		expect(result).toEqual({
			appProperties: {
				appPropertyKey1: 'appPropertyValue1',
				appPropertyKey2: 'appPropertyValue2',
			},
		});
	});
});

describe('test GoogleDriveV2, setUpdateCommonParams', () => {
	it('should return empty object', () => {
		const qs = {};
		const options = {};

		const result = setUpdateCommonParams(qs, options);

		expect(result).toEqual({});
	});

	it('should return qs with params', () => {
		const options = {
			useContentAsIndexableText: true,
			keepRevisionForever: true,
			ocrLanguage: 'en',
			trashed: true,
			includePermissionsForView: 'published',
		};

		const qs = setUpdateCommonParams({}, options);

		expect(qs).toEqual({
			useContentAsIndexableText: true,
			keepRevisionForever: true,
			ocrLanguage: 'en',
		});
	});
});
