// @ts-check

// Packages
import { SaxesParser } from 'saxes';
import { Transform } from 'readable-stream';

// Ours
import ns from './namespaces';

/**
 * @typedef Node
 * @property {string} [type]
 * @property {string} [version]
 * @property {string} [$name]
 * @property {string} [$prefix]
 * @property {string} [$local]
 * @property {string} [$uri]
 * @property {Object} attr
 * @property {string} value
 * @property {Object} meta
 *
 */

/**
 * RSS/ATOM Parser
 */
class Parser extends Transform {
	constructor() {
		// Object mode: In short, allows readable streams to push any type of chunk
		// other than Buffer and Uint8Array.
		//
		// https://nodejs.org/api/stream.html#stream_object_mode
		super({ objectMode: true });

		// XML Parser
		this._parser = new SaxesParser({ xmlns: true, position: false });
		this._parser.onopentag = this.onopentag.bind(this);
		this._parser.onclosetag = this.onclosetag.bind(this);
		this._parser.ontext = this.ontext.bind(this);
		this._parser.oncdata = this.ontext.bind(this);
		this._parser.onerror = this.onerror.bind(this);
		this._parser.onend = this.onend.bind(this);

		// Holds all open tags
		/** @type Array<Node> */
		this._stack = [];

		// We only emit a "feed" event if we:
		//
		// 1. Encountered an item and `_emitfeed` is true.
		// 2. Reached the end of the feed and `_emitfeed` is true.
		this._emitfeed = false;
	}

	/**
	 * @param {*} chunk
	 * @param {string} encoding
	 * @param {Function} cb
	 *
	 * @override
	 */
	_transform(chunk, encoding, cb) {
		try {
			this._parser.write(chunk);
			cb();
		} catch (err) {
			// Manually trigger an end, no more parsing!
			cb(err, null);
		}
	}

	/**
	 * This will be called when there is no more written data to be consumed,
	 * but before the 'end' event is emitted signaling the end of the Readable
	 * stream.
	 *
	 * @param {Function} cb
	 *
	 * @override
	 */
	_flush(cb) {
		try {
			this._parser.close();
			cb();
		} catch (err) {
			cb(err);
		}
	}

	/**
	 * @param {import('saxes').SaxesTag} tag
	 */
	onopentag(tag) {
		/**
		 * @type Node
		 */
		const node = {
			$name: tag.name,
			$prefix: tag.prefix,
			$local: tag.local,
			$uri: tag.uri,
			attr: this.attributes(tag),
			meta: {},
			value: ''
		};

		// TODO: check if we are inside xhtml

		// <rss> or <feed>
		if (this.isfeed(node) && this._stack.length === 0) {
			switch (node.$local) {
				case 'feed':
					node.type = 'atom';
					node.version = '1.0';
					break;
			}
		}

		// Emit updated feed
		if (this.isitem(node) && this._emitfeed) {
			// Don't emit again unless the feed has changed
			this._emitfeed = false;

			// Find & clone feed node
			const feed = { ...this._stack.find(n => this.isfeed(n)) };

			this.clear(feed);

			this.emit('feed', feed);
		}

		this._stack.unshift(node);
	}

	/**
	 * @param {import('saxes').SaxesTag} tag
	 */
	onclosetag(tag) {
		// NOTE: We only rely on the internal stack to ensure correct output
		// in some cases. That being said, it's up to the consumer to decide
		// what happens in case of XML error.
		if (this._stack.length === 0 || this._stack[0].$name !== tag.name) {
			return;
		}

		const node = this._stack.shift();

		if (this.isitem(node)) {
			// Remove private attributes
			this.clear(node);

			return this.emit('item', node);
		}

		const parent = this._stack[0];

		if (parent) {
			// Keep the name
			const key = node.$name;

			// Remove private attributes
			this.clear(node);

			parent.meta = { ...parent.meta, [key]: node };
		}

		if (parent && this.isfeed(parent)) {
			this._emitfeed = true;
		}

		if (this.isfeed(node) && this._emitfeed) {
			// This is probably the end anyway, but still, let's make sure that
			// We don't emit unnecessary events
			this._emitfeed = false;

			this.clear(node);

			this.emit('feed', node);
		}
	}

	/**
	 * @param {string} text
	 */
	ontext(text) {
		text = text.trim();
		if (text && this._stack.length > 0) {
			this._stack[0].value += text;
		}
	}

	/**
	 * @param {Error} err
	 */
	onerror(err) {
		this.emit('error', err);
	}

	onend() {
		// We are done here
		this.push(null);
	}

	/**
	 * Checks if a given node is <rss> or <feed> tag
	 *
	 * @param {Node} node
	 * @returns {Boolean}
	 */
	isfeed(node) {
		return Boolean(
			(node.$local === 'feed' && ns[node.$uri] === 'atom') ||
				// Or
				node.type
		);
	}

	/**
	 * Checks if a given node is <item> or <entry> tag
	 *
	 * @param {Node} node
	 * @returns {Boolean}
	 */
	isitem(node) {
		return Boolean(node.$local === 'entry' && ns[node.$uri] === 'atom');
	}

	/**
	 * Parse tag attributes
	 *
	 * @param {import('saxes').SaxesTag} tag
	 *
	 */
	attributes({ attributes }) {
		const attrs = {};

		for (const key in attributes) {
			// `attributes` should always be Array of Objects (due to xmlns:true prop)
			// @ts-ignore
			attrs[key] = attributes[key].value;
		}
		return attrs;
	}

	/**
	 * Removes private attributes from a given node.
	 * @param {Node} node
	 */
	clear(node) {
		delete node.$name;
		delete node.$prefix;
		delete node.$local;
		delete node.$uri;
	}
}

export default Parser;
