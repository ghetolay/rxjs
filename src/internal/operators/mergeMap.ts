import { Observable } from '../Observable';
import { ObservableInput, OperatorFunction } from '../types';
import { map } from './map';
import { from } from '../observable/from';
import { awesomeFlatMap } from './awesomeFlatMap';
import { generateStrategy } from '../FlattenStrategy';

/* tslint:disable:max-line-length */
export function mergeMap<T, R>(project: (value: T, index: number) => ObservableInput<R>, concurrent?: number): OperatorFunction<T, R>;
/** @deprecated resultSelector no longer supported, use inner map instead */
export function mergeMap<T, R>(project: (value: T, index: number) => ObservableInput<R>, resultSelector: undefined, concurrent?: number): OperatorFunction<T, R>;
/** @deprecated resultSelector no longer supported, use inner map instead */
export function mergeMap<T, I, R>(project: (value: T, index: number) => ObservableInput<I>, resultSelector: (outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R, concurrent?: number): OperatorFunction<T, R>;
/* tslint:enable:max-line-length */

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable.
 *
 * <span class="informal">Maps each value to an Observable, then flattens all of
 * these inner Observables using {@link mergeAll}.</span>
 *
 * ![](mergeMap.png)
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an Observable, and then merging those resulting Observables and
 * emitting the results of this merger.
 *
 * ## Example
 * Map and flatten each letter to an Observable ticking every 1 second
 * ```javascript
 * const letters = of('a', 'b', 'c');
 * const result = letters.pipe(
 *   mergeMap(x => interval(1000).pipe(map(i => x+i))),
 * );
 * result.subscribe(x => console.log(x));
 *
 * // Results in the following:
 * // a0
 * // b0
 * // c0
 * // a1
 * // b1
 * // c1
 * // continues to list a,b,c with respective ascending integers
 * ```
 *
 * @see {@link concatMap}
 * @see {@link exhaustMap}
 * @see {@link merge}
 * @see {@link mergeAll}
 * @see {@link mergeMapTo}
 * @see {@link mergeScan}
 * @see {@link switchMap}
 *
 * @param {function(value: T, ?index: number): ObservableInput} project A function
 * that, when applied to an item emitted by the source Observable, returns an
 * Observable.
  * @param {number} [concurrent] Maximum number of input
 * Observables being subscribed to concurrently.
 * @return {Observable} An Observable that emits the result of applying the
 * projection function (and the optional `resultSelector`) to each item emitted
 * by the source Observable and merging the results of the Observables obtained
 * from this transformation.
 * @method mergeMap
 * @owner Observable
 */
export function mergeMap<T, I, R>(
  project: (value: T, index: number) => ObservableInput<I>,
  resultSelector?: ((outerValue: T, innerValue: I, outerIndex: number, innerIndex: number) => R) | number,
  concurrent?: number
): OperatorFunction<T, I|R> {
  if (typeof resultSelector === 'function') {
    // DEPRECATED PATH
    return (source: Observable<T>) => source.pipe(
      mergeMap((a, i) => from(project(a, i)).pipe(
        map((b, ii) => resultSelector(a, b, i, ii)),
      ), concurrent)
    );
  } else if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }

  return awesomeFlatMap(project, () => generateStrategy(concurrent));
}