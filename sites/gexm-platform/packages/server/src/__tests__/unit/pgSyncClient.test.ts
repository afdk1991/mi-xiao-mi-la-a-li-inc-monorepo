import { PgSyncClient } from '../../models/pgSyncClient'
import { execSync } from 'child_process'

// These tests require a running PostgreSQL instance on localhost:5433
// Start with: npm run test:postgres:setup

// Synchronous port check at module level to allow describe.skip
function isPostgresAvailable(): boolean {
  try {
    execSync(
      'node -e "const s=require(\'net\').Socket();s.setTimeout(2000);s.connect(5433,\'localhost\');s.on(\'connect\',()=>{s.destroy();process.exit(0)});s.on(\'error\',()=>process.exit(1));s.on(\'timeout\',()=>process.exit(1))"',
      { timeout: 5000, stdio: 'ignore' }
    )
    return true
  } catch {
    return false
  }
}

const pgAvailable = isPostgresAvailable()
const describeOrSkip = pgAvailable ? describe : describe.skip

describeOrSkip('PgSyncClient', () => {
  let client: PgSyncClient

  beforeAll(() => {
    client = new PgSyncClient({
      host: 'localhost',
      port: 5433,
      database: 'gexm_test',
      user: 'gexm',
      password: 'gexm_test_password',
      max: 5,
    })
  })

  afterAll(() => {
    if (client) {
      client.close()
    }
  })

  beforeEach(() => {
    // Clean test table
    try {
      client.exec('DROP TABLE IF EXISTS _pgsync_test')
    } catch {
      // ignore
    }
  })

  describe('prepare().run()', () => {
    it('should execute INSERT and return changes count', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          value INTEGER DEFAULT 0
        )
      `)

      const stmt = client.prepare('INSERT INTO _pgsync_test (id, name, value) VALUES ($1, $2, $3)')
      const result = stmt.run('test-1', 'hello', 42)

      expect(result.changes).toBe(1)
    })

    it('should return 0 changes when no rows affected', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `)

      const stmt = client.prepare('UPDATE _pgsync_test SET name = $1 WHERE id = $2')
      const result = stmt.run('updated', 'nonexistent')

      expect(result.changes).toBe(0)
    })
  })

  describe('prepare().get()', () => {
    it('should return a single row', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `)
      client.prepare('INSERT INTO _pgsync_test (id, name) VALUES ($1, $2)').run('row-1', 'first')

      const stmt = client.prepare('SELECT * FROM _pgsync_test WHERE id = $1')
      const row = stmt.get('row-1')

      expect(row).toBeDefined()
      expect(row.id).toBe('row-1')
      expect(row.name).toBe('first')
    })

    it('should return undefined when no row found', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY
        )
      `)

      const stmt = client.prepare('SELECT * FROM _pgsync_test WHERE id = $1')
      const row = stmt.get('nonexistent')

      expect(row).toBeUndefined()
    })
  })

  describe('prepare().all()', () => {
    it('should return multiple rows', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `)
      client.prepare('INSERT INTO _pgsync_test (id, name) VALUES ($1, $2)').run('r1', 'a')
      client.prepare('INSERT INTO _pgsync_test (id, name) VALUES ($1, $2)').run('r2', 'b')
      client.prepare('INSERT INTO _pgsync_test (id, name) VALUES ($1, $2)').run('r3', 'c')

      const stmt = client.prepare('SELECT * FROM _pgsync_test ORDER BY name')
      const rows = stmt.all()

      expect(rows).toHaveLength(3)
      expect(rows[0].name).toBe('a')
      expect(rows[2].name).toBe('c')
    })

    it('should return empty array when no rows', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY
        )
      `)

      const stmt = client.prepare('SELECT * FROM _pgsync_test')
      const rows = stmt.all()

      expect(rows).toHaveLength(0)
    })
  })

  describe('exec()', () => {
    it('should execute DDL statements', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY
        )
      `)

      // Verify table exists by inserting
      client.prepare('INSERT INTO _pgsync_test (id) VALUES ($1)').run('x')
      expect(client.prepare('SELECT COUNT(*) as count FROM _pgsync_test').get().count).toBe(1)
    })
  })

  describe('transaction()', () => {
    it('should commit on success', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `)

      const tx = client.transaction(() => {
        client
          .prepare('INSERT INTO _pgsync_test (id, name) VALUES ($1, $2)')
          .run('tx-1', 'committed')
        return 'success'
      })

      const result = tx()
      expect(result).toBe('success')
      expect(client.prepare('SELECT * FROM _pgsync_test WHERE id = $1').get('tx-1')).toBeDefined()
    })

    it('should rollback on error', () => {
      client.exec(`
        CREATE TABLE _pgsync_test (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
        )
      `)

      const tx = client.transaction(() => {
        client
          .prepare('INSERT INTO _pgsync_test (id, name) VALUES ($1, $2)')
          .run('tx-2', 'will-rollback')
        throw new Error('intentional failure')
      })

      expect(() => tx()).toThrow('intentional failure')
      expect(client.prepare('SELECT * FROM _pgsync_test WHERE id = $1').get('tx-2')).toBeUndefined()
    })
  })

  describe('healthCheck()', () => {
    it('should return true when DB is accessible', () => {
      expect(client.healthCheck()).toBe(true)
    })
  })

  describe('getConnectionInfo()', () => {
    it('should return postgres connection info', () => {
      const info = client.getConnectionInfo()
      expect(info.type).toBe('postgres')
      expect(info.host).toBe('localhost')
      expect(info.port).toBe(5433)
    })
  })

  describe('pragma()', () => {
    it('should log warning and return empty array', () => {
      const result = client.pragma('table_info(users)')
      expect(result).toEqual([])
    })
  })
})

if (!pgAvailable) {
  describe('PgSyncClient (skipped)', () => {
    it('should skip when PostgreSQL is not available', () => {
      // eslint-disable-next-line no-console
      console.warn('[SKIP] PostgreSQL not available on localhost:5433')
    })
  })
}
