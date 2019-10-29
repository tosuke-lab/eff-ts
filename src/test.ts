import { runError } from './error'
import { edo } from './edo'
import { Effect } from './effect'
import { liftEff, pureEff } from './eff'
import { createHandler } from './handler'

class TellEffect extends Effect<void> {
  constructor(readonly msg: string) {
    super()
  }
}
const tell = liftEff(TellEffect)

const writerHandler = createHandler(pureEff, ({ construct, match }) =>
  construct(
    match(TellEffect, (e, k) => {
      console.log(e.msg)
      return k()
    }),
  ),
)

const error = () =>
  edo(function*() {
    yield tell('piyo')
    throw new Error('error!')
  })

const main = () =>
  edo(function*() {
    try {
      yield tell('hoge')
      yield error()
    } catch {
      console.log('caught!')
    }
  })

runError(main().handle(writerHandler))
