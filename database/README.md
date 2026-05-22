# SavePlate Database

This directory contains the database schema and scripts for the SavePlate application.

## Database Technology

- **RDBMS**: MySQL 8.x
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`

## Schema Overview

The database, `saveplate_db`, consists of the following core tables:

- **`users`**: Stores user accounts, authentication details, and preferences.
- **`verification_codes`**: Handles 2FA codes and email verification.
- **`food_items`**: Tracks user food inventory, including expiry dates, quantities, and status (e.g., active, used, donated).
- **`donations`**: Manages food donation listings and claims between users.
- **`notifications`**: Stores system notifications (e.g., expiry alerts, donation updates).
- **`meal_plans` & `meal_slots`**: Manages weekly meal planning configurations.
- **`meal_slot_ingredients`**: Links ingredients from the user's inventory to specific meal slots.

## Setup Instructions

1. Ensure you have MySQL Server installed and running.
2. Open your terminal or command prompt.
3. Execute the `schema.sql` script to create the database and all required tables:

   ```bash
   mysql -u root -p < schema.sql
   ```

4. Once the database is created, make sure to update the `.env` file in the `/server` directory with your MySQL credentials (username, password, database name) so the backend can connect successfully.
