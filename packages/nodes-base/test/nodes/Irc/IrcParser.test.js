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

describe ('messageParserSplitTests', () => {
	ParserTests.SplitTests.tests.forEach(testCase => {
		it(`Parsing incoming line [${testCase.input}]`, async () => {
			// our parser doesn't support tags
			if (testCase.atoms.tags) {
				return;
			}
			const msg = IrcParser.ParseIrcMessage(testCase.input);
			if (testCase.atoms.source) {
				expect(testCase.atoms.source).toEqual(msg.prefix);
			}
			expect(testCase.atoms.verb).toEqual(msg.verb);
			if (testCase.atoms.params) {
				expect(testCase.atoms.params).toEqual(msg.params);
			}
		});
	});
});
