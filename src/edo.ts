import { Effect, Eff, Pure, Impure, PromiseEff} from "./eff";

type EffRunner<R extends Effect<any>> = <A>(eff: Eff<R, A>) => Promise<A>;

type WaitResult<R extends Effect<any>, A> = {
  done: false
  eff: Eff<R, any>
  k: (value: any) => void
} | {
  done: true
  return: A
}

type State<R extends Effect<any>, A> = {
  type: 'empty'
} | {
  type: 'pending'
  queue: [eff: Eff<R, any>, k: (value: any) => void][]
} | {
  type: 'waiting'
  k: (result: WaitResult<R, A>) => void
} | {
  type: 'done'
  return: A
}

export const edo = <R extends Effect<any>, A>(
  f: (run: EffRunner<R>) => Promise<A>
): Eff<R, A> => {
  let state: State<R, A> = { type: 'empty' }

  const run: EffRunner<R> = <T>(eff: Eff<R, T>) => new Promise<T>(res => {
    switch(state.type) {
      case 'empty':
        state = { type: 'pending', queue: [[eff, res]]}
        break
      case 'pending':
        state.queue.push([eff, res])
        break
      case 'waiting':
        state.k({ done: false, eff, k: res })
        break
    }
  })

  f(run).then(r => {
    if(state.type === 'waiting') {
      state.k({ done: true, return: r })
    }
    state = { type: 'done', return: r }
  })

  const loop = async (): Promise<Eff<R, A>> => {
    switch(state.type) {
      case 'empty': {
        const result = await new Promise<WaitResult<R, A>>(resolve => { state = { type: 'waiting', k: resolve }})
        if(result.done) return new Pure(result.return)
        return result.eff.chain(v => {
          result.k(v)
          return new PromiseEff(loop())
        })
      }
      case 'pending': {
        const q = state.queue
        const [eff, k] = q.shift()!
        if(q.length === 0) state = { type: 'empty' }
        return eff.chain(v => {
          k(v)
          return new PromiseEff(loop())
        })
      }
      case 'done': 
        return new Pure(state.return)
    }
    throw 'unreachable'
  }

  return new PromiseEff<R, A>(loop())
};
