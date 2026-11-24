import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const DEFAULT_RAG_API_URL = 'https://rag-backend-production-86065391.up.railway.app';
export const RAG_JWT_ALGORITHM = 'HS256' as const;
export const RAG_JWT_ISSUER = 'factoryops-express';
export const RAG_JWT_AUDIENCE = 'factoryops-rag';
export const RAG_JWT_EXPIRES_IN_SECONDS = 60;

export const MAX_QUESTION_LENGTH = 2000;
export const MAX_SESSION_ID_LENGTH = 128;
export const MAX_HISTORY_ITEMS = 20;
export const MAX_HISTORY_TEXT_LENGTH = 2000;
export const RAG_REQUEST_TIMEOUT_MS = 25_000;

const SESSION_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

export type CanonicalRagRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER_SUPERVISOR'
  | 'PRODUCTION_PLANNER'
  | 'TECHNICIAN';

const ROLE_ALIAS_MAP: Record<string, CanonicalRagRole> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FACTORY_OWNER: 'ADMIN',
  MANAGER_SUPERVISOR: 'MANAGER_SUPERVISOR',
  FACTORY_MANAGER: 'MANAGER_SUPERVISOR',
  SUPERVISOR: 'MANAGER_SUPERVISOR',
  PRODUCTION_PLANNER: 'PRODUCTION_PLANNER',
  ANALYST: 'PRODUCTION_PLANNER',
  TECHNICIAN: 'TECHNICIAN',
  OPERATOR: 'TECHNICIAN'
};

const FORBIDDEN_IDENTITY_BODY_FIELDS = new Set([
  'user_id',
  'userid',
  'role',
  'roles',
  'factory_id',
  'factoryid',
  'sub',
  'iss',
  'aud',
  'iat',
  'exp',
  'jti',
  'jwt',
  'token',
  'permissions',
  'is_admin',
  'isadmin',
  'user'
]);

export class RagIntegrationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'RagIntegrationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface RagHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

export interface ValidatedRagChatPayload {
  question: string;
  sessionId: string;
  history?: RagHistoryItem[];
}

export interface RagTrustedIdentity {
  userId: string;
  role: CanonicalRagRole;
  factoryId: string | null;
}

export interface RagChatUpstreamResponse {
  answer: string;
  sessionId: string;
  raw?: Record<string, unknown>;
}

export function getRagApiUrl(): string {
  const configured = process.env.RAG_API_URL?.trim();
  const baseUrl = configured && configured.length > 0 ? configured : DEFAULT_RAG_API_URL;
  return baseUrl.replace(/\/+$/, '');
}

export function isRagJwtSecretConfigured(): boolean {
  const secret = process.env.RAG_INTERNAL_JWT_SECRET;
  return typeof secret === 'string' && secret.trim().length > 0;
}

export function resolveAndValidateRagRole(rawRole: unknown): CanonicalRagRole {
  if (typeof rawRole !== 'string' || !rawRole.trim()) {
    throw new RagIntegrationError(
      403,
      'INVALID_USER_ROLE',
      'Access denied: User role is missing or not authorized for AI assistant access.'
    );
  }

  const normalized = ROLE_ALIAS_MAP[rawRole.trim().toUpperCase()];
  if (!normalized) {
    throw new RagIntegrationError(
      403,
      'INVALID_USER_ROLE',
      'Access denied: User role is not supported for AI assistant access.'
    );
  }

  return normalized;
}

export function resolveAndValidateRagFactoryId(
  role: CanonicalRagRole,
  rawFactoryId: unknown
): string | null {
  const trimmedFactoryId =
    typeof rawFactoryId === 'string' && rawFactoryId.trim().length > 0
      ? rawFactoryId.trim()
      : null;

  if (role === 'SUPER_ADMIN') {
    return trimmedFactoryId;
  }

  if (!trimmedFactoryId) {
    throw new RagIntegrationError(
      403,
      'MISSING_FACTORY_ASSIGNMENT',
      'Access denied: A valid factory assignment is required to use the AI assistant.'
    );
  }

  return trimmedFactoryId;
}

