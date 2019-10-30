import { Effect } from './effect'
import { createHandler } from './handler'
import { Eff } from './eff'

export const createReader = <Env, Tag = ''>() => {
  const type = Symbol()

  class AskEffect extends Effect<Env> {
    [type]!: Tag
    readonly name = 'AskEffect' as const
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
