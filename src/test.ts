type State<T,R> = {
  type: 'empty'
} | {
  type: 'pending'
  queue: [value: T, k: () => void][]
} | {
  type: 'waiting'
  queue: ((result: IteratorResult<T, R>) => void)[]
} | {
  type: 'done'
  return: R
}

function convert2<T, R>(f: (yield_: (value: T) => Promise<void>) => Promise<R>): AsyncIterableIterator<T> {
  let state: State<T, R> = { type: 'empty' }

  const yield_ = (v: T) => new Promise<void>(res => {
    if (state.type === 'empty') {
      state = {
        type: 'pending',
        queue: [[v, res]]
      }
      return
    }
    if(state.type === 'pending') {
      state.queue.push([v, res])
      return
    }
    if(state.type === 'waiting') {
      const fn = state.queue.shift()!
      fn({ done: false, value: v })
      if(state.queue.length === 0) state = { type: 'empty' }
      return
    }
  })

  f(yield_).then(r => {
    if(state.type === 'waiting') {
      state.queue.forEach(fn => fn({ done: true, value: r}))
    }
    state = { type: 'done', return: r}
  })

  const next = (): Promise<IteratorResult<T, any>> => {
    if(state.type === 'empty' || state.type === 'waiting') {
      return new Promise<IteratorResult<T, R>>(res => {
        if(state.type === 'waiting') {
          state.queue.push(res)
        } else {
          state = { type: 'waiting', queue: [res] }
        }
      })
    }
    if(state.type === 'pending') {
      const [value, k] = state.queue.shift()!
      const result = Promise.resolve<IteratorResult<T, R>>({ done: false, value })
      k()
      if(state.queue.length === 0) { state = { type: 'empty' }}
      return result
    }
    if(state.type === 'done') {
      return Promise.resolve({ done: true, value: state.return })
    }
    throw 'unreachable'
  }

  return {
    next,
    [Symbol.asyncIterator]() {
      return this
    }
  }
}

const iter = convert2<number, void>(async yield_ => {
  await yield_(1)
  await yield_(2)
  await new Promise(r => setTimeout(r, 1000))
  await yield_(3)
})

async function main() {
  for await(const v of iter) {
    console.log(v)
  }
}

main()