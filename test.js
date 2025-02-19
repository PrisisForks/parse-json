import process from 'node:process';
import test from 'ava';
import {outdent} from 'outdent';
import stripAnsi from 'strip-ansi';
import parseJson, {JSONError} from './index.js';

const errorMessageRegex = (() => {
	const version = Number(process.versions.node.split('.')[0]);

	if (version < 20) {
		return /Unexpected token "}"/;
	}

	if (version < 21) {
		return /Expected double-quoted property name in JSON at position 16 while parsing/;
	}

	return /Expected double-quoted property name in JSON at position 16 \(line 3 column 1\) while parsing/;
})();
const errorMessageRegexWithFileName = new RegExp(errorMessageRegex.source + '.*in foo\\.json');
const INVALID_JSON_STRING = outdent`
  {
  	"foo": true,
  }
`;
const EXPECTED_CODE_FRAME = `
  1 | {
  2 | 	"foo": true,
> 3 | }
    | ^
`.slice(1, -1);

test('main', t => {
	t.deepEqual(parseJson('{"foo": true}'), {foo: true});

	t.throws(() => {
		parseJson(INVALID_JSON_STRING);
	}, {
		name: 'JSONError',
		message: errorMessageRegex,
	});

	t.throws(() => {
		try {
			parseJson(INVALID_JSON_STRING);
		} catch (error) {
			error.fileName = 'foo.json';
			throw error;
		}
	}, {
		message: errorMessageRegexWithFileName,
	});

	t.throws(() => {
		parseJson(INVALID_JSON_STRING, 'foo.json');
	}, {
		message: errorMessageRegexWithFileName,
	});

	t.throws(() => {
		try {
			parseJson(INVALID_JSON_STRING, 'bar.json');
		} catch (error) {
			error.fileName = 'foo.json';
			throw error;
		}
	}, {
		message: errorMessageRegexWithFileName,
	});
});

test('throws exported error error', t => {
	t.throws(() => {
		parseJson('asdf');
	}, {
		instanceOf: JSONError,
	});
});

test('has error frame properties', t => {
	try {
		parseJson(INVALID_JSON_STRING, 'foo.json');
	} catch (error) {
		t.is(error.rawCodeFrame, EXPECTED_CODE_FRAME);
		t.is(stripAnsi(error.codeFrame), EXPECTED_CODE_FRAME);
	}
});
