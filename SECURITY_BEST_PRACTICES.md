# Security Best Practices & Recommendations

## 🔴 CRITICAL - Already Fixed

### 1. Exposed Database Credentials
- **Issue**: Real DB credentials in `.env.local`
- **Fix**: Moved to `.env.local` (gitignored), created `.env.example` template
- **Status**: ✅ FIXED

### 2. Secrets in NEXT_PUBLIC_ Variables
- **Issue**: `NEXT_PUBLIC_HMAC_SECRET` exposed to browser
- **Fix**: Removed `NEXT_PUBLIC_` prefix - now server-side only
- **Status**: ✅ FIXED

### 3. Wildcard CORS Origins
- **Issue**: `allow_origins=["*"]` allows any domain
- **Fix**: Removed wildcard, specified only trusted origins
- **Status**: ✅ FIXED

### 4. URL Validation Missing
- **Issue**: No validation before scraping URLs
- **Fix**: Added protocol check (HTTP/HTTPS only) and private IP rejection
- **Status**: ✅ FIXED

---

## 🟡 HIGH PRIORITY - Needs Implementation

### 5. Rate Limiting
**Problem**: No rate limiting on API endpoints - vulnerable to DoS
**Solution**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/scrape")
@limiter.limit("10/minute")
async def scrape_endpoint(request: Request):
    pass
```

### 6. Input Sanitization
**Problem**: User input not validated/sanitized
**Solution**:
```python
from pydantic import BaseModel, validator

class ScrapingRequest(BaseModel):
    url: str
    
    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('Invalid URL')
        return v
```

### 7. SQL Injection Prevention
**Problem**: Database queries may be vulnerable
**Solution**: Use parameterized queries (already using Prisma/SQLAlchemy - good!)
```python
# ✅ GOOD - Parameterized
result = db.query(User).filter(User.id == user_id).first()

# ❌ BAD - String concatenation
result = db.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

### 8. Sensitive Data in Logs
**Problem**: Logs may contain credentials/PII
**Solution**:
```python
import logging

# Sanitize logs
def sanitize_log(message):
    import re
    message = re.sub(r'password["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'password=***', message)
    message = re.sub(r'token["\']?\s*[:=]\s*["\']?[^"\']*["\']?', 'token=***', message)
    return message

logging.info(sanitize_log(f"User login: {user_data}"))
```

### 9. HTTPS Enforcement
**Problem**: Development uses HTTP
**Solution**:
```python
# In production
if os.getenv("ENV") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 10. API Key Rotation
**Problem**: No mechanism to rotate API keys
**Solution**: Implement key versioning and expiration
```python
class APIKey(BaseModel):
    key: str
    created_at: datetime
    expires_at: datetime
    is_active: bool
```

---

## 🟢 MEDIUM PRIORITY - Best Practices

### 11. Authentication & Authorization
- Implement JWT token validation on all protected endpoints
- Use role-based access control (RBAC)
- Add request signing with HMAC

### 12. Content Security Policy (CSP)
```python
app.add_middleware(
    CORSMiddleware,
    allow_headers=["Content-Security-Policy"]
)
```

### 13. Request Validation
- Validate all incoming data with Pydantic
- Set max request size limits
- Validate file uploads

### 14. Error Handling
- Don't expose stack traces in production
- Log errors securely
- Return generic error messages to clients

### 15. Dependency Security
- Run `npm audit` and `pip audit` regularly
- Keep dependencies updated
- Use lock files (package-lock.json, requirements.txt)

---

## 📋 Security Checklist

- [ ] All secrets in `.env` (gitignored)
- [ ] No `NEXT_PUBLIC_` for sensitive data
- [ ] CORS restricted to trusted origins
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] Logs sanitized of sensitive data
- [ ] HTTPS enforced in production
- [ ] API keys have expiration
- [ ] JWT tokens validated
- [ ] RBAC implemented
- [ ] CSP headers set
- [ ] Dependencies audited
- [ ] Error messages generic in production
- [ ] Database backups configured

---

## 🔐 Environment Setup

### Development
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### Production
```bash
# Use environment variables from CI/CD or secrets manager
# Never commit .env files
# Rotate credentials regularly
```

---

## 📚 Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
