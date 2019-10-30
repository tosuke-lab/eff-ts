import { Effect } from './effect'
import { createHandler } from './handler'
import { Eff } from './eff'

export type List<A> = Zero | Cons<A>

export class Zero {
  toArray(): never[] {
    return []
  }

  cons<A>(value: A): List<A> {
    return new Cons<A>(value, this)
  }
}

export class Cons<A> {
  constructor(readonly value: A, readonly next: List<A>) {}

  toArray(): A[] {
    const array: A[] = []
    let list: List<A> = this
    while (true) {
      if (list instanceof Zero) return array
      array.push(list.value)
      list = list.next
    }
  }

  cons(value: A): List<A> {
    return new Cons(value, this)
  }
}

export const createWriter = <W, Tag = ''>() => {
  const type = Symbol()

  class TellEffect extends Effect<void> {
    [type]!: Tag
    readonly name = 'TellEffect' as const

    constructor(readonly value: W) {
      super()
    }
  }

  type Writer<A> = [A, List<W>]
  const handle = createHandler(
    <A>(x: A) => Eff.pure<Writer<A>>([x, new Zero()]),
    ({ construct, match }) =>
      construct(
        match(TellEffect, (e, k) => {
          return k().map(([x, list]) => [x, list.cons(e.value)] as Writer<typeof x>)
        }),
      ),
  )

  const tell = Eff.liftF(TellEffect)

  return {
    TellEffect,
    handle,
    tell,
  }
}
