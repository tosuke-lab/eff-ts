import { Effect, AnyEffect } from './effect'
import { Eff, Pure, Impure } from './eff'
import { Leaf } from './arr'

export const createState = <S, Tag extends string = ''>() => {
  const type = Symbol()

  class GetEffect extends Effect<S> {
    [type]!: Tag
    readonly name = 'GetEffect' as const
  }

  class SetEffect extends Effect<void> {
    [type]!: Tag
    readonly name = 'SetEffect' as const

    constructor(readonly value: S) {
      super()
    }
  }

  const isGetEff = <A>(fx: Impure<AnyEffect, A>): fx is Impure<GetEffect, A> => fx.effect instanceof GetEffect
  const isSetEff = <A>(fx: Impure<AnyEffect, A>): fx is Impure<SetEffect, A> => fx.effect instanceof SetEffect
  const handle = (initial: S) => <IE extends AnyEffect, A>(
    fx: Eff<IE, A>,
  ): Eff<Exclude<IE, GetEffect | SetEffect>, [A, S]> => {
    function internal<IE extends AnyEffect, A>(
      f: Eff<IE, A>,
      state: S,
    ): Eff<Exclude<IE, GetEffect | SetEffect>, [A, S]> {
      if (f instanceof Pure) return (f as Eff<never, A>).map(x => [x, state])
      if (isGetEff(f)) {
        return internal(f.k.apply(state), state)
      } else if (isSetEff(f)) {
        return internal(f.k.apply(undefined), f.effect.value)
      } else {
        return new Impure<any, [A, S]>(f.effect, Leaf.ok((x: any) => internal(f.k.apply(x), state)))
      }
    }
    return internal(fx, initial)
  }

  const get = Eff.liftF(GetEffect)
  const set = Eff.liftF(SetEffect)
  const modify = (f: (state: S) => S) =>
    get()
      .map(f)
      .chain(set)

  return {
    GetEffect,
    SetEffect,
    handle,
    get,
    set,
    modify,
  }
}
