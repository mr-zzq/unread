// Packages
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

// Ours
import pkg from './package.json';

export default {
	input: pkg.source,
	output: [
		{
			file: pkg.browser,
			format: 'umd',
			name: 'Feedify'
		},
		{
			file: pkg.module,
			format: 'es'
		},
		{
			file: pkg.main,
			format: 'cjs'
		}
	],
	plugins: [
		resolve(),
		commonjs(),
		babel({ exclude: 'node_modules/**' }),
		typescript(),
		terser()
	]
};
