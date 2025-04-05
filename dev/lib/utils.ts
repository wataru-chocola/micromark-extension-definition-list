import type { Event, Code } from 'micromark-util-types';

type FormattedEvent = [string, string, string];

export function formatEvent(event: Event): FormattedEvent {
  let content = '';
  try {
    content = event[2].sliceSerialize(event[1], true);
  } catch (_e) {
    content = '<maybe incomplete token>';
  }
  return [event[0], event[1].type, content];
}

export function formatEvents(events: Event[] | undefined): FormattedEvent[] | undefined {
  if (events == null) {
    return;
  }
  return events.map((x) => formatEvent(x));
}

export function code2Str(code: Code): string {
  if (code == null) {
    return String(code);
  } else if (0x20 <= code && code <= 0x7e) {
    return String.fromCharCode(code);
  } else if (code <= 0) {
    switch (code) {
      case -5:
        return '<CR>';
      case -4:
        return '<LF>';
      case -3:
        return '<CRLF>';
      case 0:
        return '<U+FFFD>';
      default:
        return String(code);
    }
  } else {
    return '0x' + code.toString(16);
  }
}

export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
