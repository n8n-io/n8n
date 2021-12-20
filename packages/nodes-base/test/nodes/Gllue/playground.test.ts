const realHelpers = require('../../../nodes/Gllue/helpers');

describe('generate a real', () => {
	it('should generate a useful token', () =>{
		const timestamp = realHelpers.getCurrentTimeStamp();
		const realData = realHelpers.generateTokenWithAESKey(
			timestamp, 'accounts@top20talent.com', '98a3C34415053fA2');
		expect(realData).toEqual('xxxxxxxxxxxxxxxx');
	});
});
