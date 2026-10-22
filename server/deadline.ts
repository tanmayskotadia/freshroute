export async function withDeadline<T>(
  invoke: (signal: AbortSignal) => Promise<T>,
  milliseconds = 9000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Model response deadline exceeded");
      error.name = "CopilotTimeout";
      reject(error);
      controller.abort();
    }, milliseconds);
  });
  try {
    return await Promise.race([invoke(controller.signal), timeout]);
  } finally {
    clearTimeout(timer!);
    controller.abort();
  }
}
