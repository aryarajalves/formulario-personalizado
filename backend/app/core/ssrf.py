import ipaddress
import socket
import urllib.parse
from app.core.config import settings
from app.core.logger import logger

# IPs e faixas reservadas perigosas (Metadados Cloud, Loopback, Link-Local, etc)
CLOUD_METADATA_IPS = {"169.254.169.254", "fd00:ec2::254"}

def is_ssrf_safe_url(url: str, allow_local: bool = None) -> tuple[bool, str]:
    """
    Valida se a URL fornecida é segura contra ataques de SSRF (Server-Side Request Forgery).
    Retorna uma tupla (is_safe: bool, reason: str).

    - Em 'development' (ou quando allow_local=True): permite localhost e 127.0.0.1.
    - Em 'production' (ou quando allow_local=False): bloqueia rigorosamente localhost,
      IPs de loopback, redes privadas (RFC 1918), link-local e metadados de nuvem.
    """
    if not url or not isinstance(url, str):
        return False, "URL não informada."

    trimmed_url = url.strip()
    if not trimmed_url:
        return False, "URL vazia."

    try:
        parsed = urllib.parse.urlparse(trimmed_url)
    except Exception:
        return False, "Formato de URL inválido."

    # Exige protocolos http ou https
    if parsed.scheme.lower() not in ("http", "https"):
        return False, "Protocolo inválido. Apenas HTTP e HTTPS são permitidos."

    hostname = parsed.hostname
    if not hostname:
        return False, "Hostname ausente na URL."

    hostname_lower = hostname.lower().strip()

    # Determina se deve permitir acessos locais
    if allow_local is None:
        allow_local = (settings.ENVIRONMENT.lower() == "development")

    # Tratamento de localhost / nomes locais
    if hostname_lower in ("localhost", "127.0.0.1", "::1"):
        if allow_local:
            return True, "Permitido em ambiente de desenvolvimento."
        return False, "Uso de localhost/127.0.0.1 não é permitido em ambiente de produção."

    # Bloqueio de IP de metadados de nuvem diretamente no hostname
    if hostname_lower in CLOUD_METADATA_IPS:
        return False, "Acesso a endereços de metadados da nuvem é estritamente proibido."

    # Tenta resolver o IP associado ao hostname para prevenir DNS Rebinding e evasão
    try:
        # Se for um endereço IP direto literal
        ip_obj = ipaddress.ip_address(hostname_lower)
        resolved_ips = [ip_obj]
    except ValueError:
        # É um nome de domínio: tenta resolver via DNS
        try:
            addr_info = socket.getaddrinfo(hostname_lower, None)
            resolved_ips = []
            for item in addr_info:
                sockaddr = item[4]
                ip_str = sockaddr[0]
                try:
                    resolved_ips.append(ipaddress.ip_address(ip_str))
                except ValueError:
                    pass
        except Exception as e:
            # Em caso de falha na resolução de DNS, se for produção bloqueia
            if not allow_local:
                logger.warning(f"[SSRF VALIDATION] Não foi possível resolver DNS para o webhook '{hostname_lower}': {e}")
                return False, f"Não foi possível resolver o domínio '{hostname_lower}'."
            return True, "Resolução ignorada em ambiente de desenvolvimento."

    # Valida cada IP resolvido
    for ip in resolved_ips:
        ip_str = str(ip)
        if ip_str in CLOUD_METADATA_IPS:
            return False, "Endereço resolvido aponta para serviço de metadados da nuvem."

        if ip.is_loopback:
            if not allow_local:
                return False, "Endereço resolvido aponta para loopback local (127.0.0.1/::1)."

        if ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            if not allow_local:
                return False, f"Endereço '{ip_str}' pertence a uma rede privada/interna não permitida em produção."

    return True, "URL segura."
