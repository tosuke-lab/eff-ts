import { edo } from './edo'
import { Effect } from './effect'
import { Eff } from './eff'
import { createHandler } from './handler'

class TellEffect extends Effect<void> {
  constructor(readonly msg: string) {
    super()
  }
}
const tell = Eff.liftF(TellEffect)

const writerHandler = createHandler(Eff.pure, ({ construct, match }) =>
  construct(
    match(TellEffect, (e, k) => {
      console.log(e.msg)
      return k()
    }),
  ),
)

const error = () =>
  edo(function*() {
    yield tell('hoge')
    yield tell('piyo')
    throw new Error('error')
  })

const main = () =>
  edo(function*() {
    try {
      yield error()
    } catch {
      yield tell('caught!')
    }
  })

Eff.run(main().handle(writerHandler))
