# micromark-extension-definition-list

[![Node.js CI](https://github.com/wataru-chocola/micromark-extension-definition-list/actions/workflows/node.js.yml/badge.svg)](https://github.com/wataru-chocola/micromark-extension-definition-list/actions/workflows/node.js.yml)

[micromark](https://github.com/micromark/micromark) extension to support definition lists.


## Compatibility Note

**This extension  might not work with other extensions**.

The plugin's tokenizer needs knowledge about token types that other tokenizers generate to create defList.
If you find any extensions not working with this, please [create issue](https://github.com/wataru-chocola/micromark-extension-definition-list/issues/new/choose).


## Feature

* fully support [Definition Lists Syntax of php-markdown]
* can be integrated with [remark] / [rehype] / [unified] using [remark-definition-list] (or [mdast-util-definition-list])
* shipped with types

[Definition Lists Syntax of php-markdown]: https://michelf.ca/projects/php-markdown/extra/#def-list
[remark]: https://github.com/remarkjs/remark
[rehype]: https://github.com/rehypejs/rehype
[unified]: https://github.com/unifiedjs/unified
[mdast-util-definition-list]: https://github.com/wataru-chocola/mdast-util-definition-list
[remark-definition-list]: https://github.com/wataru-chocola/remark-definition-list

## Install

Install from npm.

```console
$ npm install micromark-extension-definition-list
```

## Use

```javascript
import { micromark } from 'micromark';
import { defList, defListHtml } from 'micromark-extension-definition-list';

const markdown = `
Apple
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`;
const output = micromark(markdown, {
  extensions: [defList],
  htmlExtensions: [defListHtml]
});
```


## Known Issues

### dd-like line stops parsing gfm-table

Input:

```markdown
head
| - |
row1
: row2
```

Expected HTML:

```html
<table>
  <thead>
    <tr><th>head</th></tr>
  </thead>
  <tbody>
    <tr><td>row1</td></tr>
    <tr><td>: row2</td></tr>
  </tbody>
</table>
```

Actual behavior:

```html
<table>
  <thead>
    <tr><th>head</th></tr>
  </thead>
  <tbody>
    <tr><td>row1</td></tr>
  </tbody>
</table>
<p>: row2</p>
```

Workaround: Escape colon at the start of line

```markdown
head
| - |
row1
\: row2
```



## Test in development

For development purpose, you can run tests with debug messages.

```console
$ DEBUG="micromark-extension-definition-list:*" npm run test-dev -- -t <title_pattern>
```
