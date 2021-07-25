const IrcParser = require('../../../nodes/Irc/IrcParser.ts');
const ParserTests = require('./ParserTests.js');


describe ('messageParserJoinTests', () => {
	ParserTests.JoinTests.tests.forEach(testCase => {
		it(testCase.desc, async () => {
			// our parser doesn't support tags
			if (testCase.atoms.tags) {
				return;
			}
			const msg = new IrcParser.IrcMessage(testCase.atoms.source || '', testCase.atoms.verb, testCase.atoms.params || []);
			const msgString = msg.toString();
			expect(testCase.matches).toContain(msgString);
		});
	});
});
