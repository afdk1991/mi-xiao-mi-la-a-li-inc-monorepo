const modules = [
  './src/config',
  './src/utils/logger',
  './src/utils/response',
  './src/constants/errorCodes',
  './src/models/userModel',
  './src/controllers/authController',
  './src/middleware/auth',
  './src/routes/auth',
]

async function test() {
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i]
    try {
      console.log(`Loading ${mod}...`)
      const result = require(mod)
      console.log(`  ✓ Loaded successfully`)
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`)
      console.error(e.stack)
      process.exit(1)
    }
  }

  console.log('\n=== Testing app.js step by step ===')

  try {
    console.log('Step 1: Loading express...')
    const express = require('express')
    console.log('  ✓ express loaded')

    console.log('Step 2: Loading path...')
    const path = require('path')
    console.log('  ✓ path loaded')

    console.log('Step 3: Loading zlib...')
    const zlib = require('zlib')
    console.log('  ✓ zlib loaded')

    console.log('Step 4: Loading cors...')
    const cors = require('cors')
    console.log('  ✓ cors loaded')

    console.log('Step 5: Loading helmet...')
    const helmet = require('helmet')
    console.log('  ✓ helmet loaded')

    console.log('Step 6: Loading cookie-parser...')
    const cookieParser = require('cookie-parser')
    console.log('  ✓ cookie-parser loaded')

    console.log('Step 7: Loading models/index...')
    const { initDatabase } = require('./src/models')
    console.log('  ✓ models/index loaded')

    console.log('Step 8: Calling initDatabase()...')
    initDatabase()
    console.log('  ✓ initDatabase completed')

    console.log('Step 9: Loading middleware/requestLogger...')
    const requestLogger = require('./src/middleware/requestLogger')
    console.log('  ✓ requestLogger loaded')

    console.log('Step 10: Loading middleware/errorHandler...')
    const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler')
    console.log('  ✓ errorHandler loaded')

    console.log('Step 11: Loading middleware/rateLimiter...')
    const { apiLimiter } = require('./src/middleware/rateLimiter')
    console.log('  ✓ rateLimiter loaded')

    console.log('Step 12: Loading middleware/security...')
    const security = require('./src/middleware/security')
    console.log('  ✓ security loaded')

    console.log('Step 13: Loading middleware/csrfConfig...')
    const { getCsrfMiddleware } = require('./src/middleware/csrfConfig')
    console.log('  ✓ csrfConfig loaded')

    console.log('Step 14: Loading middleware/apm...')
    const { apmMiddleware, getMetrics, resetMetrics } = require('./src/middleware/apm')
    console.log('  ✓ apm loaded')

    console.log('Step 15: Loading routes...')
    const authRoutes = require('./src/routes/auth')
    const userRoutes = require('./src/routes/users')
    console.log('  ✓ routes loaded')

    console.log('\nAll modules loaded successfully!')
  } catch (e) {
    console.error(`\n  ✗ Error: ${e.message}`)
    console.error(e.stack)
    process.exit(1)
  }
}

test()
