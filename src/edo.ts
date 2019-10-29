import { AnyEffect } from './effect'
import { Eff, pureEff, throwError, Pure, Impure } from './eff'
import { Result, Err, Leaf } from './arr'

type InferEffects<E> = E extends Eff<infer F, any> ? F : never
export const edo = <E extends Eff<AnyEffect, any>, A>(gen: () => Generator<E, A, any>): Eff<InferEffects<E>, A> => {
  const iter = gen()

  const loop = (val: Result<unknown>): Eff<InferEffects<E>, A> => {
    try {
      const r = val instanceof Err ? iter.throw(val.err) : iter.next(val)
      if (r.done) {
        return pureEff(r.value)
      }
      const eff = (r.value as unknown) as Eff<InferEffects<E>, unknown>
      return eff instanceof Pure ? loop(eff.value) : new Impure(eff.effect, eff.k.concat(new Leaf(loop)))
    } catch (e) {
      return throwError(e)
    }
  }

  return loop(undefined)
}
