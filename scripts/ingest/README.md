# Food Database Ingestion Scripts

This directory contains scripts to import food nutrition data from various sources into the `nutrition_foods` table.

## Prerequisites

1. Set environment variables:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export USDA_API_KEY="your-usda-api-key" # Optional but recommended
   ```

2. Install dependencies:
   ```bash
   npm install csv-parse @types/node
   ```

## Scripts

### 1. OpenFoodFacts Nightly Sync

Fetches the daily dump from OpenFoodFacts and merges into the database.

```bash
npx tsx scripts/ingest/openfoodfacts-sync.ts
```

**Schedule with cron:**
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/shiftcali && npx tsx scripts/ingest/openfoodfacts-sync.ts >> /var/log/off-sync.log 2>&1
```

### 2. CoFID Importer

Imports UK food composition data from CoFID CSV.

1. Download CoFID dataset from: https://www.gov.uk/government/statistics/composition-of-foods-integrated-dataset-cofid
2. Run importer:
   ```bash
   npx tsx scripts/ingest/cofid-importer.ts /path/to/cofid.csv
   ```

### 3. USDA Importer

Imports US food data from USDA FDC API.

**Import specific search:**
```bash
npx tsx scripts/ingest/usda-importer.ts "chicken breast"
```

**Import popular foods:**
```bash
npx tsx scripts/ingest/usda-importer.ts
```

**Get USDA API key:** https://fdc.nal.usda.gov/api-guide.html

### 4. AUSNUT Importer

Imports Australian food composition data from AUSNUT CSV.

1. Download AUSNUT dataset from: https://www.foodstandards.gov.au/science/monitoringnutrients/ausnut/Pages/default.aspx
2. Run importer:
   ```bash
   npx tsx scripts/ingest/ausnut-importer.ts /path/to/ausnut.csv
   ```

## Database Schema

All scripts write to the `nutrition_foods` table with this structure:

- `id` (uuid, PK)
- `name` (text) - Food name
- `brand` (text, nullable) - Brand name
- `barcode` (text, nullable, unique) - Barcode/EAN
- `serving_size` (numeric) - Serving size
- `serving_unit` (text) - Unit (g, ml, etc.)
- `calories_per_serving` (numeric) - Calories
- `protein_per_serving` (numeric) - Protein in grams
- `carbs_per_serving` (numeric) - Carbs in grams
- `fat_per_serving` (numeric) - Fat in grams
- `source` (text) - Source: 'openfoodfacts', 'cofid', 'usda', 'ausnut', 'recipe_parser'
- `external_id` (text, nullable) - External system ID
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Notes

- All scripts use `upsert` to avoid duplicates
- Barcode-based foods use `barcode` as unique constraint
- Name-based foods use `name,brand` as unique constraint
- Scripts are designed to be idempotent (safe to run multiple times)

