import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Nginx Security Headers Hardening (OWASP Report CyberPulse)', () => {
  const nginxConfPath = path.resolve(__dirname, '../../nginx.conf');
  const content = fs.readFileSync(nginxConfPath, 'utf-8');

  it('deve ocultar a versao do Nginx via server_tokens off (Item #7)', () => {
    expect(content).toContain('server_tokens off;');
  });

  it('deve conter o cabecalho Strict-Transport-Security HSTS (Item #1)', () => {
    expect(content).toContain('Strict-Transport-Security');
    expect(content).toContain('max-age=31536000');
    expect(content).toContain('includeSubDomains');
  });

  it('deve conter o cabecalho Content-Security-Policy CSP (Item #2)', () => {
    expect(content).toContain('Content-Security-Policy');
    expect(content).toContain("default-src 'self'");
  });

  it('deve conter o cabecalho X-Frame-Options contra Clickjacking (Item #3)', () => {
    expect(content).toContain('X-Frame-Options');
    expect(content).toContain('SAMEORIGIN');
  });

  it('deve conter o cabecalho X-Content-Type-Options contra MIME Sniffing (Item #4)', () => {
    expect(content).toContain('X-Content-Type-Options');
    expect(content).toContain('nosniff');
  });

  it('deve conter o cabecalho Referrer-Policy (Item #5)', () => {
    expect(content).toContain('Referrer-Policy');
    expect(content).toContain('strict-origin-when-cross-origin');
  });

  it('deve conter o cabecalho Permissions-Policy para APIs sensiveis (Item #6)', () => {
    expect(content).toContain('Permissions-Policy');
    expect(content).toContain('camera=()');
    expect(content).toContain('microphone=()');
    expect(content).toContain('geolocation=()');
  });

  it('deve configurar limit_req_zone e limit_req para protecao contra forca bruta e DDoS', () => {
    expect(content).toContain('limit_req_zone');
    expect(content).toContain('limit_req zone=');
    expect(content).toContain('limit_req_status 429;');
  });

  it('deve conter cabecalhos identificadores de Rate Limiting (Item #4 do Relatorio 8)', () => {
    expect(content).toContain('X-RateLimit-Limit');
    expect(content).toContain('X-RateLimit-Remaining');
    expect(content).toContain('RateLimit-Limit');
    expect(content).toContain('RateLimit-Remaining');
  });
});
