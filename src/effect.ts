export declare const Return: unique symbol

export abstract class Effect<A> {
  [Return]!: A
}

export type AnyEffect = Effect<any>
export type EffectReturnType<E extends AnyEffect> = E[typeof Return]
