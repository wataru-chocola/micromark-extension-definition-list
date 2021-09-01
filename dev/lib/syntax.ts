import {
  Construct,
  Extension,
  State,
  Code,
  Event,
  Effects,
  Point,
  TokenizeContext,
} from 'micromark-util-types';
import { codes } from 'micromark-util-symbol/codes';
import { types } from 'micromark-util-symbol/types';
import { factorySpace } from 'micromark-factory-space';
import { constants } from 'micromark-util-symbol/constants.js';
import { markdownSpace } from 'micromark-util-character';
import { blankLine } from 'micromark-core-commonmark/dev/lib/blank-line';
import { tokenTypes } from './types';
import assert from 'assert';

interface TokenizeContextWithDefState extends TokenizeContext {
  containerState?: {
    _closeFlow?: boolean;
    size?: number;
    type?: string;
    initialBlankLine?: boolean;
    furtherBlankLines?: boolean;
    lastBlankLinke?: boolean;
  } & Record<string, unknown>;
}

const defListConstruct: Construct = {
  name: 'defList',
  tokenize: tokenizeDefListStart,
  continuation: {
    tokenize: tokenizeDefListContinuation,
  },
  resolveAll: resolveAllDefinitionTerm,
  exit: tokenizeDefListEnd,
};

const defListDescriptionPrefixWhitespaceConstruct: Construct = {
  tokenize: tokenizeDefListDescriptionPrefixWhitespace,
  partial: true,
};

const indentConstruct = { tokenize: tokenizeIndent, partial: true };

export const defList: Extension = {
  document: { [codes.colon]: defListConstruct, null: [] },
};

function inspectEvents(events: Event[] | undefined): void {
  if (events == null) {
    return;
  }
  events.forEach((x) => {
    let content = '';
    try {
      content = x[2].sliceSerialize(x[1], true);
    } catch (e) {
      content = '<maybe incomplete token>';
    }
    console.log([x[0], x[1].type, content]);
  });
}

function resolveAllDefinitionTerm(events: Event[], context: TokenizeContext): Event[] {
  console.log('resolveAll');
  inspectEvents(events);

  let index = 0;
  while (index < events.length) {
    const event = events[index];
    if (event[0] === 'enter' && event[1].type === tokenTypes.defList) {
      // create definition terms and adjust start of defList
      index += resolveDefinitionTermTo(index, events, context);
    } else if (event[0] === 'enter' && event[1].type === tokenTypes.defListDescription) {
      // mark loose definition description
      assert(index > 0, 'expect some events before defListDescription');
      if (events[index - 1][1].type === types.chunkFlow) {
        const flowEvents = events[index - 1][1]._tokenizer!.events;
        if (flowEvents[flowEvents.length - 1][1].type === types.lineEndingBlank) {
          event[1]._loose = true;
        }
      }
    }
    index++;
  }

  // merge definition lists
  const dlStack = [];
  index = 0;
  while (index < events.length) {
    const event = events[index];
    if (event[0] === 'enter' && event[1].type === tokenTypes.defList) {
      dlStack.push(event[1]);
    } else if (event[0] === 'exit' && event[1].type === tokenTypes.defList) {
      if (
        index < events.length - 1 &&
        events[index + 1][0] === 'enter' &&
        events[index + 1][1].type === tokenTypes.defList
      ) {
        event[1].end = Object.assign({}, events[index + 1][1].end);
        events.splice(index, 2);
        index -= 1;
      } else {
        const token = dlStack.pop();
        assert(token != null, 'expect a token of balanced enter event');
        event[1] = token;
      }
    }
    index++;
  }

  console.log('modified events');
  inspectEvents(events);
  return events;
}

