// `@types/js-nacl` omits the sealed-box helpers, which js-nacl has exported since 1.3.
// See https://github.com/tonyg/js-nacl#anonymous-authenticated-encryption-crypto_box_seal
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
}
