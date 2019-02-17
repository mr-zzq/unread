// @ts-check

// Packages
const { Transform } = require('readable-stream');
const { SaxesParser } = require('saxes');
const { StringDecoder } = require('string_decoder');

/**
 * RSS/ATOM Parser
 */
class Parser extends Transform {
	constructor() {
		super();
		// XML Parser
		this._parser = new SaxesParser({ xmlns: true });
		this._parser.onopentag = this.onopentag.bind(this);
		this._parser.onclosetag = this.onclosetag.bind(this);
		this._parser.ontext = this.ontext.bind(this);
		this._parser.oncdata = this.ontext.bind(this);
		this._parser.onerror = this.onerror.bind(this);

		// Decodes Buffer to string
		// TODO: support other encoding options
		this._decoder = new StringDecoder('utf8');
	}

	/**
	 * @param {*} chunk
	 * @param {string} encoding
	 * @param {Function} cb
	 *
	 * @override
	 */
	_transform(chunk, encoding, cb) {
		const str = this._decoder.write(chunk);
		this._parser.write(str);

		cb();
	}

	/**
	 * @param {Function} cb
	 *
	 * @override
	 */
	_flush(cb) {
		this._parser.close();
		this._parser = null;

		this._decoder = null;

		cb();
	}

	/**
	 * @param {import('saxes').SaxesTag} tag
	 */
	onopentag(tag) {
		console.log(tag);
	}

	/**
	 * @param {import('saxes').SaxesTag} tag
	 */
	onclosetag(tag) {
		console.log(tag);
	}

	/**
	 * @param {string} text
	 */
	ontext(text) {
		console.log(text);
	}

	/**
	 * @param {Error} err
	 */
	onerror(err) {
		console.log(err);
	}
}

module.exports = Parser;
