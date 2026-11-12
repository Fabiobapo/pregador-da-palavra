export function isAllowedOrigin(origin: string | null, hostHeaders: (string | null)[]) {
  if (!origin) return false;

  let originHost: string;
  try {
    const parsedOrigin = new URL(origin);
    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.username ||
      parsedOrigin.password ||
      parsedOrigin.pathname !== "/" ||
      parsedOrigin.search ||
      parsedOrigin.hash
    ) {
      return false;
    }
    originHost = parsedOrigin.host;
  } catch {
    return false;
  }

  const requestHosts = hostHeaders.flatMap((header) =>
    header?.split(",").map((host) => host.trim()).filter(Boolean) ?? [],
  );

  return requestHosts.some((host) => {
    try {
      const parsedHost = new URL(`http://${host}`);
      if (
        parsedHost.username ||
        parsedHost.password ||
        parsedHost.pathname !== "/" ||
        parsedHost.search ||
        parsedHost.hash
      ) {
        return false;
      }
      return parsedHost.host === originHost;
    } catch {
      return false;
    }
  });
}