export function resolveTrustedIdentity(user: {
  id?: unknown;
  role?: unknown;
  factory_id?: unknown;
} | undefined): RagTrustedIdentity {
  if (!user || typeof user.id !== 'string' || !user.id.trim()) {
    throw new RagIntegrationError(
      401,
      'UNAUTHENTICATED',
      'Unauthorized: Valid authenticated user session is required.'
    );
  }

  const role = resolveAndValidateRagRole(user.role);
  const factoryId = resolveAndValidateRagFactoryId(role, user.factory_id);

  return {
    userId: user.id.trim(),
    role,
    factoryId
  };
}

export function validateRagChatRequestBody(body: unknown): ValidatedRagChatPayload {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new RagIntegrationError(
      400,
      'MALFORMED_REQUEST',
      'Request body must be a valid JSON object.'
    );
  }

  const record = body as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (FORBIDDEN_IDENTITY_BODY_FIELDS.has(key.toLowerCase())) {
      throw new RagIntegrationError(
        400,
        'IDENTITY_FIELDS_NOT_ALLOWED',
        'Identity and authorization claims cannot be supplied in the request body.'
      );
    }
  }

  if (typeof record.question !== 'string') {
    throw new RagIntegrationError(
      400,
      'INVALID_QUESTION',
      'A non-empty string "question" field is required.'
    );
  }

  const question = record.question.trim();
  if (question.length === 0) {
    throw new RagIntegrationError(
      400,
      'EMPTY_QUESTION',
      'Question cannot be empty.'
    );
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    throw new RagIntegrationError(
      400,
      'QUESTION_TOO_LONG',
      `Question exceeds the maximum allowed length of ${MAX_QUESTION_LENGTH} characters.`
    );
  }

  if (typeof record.session_id !== 'string') {
    throw new RagIntegrationError(
      400,
      'INVALID_SESSION_ID',
      'A valid string "session_id" field is required.'
    );
  }

  const sessionId = record.session_id.trim();
  if (
    sessionId.length === 0 ||
    sessionId.length > MAX_SESSION_ID_LENGTH ||
    !SESSION_ID_PATTERN.test(sessionId)
  ) {
    throw new RagIntegrationError(
      400,
      'INVALID_SESSION_ID',
      `session_id must be 1-${MAX_SESSION_ID_LENGTH} characters and contain only letters, numbers, '.', '_', ':', or '-'.`
    );
  }

  let validatedHistory: RagHistoryItem[] | undefined;
  if (record.history !== undefined) {
    if (!Array.isArray(record.history)) {
      throw new RagIntegrationError(
        400,
        'INVALID_HISTORY',
        'Chat history must be an array when provided.'
      );
    }

    validatedHistory = [];
    for (const item of record.history.slice(-MAX_HISTORY_ITEMS)) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new RagIntegrationError(
          400,
          'INVALID_HISTORY_ITEM',
          'Each chat history entry must be an object with role and text.'
        );
      }
      const entry = item as Record<string, unknown>;
      const rawRole = entry.role;
      const rawText = typeof entry.text === 'string' ? entry.text : entry.content;

      if (
        (rawRole !== 'user' && rawRole !== 'assistant') ||
        typeof rawText !== 'string' ||
        !rawText.trim()
      ) {
        throw new RagIntegrationError(
          400,
          'INVALID_HISTORY_ITEM',
          'Each chat history entry must contain a valid role ("user" or "assistant") and non-empty text.'
        );
      }

      validatedHistory.push({
        role: rawRole,
        text: rawText.trim().slice(0, MAX_HISTORY_TEXT_LENGTH)
      });
    }
  }

  return {
    question,
    sessionId,
    ...(validatedHistory && validatedHistory.length > 0 ? { history: validatedHistory } : {})
  };
}

