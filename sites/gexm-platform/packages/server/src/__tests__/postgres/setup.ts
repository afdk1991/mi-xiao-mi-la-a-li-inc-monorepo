import { initDatabase, closeDb } from '../../models'

beforeAll(() => {
  initDatabase()
})

afterAll(() => {
  closeDb()
})