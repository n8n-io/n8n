// `@types/js-nacl@1.3.0` is incomplete for the sealed-box API we use:
//   - `instantiate` is typed as returning `void`, but it returns the promise that
//     resolves to the same Nacl instance it passes to the callback (and rejects if
//     initialisation aborts). Fixed upstream in @types/js-nacl 1.3.1+.
//   - `crypto_box_seal`/`crypto_box_seal_open` are missing entirely, though js-nacl
//     has exported them since 1.3.
// https://github.com/tonyg/js-nacl#anonymous-authenticated-encryption-crypto_box_seal
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
