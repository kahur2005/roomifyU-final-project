import { authService } from './auth';
import { gasPost } from './gasClient';

/** Server-side Gemini `generateContent`; session required. Keys live in Apps Script Properties only. */
export async function apiChatRemote(
  message: string,
  contextSnippet?: string,
): Promise<{ reply: string } | null> {
  const token = authService.getSessionToken();
  if (!token) return null;
  const out = await gasPost({
    action: 'apiChat',
    token,
    message,
    ...(contextSnippet ? { contextSnippet: contextSnippet.slice(0, 2000) } : {}),
  });
  if (!out.ok || typeof out.reply !== 'string') return null;
  return { reply: out.reply };
}
