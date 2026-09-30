import { test, expect } from 'vitest';

import { defList, defListHtml } from './index.js';
import { micromark, parse, postprocess, preprocess } from 'micromark';

import { dedent } from 'ts-dedent';

import type { TestCases } from './coreTestcases.js';
import { coreTestCases } from './coreTestcases.js';

test.each(coreTestCases)('core tests: $title', ({ markdown, html }) => {
  const parse = (md: string) =>
    micromark(md, {
      extensions: [defList],
      htmlExtensions: [defListHtml],
    });
  const result = parse(dedent(markdown));
  expect(result).toEqual(dedent(html));
});

const htmlTestCases: TestCases = [
  {
    title: 'deflist and table',
    markdown: `
    <em>term</em>
    : hello
    `,
    html: `
    <dl>
    <dt><em>term</em></dt>
    <dd>hello</dd>
    </dl>`,
  },
];

test.each([...coreTestCases, ...htmlTestCases])(
  'core tests with HTML: $title',
  ({ markdown, html }) => {
    const parse = (md: string) =>
      micromark(md, {
        allowDangerousHtml: true,
        extensions: [defList],
        htmlExtensions: [defListHtml],
      });
    const result = parse(dedent(markdown));
    expect(result).toEqual(dedent(html));
  },
);

test.each([2, 3, 4])('merged deflist of %i terms ends with its last description', (count) => {
  const markdown = Array.from({ length: count }, (_, i) => `term ${i}\n: description ${i}\n`).join(
    '\n',
  );
  const events = postprocess(
    parse({ extensions: [defList] })
      .document()
      .write(preprocess()(markdown, undefined, true)),
  );
  const tokenEnd = (type: string) =>
    events
      .filter(([kind, token]) => kind === 'exit' && token.type === type)
      .map(([, token]) => token.end.offset);
  expect(tokenEnd('defList')).toEqual([Math.max(...tokenEnd('defListDescription'))]);
});
