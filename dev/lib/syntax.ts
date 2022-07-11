import type {
  Construct,
  Extension,
  State,
  Code,
  Event,
  Effects,
  Point,
  TokenizeContext,
  Token,
} from 'micromark-util-types';
import { codes } from 'micromark-util-symbol/codes';
import { types } from 'micromark-util-symbol/types';
import { factorySpace } from 'micromark-factory-space';
import { constants } from 'micromark-util-symbol/constants.js';
import { markdownSpace } from 'micromark-util-character';
import { blankLine } from 'micromark-core-commonmark';
import { tokenTypes } from './types.js';
import { formatEvents } from './utils.js';
import { splice } from 'micromark-util-chunked';
import assert from 'assert';
import Debug from 'debug';

const debug = Debug('micromark-extension-definition-list:syntax');

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

const ignorablePrefixTypes = new Set([
  types.linePrefix,
  types.blockQuotePrefix,
  types.blockQuoteMarker,
  types.blockQuotePrefixWhitespace,
]);

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

function resolveAllDefinitionTerm(events: Event[], context: TokenizeContext): Event[] {
  /**
   * Resolves all detList events
   *
   * @remarks
   * For each defList events, this does:
   * - create defListTerm event
   * - create defListDescription event
   *
   * And then merge adjacent lists
   *
   */
  debug('resolveAll');
  debug('original events:');
  debug(formatEvents(events));

  let index = 0;
  while (index < events.length) {
    const event = events[index];
    if (event[0] === 'enter' && event[1].type === tokenTypes.defList) {
      // create defListTerms and defListDescriptions inside defList
      index += resolveDefList(index, events, context);
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
    }
    if (event[0] === 'exit' && event[1].type === tokenTypes.defList) {
      let defListFound = false;
      let i = 1;
      while (index + i < events.length) {
        const forwardEvent = events[index + i];
        if (forwardEvent[0] === 'enter' && forwardEvent[1].type === tokenTypes.defList) {
          defListFound = true;
          break;
        } else if (!ignorablePrefixTypes.has(forwardEvent[1].type)) {
          break;
        }
        i++;
      }
      if (defListFound) {
        event[1].end = Object.assign({}, events[index + i][1].end);
        splice(events, index, i + 1, []);
        index -= i;
      } else {
        const token = dlStack.pop();
        assert(token != null, 'expect a token of balanced enter event');
        event[1] = token;
      }
    }

    index++;
  }

  debug('modified events:');
  debug(formatEvents(events));
  return events;
}

