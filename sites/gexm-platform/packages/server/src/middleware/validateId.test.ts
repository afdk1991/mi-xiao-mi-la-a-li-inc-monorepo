import { validateId, validateNumericId, validateUuid } from './validateId'

describe('validateId middleware', () => {
  const createMockReq = (params: Record<string, unknown>) => ({ params })
  const createMockRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  })
  const createMockNext = () => jest.fn()

  describe('validateId with default options', () => {
    it('should call next when id is provided', () => {
      const req = createMockReq({ id: 'test123' })
      const res = createMockRes()
      const next = createMockNext()

      validateId()(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return error when id is missing and required', () => {
      const req = createMockReq({})
      const res = createMockRes()
      const next = createMockNext()

      validateId()(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should call next when id is missing but not required', () => {
      const req = createMockReq({})
      const res = createMockRes()
      const next = createMockNext()

      validateId({ required: false })(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should handle array param value', () => {
      const req = createMockReq({ id: ['test123'] })
      const res = createMockRes()
      const next = createMockNext()

      validateId()(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })
  })

  describe('validateId with uuid type', () => {
    it('should call next for valid UUID', () => {
      const req = createMockReq({ id: '550e8400-e29b-41d4-a716-446655440000' })
      const res = createMockRes()
      const next = createMockNext()

      validateId({ idType: 'uuid' })(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return error for invalid UUID', () => {
      const req = createMockReq({ id: 'invalid-uuid' })
      const res = createMockRes()
      const next = createMockNext()

      validateId({ idType: 'uuid' })(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('validateId with numeric type', () => {
    it('should call next for valid numeric id', () => {
      const req = createMockReq({ id: '12345' })
      const res = createMockRes()
      const next = createMockNext()

      validateId({ idType: 'numeric' })(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return error for non-numeric id', () => {
      const req = createMockReq({ id: 'abc123' })
      const res = createMockRes()
      const next = createMockNext()

      validateId({ idType: 'numeric' })(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('should return error for id starting with 0', () => {
      const req = createMockReq({ id: '01234' })
      const res = createMockRes()
      const next = createMockNext()

      validateId({ idType: 'numeric' })(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('validateId with custom paramName', () => {
    it('should validate custom parameter name', () => {
      const req = createMockReq({ userId: 'test123' })
      const res = createMockRes()
      const next = createMockNext()

      validateId({ paramName: 'userId' })(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return error for missing custom parameter', () => {
      const req = createMockReq({})
      const res = createMockRes()
      const next = createMockNext()

      validateId({ paramName: 'userId' })(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('validateNumericId', () => {
    it('should call next for valid numeric id', () => {
      const req = createMockReq({ id: '12345' })
      const res = createMockRes()
      const next = createMockNext()

      validateNumericId()(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return error for non-numeric id', () => {
      const req = createMockReq({ id: 'abc123' })
      const res = createMockRes()
      const next = createMockNext()

      validateNumericId()(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('validateUuid', () => {
    it('should call next for valid UUID', () => {
      const req = createMockReq({ id: '550e8400-e29b-41d4-a716-446655440000' })
      const res = createMockRes()
      const next = createMockNext()

      validateUuid()(req as never, res as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return error for invalid UUID', () => {
      const req = createMockReq({ id: 'invalid-uuid' })
      const res = createMockRes()
      const next = createMockNext()

      validateUuid()(req as never, res as never, next)

      expect(next).not.toHaveBeenCalled()
    })
  })
})
