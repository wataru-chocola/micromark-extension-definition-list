import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { defList, defListHtml } from './index.js';

import { coreTestCases } from './coreTestcases.js';

test.each(coreTestCases)('with gfm: $title', ({ markdown, html }) => {
  const parse = (md: string) =>
    micromark(md, { extensions: [gfm(), defList], htmlExtensions: [gfmHtml(), defListHtml] });
  const result = parse(markdown);
  expect(result).toEqual(html.trimStart());
});
