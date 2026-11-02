"""
Endpoint de Introspecção e Auditoria Automatizada do CyberPulse.
Retorna o catálogo completo de rotas da aplicação, mapeando métodos,
exigência de autenticação, rate limiting e descrições técnicas de segurança.
"""
import secrets
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.routing import APIRoute
from app.core.config import settings

router = APIRouter(prefix="/cyberpulse", tags=["CyberPulse Audit"])


def verify_cyberpulse_token(x_cyberpulse_secret: str = Header(None, alias="X-CyberPulse-Secret")):
    """
    Valida o cabeçalho X-CyberPulse-Secret utilizando comparação de tempo constante.
    """
    configured_secret = settings.CYBERPULSE_AUDIT_SECRET or ""
    if not x_cyberpulse_secret or not secrets.compare_digest(x_cyberpulse_secret, configured_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso não autorizado ao catálogo de auditoria."
        )
    return True


def _extract_all_routes(routes, prefix=""):
    """Extrai recursivamente todos os APIRoute suportando routers aninhados e _IncludedRouter."""
    extracted = []
    for r in routes:
        if isinstance(r, APIRoute):
            extracted.append((prefix + r.path, r))
        elif hasattr(r, "original_router") and hasattr(r.original_router, "routes"):
            context_prefix = getattr(getattr(r, "include_context", None), "prefix", "")
            extracted.extend(_extract_all_routes(r.original_router.routes, prefix + context_prefix))
        elif hasattr(r, "routes"):
            extracted.extend(_extract_all_routes(r.routes, prefix))
    return extracted


@router.get(
    "/catalog",
    dependencies=[Depends(verify_cyberpulse_token)],
    summary="Catálogo de Introspecção para Auditoria",
    description="Retorna o inventário detalhado de todas as rotas públicas e privadas para análise de conformidade OWASP."
)
def get_endpoints_catalog() -> Dict[str, Any]:
    """
    Realiza a varredura dinâmica das rotas registradas na aplicação FastAPI principal.
    """
    from app.main import app

    catalog: List[Dict[str, Any]] = []
    seen_routes = set()

    for full_path, r in _extract_all_routes(app.routes):
        # Ignora rotas de documentação interna e o próprio endpoint de auditoria
        if full_path.startswith(("/docs", "/redoc", "/openapi.json", "/api/v1/cyberpulse")):
            continue

        methods = sorted([m for m in r.methods if m not in ("HEAD", "OPTIONS")])
        if not methods:
            continue

        route_key = (full_path, tuple(methods))
        if route_key in seen_routes:
            continue
        seen_routes.add(route_key)

        all_deps = set()

        def collect_deps(dependant):
            if not dependant:
                return
            for d in getattr(dependant, "dependencies", []):
                if hasattr(d, "call") and hasattr(d.call, "__name__"):
                    all_deps.add(d.call.__name__)
                collect_deps(d)

        collect_deps(getattr(r, "dependant", None))

        # Checa se exige login/permissões de usuário
        auth_keywords = [
            "user", "admin", "auth", "token", "current_user",
            "get_current_active_user", "get_current_user", "require_superadmin"
        ]
        requires_auth = any(
            keyword in dep.lower() for dep in all_deps for keyword in auth_keywords
        )

        # Checa se possui SlowApi ou limitação de taxa
        endpoint_str = str(r.endpoint)
        has_rate_limit = (
            hasattr(r.endpoint, "_rate_limit") or
            "limiter" in endpoint_str or
            (hasattr(r.endpoint, "__wrapped__") and hasattr(r.endpoint.__wrapped__, "_rate_limit"))
        )

        # Descrição técnica da rota
        doc_description = ""
        if r.endpoint and r.endpoint.__doc__:
            doc_description = r.endpoint.__doc__.strip().split("\n")[0]

        description = r.summary or r.description or doc_description or r.name or "Sem descrição fornecida"

        catalog.append({
            "path": full_path,
            "methods": methods,
            "requires_auth": requires_auth,
            "has_rate_limit": has_rate_limit,
            "description": description
        })

    return {
        "app_name": app.title,
        "environment": settings.ENVIRONMENT,
        "total_endpoints": len(catalog),
        "endpoints": catalog
    }
