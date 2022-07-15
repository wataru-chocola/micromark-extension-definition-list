import type { Event, Token } from 'micromark-util-types';
import { types } from 'micromark-util-symbol/types';
import { splice } from 'micromark-util-chunked';

import { tokenTypes } from './types.js';
import { formatEvents } from './utils.js';
import assert from 'assert';
import Debug from 'debug';

const debug = Debug('micromark-extension-definition-list:defTermFlowToken');

/**
 *
 * DefListTerm tokens aren't created in tokenize funciton.
 * They must be created from chunkFlow preceding defList afterward.
 *
 * Such chunkFlow tokens have subEvents, stacked like:
 *
 *   (... leading line breaks)
 *   [enter, content]
 *   [enter, definition] (optional)
 *   [exit, definition] (optional)
 *   ...
 *   [enter, paragraph]
 *   ...
 *   [enter, chunkText]  <-- extract and put into defTerm
 *   [exit, chunkText]  <-- extract and put into defTerm
 *   [exit, paragraph]
 *   [exit, content]
 *   (... trailing line breaks)
 *
 */

export type AnalyzedFlowToken = {
  flowEvents: Event[];
  paraEnterIndex: number | undefined;
  paraExitIndex: number | undefined;
};
export function analyzeDefTermFlow(flowToken: Token): AnalyzedFlowToken {
  const flowEvents = flowToken._tokenizer!.events;

  let paraEnterIndex: number | undefined;
  let paraExitIndex: number | undefined;
  for (let i = flowEvents.length - 1; i >= 0; i--) {
    const tmpEvent = flowEvents[i];
    if (tmpEvent[1].type === types.paragraph) {
      if (tmpEvent[0] === 'exit') paraExitIndex = i;
      else {
        paraEnterIndex = i;
        break;
      }
    }
  }

  return {
    flowEvents,
    paraEnterIndex,
    paraExitIndex,
  };
}

function getSubtokensForDefTerm(termFlowToken: Token) {
  const flowEvents = termFlowToken._tokenizer!.events;
  debug('original flow events:');
  debug(formatEvents(flowEvents));

  const leadingChildEvents: Event[] = [];
  const trailingChildEvents: Event[] = [];
  const termChildEvents: Event[] = [];

  const removedEventIndexes: number[] = [];
  let pEnterIndex: number | undefined;
  let pExitIndex: number | undefined;
  let contentEnterIndex: number | undefined;
  let contentExitIndex: number | undefined;
  const paragraphEvents: Event[] = [];
  const contentEvents: Event[] = [];
  for (let i = flowEvents.length - 1; i >= 0; i--) {
    const tmpEvent = flowEvents[i];
    const tmpToken = tmpEvent[1];

    if (tmpToken.start.offset >= termFlowToken.end.offset) {
      removedEventIndexes.push(i);
      continue;
    }

    switch (tmpToken.type) {
      case types.paragraph:
        if (pEnterIndex == null && tmpEvent[0] === 'enter') pEnterIndex = i;
        else if (pExitIndex == null && tmpEvent[0] === 'exit') pExitIndex = i;
        break;

      case types.content:
        if (tmpEvent[0] === 'enter') contentEnterIndex = i;
        else if (tmpEvent[0] === 'exit') contentExitIndex = i;
        break;

      default:
        if (
          termFlowToken.start.offset <= tmpToken.start.offset &&
          tmpToken.end.offset <= termFlowToken.end.offset
        ) {
          if (tmpToken.type === types.chunkText) {
            // unlink chunkText token
            if (tmpToken.previous && tmpToken.previous.start.offset < termFlowToken.start.offset) {
              tmpToken.previous.next = undefined;
              tmpToken.previous = undefined;
            }
            if (tmpToken.next && termFlowToken.end.offset < tmpToken.next.end.offset) {
              tmpToken.next.previous = undefined;
              tmpToken.next = undefined;
            }
          }

          if (pEnterIndex == null && pExitIndex == null) trailingChildEvents.unshift(tmpEvent);
          else if (pEnterIndex == null && pExitIndex != null) termChildEvents.unshift(tmpEvent);
          else leadingChildEvents.unshift(tmpEvent);

          removedEventIndexes.push(i);
        } else {
          if (pEnterIndex == null && pExitIndex != null) paragraphEvents.unshift(tmpEvent);
          if (contentEnterIndex == null && contentExitIndex != null)
            contentEvents.unshift(tmpEvent);
        }
    }

    if (tmpToken.end.offset <= termFlowToken.start.offset) break;
  }

  // modify paragraph and content
  debug('paragraph events:');
  debug(formatEvents(paragraphEvents));
  if (pExitIndex != null) {
    if (paragraphEvents.length >= 1) {
      // adjust end position
      flowEvents[pExitIndex][1].end = Object.assign(
        {},
        paragraphEvents[paragraphEvents.length - 1][1].end,
      );
    } else if (pEnterIndex != null) {
      // remove paragraph
      removedEventIndexes.push(pEnterIndex, pExitIndex);
    }
  }
  debug('content events:');
  debug(formatEvents(contentEvents));
  if (contentExitIndex != null) {
    if (contentEvents.length >= 1) {
      // adjust end position
      flowEvents[contentExitIndex][1].end = Object.assign(
        {},
        contentEvents[contentEvents.length - 1][1].end,
      );
    } else if (contentEnterIndex != null) {
      // remove content
      removedEventIndexes.push(contentEnterIndex, contentExitIndex);
    }
  }

  // remove subtokens from original flowEvents
  removedEventIndexes.sort((a, b) => b - a);
  for (const i of removedEventIndexes) {
    splice(flowEvents, i, 1, []);
  }
  debug('modified flow events:');
  debug(formatEvents(flowEvents));

  return { leadingChildEvents, termChildEvents, trailingChildEvents };
}

export function subtokenizeDefTerm(events: Event[], flowEnterIndex: number, flowExitIndex: number) {
  /**
   * Subtokenize chunkFlow events
   */
  const termFlowToken = events[flowEnterIndex][1];
  debug(
    `subtokenize: ${events[flowEnterIndex][0]} '${events[flowEnterIndex][2].sliceSerialize(
      termFlowToken,
      true,
    )}'`,
  );

  // unlink
  if (termFlowToken.previous != null) {
    termFlowToken.previous!.next = undefined;
    termFlowToken.previous = undefined;
  }

  // get subtokens
  const subtokens = getSubtokensForDefTerm(termFlowToken);

  // subtokenize chunkFlow event with childEvents
  const termToken = {
    type: tokenTypes.defListTerm,
    start: Object.assign({}, termFlowToken.start),
    end: Object.assign({}, termFlowToken.end),
  };
  const context = events[flowExitIndex][2];
  const childEvents: Event[] = [];
  childEvents.push(...subtokens.leadingChildEvents);
  if (subtokens.termChildEvents.length >= 1) {
    childEvents.push(['enter', termToken, context]);
    childEvents.push(...subtokens.termChildEvents);
    childEvents.push(['exit', termToken, context]);
  }
  childEvents.push(...subtokens.trailingChildEvents);

  splice(events, flowExitIndex, 1, []);
  splice(events, flowEnterIndex, 1, childEvents);

  return events;
}
