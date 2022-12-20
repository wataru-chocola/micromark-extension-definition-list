import type { Event, Code } from 'micromark-util-types';

export function formatEvents(events: Event[] | undefined): any | undefined {
  if (events == null) {
    return;
  }
  return events.map((x) => {
    let content = '';
    try {
      content = x[2].sliceSerialize(x[1], true);
    } catch (e) {
      content = '<maybe incomplete token>';
    }
    return [x[0], x[1].type, content];
  });
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
