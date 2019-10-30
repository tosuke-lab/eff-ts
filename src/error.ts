import { AnyEffect } from './effect'
import { Eff } from './eff'

export type Either<A, B> = Left<A> | Right<B>

export class Left<A> {
  constructor(readonly left: A) {}
}

export class Right<A> {
  constructor(readonly right: A) {}
}

export const handleError = <IE extends AnyEffect, A>(fx: Eff<IE, A>) =>
  fx.chain(x => Eff.pure<Either<unknown, A>>(new Right(x))).catch(err => Eff.pure(new Left(err)))
