import { AnyEffect } from "./effect";
import { Eff, Pure, Impure } from "./eff";
import { EffResult, EffError, Leaf } from "./arr";

export const edo = <E extends Eff<AnyEffect, any>, A>(
  gen: () => Generator<E, A, any>
): Eff<Eff.EffectOf<E>, A> => {
  const iter = gen();

  const loop = (val: EffResult<unknown>): Eff<Eff.EffectOf<E>, A> => {
    try {
      const r = val instanceof EffError ? iter.throw(val.err) : iter.next(val);
      if (r.done) {
        return Eff.pure(r.value);
      }
      const eff = (r.value as unknown) as Eff<Eff.EffectOf<E>, unknown>;
      return eff instanceof Pure
        ? loop(eff.value)
        : new Impure(eff.effect, eff.k.concat(new Leaf(loop)));
    } catch (e) {
      return Eff.throwError(e);
    }
  };

  return loop(undefined);
};
