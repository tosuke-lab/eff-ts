import { Effect, AnyEffect } from "./effect";
import { createHandler } from "./handler";
import { Eff } from "./eff";

declare const tag: unique symbol;

interface AskEffect<Env, Tag> extends Effect<Env> {
  [tag]: Tag;
  readonly name: "AskEffect";
}

type ReaderHandler<Env, Tag> = <IE extends AnyEffect, A>(
  fx: Eff<IE, A>
) => Eff<Exclude<IE, AskEffect<Env, Tag>>, A>;

type Reader<Env, Tag> = {
  AskEffect: new () => AskEffect<Env, Tag>;
  handle: (env: Env) => ReaderHandler<Env, Tag>;
  local: (
    f: (env: Env) => Env
  ) => <FX extends Eff<AnyEffect, any>>(fx: FX) => FX;
  ask: () => Eff<AskEffect<Env, Tag>, Env>;
};

export const createReader = <Env, Tag = "">(): Reader<Env, Tag> => {
  const AskEffect = class AskEffect extends Effect<Env> {
    readonly name = "AskEffect" as const;
    [tag]!: Tag;
  };
  const handle = (env: Env) =>
    createHandler(Eff.pure, ({ construct, match }) =>
      construct(
        match(AskEffect, (_, k) => {
          return k(env);
        })
      )
    );
  const ask = Eff.liftF(AskEffect);

  const local = (f: (env: Env) => Env) => <FX extends Eff<AnyEffect, any>>(
    fx: FX
  ): FX => ask().chain(e => handle(f(e))(fx)) as FX;

  return {
    AskEffect,
    handle,
    ask,
    local
  };
};
