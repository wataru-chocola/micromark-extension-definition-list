export type TestCases = TestCase[];
export type TestCase = {
  title: string;
  markdown: string;
  html: string;
};

export const coreTestCases: TestCases = [
  {
    title: 'simple definition list',
    markdown: `
Apple
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`,
    html: `
<dl>
<dt>Apple</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`,
  },
  {
    title: 'definition with multiple lines without indentation',
    markdown: `
Apple
:   Pomaceous fruit of plants of the genus Malus in 
the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`,
    html: `
<dl>
<dt>Apple</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`,
  },
  {
    title: 'have one definition associated with one term',
    markdown: `
Apple
:   Pomaceous fruit of plants of the genus Malus in 
    the family Rosaceae.
:   An American computer company.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`,
    html: `<dl>
<dt>Apple</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dd>An American computer company.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`,
  },
  {
    title: 'associate multiple terms to a definition',
    markdown: `
Term 1
Term 2
:   Definition a

Term 3
:   Definition b
`,
    html: `<dl>
<dt>Term 1
</dt>
<dt>Term 2</dt>
<dd>Definition a</dd>
<dt>Term 3</dt>
<dd>Definition b</dd>
</dl>`,
  },

  {
    title: 'definition preceded by a blank line',
    markdown: `
Apple

:   Pomaceous fruit of plants of the genus Malus in
    the family Rosaceae.

Orange

:    The fruit of an evergreen tree of the genus Citrus.
`,
    html: `<dl>
<dt>Apple</dt>
<dd>
<p>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</p>
</dd>
<dt>Orange</dt>
<dd>
<p>The fruit of an evergreen tree of the genus Citrus.</p>
</dd>
</dl>`,
  },

  {
    title: 'definition term can be decorated',
    markdown: `
A**pp**le
:   Pomaceous fruit of plants of the genus Malus in
    the family Rosaceae.

Orange
:   The fruit of an evergreen tree of the genus Citrus.
`,
    html: `<dl>
<dt>A<strong>pp</strong>le</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>Orange</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`,
  },

  {
    title: 'definition term with markdown definition',
    markdown: `
[ra]: http://example.com/ra
A[pp]le
:   Pomaceous fruit of plants of the genus Malus in
    the family Rosaceae.

O[ra]nge
:   The fruit of an evergreen tree of the genus Citrus.

[pp]: http://example.com/
`,
    html: `<dl>
<dt>A<a href="http://example.com/">pp</a>le</dt>
<dd>Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</dd>
<dt>O<a href="http://example.com/ra">ra</a>nge</dt>
<dd>The fruit of an evergreen tree of the genus Citrus.</dd>
</dl>`,
  },

  {
    title: 'definition before dd-like paragraph (1)',
    markdown: `
[fruit]: http://example.com/fruit

:   Pomaceous [fruit] of plants of the genus Malus in
    the family Rosaceae.
`,
    html: `<p>:   Pomaceous <a href="http://example.com/fruit">fruit</a> of plants of the genus Malus in
the family Rosaceae.</p>
`,
  },

  {
    title: 'definition before dd-like paragraph (2)',
    markdown: `
[fruit]: http://example.com/fruit
:   Pomaceous [fruit] of plants of the genus Malus in
    the family Rosaceae.
`,
    html: `<p>:   Pomaceous <a href="http://example.com/fruit">fruit</a> of plants of the genus Malus in
the family Rosaceae.</p>
`,
  },

  {
    title: 'nested defList',
    markdown: `
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
`,
    html: `<dl>
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
</dl>`,
  },

  {
    title: 'defList can contain multiple paragraph and other block-level elements',
    markdown: `
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
`,
    html: `<dl>
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
</dl>`,
  },

  {
    title: 'document with multiple defList and other contents',
    markdown: `
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

`,
    html: `<h1>Header 1</h1>
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
</dl>`,
  },

  {
    title: 'defList cannot start without any term',
    markdown: `
: Definition a
`,
    html: `<p>: Definition a</p>
`,
  },

  {
    title: 'defList cannot start without any term (2)',
    markdown: `
- a
- b

: Definition a
`,
    html: `<ul>
<li>a</li>
<li>b</li>
</ul>
<p>: Definition a</p>
`,
  },

  {
    title: 'defList cannot start without any term, but this IS defList',
    markdown: `
: Definition a
: Definition b
`,
    html: `<dl>
<dt>: Definition a</dt>
<dd>Definition b</dd>
</dl>`,
  },

  {
    title: 'colon after thematicBreak',
    markdown: `
****
: NotDefinition
`,
    html: `<hr />
<p>: NotDefinition</p>
`,
  },

  {
    title: 'colon after heading',
    markdown: `
# heading
: NotDefinition
`,
    html: `<h1>heading</h1>
<p>: NotDefinition</p>
`,
  },

  {
    title: 'colon after the start of fenced code',
    markdown: `
\`\`\`
: Definition
\`\`\`
`,
    html: `<pre><code>: Definition
</code></pre>
`,
  },

  {
    title: 'defList starting in lazy line of blockquote',
    markdown: `
> BlockQuote
Term
: Definition a
`,
    html: `<blockquote>
<p>BlockQuote
</p>
</blockquote>
<dl>
<dt>Term</dt>
<dd>Definition a</dd>
</dl>`,
  },

  {
    title: 'no more than two blank lines between term and description',
    markdown: `
Apple


:   Pomaceous fruit of plants of the genus Malus in
    the family Rosaceae.

Orange


:   The fruit of an evergreen tree of the genus Citrus.
`,
    html: `<p>Apple</p>
<p>:   Pomaceous fruit of plants of the genus Malus in
the family Rosaceae.</p>
<p>Orange</p>
<p>:   The fruit of an evergreen tree of the genus Citrus.</p>
`,
  },

  {
    title: 'regression: list inside dd followed by another dd without emptyline',
    markdown: `
Term1
: Description 1.
    * li1
    * li2
    * li3
: Description 2.
`,
    html: `<dl>
<dt>Term1</dt>
<dd>Description 1.
<ul>
<li>li1</li>
<li>li2</li>
<li>li3</li>
</ul>
</dd>
<dd>Description 2.</dd>
</dl>`,
  },

  {
    title: 'regression: list inside dd followed by not-dd text without emptyline',
    markdown: `
Term1
: Description 1.
    * li1
    * li2
NotTerm2
: Description 2.
`,
    html: `<dl>
<dt>Term1</dt>
<dd>Description 1.
<ul>
<li>li1</li>
<li>li2
NotTerm2</li>
</ul>
</dd>
<dd>Description 2.</dd>
</dl>`,
  },

  {
    title: 'regression: blankline followed by fenced code',
    markdown: `
Term
:
    \`\`\`
    This is test.
    \`\`\`
`,
    html: `<dl>
<dt>Term</dt>
<dd>
<pre><code>This is test.
</code></pre>
</dd>
</dl>`,
  },

  {
    title: 'regression: dd inside of blockquote',
    markdown: `
> Term1
> : Description 1.
> : Description 2.
>
> Term2
> : Description 1.
> : Description 2.
`,
    html: `<blockquote>
<dl>
<dt>Term1</dt>
<dd>Description 1.</dd>
<dd>Description 2.</dd>
<dt>Term2</dt>
<dd>Description 1.</dd>
<dd>Description 2.</dd>
</dl>
</blockquote>`,
  },

  {
    title: 'regression: dd inside of nested blockquote',
    markdown: `
> > Term1
> > : Description 1.
> > : Description 2.
`,
    html: `<blockquote>
<blockquote>
<dl>
<dt>Term1</dt>
<dd>Description 1.</dd>
<dd>Description 2.</dd>
</dl>
</blockquote>
</blockquote>`,
  },

  {
    title: 'regression: dd-like stuff inside of blockquote',
    markdown: `
test

> : Description 1.
`,
    html: `<p>test</p>
<blockquote>
<p>: Description 1.</p>
</blockquote>
`,
  },

  {
    title: 'regression: dd-like stuff inside of nested blockquote',
    markdown: `
> Term1
> > : Description 1.
`,
    html: `<blockquote>
<p>Term1</p>
<blockquote>
<p>: Description 1.</p>
</blockquote>
</blockquote>
`,
  },
];
