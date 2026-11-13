// Name resolution for the fallback host in the synthetic benchmark, a
// subset of the gym's `deploy/e2e/host/resolve.cjs`. Load it with
// NODE_OPTIONS=--require=<this file>. It does nothing unless GYM_ADDR is set.
//
//   GYM_ADDR      the IPv4 address that vendor names resolve to; nothing
//                 listens there, connections to it are redirected below
//   GYM_HOSTS     vendor name patterns, comma-separated: "name" or "*.domain"
//   GYM_PORT_MAP  "<port>=<port>,...": GYM_ADDR:<port> goes to
//                 127.0.0.1:<mapped port> (443 to the stub's HTTPS listener)
//
// The redirect is on the TCP handle's connect, after the lookup, so TLS
// still checks the vendor name.
'use strict';

const ADDR = process.env.GYM_ADDR;
if (ADDR) install();

function install() {
	const dns = require('dns');
	const patterns = (process.env.GYM_HOSTS || '')
		.split(',')
		.map((p) => p.trim().toLowerCase())
		.filter(Boolean);
	const portMap = new Map();
	for (const kv of (process.env.GYM_PORT_MAP || '').split(',')) {
		const [a, b] = kv.split('=').map(Number);
		if (a > 0 && b > 0) portMap.set(a, b);
	}
	const matches = (host) => {
		const h = String(host).toLowerCase().replace(/\.$/, '');
		return patterns.some((p) => (p.startsWith('*.') ? h.endsWith(p.slice(1)) && h.length > p.length - 1 : h === p));
	};

	const origLookup = dns.lookup;
	dns.lookup = function lookup(hostname, options, callback) {
		if (typeof options === 'function') {
			callback = options;
			options = {};
		}
		if (!matches(hostname)) return origLookup.call(dns, hostname, options, callback);
		const opts = typeof options === 'number' ? { family: options } : options || {};
		if (opts.all) process.nextTick(callback, null, [{ address: ADDR, family: 4 }]);
		else process.nextTick(callback, null, ADDR, 4);
	};
	const origPLookup = dns.promises.lookup;
	dns.promises.lookup = async function lookup(hostname, options) {
		if (!matches(hostname)) return origPLookup.call(dns.promises, hostname, options);
		const opts = typeof options === 'number' ? { family: options } : options || {};
		return opts.all ? [{ address: ADDR, family: 4 }] : { address: ADDR, family: 4 };
	};

	const { TCP } = process.binding('tcp_wrap');
	const connect4 = TCP.prototype.connect;
	TCP.prototype.connect = function (req, address, port, ...rest) {
		if (address === ADDR) return connect4.call(this, req, '127.0.0.1', portMap.get(port) || port, ...rest);
		return connect4.call(this, req, address, port, ...rest);
	};
}
