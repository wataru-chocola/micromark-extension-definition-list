# micromark-extension-definition-list

[micromark](https://github.com/micromark/micromark) extension to support definition lists.

## Feature

* fully support [Definition Lists Syntax of php-markdown]
* can be integrated with [remark] / [rehype] / [unified] using [rehype-definition-list] (or [mdast-util-definition-list])
* shipped with types

[Definition Lists Syntax of php-markdown]: https://michelf.ca/projects/php-markdown/extra/#def-list
[remark]: https://github.com/remarkjs/remark
[rehype]: https://github.com/rehypejs/rehype
[unified]: https://github.com/unifiedjs/unified
[mdast-util-definition-list]: https://github.com/wataru-chocola/mdast-util-definition-list
[rehype-definition-list]: https://github.com/wataru-chocola/rehype-definition-list

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


## Test in develepment

For development purpose, you can run tests with debug messages.

```console
$ DEBUG="micromark-extension-definition-list:syntax" npm run test-dev
```
