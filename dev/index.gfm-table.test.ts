import { micromark } from 'micromark';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';
import { defList, defListHtml } from './index.js';

import { dedent } from 'ts-dedent';

import type { TestCases } from './coreTestcases.js';
import { coreTestCases } from './coreTestcases.js';

const tblTestCases: TestCases = [
  {
    title: 'simple deflist and table',
    markdown: `
    a
    : b

    | c |
    | - |
    `,
    html: `
    <dl>
    <dt>a</dt>
    <dd>b</dd>
    </dl>
    <table>
    <thead>
    <tr>
    <th>c</th>
    </tr>
    </thead>
    </table>`,
  },

  {
    title: 'left-alignment column',
    markdown: `
    head1 | head2
    :--|:--
    cell1 | cell2
    `,
    html: `
    <table>
    <thead>
    <tr>
    <th align="left">head1</th>
    <th align="left">head2</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td align="left">cell1</td>
    <td align="left">cell2</td>
    </tr>
    </tbody>
    </table>
    `,
  },

  {
    title: 'colon inside table cell',
    markdown: `
    head1 | head2
    |:-:|:-:|
    cell1 | : cell2
    `,
    html: `
    <table>
    <thead>
    <tr>
    <th align="center">head1</th>
    <th align="center">head2</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td align="center">cell1</td>
    <td align="center">: cell2</td>
    </tr>
    </tbody>
    </table>
    `,
  },

  {
    title: 'known issue: dd-like line breaks table',
    markdown: `
    aaa
    | - |
    bbb
    :   c1
        c2
    `,
    html: `
    <table>
    <thead>
    <tr>
    <th>aaa</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td>bbb</td>
    </tr>
    </tbody>
    </table>
    <p>:   c1
    c2</p>
    `,
  },

  {
    title: 'workaround: dd-like line breaks table',
    markdown: `
    aaa
    | - |
    bbb
    \\: c1
    `,
    html: `
    <table>
    <thead>
    <tr>
    <th>aaa</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td>bbb</td>
    </tr>
    <tr>
    <td>: c1</td>
    </tr>
    </tbody>
    </table>
    `,
  },
];

const parse = (md: string) =>
  micromark(md, { extensions: [gfmTable, defList], htmlExtensions: [gfmTableHtml, defListHtml] });

test.each([...coreTestCases, ...tblTestCases])('with gfm-table: $title', ({ markdown, html }) => {
  const result = parse(dedent(markdown));
  expect(result).toEqual(dedent(html));
});
