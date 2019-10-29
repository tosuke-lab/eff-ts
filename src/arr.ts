import { AnyEffect } from './effect'
import { Eff, Pure, Impure } from './eff'

export class Err {
  constructor(readonly err: unknown) {}
}

export type Result<A> = A | Err

export type Arrs<E extends AnyEffect, A, B> = Leaf<E, A, B> | Node<E, A, any, B>

export class Leaf<E extends AnyEffect, A, B> {
  static ok<E extends AnyEffect, A, B>(f: <AA extends A>(x: AA) => Eff<E, B>): Arrs<E, A, B> {
    return new Leaf<E, A, B>(r => {
      if (r instanceof Err) {
        return new Pure<E, B>(r)
      } else {
        return f(r)
      }
    })
  }
  static err<E extends AnyEffect, A>(f: (err: unknown) => Eff<E, A>): Arrs<E, A, A> {
    return new Leaf<E, A, A>(r => {
      if (r instanceof Err) {
        return f(r.err)
      } else {
        return new Pure<E, A>(r)
      }
    })
  }
  constructor(readonly f: <AA extends A>(x: Result<AA>) => Eff<E, B>) {}

  chain<F extends AnyEffect, C>(f: <BB extends B>(x: BB) => Eff<F, C>): Arrs<E | F, A, C> {
    return this.concat(Leaf.ok(f))
  }

  catch<F extends AnyEffect>(f: (err: unknown) => Eff<F, B>): Arrs<E | F, A, B> {
    return this.concat(Leaf.err(f))
  }

  concat<F extends AnyEffect, C>(fbc: Arrs<F, B, C>): Arrs<E | F, A, C> {
    return new Node(this, fbc as Arrs<E | F, B, C>)
  }

  apply(x: A): Eff<E, B> {
    return apply(this, x)
  }
}

export class Node<E extends AnyEffect, A, X, B> {
  constructor(readonly left: Arrs<E, A, X>, readonly right: Arrs<E, X, B>) {}

  chain<F extends AnyEffect, C>(f: <BB extends B>(x: BB) => Eff<F, C>): Arrs<E | F, A, C> {
    return this.concat(Leaf.ok(f))
  }

  catch<F extends AnyEffect>(f: (err: unknown) => Eff<F, B>): Arrs<E | F, A, B> {
    return this.concat(Leaf.err(f))
  }

  concat<F extends AnyEffect, C>(fbc: Arrs<F, B, C>): Arrs<E | F, A, C> {
    return new Node(this, fbc as Arrs<E | F, B, C>)
  }

  apply(x: A): Eff<E, B> {
    return apply(this, x)
  }
}

type View<E extends AnyEffect, A, B> = One<E, A, B> | Cons<E, A, any, B>

class One<E extends AnyEffect, A, B> {
  constructor(readonly f: (x: A) => Eff<E, B>) {}
}

class Cons<E extends AnyEffect, A, X, B> {
  constructor(readonly f: (x: A) => Eff<E, X>, readonly k: Arrs<E, X, B>) {}
}

function createView<E extends AnyEffect, A, B>(f: Arrs<E, A, B>): View<E, A, B> {
  if (f instanceof Leaf) return new One(f.f)

  let l: Arrs<E, A, any> = f.left
  let r: Arrs<E, any, B> = f.right

  while (true) {
    if (l instanceof Leaf) return new Cons(l.f, r)

    r = new Node(l.right, r)
    l = l.left
  }
}

function apply<E extends AnyEffect, A, B>(f: Arrs<E, A, B>, a: A): Eff<E, B> {
  let fx: Arrs<E, any, B> = f
  let x: any = a

  while (true) {
    const view = createView(fx)
    if (view instanceof One) return view.f(x)
    const r = view.f(x)
    if (r instanceof Pure) {
      fx = view.k
      x = r.value
    } else {
      return new Impure(r.effect, r.k.concat(view.k))
    }
  }
}
