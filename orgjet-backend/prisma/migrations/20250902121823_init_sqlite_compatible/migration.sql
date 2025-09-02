-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'REQUESTER',
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RequestType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "schemaJson" TEXT NOT NULL,
    "defaultSlaMinutes" INTEGER NOT NULL DEFAULT 1440
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "typeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "assigneeId" TEXT,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "currentStatus" TEXT NOT NULL DEFAULT 'NEW',
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "dueAt" DATETIME,
    "slaBreachAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "RequestType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SLAConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    CONSTRAINT "SLAConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SLAConfig_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "RequestType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "tz" TEXT NOT NULL,
    "workdaysJson" TEXT NOT NULL,
    "holidaysJson" TEXT NOT NULL,
    CONSTRAINT "Schedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Subscription_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_name_key" ON "RequestType"("name");
