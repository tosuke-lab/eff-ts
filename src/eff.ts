export type Effect<R> = {
  readonly _R?: R;
  readonly type: string;
};

type EffectResult<R extends Effect<any>> = R extends Effect<infer TResult>
  ? TResult
  : never;

export interface Eff<R extends Effect<any>, A> {
  chain<S extends Effect<any>, B>(f: (x: A) => Eff<S, B>): Eff<R | S, B>;
}

export class Pure<A> implements Eff<never, A> {
  constructor(private _value: A) {}

  get value() {
    return this._value;
  }

  chain<S extends Effect<any>, B>(f: (x: A) => Eff<S, B>): Eff<S, B> {
    return f(this._value);
  }
}

export class Impure<R extends Effect<any>, A> implements Eff<R, A> {
  constructor(
    private _effect: R,
    private _k: (x: EffectResult<R>) => Eff<R, A>
  ) {}

  chain<S extends Effect<any>, B>(f: (x: A) => Eff<S, B>): Eff<R | S, B> {
    return new Impure(this._effect, (x) => this._k(x).chain(f));
  }
}

export class PromiseEff<R extends Effect<any>, A> implements Eff<R, A> {
  constructor(private _eff: Promise<Eff<R, A>>) {}

  chain<S extends Effect<any>, B>(f: (x: A) => Eff<S, B>): Eff<R | S, B> {
    return new PromiseEff(this._eff.then((eff) => eff.chain(f)));
  }
}

export function pure<A>(value: A): Eff<never, A> {
  return new Pure(value);
}

export function liftEff<E extends Effect<any>>(
  effect: E
): Eff<E, EffectResult<E>> {
  return new Impure(effect, pure);
}
