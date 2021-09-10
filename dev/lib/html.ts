import { CompileContext, Token } from 'micromark-util-types';
import { tokenTypes } from './types.js';

export const defListHtml = {
  enter: {
    [tokenTypes.defList](this: CompileContext): void {
      this.setData('expectFirstTermGroup', true);
      this.lineEndingIfNeeded();
      this.tag('<dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): void {
      if (!this.getData('expectFirstTermGroup')) {
        onExitDefDescription(this);
      }
      this.setData('expectFirstDescription', true);
      this.lineEndingIfNeeded();
      this.tag('<dt>');
    },
    [tokenTypes.defListDescriptionPrefix](this: CompileContext, token: Token): void {
      if (!this.getData('expectFirstDescription')) {
        onExitDefDescription(this);
      }

      this.lineEndingIfNeeded();
      this.tag('<dd>');
      (this.getData('tightStack') as boolean[]).push(!token._loose);
      this.setData('expectFirstTermGroup');
      this.setData('expectFirstDescription');
      this.setData('lastWasTag');
    },
  },
  exit: {
    [tokenTypes.defList](this: CompileContext): void {
      onExitDefDescription(this);
      this.lineEndingIfNeeded();
      this.tag('</dl>');
    },
    [tokenTypes.defListTerm](this: CompileContext): void {
      this.tag('</dt>');
    },
  },
};

function onExitDefDescription(context: CompileContext): void {
  if (context.getData('lastWasTag') && !context.getData('slurpAllLineEndings')) {
    context.lineEndingIfNeeded();
  }
  (context.getData('tightStack') as boolean[]).pop();
  context.tag('</dd>');
}