export function signRagInternalJwt(identity: RagTrustedIdentity): string {
  const secret = process.env.RAG_INTERNAL_JWT_SECRET?.trim();
  if (!secret) {
    throw new RagIntegrationError(
      503,
      'RAG_JWT_SECRET_MISSING',
      'AI assistant authentication is not configured on the server.'
    );
  }

  return jwt.sign(
    {
      role: identity.role,
      factory_id: identity.factoryId
    },
    secret,
    {
      algorithm: RAG_JWT_ALGORITHM,
      subject: identity.userId,
      issuer: RAG_JWT_ISSUER,
      audience: RAG_JWT_AUDIENCE,
      expiresIn: RAG_JWT_EXPIRES_IN_SECONDS,
      jwtid: crypto.randomUUID()
    }
  );
}

export async function callRailwayRagBackend(params: {
  jwtToken: string;
  question: string;
  sessionId: string;
  history?: RagHistoryItem[];
  timeoutMs?: number;
}): Promise<RagChatUpstreamResponse> {
  const ragApiUrl = getRagApiUrl();
  if (!/^https?:\/\/.+/.test(ragApiUrl)) {
    throw new RagIntegrationError(
      503,
      'RAG_URL_INVALID',
      'AI assistant backend URL is not properly configured.'
    );
  }

  const endpoint = `${ragApiUrl}/chat`;
  const timeoutMs = params.timeoutMs ?? RAG_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestBody: Record<string, unknown> = {
    question: params.question,
    session_id: params.sessionId
  };

  if (params.history && params.history.length > 0) {
    requestBody.history = params.history;
  }

  let upstreamRes: globalThis.Response;
  try {
    upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${params.jwtToken}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new RagIntegrationError(
        504,
        'RAG_TIMEOUT',
        'The AI assistant request timed out. Please try again.'
      );
    }
    throw new RagIntegrationError(
      503,
      'RAG_UNAVAILABLE',
      'The AI assistant service is currently unavailable. Please try again later.'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (upstreamRes.status === 401 || upstreamRes.status === 403) {
    throw new RagIntegrationError(
      502,
      'RAG_AUTH_FAILED',
      'AI assistant authentication failed. Please contact a system administrator.'
    );
  }

  if (upstreamRes.status === 400 || upstreamRes.status === 422) {
    throw new RagIntegrationError(
      502,
      'RAG_REQUEST_REJECTED',
      'The AI assistant rejected the request format.'
    );
  }

  if (!upstreamRes.ok) {
    throw new RagIntegrationError(
      502,
      'RAG_UPSTREAM_ERROR',
      'The AI assistant service returned an error. Please try again.'
    );
  }

  let data: unknown;
  try {
    data = await upstreamRes.json();
  } catch {
    throw new RagIntegrationError(
      502,
      'RAG_INVALID_RESPONSE',
      'Received a non-JSON response from the AI assistant.'
    );
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new RagIntegrationError(
      502,
      'RAG_INVALID_RESPONSE',
      'Received a malformed response from the AI assistant.'
    );
  }

  const parsed = data as Record<string, unknown>;
  const candidateAnswer =
    typeof parsed.answer === 'string'
      ? parsed.answer
      : typeof parsed.reply === 'string'
        ? parsed.reply
        : typeof parsed.response === 'string'
          ? parsed.response
          : null;

  if (!candidateAnswer || !candidateAnswer.trim()) {
    throw new RagIntegrationError(
      502,
      'RAG_INVALID_RESPONSE',
      'Received an empty response from the AI assistant.'
    );
  }

  return {
    answer: candidateAnswer,
    sessionId: typeof parsed.session_id === 'string' && parsed.session_id.trim()
      ? parsed.session_id.trim()
      : params.sessionId,
    raw: parsed
  };
}

export async function checkRailwayRagHealth(timeoutMs = 5000): Promise<{
  reachable: boolean;
  healthy: boolean;
}> {
  const ragApiUrl = getRagApiUrl();
  if (!/^https?:\/\/.+/.test(ragApiUrl)) {
    return { reachable: false, healthy: false };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${ragApiUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!res.ok) {
      return { reachable: true, healthy: false };
    }
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const isHealthy = body?.status === 'healthy' || body?.status === 'ok' || res.ok;
    return { reachable: true, healthy: Boolean(isHealthy) };
  } catch {
    return { reachable: false, healthy: false };
  } finally {
    clearTimeout(timeoutId);
  }
}
