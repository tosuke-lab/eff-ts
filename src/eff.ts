import { AnyEffect, EffectReturnType, Effect } from './effect'

export type Eff<E extends AnyEffect, A> = Pure<E, A> | Impure<E, A>

export class Pure<E extends AnyEffect, A> {
  private _value: A

  constructor(value: A) {
    this._value = value
  }

  get value(): A {
    return this._value
  }

  map<B>(f: (x: A) => B): Eff<E, B> {
    return new Pure(f(this._value))
  }

  chain<F extends AnyEffect, B>(f: (x: A) => Eff<F, B>): Eff<E | F, B> {
    return f(this._value)
  }
}

export class Impure<E extends AnyEffect, A> {
  private _effect: E
  private _k: <R extends EffectReturnType<E>>(x: R) => Eff<E, A>

  constructor(effect: E, k: <R extends EffectReturnType<E>>(x: R) => Eff<E, A>) {
    this._effect = effect
    this._k = k
  }

  get effect() {
    return this._effect
  }

  get k() {
    return this._k
  }

  map<B>(f: (x: A) => B): Eff<E, B> {
    return this.chain(x => new Pure(f(x)))
  }

  chain<F extends AnyEffect, B>(f: (x: A) => Eff<F, B>): Eff<E | F, B> {
    return new Impure<E | F, B>(this._effect, x => this._k(x).chain(f))
  }
}

export const pureEff = <A>(x: A): Eff<never, A> => new Pure<never, A>(x)

export const liftEff = <AS extends any[], E extends AnyEffect>(effect: new (...args: AS) => E) => (
  ...args: AS
): Eff<E, EffectReturnType<E>> => new Impure(new effect(...args), pureEff)

export const runEff = <A>(eff: Eff<never, A>): A => {
  if (eff instanceof Pure) {
    return eff.value
  }
  throw new Error('Cannot run Eff which has effects')
}
