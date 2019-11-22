import { Effect, AnyEffect } from "./effect";
import { Eff, Pure, Impure } from "./eff";
import { Leaf } from "./arr";

declare const tag: unique symbol;

interface GetEffect<S, Tag> extends Effect<S> {
  [tag]: Tag;
  readonly name: "GetEffect";
}

interface SetEffect<S, Tag> extends Effect<void> {
  [tag]: Tag;
  readonly name: "SetEffect";
  readonly value: S;
}

type StateEffect<S, Tag> = GetEffect<S, Tag> | SetEffect<S, Tag>;

type State<S, Tag> = {
  GetEffect: new () => GetEffect<S, Tag>;
  SetEffect: new (value: S) => SetEffect<S, Tag>;
  handle: (
    initial: S
  ) => <IE extends AnyEffect, A>(
    fx: Eff<IE, A>
  ) => Eff<Exclude<IE, StateEffect<S, Tag>>, [A, S]>;
  get: () => Eff<GetEffect<S, Tag>, S>;
  set: (value: S) => Eff<SetEffect<S, Tag>, void>;
  modify: (f: (state: S) => S) => Eff<StateEffect<S, Tag>, void>;
};

export const createState = <S, Tag = "">(): State<S, Tag> => {
  const GetEffect = class GetEffect extends Effect<S> {
    [tag]!: Tag;
    readonly name = "GetEffect" as const;
  };

  const SetEffect = class SetEffect extends Effect<void> {
    [tag]!: Tag;
    readonly name = "SetEffect" as const;

    constructor(readonly value: S) {
      super();
    }
  };

  const isGetEff = <A>(
    fx: Impure<AnyEffect, A>
  ): fx is Impure<GetEffect<S, Tag>, A> => fx.effect instanceof GetEffect;
  const isSetEff = <A>(
    fx: Impure<AnyEffect, A>
  ): fx is Impure<SetEffect<S, Tag>, A> => fx.effect instanceof SetEffect;
  const handle = (initial: S) => <IE extends AnyEffect, A>(
    fx: Eff<IE, A>
  ): Eff<Exclude<IE, StateEffect<S, Tag>>, [A, S]> => {
    function internal<IE extends AnyEffect, A>(
      f: Eff<IE, A>,
      state: S
    ): Eff<Exclude<IE, StateEffect<S, Tag>>, [A, S]> {
      if (f instanceof Pure) return (f as Eff<never, A>).map(x => [x, state]);
      if (isGetEff(f)) {
        return internal(f.k.apply(state), state);
      } else if (isSetEff(f)) {
        return internal(f.k.apply(undefined), f.effect.value);
      } else {
        return new Impure<any, [A, S]>(
          f.effect,
          Leaf.ok((x: any) => internal(f.k.apply(x), state))
        );
      }
    }
    return internal(fx, initial);
  };

  const get = Eff.liftF(GetEffect);
  const set = Eff.liftF(SetEffect);
  const modify = (f: (state: S) => S) =>
    get()
      .map(f)
      .chain(set);

  return {
    GetEffect,
    SetEffect,
    handle,
    get,
    set,
    modify
  };
};
