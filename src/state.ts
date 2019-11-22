import { Effect, AnyEffect } from "./effect";
import { Eff, Pure, Impure } from "./eff";
import { Leaf } from "./arr";

declare const tag: unique symbol;

interface ModifyEffect<S, Tag> extends Effect<S> {
  [tag]: Tag;
  readonly name: "ModifyEffect";
  readonly f: (state: S) => S;
}

type StateEffect<S, Tag> = ModifyEffect<S, Tag>;

type State<S, Tag> = {
  ModifyEffect: new (f: (state: S) => S) => ModifyEffect<S, Tag>;
  handle: (
    initial: S
  ) => <IE extends AnyEffect, A>(
    fx: Eff<IE, A>
  ) => Eff<Exclude<IE, StateEffect<S, Tag>>, [A, S]>;
  modify: (f: (state: S) => S) => Eff<StateEffect<S, Tag>, S>;
  get: () => Eff<StateEffect<S, Tag>, S>;
  put: (value: S) => Eff<StateEffect<S, Tag>, void>;
};

export const createState = <S, Tag = "">(): State<S, Tag> => {
  const ModifyEffect = class ModifyEffect extends Effect<S> {
    [tag]!: Tag;
    readonly name = "ModifyEffect" as const;

    constructor(readonly f: (state: S) => S) {
      super();
    }
  };

  const isStateEff = <A>(
    fx: Impure<AnyEffect, A>
  ): fx is Impure<ModifyEffect<S, Tag>, A> => fx.effect instanceof ModifyEffect;
  const handle = (initial: S) => <IE extends AnyEffect, A>(
    fx: Eff<IE, A>
  ): Eff<Exclude<IE, StateEffect<S, Tag>>, [A, S]> => {
    function internal<IE extends AnyEffect, A>(
      f: Eff<IE, A>,
      state: S
    ): Eff<Exclude<IE, StateEffect<S, Tag>>, [A, S]> {
      if (f instanceof Pure) return (f as Eff<never, A>).map(x => [x, state]);
      if (isStateEff(f)) {
        const nextState = f.effect.f(state);
        return internal(f.k.apply(nextState), nextState);
      } else {
        return new Impure<any, [A, S]>(
          f.effect,
          Leaf.ok((x: any) => internal(f.k.apply(x), state))
        );
      }
    }
    return internal(fx, initial);
  };

  const modify = Eff.liftF(ModifyEffect);

  const get = () => modify(s => s);
  const put = (newState: S) => modify(_ => newState).map(() => {});

  return {
    ModifyEffect,
    handle,
    modify,
    get,
    put
  };
};
