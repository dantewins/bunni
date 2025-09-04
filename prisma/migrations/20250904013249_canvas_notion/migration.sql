/*
  Warnings:

  - You are about to drop the `NotionConnection` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[notionUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."NotionConnection" DROP CONSTRAINT "NotionConnection_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hasCompletedSetup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notionUserId" TEXT;

-- DropTable
DROP TABLE "public"."NotionConnection";

-- CreateTable
CREATE TABLE "public"."notion_connections" (
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "workspace_id" TEXT,
    "bot_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "parent_page_id" TEXT,
    "calendar_database_id" TEXT,

    CONSTRAINT "notion_connections_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."canvas_connections" (
    "user_id" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_connections_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_notionUserId_key" ON "public"."User"("notionUserId");

-- AddForeignKey
ALTER TABLE "public"."notion_connections" ADD CONSTRAINT "notion_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."canvas_connections" ADD CONSTRAINT "canvas_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
