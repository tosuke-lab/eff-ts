import { Effect } from './effect'
import { Eff, liftEff, pureEff } from './eff'
import { createHandler, createRunner } from './handler'

export class ErrorEffect extends Effect<never> {
  constructor(readonly error: unknown) {
    super()
  }
}

export const throwError = liftEff(ErrorEffect)

export const runError = createRunner(
  <A>(x: A) => x,
  ({ construct, match }) =>
    construct(
      match(ErrorEffect, (e, _) => {
        throw e.error
      }),
    ),
)

export type Either<A, B> = Left<A> | Right<B>

export class Left<A> {
  constructor(readonly left: A) {}
}

export class Right<A> {
  constructor(readonly right: A) {}
}

export const handleError = createHandler()(
  <A>(x: A): Eff<never, Either<unknown, A>> => pureEff(new Right(x)),
  ({ construct, match }) =>
    construct(
      match(ErrorEffect, (e, _) => {
        return pureEff(new Left(e.error))
      }),
    ),
)
