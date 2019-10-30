import { Result, Err, Arrs, Leaf } from './arr'
import { AnyEffect, EffectReturnType } from './effect'

export type Eff<E extends AnyEffect, A> = Pure<E, A> | Impure<E, A>
export namespace Eff {
  export type TypeOf<F> = F extends Eff<any, infer A> ? A : never
  export type EffectOf<F> = F extends Eff<infer E, any> ? E : never
}

const pureEff = <A>(x: A): Eff<never, A> => new Pure<never, A>(x)

const throwError = (err: unknown): Eff<never, never> => new Pure<never, never>(new Err(err))

const liftEff = <AS extends any[], E extends AnyEffect>(effect: new (...args: AS) => E) => (
  ...args: AS
): Eff<E, EffectReturnType<E>> => new Impure(new effect(...args), new Leaf(pureEff))

const runEff = <A>(eff: Eff<never, A>): A => {
  if (eff instanceof Pure) {
    if (eff.value instanceof Err) {
      throw eff.value.err
    } else {
      return eff.value
    }
  }
  throw new Error('Cannot run Eff which has effects')
}

export const Eff = Object.freeze({
  pure: pureEff,
  throwError: throwError,
  liftF: liftEff,
  run: runEff,
})

export class Pure<E extends AnyEffect, A> {
  private _value: Result<A>

  constructor(value: Result<A>) {
    this._value = value
  }

  get value(): Result<A> {
    return this._value
  }

  map<B>(f: (x: A) => B): Eff<E, B> {
    if (this._value instanceof Err) {
      return (this as unknown) as Pure<E, B>
    } else {
      return new Pure(f(this._value))
    }
  }

  chain<F extends AnyEffect, B>(f: (x: A) => Eff<F, B>): Eff<E | F, B> {
    if (this._value instanceof Err) {
      return (this as unknown) as Pure<never, B>
    } else {
      return f(this._value) as Eff<E | F, B>
    }
  }

  catch<F extends AnyEffect>(f: (err: unknown) => Eff<F, A>): Eff<E | F, A> {
    if (this._value instanceof Err) {
      return f(this._value.err)
    } else {
      return this
    }
  }

  handle<F extends AnyEffect, B>(handler: (fx: Eff<E, A>) => Eff<F, B>): Eff<F, B> {
    return handler(this)
  }
}

export class Impure<E extends AnyEffect, A> {
  private _effect: E
  private _k: Arrs<E, EffectReturnType<E>, A>

  constructor(effect: E, k: Arrs<E, EffectReturnType<E>, A>) {
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
    return new Impure<E | F, B>(this._effect, this._k.chain(f))
  }

  catch<F extends AnyEffect>(f: (err: unknown) => Eff<F, A>): Eff<E | F, A> {
    return new Impure<E | F, A>(this._effect, this._k.catch(f))
  }

  handle<F extends AnyEffect, B>(handler: (fx: Eff<E, A>) => Eff<F, B>): Eff<F, B> {
    return handler(this)
  }
}
