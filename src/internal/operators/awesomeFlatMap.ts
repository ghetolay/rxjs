import { Observable } from '../Observable';
import { Operator } from '../Operator';
import { Subscriber } from '../Subscriber';
import { Subscription } from '../Subscription';
import { subscribeToResult } from '../util/subscribeToResult';
import { OuterSubscriber } from '../OuterSubscriber';
import { InnerSubscriber } from '../InnerSubscriber';
import { ObservableInput, OperatorFunction } from '../types';
import { FlattenStrategy, MERGE_STRATEGY } from '../FlattenStrategy';
import { UnsubscriptionError } from '../util/UnsubscriptionError';

export function awesomeFlatMap<T, I>(
  project: (value: T, index: number) => ObservableInput<I>,
  flattenStrategyFactory?: () => FlattenStrategy<T>
): OperatorFunction<T, I> {

  return (source: Observable<T>) => source.lift(new AwesomeFlatMapOperator(project, flattenStrategyFactory));
}

export class AwesomeFlatMapOperator<T, R> implements Operator<T, R> {
  constructor(private project: (value: T, index: number) => ObservableInput<R>,
              private queueStrategyFactory: () => FlattenStrategy<T> = () => MERGE_STRATEGY) {
  }

  call(observer: Subscriber<R>, source: any): any {
    return source.subscribe(new AwesomeFlatMapSubscriber(
      observer, this.project, this.queueStrategyFactory()
    ));
  }
}

interface ActiveInner<T> {
  value: T;
  subscription?: Subscription;
  state: 'init' | 'registered' | 'done';
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
export class AwesomeFlatMapSubscriber<T, R> extends OuterSubscriber<T, R> {
  private hasCompleted: boolean = false;
  protected index: number = 0;

  private activeSubscriptions: ActiveInner<T>[] = [];

  constructor(destination: Subscriber<R>,
              private project: (value: T, index: number) => ObservableInput<R>,
              private queueStrategy: FlattenStrategy<T>) {
    super(destination);
  }

  protected _next(value: T): void {
    const result = this.queueStrategy.onNewItem(value, this.activeSubscriptions.map(a => a.value));

    if (result == null) {
      return;
    }

    const [item, index] = result;

    if (index >= 0 && index < this.activeSubscriptions.length) {
      const activeInner = this.activeSubscriptions.splice(index, 1)[0];
      activeInner.subscription.unsubscribe();
    }

    this._tryNext(item);
  }

  protected _tryNext(value: T) {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (err) {
      this.destination.error(err);
      return;
    }
    this._innerSub(result, value, index);
  }

  private _innerSub(ish: ObservableInput<R>, value: T, index: number): void {
    const activeSub: ActiveInner<T> = {
      value,
      state: 'init',
    };

    /* typings of subscribeToResult() are lying to us, this can return undefined */
    const innerSubscription: Subscription | undefined = subscribeToResult<T, R>(this.buildOuterSubscriber(activeSub), ish, value, index);

    if (activeSub.state !== 'done') {
      activeSub.state = 'registered';
      activeSub.subscription = innerSubscription;
      this.activeSubscriptions.push(activeSub);
    }
  }

  private buildOuterSubscriber(activeSub: ActiveInner<T>) {
    return {
      notifyNext: (_: T, innerValue: R) => {
        this.destination.next(innerValue);
      },
      notifyError: (error: any): void => {
        this.destination.error(error);
      },
      notifyComplete: (innerSub: Subscription) => {
        if (activeSub.state === 'registered') {
          this.activeSubscriptions.splice(this.activeSubscriptions.indexOf(activeSub), 1);
        }
        activeSub.state = 'done';

        const nextItem = this.queueStrategy.onSubComplete(activeSub.value);

        if (nextItem != null) {
          this._tryNext(nextItem);
        } else if (this.activeSubscriptions.length === 0 && this.hasCompleted) {
          this.destination.complete();
        }
      }
    } as any as OuterSubscriber<T, R>;
  }

  protected _complete(): void {
    this.hasCompleted = true;
    if (this.activeSubscriptions.length === 0) {
      this.destination.complete();
    }
  }

  _unsubscribe() {
    const errors = [];

    for (const sub of this.activeSubscriptions) {
      if (sub.subscription) {
        try {
          sub.subscription.unsubscribe();
        } catch (e) {
          errors.push(e);
        }
      }
    }

    if (errors.length > 0) {
      throw new UnsubscriptionError(errors);
    }
  }

}
