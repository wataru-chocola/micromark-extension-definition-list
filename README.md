# micromark-extension-definition-list

[![Node.js CI](https://github.com/wataru-chocola/micromark-extension-definition-list/actions/workflows/node.js.yml/badge.svg)](https://github.com/wataru-chocola/micromark-extension-definition-list/actions/workflows/node.js.yml)

[micromark](https://github.com/micromark/micromark) extension to support definition lists.

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

## Limitation

**This plugin might not work with other 3rd party plugins using `document` level tokenizer**.

The tokenizer of this plugin starts at the start of a definition description, not a definition term.
Definition terms have to be resolved from other events.
To do so, this plugin uses some knowledge about built-in `document` token types.


## Test in development

For development purpose, you can run tests with debug messages.

```console
$ DEBUG="micromark-extension-definition-list:*" npm run test-dev
```
