import type { OAuthTokens } from './interfaces'

const DEFAULT_TIMEOUT = 10000

export abstract class BaseOAuthProvider {
  protected readonly timeout: number = DEFAULT_TIMEOUT

  protected fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    const mergedOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Gexm/1.0.0 (+https://gexm.com)',
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    }

    return fetch(url, mergedOptions).finally(() => clearTimeout(timer))
  }

  protected async getJsonResponse<T>(
    url: string,
    options?: RequestInit,
    operation?: string
  ): Promise<T> {
    const response = await this.fetchWithTimeout(url, options)
    if (operation) {
      this.validateResponse(response, operation)
    }
    return response.json() as Promise<T>
  }

  protected validateResponse(response: Response, operation: string): void {
    if (!response.ok) {
      throw new Error(`${operation}: HTTP ${response.status}`)
    }
  }

  protected buildExpiresAt(expiresIn?: number): string | undefined {
    return expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined
  }

  protected validateAccessToken(accessToken: string | undefined, providerName: string): void {
    if (!accessToken) {
      throw new Error(`${providerName} OAuth错误: access_token为空`)
    }
  }

  async refreshToken(_refreshToken: string): Promise<OAuthTokens | null> {
    return null
  }
}

export default BaseOAuthProvider
