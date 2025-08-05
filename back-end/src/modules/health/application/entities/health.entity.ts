export class Health {
  constructor(
    public readonly status: string,
    public readonly serviceName?: string,
  ) {}

  isOk(): boolean {
    return this.status === 'ok';
  }
}
