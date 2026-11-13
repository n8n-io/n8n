// `@types/js-nacl@1.3.0` omits the sealed-box API and types `instantiate` as void.
import 'js-nacl';

declare module 'js-nacl' {
	interface Nacl {
		crypto_box_seal: (msg: Uint8Array, recipientPublicKey: Uint8Array) => Uint8Array;
		crypto_box_seal_open: (
			ciphertext: Uint8Array,
			recipientPublicKey: Uint8Array,
			recipientSecretKey: Uint8Array,
		) => Uint8Array;
	}

	function instantiate(cb: NaclCallback, opts?: NaclOpts): Promise<Nacl>;
}
