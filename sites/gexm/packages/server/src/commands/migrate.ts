import { migrateFromSqliteToPostgres, verifyMigration } from '../utils/migration'
import config from '../config'
import logger from '../utils/logger'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    logger.info('Usage: npm run migrate <command>')
    logger.info('Commands:')
    logger.info('  run          - Run migration from SQLite to PostgreSQL')
    logger.info('  verify       - Verify migration results')
    logger.info('  run:verify   - Run migration and verify')
    process.exit(1)
  }

  if (config.database.type !== 'postgres') {
    logger.error('Migration requires PostgreSQL database type. Set DB_TYPE=postgres in .env')
    process.exit(1)
  }

  const sqlitePath = config.database.path || './data/gexm.db'

  try {
    if (command === 'run' || command === 'run:verify') {
      logger.info('Starting data migration from SQLite to PostgreSQL...')
      logger.info(`Source: ${sqlitePath}`)
      logger.info(
        `Target: ${config.database.host}:${config.database.port}/${config.database.database}`
      )

      const result = await migrateFromSqliteToPostgres(sqlitePath)

      logger.info('Migration completed:')
      logger.info(`  Total tables migrated: ${result.tablesMigrated.length}`)
      logger.info(`  Total records migrated: ${result.totalRecords}`)
      logger.info(`  Duration: ${result.duration}ms`)

      if (result.errors.length > 0) {
        logger.error(`Migration errors (${result.errors.length}):`)
        result.errors.forEach((error, index) => {
          logger.error(`  ${index + 1}. ${error}`)
        })
      }
    }

    if (command === 'verify' || command === 'run:verify') {
      logger.info('Verifying migration results...')
      await verifyMigration(sqlitePath)
      logger.info('Verification completed successfully')
    }

    process.exit(0)
  } catch (error) {
    logger.error('Migration failed: %s', (error as Error).message)
    logger.error((error as Error).stack)
    process.exit(1)
  }
}

main()
