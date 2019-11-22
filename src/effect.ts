export abstract class Effect<A> {
  Return: Promise<A>;

  constructor() {
    this.Return = new Promise<A>((_, rej) => {
      rej(new Error("This is 'Phantom Type' value. Don't use this."));
    });
  }
}

export type AnyEffect = Effect<any>;
export type EffectReturnType<E extends AnyEffect> = E extends Effect<infer A>
  ? A
  : never;
