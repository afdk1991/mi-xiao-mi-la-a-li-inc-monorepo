const http = require('http')

const BASE_URL = 'localhost'
const PORT = 3000

function request(path, method = 'GET', body = null, token = null, redirects = 0) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https',
      },
    }

    if (token) {
      options.headers.Authorization = `Bearer ${token}`
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirects < 3
        ) {
          const newUrl = new URL(res.headers.location, `http://${BASE_URL}:${PORT}`)
          request(newUrl.pathname + newUrl.search, method, body, token, redirects + 1)
            .then(resolve)
            .catch(reject)
          return
        }
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function runTests() {
  console.log('=== API 端点测试 ===\n')
  let passed = 0
  let failed = 0

  function test(name, promise) {
    return promise
      .then((result) => {
        const ok = result.status >= 200 && result.status < 300
        if (ok) {
          console.log(`✅ PASS: ${name} (${result.status})`)
          passed++
        } else {
          console.log(`❌ FAIL: ${name} (${result.status})`)
          const msg =
            typeof result.data === 'string'
              ? result.data.slice(0, 80)
              : JSON.stringify(result.data).slice(0, 80)
          console.log(`   ${msg}`)
          failed++
        }
        return result
      })
      .catch((err) => {
        console.log(`❌ FAIL: ${name} - ${err.message}`)
        failed++
        return null
      })
  }

  await test('GET /api/health', request('/api/health'))
  await test('GET /api/products', request('/api/products'))
  await test('GET /api/products/hot', request('/api/products/hot'))
  await test('GET /api/products/new', request('/api/products/new'))
  await test('GET /api/products/price-range', request('/api/products/price-range'))
  await test('GET /api/categories', request('/api/categories'))

  const productRes = await request('/api/products?pageSize=1')
  if (
    productRes.status === 200 &&
    productRes.data.data &&
    productRes.data.data.products &&
    productRes.data.data.products[0]
  ) {
    const productId = productRes.data.data.products[0].id
    await test(`GET /api/products/${productId}`, request(`/api/products/${productId}`))
  }

  const registerRes = await request('/api/auth/register', 'POST', {
    username: `testuser_${Date.now()}`,
    password: 'test123456',
    phone: `138${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0')}`,
  })

  let token = null
  if (
    registerRes.status === 200 &&
    registerRes.data.data &&
    (registerRes.data.data.token || registerRes.data.data.accessToken)
  ) {
    token = registerRes.data.data.token || registerRes.data.data.accessToken
    console.log('\n✅ 注册成功，获取 token')
  } else {
    const loginRes = await request('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'admin123456',
    })
    if (
      loginRes.status === 200 &&
      loginRes.data.data &&
      (loginRes.data.data.token || loginRes.data.data.accessToken)
    ) {
      token = loginRes.data.data.token || loginRes.data.data.accessToken
      console.log('\n✅ 登录成功，获取 token')
    } else {
      console.log('\n⚠️  无法获取 token，跳过需要认证的接口')
    }
  }

  if (token) {
    await test('GET /api/auth/profile', request('/api/auth/profile', 'GET', null, token))
    await test('GET /api/orders', request('/api/orders', 'GET', null, token))
    await test('GET /api/cart', request('/api/cart', 'GET', null, token))
    await test('GET /api/addresses', request('/api/addresses', 'GET', null, token))
  }

  console.log(`\n=== 测试结果 ===`)
  console.log(`通过: ${passed}`)
  console.log(`失败: ${failed}`)
  console.log(`总计: ${passed + failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

setTimeout(runTests, 1000)
