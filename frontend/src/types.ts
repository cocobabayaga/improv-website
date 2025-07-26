import { z } from 'zod';

export const TokenResponseSchema = z.object({
  token: z.string(),
  rtc_url: z.string(),
  expires_at: z.string(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export interface SceneState {
  status: 'idle' | 'connecting' | 'active' | 'error';
  isListening: boolean;
  transcript: string;
  error?: string;
}
