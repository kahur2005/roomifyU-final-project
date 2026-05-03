import { getGasExecUrl } from '../../gasConfig';

export type GasEnvelope = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

export async function gasPost(body: Record<string, unknown>): Promise<GasEnvelope> {
  const url = getGasExecUrl();
  if (!url) {
    return { ok: false, error: 'NO_BACKEND_URL' };
  }
  let res: Response;
  try {
    // text/plain avoids CORS preflight (GAS doesn't handle OPTIONS).
    // GAS reads e.postData.contents regardless of Content-Type.
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'NETWORK_ERROR' };
  }

  try {
    return (await res.json()) as GasEnvelope;
  } catch {
    return { ok: false, error: 'BAD_RESPONSE' };
  }
}
