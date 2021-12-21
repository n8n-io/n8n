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
