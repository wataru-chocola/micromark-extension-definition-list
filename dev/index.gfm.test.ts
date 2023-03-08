import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { defList, defListHtml } from './index.js';

import { dedent } from 'ts-dedent';

import { coreTestCases } from './coreTestcases.js';

test.each(coreTestCases)('with gfm: $title', ({ markdown, html }) => {
  const parse = (md: string) =>
    micromark(md, { extensions: [gfm(), defList], htmlExtensions: [gfmHtml(), defListHtml] });
  const result = parse(dedent(markdown));
  expect(result).toEqual(dedent(html));
});
