// Packages
import { Except } from 'type-fest';

export interface Node {
	attrs: Map<string, string>;
	children: Map<string, Node | Node[]>;
	ns: string;
	value?: string;
}

export interface Item extends Node {
	id?: string;
	title?: string;
	description?: string;
	content?: string;
	image?: string;
	published?: string;
	updated?: string;

	/**
	 * A wrapper around `getMany` that returns a single node.
	 */
	get?: (names: string[]) => Node;

	/**
	 * Accepts multiple queries and return the first (if many) Node that
	 * matches one of the queries (executed in order).
	 *
	 * Examples:
	 *
	 *  * "title": returns the first <title> that has empty namespace
	 *
	 *  * "atom:link": returns the first <link> that has Atom namespace
	 *
	 *  * "atom:link[rel=self]": returns the first <link> that as Atom
	 *     namespace and has the attribute "rel" set to "self"
	 *
	 * 	We only recognize namespaces specified in `src/rss/namespaces.ts`
	 */
	getMany?: (names: string[]) => Node | Node[];
}

export interface Feed extends Except<Item, 'content'> {
	type?: string;
	version?: string;
	feedURL?: string;
	language?: string;
}

export interface Parser {
	/**
	 * Get the current parsed feed data.
	 */
	feed(): Feed;

	/**
	 * Iterates over avaiable items
	 */
	items: () => IterableIterator<Item>;

	/**
	 * Write text to stream.
	 */
	write: (chunk: string) => Parser;

	/**
	 * Close the current stream.
	 */
	close: () => void;
}
