import { AnyEffect, EffectReturnType, Effect } from './effect'
import { Eff, Pure, Impure } from './eff'
import { Leaf, Err } from './arr'

type Constructor<E> = new (...args: any[]) => E
type ChainFn<E extends AnyEffect, KR, R> = (effect: E, k: (x: EffectReturnType<E>) => KR) => R
type Matcher<E extends AnyEffect, KR, R> = [Constructor<E>, ChainFn<E, KR, R>]
type MatchFn<KR> = <R, E extends AnyEffect>(e: Constructor<E>, f: ChainFn<E, KR, R>) => Matcher<E, KR, R>
type InferMatchersEffect<M extends Matcher<any, any, any>[]> = M[number] extends Matcher<infer E, any, any> ? E : never

const matchImpl: MatchFn<any> = (e, f) => [e, f]

/// Runner

type RunnerConstructFn<A, B> = <MS extends Matcher<any, B, B>[]>(
  ...matchers: MS
) => (fx: Eff<InferMatchersEffect<MS>, A>) => B

const runnerImpl = <A, B>(pure: (x: A) => B): RunnerConstructFn<A, B> => (...matchers) =>
  function handle(fx: Eff<any, A>): B {
    if (fx instanceof Pure) {
      if (fx.value instanceof Err) throw fx.value.err
      return pure(fx.value)
    }
    const result = (matchers as Matcher<AnyEffect, B, B>[]).find(m => fx.effect instanceof m[0])
    if (result) {
      const fn = result[1]
      const k = (x: any): B => handle(fx.k.apply(x))
      return fn(fx.effect, k)
    }
    throw new Error('Unhandlable Effect')
  }

export const createRunner = <A, B, IE extends AnyEffect>(
  pure: (x: A) => B,
  impure: (x: { construct: RunnerConstructFn<A, B>; match: MatchFn<B> }) => (fx: Eff<IE, A>) => B,
): ((fx: Eff<IE, A>) => B) => impure({ construct: runnerImpl(pure), match: matchImpl })

/// Handler
export type Handler<IE extends AnyEffect, A, OE extends AnyEffect, B> = (fx: Eff<IE, A>) => Eff<OE, B>

interface OtherEffects extends Effect<never> {
  __value: never
}

type InferMatchersReturns<M extends any[]> = M[number] extends Matcher<any, any, infer R> ? R : never
type InferEffects<F extends any> = Exclude<Eff.EffectOf<F>, OtherEffects>
type HandlerConstructFn<A, B> = <MS extends Matcher<any, Eff<OtherEffects, B>, Eff<AnyEffect, B>>[]>(
  ...matchers: MS
) => <IE extends AnyEffect>(
  fx: Eff<IE, A>,
) => Eff<Exclude<IE, InferMatchersEffect<MS>> | InferEffects<InferMatchersReturns<MS>>, B>

const handlerImpl = <A, B, PureE extends AnyEffect>(pure: (x: A) => Eff<PureE, B>): HandlerConstructFn<A, B> => (
  ...matchers
) =>
  function handle(fx: Eff<any, A>): Eff<any, B> {
    if (fx instanceof Pure) return fx.chain(pure)
    const result = (matchers as Matcher<AnyEffect, Eff<any, B>, Eff<any, B>>[]).find(m => fx.effect instanceof m[0])
    if (result) {
      const fn = result[1]
      const k = (x: any): Eff<any, B> => handle(fx.k.apply(x))
      return fn(fx.effect, k)
    } else {
      return new Impure(fx.effect, new Leaf((x: any) => handle(fx.k.apply(x))))
    }
  }

export const createHandler = <A, B, PureE extends AnyEffect, InE extends AnyEffect, OutE extends AnyEffect>(
  pure: (x: A) => Eff<PureE, B>,
  impure: (x: {
    construct: HandlerConstructFn<A, B>
    match: MatchFn<Eff<OtherEffects, B>>
  }) => (fx: Eff<InE, any>) => Eff<OutE, any>,
): Handler<InE, A, PureE | OutE, B> => impure({ construct: handlerImpl(pure), match: matchImpl })