function resolveDefList(defList_start: number, events: Event[], context: TokenizeContext): number {
  /**
   * Create defListTerms and defListDescriptions
   *
   * @returns Index offset to the end of current defList
   *
   */
  let indexOffset = 0;

  let defListDescriptionToken: Token | undefined;
  let expectFirstDescription = true;
  let index = defList_start + 1;
  index += resolveDefinitionTermTo(defList_start, events, context);

  while (index < events.length) {
    const event = events[index];
    if (event[0] === 'enter' && event[1].type === tokenTypes.defList) {
      index += resolveDefList(index, events, context);
    }
    if (event[0] === 'exit' && event[1].type === tokenTypes.defList) {
      index += addDescriptionExit(index, events);
      defListDescriptionToken = undefined;
      indexOffset = index - defList_start;
      break;
    }
    if (event[0] === 'exit' && event[1].type === tokenTypes.defListDescriptionPrefix) {
      if (!expectFirstDescription) {
        index += addDescriptionExit(index, events);
        defListDescriptionToken = undefined;
      }
      index += addDescriptionEnter(index, events, event[1]._loose);
      expectFirstDescription = false;
    }
    if (event[0] === 'enter' && event[1].type === tokenTypes.defListDescriptionPrefix) {
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
  return indexOffset;

  function addDescriptionEnter(index: number, events: Event[], loose: boolean | undefined): number {
    const indexOffset = 1;
    defListDescriptionToken = {
      type: tokenTypes.defListDescription,
      start: Object.assign({}, events[index + 1][1].start),
      end: Object.assign({}, events[index + 1][1].end),
      _loose: loose,
    };
    splice(events, index + 1, 0, [['enter', defListDescriptionToken, context]]);
    return indexOffset;
  }

  function addDescriptionExit(index: number, events: Event[]): number {
    const indexOffset = 1;
    assert(defListDescriptionToken != null);
    defListDescriptionToken.end = Object.assign({}, events[index - 1][1].end);
    splice(events, index, 0, [['exit', defListDescriptionToken, context]]);
    return indexOffset;
  }
}

type AnalyzedFlowToken = {
  flowEvents: Event[];
  contentEnterIndex: number;
  contentExitIndex: number;
  definitionIndex: number | undefined;
  paraEnterIndex: number | undefined;
  paraExitIndex: number | undefined;
};
function analyzeDefTermFlow(flowToken: Token): AnalyzedFlowToken {
  const flowEvents = flowToken._tokenizer!.events;

  // flow events are stacked like:
  //
  //   [enter, content]
  //   [enter, definition] (optional)
  //   [exit, definition] (optional)
  //   [enter, paragraph]
  //   ...
  //   [exit, paragraph]
  //   [exit, content]
  //
  let contentEnterIndex: number | undefined;
  let contentExitIndex: number | undefined;
  let definitionIndex: number | undefined;
  let paraEnterIndex: number | undefined;
  let paraExitIndex: number | undefined;
  for (let i = flowEvents.length - 1; i >= 0; i--) {
    const tmpEvent = flowEvents[i];
    if (tmpEvent[0] === 'exit' && tmpEvent[1].type === types.content) {
      contentExitIndex = i;
    }
    if (tmpEvent[0] === 'exit' && tmpEvent[1].type === types.paragraph) {
      paraExitIndex = i;
    }
    if (tmpEvent[0] === 'enter' && tmpEvent[1].type === types.paragraph) {
      paraEnterIndex = i;
    }
    if (!definitionIndex && tmpEvent[0] === 'exit' && tmpEvent[1].type === types.definition) {
      definitionIndex = i;
    }
    if (tmpEvent[0] === 'enter' && tmpEvent[1].type === types.content) {
      contentEnterIndex = i;
      break;
    }
  }

  assert(contentEnterIndex != null, 'expect a content to be found');
  assert(contentExitIndex != null, 'expect a content to be found');
  return {
    flowEvents,
    contentEnterIndex,
    contentExitIndex,
    definitionIndex,
    paraEnterIndex,
    paraExitIndex,
  };
}

function modifyDefTermFlow(flowToken: Token, context: TokenizeContext) {
  const flow = analyzeDefTermFlow(flowToken);
  debug('original flow events:');
  debug(formatEvents(flow.flowEvents));

  if (flow.definitionIndex != null) {
    splice(flow.flowEvents, flow.contentExitIndex, 1, []);
  }
  if (flow.paraEnterIndex != null && flow.paraExitIndex != null) {
    splice(flow.flowEvents, flow.paraExitIndex, 1, []);
    splice(flow.flowEvents, flow.paraEnterIndex, 1, []);
  }
  if (flow.definitionIndex != null) {
    const contentToken = flow.flowEvents[flow.contentEnterIndex][1];
    contentToken.end = Object.assign({}, flow.flowEvents[flow.definitionIndex][1].end);
    splice(flow.flowEvents, flow.definitionIndex + 1, 0, [['exit', contentToken, context]]);
  }

  debug('modified flow events:');
  debug(formatEvents(flow.flowEvents));
}

function resolveDefinitionTermTo(
  defList_start: number,
  events: Event[],
  context: TokenizeContext,
): number {
  /**
   * Create defListTerm for current defList
   *
   * @returns Index offset added by new events
   *
   */

  let flowIndex: number | undefined;
  for (let i = defList_start - 1; i >= 0; i--) {
    if (ignorablePrefixTypes.has(events[i][1].type)) {
      continue;
    }
    if (events[i][1].type === types.chunkFlow) {
      flowIndex = i;
    }
    break;
  }
  assert(flowIndex !== undefined, 'expected a chunkFlow found');
  const flowToken = events[flowIndex][1];
  const flow = analyzeDefTermFlow(flowToken);

  // temporarily remove defList enter
  const defListEnterEvent = events[defList_start];
  splice(events, defList_start, 1, []);

  // create and insert defListTerm events
  assert(
    (flow.paraEnterIndex != null && flow.paraExitIndex != null) ||
      (flow.paraEnterIndex == null && flow.paraExitIndex == null),
  );
  let startIndex = 0;
  if (flow.paraEnterIndex != null && flow.paraExitIndex != null) {
    const paraStart = flow.flowEvents[flow.paraEnterIndex][1].start;
    const paraEnd = flow.flowEvents[flow.paraExitIndex][1].end;

    let flowIndex_exit: number | undefined;
    for (let i = flowIndex; i >= 0; i--) {
      if (events[i][1].start.offset > paraEnd.offset) {
        continue;
      }
      if (events[i][1].type !== types.chunkFlow || events[i][1].start.offset < paraStart.offset) {
        startIndex = i + 1;
        break;
      }

      if (events[i][0] === 'enter') {
        assert(flowIndex_exit != null, 'expect a flow index exit');
        events[i][1].type = types.chunkText;

        // modify flow events
        modifyDefTermFlow(events[i][1], context);

        // create defListTerm events
        const termToken = {
          type: tokenTypes.defListTerm,
          start: Object.assign({}, events[i][1].start),
          end: Object.assign({}, events[i][1].end),
        };
        splice(events, flowIndex_exit + 1, 0, [['exit', termToken, context]]);
        splice(events, i, 0, [['enter', termToken, context]]);

        flowIndex_exit = undefined;
      } else {
        flowIndex_exit = i;
      }
    }
  } else {
    // for some reason there's any paragraph, so create dummy term
    startIndex = defList_start;
    const termToken = {
      type: tokenTypes.defListTerm,
      start: Object.assign({}, defListEnterEvent[1].start),
      end: Object.assign({}, defListEnterEvent[1].start),
    };
    splice(events, startIndex, 0, [
      ['enter', termToken, context],
      ['exit', termToken, context],
    ]);
  }

  // insert defList enter at right position
  defListEnterEvent[1].start = Object.assign({}, events[startIndex][1].start);
  splice(events, startIndex, 0, [defListEnterEvent]);

  return startIndex - defList_start;
}

function checkPossibleDefTerm(events: Event[]): boolean {
  let index = events.length;
  let termFlowStart: Event | undefined;
  let flowEvents: Event[] | undefined;
  while (index--) {
    if (ignorablePrefixTypes.has(events[index][1].type)) {
      continue;
    }
    if (events[index][1].type === types.chunkFlow) {
      flowEvents ??= events[index][1]._tokenizer?.events;
      termFlowStart = events[index];
    } else {
      break;
    }
  }

  let blanklines = 0;
  if (flowEvents != null && termFlowStart != null) {
    let tmpIndex = flowEvents.length;
    while (tmpIndex--) {
      const flowEvent = flowEvents[tmpIndex];
      const tmpToken = flowEvent[1];
      if (tmpToken.start.offset < termFlowStart[1].start.offset) break;

      if (flowEvent[0] === 'enter' && tmpToken.type === types.lineEndingBlank) {
        if (blanklines >= 1) {
          break;
        }
        blanklines++;
      }
      if (
        tmpToken.type !== types.lineEnding &&
        tmpToken.type !== types.linePrefix &&
        tmpToken.type !== types.lineEndingBlank &&
        tmpToken.type !== types.content
      ) {
        return tmpToken.type === types.paragraph || tmpToken.type === types.chunkContent;
      }
    }
  }
  return false;
}

function tokenizeDefListStart(
  this: TokenizeContextWithDefState,
  effects: Effects,
  ok: State,
  nok: State,
): State {
  debug('initialize tokenizer');
  const self = this; // eslint-disable-line @typescript-eslint/no-this-alias
  if (self.containerState == null) {
    self.containerState = {};
  }

  const tail = self.events[self.events.length - 1];
  let initialSize =
    tail && tail[1].type === types.linePrefix ? tail[2].sliceSerialize(tail[1], true).length : 0;

  if (self.containerState!.type == null) {
    // start defList only when definition term found.
    if (checkPossibleDefTerm(self.events)) {
      effects.enter(tokenTypes.defList, { _container: true });
      self.containerState!.type = tokenTypes.defList;
    } else {
      debug('nok');
      return nok;
    }
  }

  return start;

  function start(code: Code): State | void {
    debug(`start: start (code: ${String(code)})`);
    if (code !== codes.colon) {
      return nok(code);
    }

    effects.enter(tokenTypes.defListDescriptionPrefix, {
      _loose: self.containerState?.lastBlankLine,
    });
    self.containerState!.lastBlankLinke = undefined;
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
    debug('start: on blank');
    self.containerState!.initialBlankLine = true;
    initialSize++;
    return prefixEnd(code);
  }

  function otherPrefix(code: Code): State | void {
    debug('start: other prefix');
    if (markdownSpace(code)) {
      effects.enter(tokenTypes.defListDescriptionPrefixWhitespace);
      effects.consume(code);
      effects.exit(tokenTypes.defListDescriptionPrefixWhitespace);
      return prefixEnd;
    }
    return nok(code);
  }

  function prefixEnd(code: Code): State | void {
    debug('start: prefix end');
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
    debug('continuous: on blank');
    self.containerState!.furtherBlankLines =
      self.containerState!.furtherBlankLines || self.containerState!.initialBlankLine;
    self.containerState!.lastBlankLine = true;

    return factorySpace(effects, ok, types.linePrefix, self.containerState!.size! + 1)(code);
  }

  function notBlank(code: Code): State | void {
    debug('continuous: not blank');
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
    debug('continuous: not in current item');
    self.containerState!._closeFlow = true;
    self.interrupt = undefined;

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

  return factorySpace(effects, afterPrefix, types.linePrefix, self.containerState!.size! + 1);

  function afterPrefix(code: Code): State | void {
    const tail = self.events[self.events.length - 1];
    return tail &&
      tail[1].type === types.linePrefix &&
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
    debug('whitespace');

    return !markdownSpace(code) &&
      tail &&
      tail[1].type === tokenTypes.defListDescriptionPrefixWhitespace
      ? ok(code)
      : nok(code);
  }
}

function tokenizeDefListEnd(this: TokenizeContext, effects: Effects): void {
  debug('container end');
  effects.exit(tokenTypes.defList);
}
