import { AnyEffect } from './effect'
import { Eff, pureEff, Pure, Impure } from './eff'
import { ErrorEffect, throwError } from './error'

type InferEffects<E> = E extends Eff<infer F, any> ? F : never
export const edo = <E extends Eff<AnyEffect, any>, A>(
  gen: () => Generator<E, A, any>,
): Eff<InferEffects<E> | ErrorEffect, A> => {
  const iter = gen()

  const handleError = (fx: Eff<any, any>): Eff<any, any> => {
    if (fx instanceof Pure) return fx as Pure<never, A>
    if (fx.effect instanceof ErrorEffect) {
      return loop(fx.effect, undefined)
    } else {
      return new Impure<any, any>(fx.effect, (x: any) => handleError(fx.k(x)))
    }
  }

  const loop = (err?: unknown, val?: unknown): Eff<InferEffects<E> | ErrorEffect, A> => {
    try {
      const r = err !== undefined ? iter.throw(err) : iter.next(val)
      if (r.done) {
        return pureEff(r.value)
      }
      const eff = (r.value as unknown) as Eff<InferEffects<E>, unknown>
      const k = (x: unknown) => loop(undefined, x)
      return handleError(eff).chain(k)
    } catch (e) {
      return throwError(e)
    }
  }
  return loop()
}
