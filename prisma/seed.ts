import type { Department, User } from '@prisma/client'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const salt: string = await bcrypt.genSalt(10)
  const hashedAdminPassword = await bcrypt.hash('superadmin123', salt)

  const adminDepartment: Department = await prisma.department.upsert({
    where: { name: 'Администрация' },
    update: {},
    create: { name: 'Администрация' },
  })

  const admin: User = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Администратор',
      email: 'admin@example.com',
      passwordHash: hashedAdminPassword,
      role: 'admin',
      departmentId: adminDepartment.id,
    },
  })

  console.log('Create admin', admin.email)
}

main()
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
