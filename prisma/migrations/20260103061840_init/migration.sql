-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "referencedIn" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_slug_key" ON "Image"("slug");
