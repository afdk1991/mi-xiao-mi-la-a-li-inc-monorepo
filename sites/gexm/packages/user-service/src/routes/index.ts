import express from 'express'
import authRoutes from './auth'
import usersRoutes from './users'
import addressRoutes from './addresses'
import internalRoutes from './internal'

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/addresses', addressRoutes)
router.use('/internal', internalRoutes)

export default router