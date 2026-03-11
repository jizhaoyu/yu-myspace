declare namespace krema {
  function invoke<T = unknown>(
    command: string,
    args?: Record<string, unknown>,
  ): Promise<T>;

  function on<T = unknown>(
    event: string,
    callback: (payload: T) => void,
  ): () => void;
}

interface Window {
  krema?: typeof krema;
}
