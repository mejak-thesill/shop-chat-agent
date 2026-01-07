import { PrismaClient } from "@prisma/client";

let prisma;

// Prevent multiple PrismaClient instances in dev
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient();
  }
  prisma = global.__prisma__;
}

export default prisma;