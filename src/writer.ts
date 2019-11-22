import { Effect, AnyEffect } from "./effect";
import { createHandler } from "./handler";
import { Eff } from "./eff";

declare const tag: unique symbol;

interface TellEffect<W, Tag> extends Effect<void> {
  [tag]: Tag;
  readonly name: "TellEffect";
  readonly value: W;
}

type WriterHandler<W, Tag, M> = <IE extends AnyEffect, A>(
  fx: Eff<IE, A>
) => Eff<Exclude<IE, TellEffect<W, Tag>>, readonly [A, M]>;

type Writer<W, Tag> = {
  TellEffect: new (value: W) => TellEffect<W, Tag>;
  handle: <M>(zero: M, fold: (pre: M, cur: W) => M) => WriterHandler<W, Tag, M>;
  tell: (value: W) => Eff<TellEffect<W, Tag>, void>;
};

export const createWriter = <W, Tag = "">(): Writer<W, Tag> => {
  const TellEffect = class TellEffect extends Effect<void> {
    [tag]!: Tag;
    readonly name = "TellEffect" as const;

    constructor(readonly value: W) {
      super();
    }
  };

  const handle = <M>(
    zero: M,
    fold: (pre: M, cur: W) => M
  ): WriterHandler<W, Tag, M> =>
    createHandler(
      <A>(x: A) => Eff.pure([x, zero] as const),
      ({ construct, match }) =>
        construct(
          match(TellEffect, (e, k) => {
            return k().map(([x, m]) => [x, fold(m, e.value)] as const);
          })
        )
    );

  const tell = Eff.liftF(TellEffect);

  return {
    TellEffect,
    handle,
    tell
  };
};
