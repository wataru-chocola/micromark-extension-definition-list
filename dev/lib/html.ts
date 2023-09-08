import { CompileContext, Token } from 'micromark-util-types';
import { tokenTypes } from './types.js';

export const defListHtml = {
  enter: {
    [tokenTypes.defList](this: CompileContext): void {
      this.lineEndingIfNeeded();
      this.tag('<dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): void {
      this.lineEndingIfNeeded();
      this.tag('<dt>');
      this.setData('slurpOneLineEnding', true);
    },
    [tokenTypes.defListDescription](this: CompileContext, token: Token): void {
      this.lineEndingIfNeeded();
      this.tag('<dd>');
      this.getData('tightStack').push(!token._loose);
    },
  },
  exit: {
    [tokenTypes.defList](this: CompileContext): void {
      this.lineEndingIfNeeded();
      this.tag('</dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): void {
      this.tag('</dt>');
      this.setData('slurpOneLineEnding');
    },
    [tokenTypes.defListDescription](this: CompileContext): void {
      this.getData('tightStack').pop();
      this.tag('</dd>');
    },
  },
};
