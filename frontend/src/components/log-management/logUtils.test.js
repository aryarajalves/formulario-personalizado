import { describe, it, expect } from 'vitest';
import { formatToBrasiliaTime, classifyLogLine } from './logUtils';

describe('logUtils Helper', () => {
  it('converts Nginx UTC timestamps to Brasilia Time (UTC-3)', () => {
    const rawLine = '172.31.0.1 - - [29/Sep/2026:17:59:35 +0000] "GET /api/v1/users HTTP/1.1" 200 450';
    const converted = formatToBrasiliaTime(rawLine);
    // 17:59 UTC vira 14:59 em Brasília
    expect(converted).toContain('14:59:35');
    expect(converted).not.toContain('17:59:35');
  });

  it('converts ISO 8601 UTC timestamps to Brasilia Time (UTC-3)', () => {
    const rawLine = '2026-09-29T17:30:00Z [INFO] Service started';
    const converted = formatToBrasiliaTime(rawLine);
    expect(converted).toContain('14:30:00');
  });

  it('classifies error log lines with red badge and styling', () => {
    const errorLine = '[ERROR] [backend]: Falha crítica ao conectar ao banco';
    const parsed = classifyLogLine(errorLine);
    expect(parsed.type).toBe('error');
    expect(parsed.badge).toBe('ERRO');
    expect(parsed.badgeColor).toBe('#dc2626');
  });

  it('classifies warning log lines with amber badge and styling', () => {
    const warnLine = '[WARNING] [backend]: Conexão lenta detectada';
    const parsed = classifyLogLine(warnLine);
    expect(parsed.type).toBe('warning');
    expect(parsed.badge).toBe('AVISO');
    expect(parsed.badgeColor).toBe('#d97706');
  });

  it('classifies HTTP request lines with HTTP status badge and green color for 2xx', () => {
    const httpLine = '172.31.0.1 - - [29/Sep/2026:17:59:35 +0000] "GET /api/v1/backups/list HTTP/1.1" 200 287';
    const parsed = classifyLogLine(httpLine);
    expect(parsed.type).toBe('http');
    expect(parsed.badge).toBe('HTTP 200');
    expect(parsed.badgeColor).toBe('#059669');
    expect(parsed.formattedLine).toContain('14:59:35');
  });

  it('classifies default info logs with blue badge', () => {
    const infoLine = '[INFO] Sistema operando normalmente';
    const parsed = classifyLogLine(infoLine);
    expect(parsed.type).toBe('info');
    expect(parsed.badge).toBe('INFO');
    expect(parsed.badgeColor).toBe('#0284c7');
  });
});
