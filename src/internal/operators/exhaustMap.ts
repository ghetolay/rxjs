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

const exhaustStrategy: FlattenStrategy<any> = {
  onNewItem: (item: any, actives: any[]) => actives.length > 0 ? undefined : item,
  onSubComplete: () => undefined,
};

/* tslint:disable:max-line-length */
export function exhaustMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>;
/** @deprecated resultSelector is no longer supported. Use inner map instead. */
export function exhaustMap<T, R>(project: (value: T, index: number) => ObservableInput<R>, resultSelector: undefined): OperatorFunction<T, R>;
/** @deprecated resultSelector is no longer supported. Use inner map instead. */
export function exhaustMap<T, I, R>(project: (value: T, index: number) => ObservableInput<I>, resultSelector: (outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R): OperatorFunction<T, R>;
/* tslint:enable:max-line-length */

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable only if the previous projected Observable has completed.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link exhaust}.</span>
 *
 * ![](exhaustMap.png)
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an (so-called "inner") Observable. When it projects a source value to
 * an Observable, the output Observable begins emitting the items emitted by
 * that projected Observable. However, `exhaustMap` ignores every new projected
 * Observable if the previous projected Observable has not yet completed. Once
 * that one completes, it will accept and flatten the next projected Observable
 * and repeat this process.
 *
 * ## Example
 * Run a finite timer for each click, only if there is no currently active timer
 * ```javascript
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   exhaustMap((ev) => interval(1000).pipe(take(5))),
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link concatMap}
 * @see {@link exhaust}
 * @see {@link mergeMap}
 * @see {@link switchMap}
 *
 * @param {function(value: T, ?index: number): ObservableInput} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
 * @return {Observable} An Observable containing projected Observables
 * of each item of the source, ignoring projected Observables that start before
 * their preceding Observable has completed.
 * @method exhaustMap
 * @owner Observable
 */
export function exhaustMap<T, I, R>(
  project: (value: T, index: number) => ObservableInput<I>,
  resultSelector?: (outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R,
): OperatorFunction<T, I|R> {
  if (resultSelector) {
    // DEPRECATED PATH
    return (source: Observable<T>) => source.pipe(
      exhaustMap((a, i) => from(project(a, i)).pipe(
        map((b, ii) => resultSelector(a, b, i, ii)),
      )),
    );
  }

  return awesomeFlatMap(project, () => exhaustStrategy);
}
