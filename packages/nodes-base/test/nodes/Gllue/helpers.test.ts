import {UrlParams} from '../../../nodes/Gllue/helpers';


const helpers = require('../../../nodes/Gllue/helpers');

beforeAll(() => {
	jest
		.useFakeTimers('modern')
		.setSystemTime(new Date('2021-02-18 12:24:00'));

});

const TIMESTAMP = '1613622240000';
const EMAIL = 'flash@cgptalent.com';
const TIMESTAMP_EMAIL_CONNECTED = `${TIMESTAMP},${EMAIL},`;
const SCALE_SIZE = 16;
const AES_KEY = 'eqs214hvIHEY7Reg';
const TOKEN = 'U5yBIIC7ieV934VhmvAeevpNSejoGUbbMHEJXXPSElN91gVC1aiONXWNC%2Frnc1Xn8H0NFdFar%2BNOB%2FkMkv1ZLw%3D%3D';

describe('Private Token Generator', () => {
	it('should get current date string', () => {
		const realData = helpers.getCurrentTimeStamp();
		expect(realData).toStrictEqual(TIMESTAMP);
	});
	it('should connect the data with comma', () => {
		const realData = helpers.connectWithComma(TIMESTAMP, EMAIL);
		expect(realData).toStrictEqual(`${TIMESTAMP},${EMAIL},`);
	});
	it('should pad string with 16 length with 15', () => {
		const realData = helpers.get16TimesLength(15);
		expect(realData).toEqual(SCALE_SIZE);
	});
	it('should pad string with 16 length with 16', () => {
		const realData = helpers.get16TimesLength(SCALE_SIZE);
		expect(realData).toEqual(SCALE_SIZE);
	});

	it('should pad string with 32 length with 17', () => {
		const realData = helpers.get16TimesLength(17);
		expect(realData).toEqual(2 * SCALE_SIZE);
	});
	it('should pad string with 48 length with 33', () => {
		const realData = helpers.get16TimesLength(33);
		expect(realData).toEqual(3 * SCALE_SIZE);
	});
	it('should pad string with 48 length', () => {
		const realData = helpers.padWithSpaceIn16Times(TIMESTAMP_EMAIL_CONNECTED);
		expect(realData.length).toEqual(48);
	});
	it('should pad string with enough space', () => {
		const realData = helpers.padWithSpaceIn16Times(TIMESTAMP_EMAIL_CONNECTED);
		expect(realData).toEqual('1613622240000,flash@cgptalent.com,              ');
	});
	it('should generate token with AES KEY', () => {
		const realData = helpers.generateTokenWithAESKey(TIMESTAMP, EMAIL, AES_KEY);
		expect(realData).toEqual(TOKEN);
	});
});

const HOST = 'https://cgpo2o.cgptalent.cn';
const RESOURCE = 'client';
const OPTION = 'simple_list_with_ids';
const PAGINATION = 10;
const ORDERING = 'id';
const PAGE = 2;
const FIELDS = 'id,name';
const GQL = 'type__s=prospect,client';
const GQL_MULTIPLE = `${GQL}&keyword__eq=right`;
const BASE_URL = `${HOST}\\rest\\${RESOURCE}\\${OPTION}`;
const DEFAULT_PARAMS = 'fields=id&paginate_by=25&ordering=-id&page=1';

describe('Gllue url parameters builder', () => {
	it('should build base url', () => {
		const uri = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, null);
		expect(uri).toEqual(`${BASE_URL}`);
	});
	it('should build with default params', () => {
		const urlParams = new UrlParams();
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=&${DEFAULT_PARAMS}`);
	});
	it('should build with fields', () => {
		const urlParams = new UrlParams('', FIELDS, PAGINATION, ORDERING, PAGE );
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=&fields=id,name&paginate_by=10&ordering=id&page=2`);
	});
	it('should build with a single gql query', () => {
		const urlParams = new UrlParams(GQL);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=type__s%3Dprospect%252Cclient` + `&${DEFAULT_PARAMS}`);
	});
	it('should build with multiple gql queries', () => {
		const urlParams = new UrlParams(GQL_MULTIPLE);
		const url = helpers.gllueUrlBuilder(HOST, RESOURCE, OPTION, urlParams);
		expect(url).toEqual(
			`${BASE_URL}?gql=type__s%3Dprospect%252Cclient%26keyword__eq%3Dright` +
			`&${DEFAULT_PARAMS}`);
	});
});
