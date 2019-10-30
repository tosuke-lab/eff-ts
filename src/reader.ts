import { Effect, AnyEffect, Return } from './effect'
import { createHandler } from './handler'
import { Eff } from './eff'

declare const tag: unique symbol

interface AskEffect<Env, Tag> {
  [Return]: Env
  [tag]: Tag
  readonly name: 'AskEffect'
}

type Reader<Env, Tag> = {
  AskEffect: new () => AskEffect<Env, Tag>
  handle: (env: Env) => <IE extends AnyEffect, A>(fx: Eff<IE, A>) => Eff<Exclude<IE, AskEffect<Env, Tag>>, A>
  ask: () => Eff<AskEffect<Env, Tag>, Env>
}

export const createReader = <Env, Tag = ''>(): Reader<Env, Tag> => {
  const AskEffect: Reader<Env, Tag>['AskEffect'] = class AskEffect extends Effect<Env> {
    readonly name = 'AskEffect' as const;
    [Return]!: Env;
    [tag]!: Tag
  }
  const handle = (env: Env) =>
    createHandler(Eff.pure, ({ construct, match }) =>
      construct(
        match(AskEffect, (_, k) => {
          return k(env)
        }),
      ),
    )

  const ask = Eff.liftF(AskEffect)
  return {
    AskEffect,
    handle,
    ask,
  }
}
