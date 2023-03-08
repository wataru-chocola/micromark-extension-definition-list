import { defList, defListHtml } from './index.js';
import { micromark } from 'micromark';

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