function resolveDefinitionTermTo(
  defList_start: number,
  events: Event[],
  context: TokenizeContext,
): number {
  let flowIndex: number | undefined;
  if (events[defList_start - 1][1].type === types.chunkFlow) {
    flowIndex = defList_start - 1;
  }
  assert(flowIndex !== undefined, 'expected a chunkFlow found');
  const flowEvents = events[flowIndex][1]._tokenizer!.events;

  let paraStart: Point | undefined;
  let paraEnd: Point | undefined;
  let paraEnterIndex: number | undefined;
  let paraExitIndex: number | undefined;
  for (let i = flowEvents.length - 1; i >= 0; i--) {
    const tmpEvent = flowEvents[i];
    if (tmpEvent[0] === 'exit' && tmpEvent[1].type === types.paragraph) {
      paraEnd = tmpEvent[1].end;
      paraExitIndex = i;
    }
    if (tmpEvent[0] === 'enter' && tmpEvent[1].type === types.paragraph) {
      paraStart = tmpEvent[1].start;
      paraEnterIndex = i;
      break;
    }
  }

  const defListEnterEvent = events[defList_start];
  events.splice(defList_start, 1);

  let flowIndex_exit: number | undefined;
  let startIndex = 0;
  for (let i = flowIndex; i >= 0; i--) {
    if (events[i][1].type !== types.chunkFlow) {
      startIndex = i + 1;
      break;
    }
    if (paraStart != null && events[i][1].start.offset < paraStart.offset) {
      startIndex = i + 1;
      break;
    }
    if (paraEnd != null && events[i][1].start.offset > paraEnd.offset) {
      continue;
    }

    if (events[i][0] === 'enter') {
      assert(flowIndex_exit != null, 'expect a flow index exit');
      events[i][1].type = types.chunkText;

      const termToken = {
        type: tokenTypes.defListTerm,
        start: Object.assign({}, events[i][1].start),
        end: Object.assign({}, events[i][1].end),
      };
      events.splice(flowIndex_exit + 1, 0, ['exit', termToken, context]);
      events.splice(i, 0, ['enter', termToken, context]);

      flowIndex_exit = undefined;
    } else {
      flowIndex_exit = i;
    }
  }

  defListEnterEvent[1].start = Object.assign({}, events[startIndex][1].start);
  events.splice(startIndex, 0, defListEnterEvent);

  if (paraEnterIndex != null && paraExitIndex != null) {
    flowEvents.splice(paraExitIndex, 1);
    flowEvents.splice(paraEnterIndex, 1);
  }

  return startIndex - defList_start;
}

function tokenizeDefListStart(
  this: TokenizeContextWithDefState,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  console.log('initialize tokenizer');
  const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
  if (self.containerState == null) {
    self.containerState = {};
  }

  const tail = self.events[self.events.length - 1];
  let initialSize =
    tail && tail[1].type === types.linePrefix ? tail[2].sliceSerialize(tail[1], true).length : 0;

  if (self.parser.lazy[self.now().line]) {
    // in the middle of blockquote or something
    return nok;
  }

  // find possible term chunkFlow
  let index = self.events.length;
  let termFlowStart: Event | undefined;
  let flowEvents: Event[] | undefined;
  while (index--) {
    if (self.events[index][1].type === types.chunkFlow) {
      flowEvents ??= self.events[index][1]._tokenizer?.events;
      termFlowStart = self.events[index];
    } else {
      break;
    }
  }

  let paragraph = false;
  if (flowEvents != null && termFlowStart != null) {
    let tmpIndex = flowEvents.length;
    while (tmpIndex--) {
      const flowEvent = flowEvents[tmpIndex];
      if (flowEvent[1].start.offset < termFlowStart[1].start.offset) {
        break;
      }
      if (
        flowEvent[1].type !== types.lineEnding &&
        flowEvent[1].type !== types.linePrefix &&
        flowEvent[1].type !== types.lineEndingBlank &&
        flowEvent[1].type !== types.content
      ) {
        paragraph = flowEvent[1].type === types.paragraph;
        break;
      }
    }
  }

  if (self.containerState!.type == null) {
    if (self.interrupt || paragraph) {
      // start defList only when definition term found.
      effects.enter(tokenTypes.defList, { _container: true });
      self.containerState!.type = tokenTypes.defList;
    } else {
      return nok;
    }
  }

  return start;

  function start(code: Code): State | void {
    console.log('start: start' + String(code));
    if (code !== codes.colon) {
      return nok(code);
    }

    effects.enter(tokenTypes.defListDescription, { _loose: self.containerState?.lastBlankLine });
    self.containerState!.lastBlankLinke = undefined;
    effects.enter(tokenTypes.defListDescriptionPrefix);
    effects.enter(tokenTypes.defListDescriptionMarker);
    effects.consume(code);
    effects.exit(tokenTypes.defListDescriptionMarker);

    return effects.check(
      blankLine,
      onBlank,
      effects.attempt(defListDescriptionPrefixWhitespaceConstruct, prefixEnd, otherPrefix),
    );
  }

  function onBlank(code: Code): State | void {
    console.log('start: on blank');
    self.containerState!.initialBlankLine = true;
    initialSize++;
    return prefixEnd;
  }

  function otherPrefix(code: Code): State | void {
    console.log('start: other prefix');
    if (markdownSpace(code)) {
      effects.enter(tokenTypes.defListDescriptionPrefixWhitespace);
      effects.consume(code);
      effects.exit(tokenTypes.defListDescriptionPrefixWhitespace);
      return prefixEnd;
    }
    return nok(code);
  }

  function prefixEnd(code: Code): State | void {
    console.log('start: prefix end');
    self.containerState!.size =
      initialSize +
      self.sliceSerialize(effects.exit(tokenTypes.defListDescriptionPrefix), true).length;

    return ok(code);
  }
}

