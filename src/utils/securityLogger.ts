// src/utils/securityLogger.ts

interface SecurityEvent {
  event: string;
  providerId?: string;
  userId?: string;
  message?: string;
  metadata?: any;
}

export function logSecurityEvent(evt: SecurityEvent) {
  const timestamp = new Date().toISOString();
  console.warn(`[SECURITY][${timestamp}]`, JSON.stringify(evt, null, 2));
}
