CREATE TABLE "NewsItem" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "link" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "source" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NewsItem_link_key" ON "NewsItem"("link");
CREATE INDEX "NewsItem_publishedAt_idx" ON "NewsItem"("publishedAt");
