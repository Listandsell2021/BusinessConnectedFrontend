# Lead Data Migration Guide

This directory contains migration scripts to normalize and improve lead data in your database.

## What This Migration Does

### 1. Data Normalization (`normalize_lead_data.js`)
- **Property Types**: Normalizes property type values like `own_home`, `rental_apartment`, etc.
- **Time Preferences**: Standardizes time preference values like `morning_preferred`, `afternoon_preferred`
- **Boolean Values**: Converts string boolean values ("yes"/"no", "ja"/"nein") to proper booleans
- **Lead IDs**: Updates old format Lead IDs (e.g., `MOV7334`) to new format (e.g., `MOV-250909-A1B2`)

### 2. Translation Improvements
The frontend now properly translates these values in both English and German:

#### Property Types
- `rental_apartment` → "Rental Apartment" / "Mietwohnung"
- `own_home` → "Own Home" / "Eigenheim" 
- `own_house` → "Own House" / "Eigenhaus"
- `own_apartment` → "Own Apartment" / "Eigentumswohnung"

#### Time Preferences  
- `morning_preferred` → "Morning Preferred" / "Morgens bevorzugt"
- `afternoon_preferred` → "Afternoon Preferred" / "Nachmittags bevorzugt"
- `evening_preferred` → "Evening Preferred" / "Abends bevorzugt"

#### Service Types
- `moving` → "Moving" / "Umzug"
- `cleaning` → "Cleaning" / "Reinigung"

## How to Run the Migration

### Prerequisites
1. **Backup your database** before running any migration
2. Ensure MongoDB is running
3. Set your database connection string in `.env` file

### Running the Migration

#### Option 1: Using the migration script
```bash
cd server
node migrations/normalize_lead_data.js
```

#### Option 2: Using the helper script  
```bash
cd server
node scripts/run-migration.js
```

### What to Expect

The migration will:
1. Connect to your MongoDB database
2. Find all leads that need normalization
3. Update property types, time preferences, and boolean values
4. Generate new Lead IDs for leads with old format IDs
5. Preserve all existing data while only updating the format

### Example Output
```
Starting lead data normalization...
Found 150 leads to process
Lead MOV7334: Normalized propertyType from "own_home" to "own_home"
Lead CLN1234: Normalized preferredContactTime from "morning_preferred" to "morning_preferred"
Lead MOV5678: Updated lead ID from "MOV7334" to "MOV-250909-A1B2"
Migration completed. Updated 45 leads.
```

## Lead ID Format Changes

### Old Format
- `MOV7334` (Moving)
- `CLN1234` (Cleaning)  
- `CAN5678` (Cancellation)

### New Format
- `MOV-250909-A1B2` (Service-Date-Random)
- `CLN-250909-X3Y4`
- `CAN-250909-Z9W8`

Where:
- `MOV/CLN/CAN` = Service type prefix
- `250909` = Date (YYMMDD format)
- `A1B2` = Random 4-character identifier

## Safety Features

- **Non-destructive**: Only updates format, never deletes data
- **Idempotent**: Safe to run multiple times
- **Validation**: Checks for existing IDs to prevent duplicates
- **Logging**: Detailed output of all changes made

## Reverting Changes

If you need to revert:
1. Restore from your database backup
2. The migration script doesn't keep a record of original values, so backup is essential

## Troubleshooting

### Common Issues

1. **Connection Error**
   ```
   Database connection error: MongoNetworkError
   ```
   **Solution**: Check your MONGODB_URI in `.env` file

2. **Duplicate Key Error** 
   ```
   E11000 duplicate key error
   ```
   **Solution**: This means Lead IDs are conflicting. The script handles this automatically.

3. **Permission Error**
   ```
   not authorized on database
   ```
   **Solution**: Check your database user permissions

### Support

If you encounter issues:
1. Check the console output for specific error messages
2. Ensure database connectivity
3. Verify you have a recent database backup
4. Contact your development team if problems persist