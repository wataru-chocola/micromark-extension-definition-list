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
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
});

test('have one definition associated with one term', () => {
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
  expect(result).toEqual(expected.trimStart());
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
<dt>Term 1
</dt>
<dt>Term 2</dt>
<dd>Definition a</dd>
<dt>Term 3</dt>
<dd>Definition b</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
});

test('definition before dd-like paragraph (2)', () => {
  const result = parse(`
[fruit]: http://example.com/fruit
:   Pomaceous [fruit] of plants of the genus Malus in 
    the family Rosaceae.
`);
  const expected = `
<p>:   Pomaceous <a href="http://example.com/fruit">fruit</a> of plants of the genus Malus in
the family Rosaceae.</p>
`;
  expect(result).toEqual(expected.trimStart());
});

test('nested defList', () => {
  const result = parse(`
Term 1

:   This is a definition wrapped by paragraph.

    Nested term 1
    :   Nested description here.
        And next line.
    
    Nested term 2
    :   Description 2.

:   Description.

Term 2

:   Description.
`);
  const expected = `
<dl>
<dt>Term 1</dt>
<dd>
<p>This is a definition wrapped by paragraph.</p>
<dl>
<dt>Nested term 1</dt>
<dd>Nested description here.
And next line.</dd>
<dt>Nested term 2</dt>
<dd>Description 2.</dd>
</dl></dd>
<dd>
<p>Description.</p>
</dd>
<dt>Term 2</dt>
<dd>
<p>Description.</p>
</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
});

test('defList cannot start without any term', () => {
  const result = parse(`
: Definition a
`);
  const expected = `
<p>: Definition a</p>
`;
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
});

test('defList cannot start without any term, but this IS defList', () => {
  const result = parse(`
: Definition a
: Definition b
`);
  const expected = `
<dl>
<dt>: Definition a</dt>
<dd>Definition b</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
});

test('defList starting in lazy line of blockquote', () => {
  const result = parse(`
> BlockQuote
Term
: Definition a
`);
  const expected = `
<blockquote>
<p>BlockQuote
</p>
</blockquote>
<dl>
<dt>Term</dt>
<dd>Definition a</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
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
  expect(result).toEqual(expected.trimStart());
});

test('regression: list inside dd followed by another dd without emptyline', () => {
  const result = parse(`
Term1
: Description 1.
    * li1
    * li2
    * li3
: Description 2.
`);
  const expected = `
<dl>
<dt>Term1</dt>
<dd>Description 1.
<ul>
<li>li1</li>
<li>li2</li>
<li>li3</li>
</ul>
</dd>
<dd>Description 2.</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
});

test('regression: list inside dd followed by not-dd text without emptyline', () => {
  const result = parse(`
Term1
: Description 1.
    * li1
    * li2
NotTerm2
: Description 2.
`);
  const expected = `
<dl>
<dt>Term1</dt>
<dd>Description 1.
<ul>
<li>li1</li>
<li>li2
NotTerm2</li>
</ul>
</dd>
<dd>Description 2.</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
});

test('regression: blankline followed by fenced code', () => {
  const result = parse(`
Term
:
    \`\`\`
    This is test.
    \`\`\`
`);
  const expected = `
<dl>
<dt>Term</dt>
<dd>
<pre><code>This is test.
</code></pre>
</dd>
</dl>`;
  expect(result).toEqual(expected.trimStart());
});

test('regression: dd inside of blockquote', () => {
  const result = parse(`
> Term1
> : Description 1.
> : Description 2.
>
> Term2
> : Description 1.
> : Description 2.
`);
  const expected = `
<blockquote>
<dl>
<dt>Term1</dt>
<dd>Description 1.</dd>
<dd>Description 2.</dd>
<dt>Term2</dt>
<dd>Description 1.</dd>
<dd>Description 2.</dd>
</dl>
</blockquote>`;
  expect(result).toEqual(expected.trimStart());
});

test('regression: dd inside of nested blockquote', () => {
  const result = parse(`
> > Term1
> > : Description 1.
> > : Description 2.
`);
  const expected = `
<blockquote>
<blockquote>
<dl>
<dt>Term1</dt>
<dd>Description 1.</dd>
<dd>Description 2.</dd>
</dl>
</blockquote>
</blockquote>`;
  expect(result).toEqual(expected.trimStart());
});

test('regression: dd-like stuff inside of blockquote', () => {
  const result = parse(`
test

> : Description 1.
`);
  const expected = `
<p>test</p>
<blockquote>
<p>: Description 1.</p>
</blockquote>
`;
  expect(result).toEqual(expected.trimStart());
});

test('regression: dd-like stuff inside of nested blockquote', () => {
  const result = parse(`
> Term1
> > : Description 1.
`);
  const expected = `
<blockquote>
<p>Term1</p>
<blockquote>
<p>: Description 1.</p>
</blockquote>
</blockquote>
`;
  expect(result).toEqual(expected.trimStart());
});
