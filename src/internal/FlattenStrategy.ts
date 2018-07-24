export interface FlattenStrategy<T> {
  /**
   *
   * @param item new item emitted by the source
   * @param actives list of items corresponding to actives subscriptions running
   * @return a tuple with 2 values :
   *   1. item to run project and subscribe to
   *   2. optional index of subscription to cancel
   *
   * TODO: with this api we can't just cancel an active subscription
   * without subscribing to a new item.
   * TODO: we can't sub nor unsub more than once (would need tuple of array :/)
   */
  onNewItem(item: T, actives: T[]): [T, number | undefined] | undefined;

  /**
   *
   * @param completed item corresponding to the completed observable
   * @return optional, an item (to run project and subscribe to)
   */
  onSubComplete(completed: T): T | undefined;
}

export const MERGE_STRATEGY: FlattenStrategy<any> = {
  onNewItem: (item: any) => [item, undefined],
  onSubComplete: () => undefined,
};

export const DISCARD_STRATEGY: FlattenStrategy<any> = {
  onNewItem: (item: any) => undefined,
  onSubComplete: () => undefined,
};

// TODO: I don't think we need dropRunning anymore (used to use it for switchMap and exhaustMap)
export class ConcurrentFifoQueueStrategy<T> implements FlattenStrategy<T> {
  private buffer: T[] = [];

  constructor(private concurrent = Number.POSITIVE_INFINITY, private bufferSize = Number.POSITIVE_INFINITY, private dropRunning = false) {}

  onNewItem(item: T, actives: T[]): [T | undefined, number | undefined] | undefined {
    // didn't reach maximum concurrent we can subscribe to item
    if (actives.length < this.concurrent) {
      return [item, undefined];
    }

    // max concurrent reached, save item on buffer
    if (this.buffer.length < this.bufferSize) {
      this.buffer.push(item);
      return undefined;
    }

    // buffer overflow, add new item and remove latest item
    let latestItem: T;
    if (this.buffer.length === 0) {
      // same as else just opt out when buffer is empty
      // no need to push() just to shift() the same item right after
      latestItem = item;
    } else {
      this.buffer.push(item);
      latestItem = this.buffer.shift();
    }

    // drop latest running subscription and subscribe to latest buffered item
    if (this.dropRunning) {
      return [latestItem, actives.length - 1];
    }

    // drop latest item and do nothing else.
    return undefined;
  }

  onSubComplete(): T | undefined {
    return this.buffer.shift();
  }
}

// helper
export function generateStrategy(concurrent?: number) {
  if (concurrent === 0) {
    return DISCARD_STRATEGY;
  }

  if (!concurrent) {
    return MERGE_STRATEGY;
  }

  return new ConcurrentFifoQueueStrategy(concurrent);
}