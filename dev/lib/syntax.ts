import type {
  Construct,
  Extension,
  State,
  Code,
  Event,
  Effects,
  TokenizeContext,
  ContainerState,
  Token,
} from 'micromark-util-types';
import { codes, types, constants } from 'micromark-util-symbol';
import { factorySpace } from 'micromark-factory-space';
import { markdownSpace } from 'micromark-util-character';
import { blankLine } from 'micromark-core-commonmark';
import { tokenTypes } from './types.js';
import { assert, formatEvents, formatEvent, code2Str } from './utils.js';
import { analyzeDefTermFlow, subtokenizeDefTerm } from './defTermFlowToken.js';
import { splice } from 'micromark-util-chunked';
import Debug from 'debug';

const debug = Debug('micromark-extension-definition-list:syntax');

interface ExtendedContainerState extends ContainerState {
  lastBlankLine?: boolean;
}

interface TokenizeContextWithDefState extends TokenizeContext {
  containerState?: ExtendedContainerState;
}

const ignorablePrefixTypes = new Set<string>([
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
  index += resolveDefinitionTermTo(defList_start, events);

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
      if (events[index - 1][1].type === types.lineEndingBlank) {
        event[1]._loose = true;
      } else if (events[index - 1][1].type === types.chunkFlow) {
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

function createDefTermEvent(
  events: Event[],
  chunkFlowIndex: number,
  defListStartIndex: number,
  flagBlockQuote: boolean,
): number {
  /**
   * Insert defListTerm and chunkFlow subtokenized events
   *
   * @returns Index at which defList enter event should be placed
   *
   */
  debug('createDefTermEvent with %o', formatEvent(events[chunkFlowIndex]));
  const context = events[chunkFlowIndex][2];

  const flow = analyzeDefTermFlow(events[chunkFlowIndex][1]);
  const paragraphInfo = flow.paragraph;

  if (paragraphInfo == null) {
    // for some reason there's no paragraph, so create dummy term
    const defListEnterEvent = events[defListStartIndex];
    const termToken = {
      type: tokenTypes.defListTerm,
      start: Object.assign({}, defListEnterEvent[1].start),
      end: Object.assign({}, defListEnterEvent[1].start),
    };
    splice(events, defListStartIndex, 0, [
      ['enter', termToken, context],
      ['exit', termToken, context],
    ]);
    return defListStartIndex;
  }

  const lazyLines = events[chunkFlowIndex][2].parser.lazy;

  let newDefListStartIndex = 0;
  let flowExitIndex: number | undefined;
  for (let i = chunkFlowIndex; i >= 0; i--) {
    const event = events[i];
    if (event[1].type !== types.chunkFlow) {
      newDefListStartIndex = i + 1;
      break;
    }

    assert(event[1].type === types.chunkFlow);
    if (event[1].start.offset < paragraphInfo.startOffset) {
      newDefListStartIndex = i + 1;
      break;
    }

    if (event[0] === 'exit') {
      if (flagBlockQuote && !lazyLines[event[1].start.line]) {
        newDefListStartIndex = i + 1;
        break;
      }
      flowExitIndex = i;
    } else {
      assert(flowExitIndex != null, 'expect a flow index exit');
      subtokenizeDefTerm(events, i, flowExitIndex);
      flowExitIndex = undefined;
    }
  }
  return newDefListStartIndex;
}

function resolveDefinitionTermTo(defListStartIndex: number, events: Event[]): number {
  /**
   * Create defListTerm for current defList
   *
   * @returns Index offset added by new events
   *
   */
  let flowIndex: number | undefined;
  let blockQuoteExit: Event | undefined;
  let blockQuoteExitIndex: number | undefined;

  for (let i = defListStartIndex - 1; i >= 0; i--) {
    if (ignorablePrefixTypes.has(events[i][1].type)) continue;

    if (
      i === defListStartIndex - 1 &&
      events[i][1].type === types.blockQuote &&
      events[i][0] === 'exit'
    ) {
      blockQuoteExitIndex = i;
      blockQuoteExit = events[i];
      continue;
    }

    if (events[i][1].type === types.chunkFlow) {
      flowIndex = i;
    }
    break;
  }
  assert(flowIndex !== undefined, 'expected a chunkFlow found');

  // temporarily remove defList enter
  const defListEnterEvent = events[defListStartIndex];
  splice(events, defListStartIndex, 1, []);

  // temporarily remove blockQuote exit
  if (blockQuoteExitIndex != null) {
    splice(events, blockQuoteExitIndex, 1, []);
  }

  // create and insert defListTerm events
  let newDefListStartIndex = createDefTermEvent(
    events,
    flowIndex,
    defListStartIndex,
    blockQuoteExit != null,
  );

  // put blockQuote exit
  if (blockQuoteExitIndex != null) {
    blockQuoteExit![1].end = Object.assign({}, events[newDefListStartIndex - 1][1].end);
    splice(events, newDefListStartIndex, 0, [blockQuoteExit]);
    newDefListStartIndex += 1;
  }

  // insert defList enter at right position
  defListEnterEvent[1].start = Object.assign({}, events[newDefListStartIndex][1].start);
  splice(events, newDefListStartIndex, 0, [defListEnterEvent]);

  return newDefListStartIndex - defListStartIndex;
}

function checkPossibleDefTerm(events: Event[]): boolean {
  debug('checkPossibleDefTerm');
  debug(formatEvents(events));
  if (events.length <= 1) return false;

  const lastEvent = events[events.length - 1];
  const lazyLines = lastEvent[2].parser.lazy;
  let flagBlockQuote = false;

  let termFlowStart: Event | undefined;
  let flowEvents: Event[] | undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (ignorablePrefixTypes.has(event[1].type)) {
      continue;
    }
    if (i === events.length - 1 && event[1].type === types.blockQuote && event[0] === 'exit') {
      /**
       * something like:
       *
       * ```
       * > blockquote
       * term
       * : description
       * ```
       */
      flagBlockQuote = true;
      continue;
    }

    if (event[1].type === types.chunkFlow) {
      if (event[0] === 'enter') {
        flowEvents ??= event[1]._tokenizer?.events;
        termFlowStart = event;
      }
    } else {
      break;
    }
  }

  debug(formatEvents(flowEvents));
  if (flowEvents != null && termFlowStart != null) {
    let blanklines = 0;
    for (let i = flowEvents.length - 1; i >= 0; i--) {
      const flowEvent = flowEvents[i];
      const tmpToken = flowEvent[1];
      if (tmpToken.start.offset < termFlowStart[1].start.offset) break;
      if (flowEvent[0] === 'enter' && tmpToken.type === types.lineEndingBlank) {
        if (blanklines >= 1) break;
        blanklines++;
      }

      if (
        tmpToken.type !== types.lineEnding &&
        tmpToken.type !== types.linePrefix &&
        tmpToken.type !== types.lineEndingBlank &&
        tmpToken.type !== types.content
      ) {
        if (flagBlockQuote && !lazyLines[tmpToken.end.line]) {
          return false;
        }

        return (
          tmpToken.type === types.paragraph ||
          tmpToken.type === types.chunkContent ||
          tmpToken.type === 'tableHead' ||
          tmpToken.type === 'tableRow'
        );
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

  debug(`interrupt: ${self.interrupt}`);
  debug('lazy: %o', self.parser.lazy);

  if (self.containerState.type == null) {
    // start defList only when definition term found.
    if (checkPossibleDefTerm(self.events)) {
      effects.enter(tokenTypes.defList, { _container: true });
      self.containerState.type = tokenTypes.defList;
    } else {
      debug('nok');
      return nok;
    }
  }

  return start;

  function start(code: Code): State | undefined {
    debug(`defList: start (code: '${code2Str(code)}')`);
    if (code !== codes.colon) {
      return nok(code);
    }

    effects.enter(tokenTypes.defListDescriptionPrefix, {
      _loose: self.containerState?.lastBlankLine,
    });
    self.containerState!.lastBlankLine = undefined;
    effects.enter(tokenTypes.defListDescriptionMarker);
    effects.consume(code);
    effects.exit(tokenTypes.defListDescriptionMarker);

    return effects.check(
      blankLine,
      onBlank,
      effects.attempt(defListDescriptionPrefixWhitespaceConstruct, prefixEnd, otherPrefix),
    );
  }

  function onBlank(code: Code): State | undefined {
    debug('defList: on blank');
    self.containerState!.initialBlankLine = true;
    initialSize++;
    return prefixEnd(code);
  }

  function otherPrefix(code: Code): State | undefined {
    debug('defList: other prefix');
    if (markdownSpace(code)) {
      effects.enter(tokenTypes.defListDescriptionPrefixWhitespace);
      effects.consume(code);
      effects.exit(tokenTypes.defListDescriptionPrefixWhitespace);
      return prefixEnd;
    }
    return nok(code);
  }

  function prefixEnd(code: Code): State | undefined {
    debug('defList: prefix end');
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

  function onBlank(code: Code): State | undefined {
    debug('continuous: on blank');
    self.containerState!.furtherBlankLines =
      self.containerState!.furtherBlankLines ?? self.containerState!.initialBlankLine;
    self.containerState!.lastBlankLine = true;

    return factorySpace(effects, ok, types.linePrefix, self.containerState!.size! + 1)(code);
  }

  function notBlank(code: Code): State | undefined {
    debug('continuous: not blank');
    if (self.containerState!.furtherBlankLines ?? !markdownSpace(code)) {
      self.containerState!.furtherBlankLines = undefined;
      self.containerState!.initialBlankLine = undefined;
      return notInCurrentItem(code);
    }

    self.containerState!.furtherBlankLines = undefined;
    self.containerState!.initialBlankLine = undefined;
    self.containerState!.lastBlankLine = undefined;
    return effects.attempt(indentConstruct, ok, notInCurrentItem)(code);
  }

  function notInCurrentItem(code: Code): State | undefined {
    debug('continuous: not in current item');
    self.containerState!._closeFlow = true;
    self.interrupt = undefined;

    return factorySpace(
      effects,
      effects.attempt(defListConstruct, ok, nok),
      types.linePrefix,
      self.parser.constructs.disable.null != null &&
        self.parser.constructs.disable.null.includes('codeIndented')
        ? undefined
        : constants.tabSize,
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

  function afterPrefix(code: Code): State | undefined {
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
    self.parser.constructs.disable.null != null &&
      self.parser.constructs.disable.null.includes('codeIndented')
      ? undefined
      : constants.tabSize + 1,
  );

  function afterPrefix(code: Code): State | undefined {
    const tail = self.events[self.events.length - 1];
    debug('whitespace');

    return !markdownSpace(code) &&
      tail &&
      tail[1].type === tokenTypes.defListDescriptionPrefixWhitespace
      ? ok(code)
      : nok(code);
  }
}

function tokenizeDefListEnd(this: TokenizeContext, effects: Effects): undefined {
  debug('container end');
  effects.exit(tokenTypes.defList);
}
