import { AnyEffect, EffectReturnType, Effect } from './effect'
import { Eff, Pure, Impure } from './eff'
import { Leaf } from './arr'

type Constructor<E> = new (...args: any[]) => E
type ChainFn<E extends AnyEffect, R> = (effect: E, k: (x: EffectReturnType<E>) => R) => R
type Matcher<E extends AnyEffect, R> = [Constructor<E>, ChainFn<E, R>]
type MatchFn<R> = <E extends AnyEffect>(e: Constructor<E>, f: ChainFn<E, R>) => Matcher<E, R>
type InferMatchersEffect<M extends Matcher<any, any>[]> = M[number] extends Matcher<infer E, any> ? E : never

const matchImpl: MatchFn<any> = (e, f) => [e, f]

/// Runner

type RunnerConstructFn<A, B> = <MS extends Matcher<any, B>[]>(
  ...matchers: MS
) => (fx: Eff<InferMatchersEffect<MS>, A>) => B

const runnerImpl = <A, B>(pure: (x: A) => B): RunnerConstructFn<A, B> => (...matchers) =>
  function handle(fx: Eff<any, A>): B {
    if (fx instanceof Pure) return pure(fx.value)
    const result = (matchers as Matcher<AnyEffect, B>[]).find(m => fx.effect instanceof m[0])
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
interface OtherEffects extends Effect<never> {}
type HandlerConstructFn<A, B, AE extends AnyEffect> = <MS extends Matcher<any, Eff<AE | OtherEffects, B>>[]>(
  ...matchers: MS
) => <IE extends AnyEffect>(fx: Eff<IE, A>) => Eff<Exclude<IE, InferMatchersEffect<MS>> | AE, B>

const handlerImpl = <A, B, AE extends AnyEffect>(pure: (x: A) => Eff<AE, B>): HandlerConstructFn<A, B, AE> => (
  ...matchers
) =>
  function handle(fx: Eff<any, A>): Eff<any, B> {
    if (fx instanceof Pure) return pure(fx.value)
    const result = (matchers as Matcher<AnyEffect, Eff<any, B>>[]).find(m => fx.effect instanceof m[0])
    if (result) {
      const fn = result[1]
      const k = (x: any): Eff<any, B> => handle(fx.k.apply(x))
      return fn(fx.effect, k)
    } else {
      return new Impure(fx.effect, new Leaf((x: any) => handle(fx.k.apply(x))))
    }
  }

export const createHandler = <AE extends AnyEffect = never>() => <A, B, IE extends AnyEffect, OE extends AnyEffect>(
  pure: (x: A) => Eff<AE, B>,
  impure: (x: {
    construct: HandlerConstructFn<A, B, AE>
    match: MatchFn<Eff<AE | OtherEffects, B>>
  }) => (fx: Eff<IE, any>) => Eff<OE, any>,
): ((fx: Eff<IE, A>) => Eff<OE, B>) => impure({ construct: handlerImpl(pure), match: matchImpl })
