export function preconnect(url: string) {
  try {
    const origin = new URL(url).origin;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {}
}

export function dnsPrefetch(url: string) {
  try {
    const origin = new URL(url).origin;
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = origin;
    document.head.appendChild(link);
  } catch {}
}

