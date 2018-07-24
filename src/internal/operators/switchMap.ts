import { Operator } from '../Operator';
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { Subscription } from '../Subscription';
import { OuterSubscriber } from '../OuterSubscriber';
import { InnerSubscriber } from '../InnerSubscriber';
import { subscribeToResult } from '../util/subscribeToResult';
import { ObservableInput, OperatorFunction } from '../types';
import { map } from './map';
import { from } from '../observable/from';
import { awesomeFlatMap } from './awesomeFlatMap';
import { ConcurrentFifoQueueStrategy, FlattenStrategy } from '../FlattenStrategy';

const switchStrategy: FlattenStrategy<any> = {
  onNewItem: (item: any, actives: any[]) => [item, actives.length - 1],
  onSubComplete: () => undefined,
};

/* tslint:disable:max-line-length */
export function switchMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>;
/** @deprecated resultSelector is no longer supported, use inner map instead */
export function switchMap<T, R>(project: (value: T, index: number) => ObservableInput<R>, resultSelector: undefined): OperatorFunction<T, R>;
/** @deprecated resultSelector is no longer supported, use inner map instead */
export function switchMap<T, I, R>(project: (value: T, index: number) => ObservableInput<I>, resultSelector: (outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R): OperatorFunction<T, R>;
/* tslint:enable:max-line-length */

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable, emitting values only from the most recently projected Observable.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables.</span>
 *
 * ![](switchMap.png)
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. Each time it observes one of these
 * inner Observables, the output Observable begins emitting the items emitted by
 * that inner Observable. When a new inner Observable is emitted, `switchMap`
 * stops emitting items from the earlier-emitted inner Observable and begins
 * emitting items from the new one. It continues to behave like this for
 * subsequent inner Observables.
 *
 * ## Example
 * Rerun an interval Observable on every click event
 * ```javascript
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(switchMap((ev) => interval(1000)));
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link concatMap}
 * @see {@link exhaustMap}
 * @see {@link mergeMap}
 * @see {@link switchAll}
 * @see {@link switchMapTo}
 *
 * @param {function(value: T, ?index: number): ObservableInput} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @return {Observable} An Observable that emits the result of applying the
 * projection function (and the optional `resultSelector`) to each item emitted
 * by the source Observable and taking only the values from the most recently
 * projected inner Observable.
 * @method switchMap
 * @owner Observable
 */
export function switchMap<T, I, R>(
  project: (value: T, index: number) => ObservableInput<I>,
  resultSelector?: (outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R,
): OperatorFunction<T, I|R> {
  if (typeof resultSelector === 'function') {
    return (source: Observable<T>) => source.pipe(
      switchMap((a, i) => from(project(a, i)).pipe(
        map((b, ii) => resultSelector(a, b, i, ii))
      ))
    );
  }

  return awesomeFlatMap(project, () => switchStrategy);
}