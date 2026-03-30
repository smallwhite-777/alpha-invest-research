-- CreateTable
CREATE TABLE "Intelligence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "category" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "source" TEXT,
    "authorName" TEXT NOT NULL DEFAULT '匿名',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT
);

-- CreateTable
CREATE TABLE "IntelligenceTag" (
    "intelligenceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("intelligenceId", "tagId"),
    CONSTRAINT "IntelligenceTag_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "Intelligence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IntelligenceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntelligenceSector" (
    "intelligenceId" TEXT NOT NULL,
    "sectorCode" TEXT NOT NULL,
    "sectorName" TEXT NOT NULL,

    PRIMARY KEY ("intelligenceId", "sectorCode"),
    CONSTRAINT "IntelligenceSector_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "Intelligence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntelligenceStock" (
    "intelligenceId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "stockName" TEXT NOT NULL,

    PRIMARY KEY ("intelligenceId", "stockSymbol"),
    CONSTRAINT "IntelligenceStock_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "Intelligence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "intelligenceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_intelligenceId_fkey" FOREIGN KEY ("intelligenceId") REFERENCES "Intelligence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "sectorCode" TEXT NOT NULL,
    "sectorName" TEXT NOT NULL,
    "listDate" TEXT
);

-- CreateTable
CREATE TABLE "FinancialData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockSymbol" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodDate" TEXT NOT NULL,
    "revenue" REAL,
    "revenueYoy" REAL,
    "grossMargin" REAL,
    "netProfit" REAL,
    "netProfitYoy" REAL,
    "roe" REAL,
    "roa" REAL,
    "capex" REAL,
    "operatingCF" REAL,
    "totalAssets" REAL,
    "totalEquity" REAL,
    "totalDebt" REAL,
    "assetTurnover" REAL,
    "equityMultiplier" REAL,
    "netMargin" REAL,
    CONSTRAINT "FinancialData_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "Stock" ("symbol") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValuationData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockSymbol" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pe" REAL,
    "pb" REAL,
    "ps" REAL,
    "marketCap" REAL,
    "price" REAL,
    CONSTRAINT "ValuationData_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "Stock" ("symbol") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "stockSymbol" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchlistItem_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "Stock" ("symbol") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MacroIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'CN',
    "unit" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "MacroDataPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCode" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "value" REAL NOT NULL,
    CONSTRAINT "MacroDataPoint_indicatorCode_fkey" FOREIGN KEY ("indicatorCode") REFERENCES "MacroIndicator" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Intelligence_category_idx" ON "Intelligence"("category");

-- CreateIndex
CREATE INDEX "Intelligence_importance_idx" ON "Intelligence"("importance");

-- CreateIndex
CREATE INDEX "Intelligence_createdAt_idx" ON "Intelligence"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "IntelligenceSector_sectorCode_idx" ON "IntelligenceSector"("sectorCode");

-- CreateIndex
CREATE INDEX "IntelligenceStock_stockSymbol_idx" ON "IntelligenceStock"("stockSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_symbol_key" ON "Stock"("symbol");

-- CreateIndex
CREATE INDEX "Stock_sectorCode_idx" ON "Stock"("sectorCode");

-- CreateIndex
CREATE INDEX "FinancialData_stockSymbol_idx" ON "FinancialData"("stockSymbol");

-- CreateIndex
CREATE INDEX "FinancialData_periodDate_idx" ON "FinancialData"("periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialData_stockSymbol_period_key" ON "FinancialData"("stockSymbol", "period");

-- CreateIndex
CREATE INDEX "ValuationData_stockSymbol_idx" ON "ValuationData"("stockSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "ValuationData_stockSymbol_date_key" ON "ValuationData"("stockSymbol", "date");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_idx" ON "WatchlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_stockSymbol_key" ON "WatchlistItem"("userId", "stockSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "MacroIndicator_code_key" ON "MacroIndicator"("code");

-- CreateIndex
CREATE INDEX "MacroDataPoint_indicatorCode_idx" ON "MacroDataPoint"("indicatorCode");

-- CreateIndex
CREATE INDEX "MacroDataPoint_date_idx" ON "MacroDataPoint"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MacroDataPoint_indicatorCode_date_key" ON "MacroDataPoint"("indicatorCode", "date");
