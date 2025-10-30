import nock from 'nock';

export default async () => {
	nock.disableNetConnect();

	nock.emitter.on('no match', (req) => {
		console.error('No mock for network request: ', req);
	});
};
