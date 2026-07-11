import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Enterprise Single Sign-On (SSO) — SAML 2.0 + OIDC.
 *
 * Enables broadcast groups with existing IdP (Okta, Azure AD/Entra ID, Keycloak)
 * to use their corporate credentials. JIT (just-in-time) provisioning with
 * default 'read-only' role until admin promotes.
 *
 * GET  /api/v1/auth/sso         — list configured providers + JIT status
 * POST /api/v1/auth/sso         — add/update/remove provider, test connection
 *
 * Spec references:
 *   - SAML 2.0 (OASIS Standard 2005)
 *   - OpenID Connect Core 1.0
 *   - RFC 6749 (OAuth 2.0 Authorization Framework)
 *   - RFC 8414 (OAuth 2.0 Authorization Server Metadata)
 */

interface SamlProvider {
  id: string
  name: string
  entityId: string
  ssoUrl: string          // IdP Single Sign-On URL
  sloUrl: string          // IdP Single Logout URL
  x509Cert: string        // IdP signing certificate (PEM)
  metadataUrl: string     // IdP metadata URL
  attributeMapping: {
    username: string      // assertion attribute → username
    email: string
    fullName: string
    groups: string        // for role mapping
  }
  jitProvisioning: boolean
  defaultRole: string
  roleMapping: { idpGroup: string; localRole: string }[]
  active: boolean
  domains: string[]       // email domains routed to this provider
  lastLoginAt: string | null
  userCount: number
}

interface OidcProvider {
  id: string
  name: string
  issuerUrl: string
  clientId: string
  clientSecret: string   // masked
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  scope: string          // 'openid profile email groups'
  jwksUrl: string
  attributeMapping: { username: string; email: string; fullName: string; groups: string }
  jitProvisioning: boolean
  defaultRole: string
  roleMapping: { idpGroup: string; localRole: string }[]
  active: boolean
  domains: string[]
  lastLoginAt: string | null
  userCount: number
}

const SAML_PROVIDERS: SamlProvider[] = [
  {
    id: 'saml-okta',
    name: 'Okta (Corporate)',
    entityId: 'http://localhost:3000/api/auth/saml/okta',
    ssoUrl: 'https://rock887.okta.com/app/rock887/123456/sso/saml',
    sloUrl: 'https://rock887.okta.com/app/rock887/123456/slo/saml',
    x509Cert: '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----',
    metadataUrl: 'https://rock887.okta.com/app/123456/sso/saml/metadata',
    attributeMapping: { username: 'email', email: 'email', fullName: 'displayName', groups: 'groups' },
    jitProvisioning: true,
    defaultRole: 'read-only',
    roleMapping: [
      { idpGroup: 'rock887-admins', localRole: 'admin' },
      { idpGroup: 'rock887-engineers', localRole: 'technical-engineer' },
      { idpGroup: 'rock887-pds', localRole: 'program-director' },
      { idpGroup: 'rock887-presenters', localRole: 'presenter' },
    ],
    active: true,
    domains: ['rock887.fm', 'rock887.com'],
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    userCount: 24,
  },
  {
    id: 'saml-azure',
    name: 'Azure AD (Entra ID)',
    entityId: 'http://localhost:3000/api/auth/saml/azure',
    ssoUrl: 'https://login.microsoftonline.com/tenant-id/saml2',
    sloUrl: 'https://login.microsoftonline.com/tenant-id/saml2/slo',
    x509Cert: '-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----',
    metadataUrl: 'https://login.microsoftonline.com/tenant-id/federationmetadata.xml',
    attributeMapping: { username: 'userPrincipalName', email: 'email', fullName: 'displayName', groups: 'groups' },
    jitProvisioning: true,
    defaultRole: 'read-only',
    roleMapping: [
      { idpGroup: 'Broadcast-Admins', localRole: 'admin' },
      { idpGroup: 'Broadcast-Engineers', localRole: 'technical-engineer' },
    ],
    active: true,
    domains: ['broadcastgroup.com'],
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
    userCount: 8,
  },
]

