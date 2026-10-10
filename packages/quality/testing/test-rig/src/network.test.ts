import { netemCommands } from './network';

describe('netemCommands', () => {
	it('delays traffic to one IP in its own band', () => {
		expect(netemCommands('172.18.0.4', { delayMs: 250 })).toEqual([
			"DEV=$(ip -o route get 172.18.0.4 | sed -n 's/.* dev \\([^ ]*\\).*/\\1/p')",
			'tc qdisc del dev $DEV root 2>/dev/null || true',
			'tc qdisc add dev $DEV root handle 1: prio',
			'tc qdisc add dev $DEV parent 1:3 handle 30: netem delay 250ms',
			'tc filter add dev $DEV protocol ip parent 1:0 prio 3 u32 match ip dst 172.18.0.4/32 flowid 1:3',
		]);
	});

	it('cuts a link by dropping every packet to the IP', () => {
		expect(netemCommands('10.0.0.2', { cut: true })[3]).toBe(
			'tc qdisc add dev $DEV parent 1:3 handle 30: netem loss 100%',
		);
	});

	it('rounds the delay to at least one millisecond', () => {
		expect(netemCommands('10.0.0.2', { delayMs: 0.2 })[3]).toContain('delay 1ms');
	});

	it('rejects anything but an IPv4 address', () => {
		expect(() => netemCommands('postgres; rm -rf /', { cut: true })).toThrow('not an IPv4 address');
	});
});
