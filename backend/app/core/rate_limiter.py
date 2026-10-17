import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from app.core.config import settings

# Estrutura em memória para armazenar timestamps de requisições por chave:
# chave -> lista de timestamps das requisições recentes
_rate_limit_records: Dict[str, list] = {}

def get_client_ip(request: Request) -> str:
    """
    Extrai o IP real do cliente considerando possíveis proxies reversos (Nginx/Traefik/Cloudflare).
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Pega o primeiro IP da lista (IP de origem do cliente)
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

def check_rate_limit(
    key_prefix: str,
    max_requests: int,
    window_seconds: int,
    identifier: str
) -> None:
    """
    Algoritmo Sliding Window em memória para rate limiting por IP/identificador.
    Lança HTTPException 429 se o limite for ultrapassado dentro da janela de tempo.
    """
    now = time.time()
    composite_key = f"{key_prefix}:{identifier}"
    
    records = _rate_limit_records.get(composite_key, [])
    
    # Remove registros fora da janela
    cutoff = now - window_seconds
    valid_records = [t for t in records if t > cutoff]
    
    if len(valid_records) >= max_requests:
        # Calcula tempo restante para expirar a requisição mais antiga
        retry_after = int(valid_records[0] + window_seconds - now) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Muitas requisições. Limite de {max_requests} por minuto atingido. Tente novamente em {retry_after}s.",
            headers={"Retry-After": str(retry_after)}
        )
    
    valid_records.append(now)
    _rate_limit_records[composite_key] = valid_records

def rate_limiter(max_requests: int, window_seconds: int = 60, key_prefix: str = "general"):
    """
    Fábrica de Dependency do FastAPI para aplicar rate limit em rotas específicas.
    """
    async def dependency(request: Request):
        client_ip = get_client_ip(request)
        check_rate_limit(
            key_prefix=key_prefix,
            max_requests=max_requests,
            window_seconds=window_seconds,
            identifier=client_ip
        )
    return dependency

def reset_rate_limits():
    """Função utilitária para testes limparem o cache em memória."""
    _rate_limit_records.clear()
