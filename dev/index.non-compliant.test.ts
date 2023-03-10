import { defList, defListHtml } from './index.js';
import { micromark } from 'micromark';

import { dedent } from 'ts-dedent';

export const nonCompliantCases = [
  // indented code inside list item produces extra leading spaces.
  {
    title: 'indented code',
    markdown: `
    Term
    :       This is test.
            And next line.
    
    *   one
    *       Code first line.
            Second.
    `,
    html: `
    <dl>
    <dt>Term</dt>
    <dd>
    <pre><code>  This is test.
      And next line.
    </code></pre>
    </dd>
    </dl>
    <ul>
    <li>one</li>
    <li>
    <pre><code>  Code first line.
      Second.
    </code></pre>
    </li>
    </ul>`,
  },
];

test.each(nonCompliantCases)('non-compliant tests: $title', ({ markdown, html }) => {
  const parse = (md: string) =>
    micromark(md, {
      extensions: [defList],
      htmlExtensions: [defListHtml],
    });
  const result = parse(dedent(markdown));
  expect(result).toEqual(dedent(html));
});
