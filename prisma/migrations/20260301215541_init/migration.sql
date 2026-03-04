-- CreateTable
CREATE TABLE "CgmReading" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'glooko',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "glucose" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CgmReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "tirPercent" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION NOT NULL,
    "coefficientVariance" DOUBLE PRECISION NOT NULL,
    "streakDays" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "motivationalMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CgmReading_timestamp_idx" ON "CgmReading"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "CgmReading_source_timestamp_key" ON "CgmReading"("source", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DailySummary_day_key" ON "DailySummary"("day");
