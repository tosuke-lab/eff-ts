import { Effect } from './effect'
import { Eff } from './eff'
import { createRunner } from './handler'

export class PromiseEffect<A> extends Effect<A> {
  readonly name = 'PromiseEffect' as const
  constructor(readonly f: () => A | PromiseLike<A>) {
    super()
  }
}

export const liftPromise = Eff.liftF(PromiseEffect)

export const runPromise = createRunner(
  <A>(x: A) => Promise.resolve(x),
  ({ construct, match }) =>
    construct(
      match(PromiseEffect, (e, k) => {
        return Promise.resolve(e.f()).then(k)
      }),
    ),
)
