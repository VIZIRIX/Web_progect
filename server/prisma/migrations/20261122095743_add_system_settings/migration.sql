-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "workStart" TEXT NOT NULL DEFAULT '08:00',
    "workEnd" TEXT NOT NULL DEFAULT '20:00',
    "maxBookingHours" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
