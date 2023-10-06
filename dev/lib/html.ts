import { CompileContext, Token } from 'micromark-util-types';
import { tokenTypes } from './types.js';

export const defListHtml = {
  enter: {
    [tokenTypes.defList](this: CompileContext): undefined {
      this.lineEndingIfNeeded();
      this.tag('<dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): undefined {
      this.lineEndingIfNeeded();
      this.tag('<dt>');
      this.setData('slurpOneLineEnding', true);
    },
    [tokenTypes.defListDescription](this: CompileContext, token: Token): undefined {
      this.lineEndingIfNeeded();
      this.tag('<dd>');
      this.getData('tightStack').push(!token._loose);
    },
  },
  exit: {
    [tokenTypes.defList](this: CompileContext): undefined {
      this.lineEndingIfNeeded();
      this.tag('</dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): undefined {
      this.tag('</dt>');
      this.setData('slurpOneLineEnding');
    },
    [tokenTypes.defListDescription](this: CompileContext): undefined {
      this.getData('tightStack').pop();
      this.tag('</dd>');
    },
  },
};