function tokenizeDefListContinuation(
  this: TokenizeContextWithDefState,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
  self.containerState!._closeFlow = undefined;
  return effects.check(blankLine, onBlank, notBlank);

  function onBlank(code: Code): State | void {
    console.log('continuous: on blank');
    self.containerState!.furtherBlankLines =
      self.containerState!.furtherBlankLines || self.containerState!.initialBlankLine;
    self.containerState!.lastBlankLine = true;

    return factorySpace(
      effects,
      ok,
      tokenTypes.defListDescriptionIndent,
      self.containerState!.size! + 1,
    )(code);
  }

  function notBlank(code: Code): State | void {
    console.log('continuous: not blank');
    if (self.containerState!.furtherBlankLines || !markdownSpace(code)) {
      self.containerState!.furtherBlankLines = undefined;
      self.containerState!.initialBlankLine = undefined;
      return notInCurrentItem(code);
    }

    self.containerState!.furtherBlankLines = undefined;
    self.containerState!.initialBlankLine = undefined;
    self.containerState!.lastBlankLine = undefined;
    return effects.attempt(indentConstruct, ok, notInCurrentItem)(code);
  }

  function notInCurrentItem(code: Code): State | void {
    console.log('continuous: not in current item');
    self.containerState!._closeFlow = true;
    self.interrupt = undefined;

    effects.exit(tokenTypes.defListDescription);

    return factorySpace(
      effects,
      effects.attempt(defListConstruct, ok, nok),
      types.linePrefix,
      self.parser.constructs.disable.null.includes('codeIndented') ? undefined : constants.tabSize,
    )(code);
  }
}

function tokenizeIndent(
  this: TokenizeContextWithDefState,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  const self = this; // eslint-disable-line @typescript-eslint/no-this-alias

  return factorySpace(
    effects,
    afterPrefix,
    tokenTypes.defListDescriptionIndent,
    self.containerState!.size! + 1,
  );

  function afterPrefix(code: Code): State | void {
    const tail = self.events[self.events.length - 1];
    return tail &&
      tail[1].type === tokenTypes.defListDescriptionIndent &&
      tail[2].sliceSerialize(tail[1], true).length === self.containerState!.size!
      ? ok(code)
      : nok(code);
  }
}

function tokenizeDefListDescriptionPrefixWhitespace(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
  return factorySpace(
    effects,
    afterPrefix,
    tokenTypes.defListDescriptionPrefixWhitespace,
    self.parser.constructs.disable.null.includes('codeIndented')
      ? undefined
      : constants.tabSize + 1,
  );

  function afterPrefix(code: Code): State | void {
    const tail = self.events[self.events.length - 1];
    console.log('whitespace');

    return !markdownSpace(code) &&
      tail &&
      tail[1].type === tokenTypes.defListDescriptionPrefixWhitespace
      ? ok(code)
      : nok(code);
  }
}

function tokenizeDefListEnd(this: TokenizeContext, effects: Effects): void {
  console.log('container end');
  effects.exit(tokenTypes.defListDescription);
  effects.exit(tokenTypes.defList);
}
