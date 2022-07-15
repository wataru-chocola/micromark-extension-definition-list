import type { Event } from 'micromark-util-types';

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