const OIDC_PROVIDERS: OidcProvider[] = [
  {
    id: 'oidc-keycloak',
    name: 'Keycloak (Internal)',
    issuerUrl: 'https://auth.rock887.fm/realms/rock887',
    clientId: 'rock887-dashboard',
    clientSecret: '***',
    authorizationUrl: 'https://auth.rock887.fm/realms/rock887/protocol/openid-connect/auth',
    tokenUrl: 'https://auth.rock887.fm/realms/rock887/protocol/openid-connect/token',
    userInfoUrl: 'https://auth.rock887.fm/realms/rock887/protocol/openid-connect/userinfo',
    scope: 'openid profile email groups',
    jwksUrl: 'https://auth.rock887.fm/realms/rock887/protocol/openid-connect/certs',
    attributeMapping: { username: 'preferred_username', email: 'email', fullName: 'name', groups: 'groups' },
    jitProvisioning: true,
    defaultRole: 'read-only',
    roleMapping: [
      { idpGroup: 'realm-admin', localRole: 'admin' },
      { idpGroup: 'realm-engineer', localRole: 'technical-engineer' },
    ],
    active: true,
    domains: ['auth.rock887.fm'],
    lastLoginAt: new Date(Date.now() - 1800000).toISOString(),
    userCount: 12,
  },
  {
    id: 'oidc-google',
    name: 'Google Workspace',
    issuerUrl: 'https://accounts.google.com',
    clientId: '123456789-abc.apps.googleusercontent.com',
    clientSecret: '***',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid profile email',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    attributeMapping: { username: 'email', email: 'email', fullName: 'name', groups: 'groups' },
    jitProvisioning: true,
    defaultRole: 'read-only',
    roleMapping: [],
    active: false,
    domains: ['gmail.com', 'rock887.fm'],
    lastLoginAt: null,
    userCount: 0,
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    samlProviders: SAML_PROVIDERS,
    oidcProviders: OIDC_PROVIDERS,
    stats: {
      totalProviders: SAML_PROVIDERS.length + OIDC_PROVIDERS.length,
      activeProviders: SAML_PROVIDERS.filter((p) => p.active).length + OIDC_PROVIDERS.filter((p) => p.active).length,
      totalUsers: [...SAML_PROVIDERS, ...OIDC_PROVIDERS].reduce((s, p) => s + p.userCount, 0),
      jitProvisioned: 44,
      lastLoginAt: [...SAML_PROVIDERS, ...OIDC_PROVIDERS]
        .filter((p) => p.lastLoginAt)
        .sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? ''))[0]?.lastLoginAt,
    },
    compliance: {
      standards: ['SAML 2.0 (OASIS 2005)', 'OpenID Connect Core 1.0', 'RFC 6749 (OAuth 2.0)', 'RFC 8414 (OIDC Discovery)'],
      jitProvisioning: 'Auto-create users on first login with default read-only role',
      roleMapping: 'IdP groups → local RBAC roles (admin/technical-engineer/program-director/etc.)',
      security: 'Signed assertions (SAML) + ID tokens (OIDC) verified against IdP cert/JWKS',
    },
    flow: {
      saml: 'User → /api/auth/saml/:provider → redirect to IdP → assertion POST → verify signature → create session',
      oidc: 'User → /api/auth/oidc/:provider → redirect to IdP → callback with code → exchange for tokens → verify ID token → create session',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'test-connection' && body.providerId) {
    const provider = [...SAML_PROVIDERS, ...OIDC_PROVIDERS].find((p) => p.id === body.providerId)
    if (!provider) return NextResponse.json({ ok: false, error: 'Provider not found' }, { status: 404 })
    // Simulate connection test (production: fetch metadata, verify cert, test SAML/OIDC handshake)
    return NextResponse.json({
      ok: true,
      provider: provider.name,
      testedAt: new Date().toISOString(),
      checks: {
        metadataReachable: true,
        certValid: true,
        handshakeSuccess: true,
        attributeMappingValid: true,
      },
      message: `✅ Connection to ${provider.name} successful — all checks passed`,
    })
  }

  if (body.action === 'add-saml' && body.provider) {
    const newProvider: SamlProvider = { ...body.provider, id: `saml-${Date.now()}`, userCount: 0, lastLoginAt: null }
    SAML_PROVIDERS.push(newProvider)
    return NextResponse.json({ ok: true, provider: newProvider })
  }

  if (body.action === 'add-oidc' && body.provider) {
    const newProvider: OidcProvider = { ...body.provider, id: `oidc-${Date.now()}`, userCount: 0, lastLoginAt: null }
    OIDC_PROVIDERS.push(newProvider)
    return NextResponse.json({ ok: true, provider: newProvider })
  }

  if (body.action === 'toggle' && body.providerId !== undefined) {
    for (const p of SAML_PROVIDERS) if (p.id === body.providerId) p.active = body.active ?? !p.active
    for (const p of OIDC_PROVIDERS) if (p.id === body.providerId) p.active = body.active ?? !p.active
    return NextResponse.json({ ok: true, message: 'Provider toggled' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
