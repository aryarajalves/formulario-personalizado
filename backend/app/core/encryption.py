import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings
from app.core.logger import logger

def _get_fernet_instance() -> Fernet:
    """
    Retorna uma instância de Fernet configurada com a SECURITY_ENCRYPTION_KEY.
    Caso a variável não esteja preenchida, deriva de forma determinística uma chave
    válida de 32 bytes em Base64 a partir da SECRET_KEY da aplicação.
    """
    key_str = settings.SECURITY_ENCRYPTION_KEY.strip() if settings.SECURITY_ENCRYPTION_KEY else ""
    
    if key_str:
        try:
            # Tenta instanciar diretamente se for uma chave Fernet válida
            return Fernet(key_str.encode("utf-8"))
        except Exception:
            # Se for uma string comum, gera hash SHA256 de 32 bytes e converte para base64 url-safe
            derived_key = base64.urlsafe_b64encode(hashlib.sha256(key_str.encode("utf-8")).digest())
            return Fernet(derived_key)
    
    # Fallback seguro: deriva da SECRET_KEY
    derived = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest())
    return Fernet(derived)

def encrypt_token(plain_text: Optional[str]) -> Optional[str]:
    """
    Criptografa uma string usando Fernet (AES-128-CBC + HMAC-SHA256).
    Retorna o ciphertext seguro com prefixo 'enc:' para rastreabilidade, ou None se vazio.
    """
    if not plain_text:
        return plain_text
    
    # Se já estiver criptografado, não criptografa novamente
    if plain_text.startswith("enc:"):
        return plain_text
        
    fernet = _get_fernet_instance()
    encrypted_bytes = fernet.encrypt(plain_text.encode("utf-8"))
    return f"enc:{encrypted_bytes.decode('utf-8')}"

def decrypt_token(cipher_text: Optional[str]) -> Optional[str]:
    """
    Descriptografa uma string gerada pelo encrypt_token.
    Mantém compatibilidade com tokens legados que ainda estavam em texto puro.
    """
    if not cipher_text:
        return cipher_text
        
    # Se não começar com o prefixo 'enc:', trata como token legado em texto puro
    if not cipher_text.startswith("enc:"):
        return cipher_text
        
    raw_cipher = cipher_text[4:]
    fernet = _get_fernet_instance()
    try:
        decrypted_bytes = fernet.decrypt(raw_cipher.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        logger.error("Falha ao descriptografar token: chave incorreta ou token corrompido.")
        return None
    except Exception as e:
        logger.error(f"Erro inesperado ao descriptografar token: {e}")
        return None
