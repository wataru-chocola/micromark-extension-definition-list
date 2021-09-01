import { CompileContext, Token } from 'micromark-util-types';
import { tokenTypes } from './types';

export const defListHtml = {
  enter: {
    [tokenTypes.defList](this: CompileContext, token: Token): void {
      this.lineEndingIfNeeded();
      this.tag('<dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): void {
      this.lineEndingIfNeeded();
      this.tag('<dt>');
    },
    [tokenTypes.defListDescription](this: CompileContext, token: Token): void {
      this.lineEndingIfNeeded();
      this.tag('<dd>');
      (this.getData('tightStack') as boolean[]).push(!token._loose);
    },
  },
  exit: {
    [tokenTypes.defList](this: CompileContext): void {
      this.lineEndingIfNeeded();
      this.tag('</dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): void {
      this.tag('</dt>');
    },
    [tokenTypes.defListDescription](this: CompileContext, token: Token): void {
      (this.getData('tightStack') as boolean[]).pop();
      this.tag('</dd>');
    },
  },
};
