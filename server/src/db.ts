import { PrismaClient } from '@prisma/client';

/** Единый PrismaClient — чтобы не конструировать его в разных модулях заново. */
export const prisma = new PrismaClient();
