import { defList, defListHtml } from './index.js';
import { micromark } from 'micromark';

const parse = (md: string) =>
  micromark(md, { extensions: [defList], htmlExtensions: [defListHtml] });

test('simple definition list', () => {
  const result = parse(`
Apple
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`);
  const expected = `
<dl>
<dt>Apple</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('definition with multiple lines without indentation', () => {
  const result = parse(`
Apple
:   Pomaceous fruit of plants of the genus Malus in 
the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`);
  const expected = `
<dl>
<dt>Apple</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('have one difinition associated with one term', () => {
  const result = parse(`
Apple
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.
:   An American computer company.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`);
  const expected = `
<dl>
<dt>Apple</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dd>An American computer company.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('associate multiple terms to a definition', () => {
  const result = parse(`
Term 1
Term 2
:   Definition a

Term 3
:   Definition b
`);
  const expected = `
<dl>
<dt>Term 1</dt>
<dt>Term 2</dt>
<dd>Definition a</dd>
<dt>Term 3</dt>
<dd>Definition b</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('definition preceded by a blank line', () => {
  const result = parse(`
Apple

:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

Orange

:    The fruit of an evergreen tree of the genus Citrus.
`);
  const expected = `
<dl>
<dt>Apple</dt>
<dd>
<p>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</p>
</dd>
<dt>Orange</dt>
<dd>
<p>The fruit of an evergreen tree of the genus Citrus.</p>
</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('definition term can be decorated', () => {
  const result = parse(`
A**pp**le
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`);
  const expected = `
<dl>
<dt>A<strong>pp</strong>le</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('definition term with markdown definition', () => {
  const result = parse(`
[ra]: http://example.com/ra
A[pp]le
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

O[ra]nge
:   The fruit of an evergreen tree of the genus Citrus.

[pp]: http://example.com/
`);
  const expected = `
<dl>
<dt>A<a href="http://example.com/">pp</a>le</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>O<a href="http://example.com/ra">ra</a>nge</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('definition before dd-like paragraph (1)', () => {
  const result = parse(`
[fruit]: http://example.com/fruit

:   Pomaceous [fruit] of plants of the genus Malus in 
    the family Rosaceae.
`);
  const expected = `
<p>:   Pomaceous <a href="http://example.com/fruit">fruit</a> of plants of the genus Malus in
the family Rosaceae.</p>
`;
  expect(result).toEqual(expected.trimLeft());
});

test('definition before dd-like paragraph (2)', () => {
  const result = parse(`
[fruit]: http://example.com/fruit
:   Pomaceous [fruit] of plants of the genus Malus in 
    the family Rosaceae.
`);
  const expected = `
<dl>
<dt></dt>
<dd>Pomaceous <a href="http://example.com/fruit">fruit</a> of plants of the genus Malus in
the family Rosaceae.</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('defList can contain multiple paragraph and other block-level elements', () => {
  const result = parse(`
Term 1

:   This is a definition with two paragraphs. Lorem ipsum 
    dolor sit amet, consectetuer adipiscing elit. Aliquam 
    hendrerit mi posuere lectus.

    Vestibulum enim wisi, viverra nec, fringilla in, laoreet
    vitae, risus.

:   Second definition for term 1, also wrapped in a paragraph
    because of the blank line preceding it.

Term 2

:   This definition has a code block, a blockquote and a list.

        code block.

    > block quote
    > on two lines.

    1.  first list item
    2.  second list item
`);
  const expected = `
<dl>
<dt>Term 1</dt>
<dd>
<p>This is a definition with two paragraphs. Lorem ipsum
dolor sit amet, consectetuer adipiscing elit. Aliquam
hendrerit mi posuere lectus.</p>
<p>Vestibulum enim wisi, viverra nec, fringilla in, laoreet
vitae, risus.</p>
</dd>
<dd>
<p>Second definition for term 1, also wrapped in a paragraph
because of the blank line preceding it.</p>
</dd>
<dt>Term 2</dt>
<dd>
<p>This definition has a code block, a blockquote and a list.</p>
<pre><code>code block.
</code></pre>
<blockquote>
<p>block quote
on two lines.</p>
</blockquote>
<ol>
<li>first list item</li>
<li>second list item</li>
</ol>
</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('document with multiple defList and other contents', () => {
  const result = parse(`
# Header 1

Term 1
:   Description 1
:   Description 2

Term 2
:   Description 3

This is paragraph.

New Term A
: Description A
  with countinous line.
: Description B

`);
  const expected = `
<h1>Header 1</h1>
<dl>
<dt>Term 1</dt>
<dd>Description 1</dd>
<dd>Description 2</dd>
<dt>Term 2</dt>
<dd>Description 3</dd>
</dl>
<p>This is paragraph.</p>
<dl>
<dt>New Term A</dt>
<dd>Description A
with countinous line.</dd>
<dd>Description B</dd>
</dl>`;
  expect(result).toEqual(expected.trimLeft());
});

test('defList cannot start without any term', () => {
  const result = parse(`
: Definition a
`);
  const expected = `
<p>: Definition a</p>
`;
  expect(result).toEqual(expected.trimLeft());
});

test('defList cannot start without any term (2)', () => {
  const result = parse(`
- a
- b

: Definition a
`);
  const expected = `
<ul>
<li>a</li>
<li>b</li>
</ul>
<p>: Definition a</p>
`;
  expect(result).toEqual(expected.trimLeft());
});

test('defList cannot start from lazy line', () => {
  const result = parse(`
> BlockQuote
Not Term
: Definition a
`);
  const expected = `
<blockquote>
<p>BlockQuote
Not Term
: Definition a</p>
</blockquote>
`;
  expect(result).toEqual(expected.trimLeft());
});

test('no more than two blank lines between term and description', () => {
  const result = parse(`
Apple


:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

Orange


:   The fruit of an evergreen tree of the genus Citrus.
`);
  const expected = `
<p>Apple</p>
<p>:   Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</p>
<p>Orange</p>
<p>:   The fruit of an evergreen tree of the genus Citrus.</p>
`;
  expect(result).toEqual(expected.trimLeft());
});
