# Batloung Farm Distribution System (DIWA2110 Take-Home Test)

Node.js + Express + MySQL REST API (`backend/`) with a simple web interface (`frontend/`).

```
backend/    server.js, package.json, .env.example
  database/   schema.sql  seed.sql  reports.sql (4 reports + rollback demo)
  src/        config/  routes/  controllers/  models/  middleware/  utils/
  scripts/    setup-db.js  (creates tables + sample data)
frontend/   index, stock, suppliers, pos, vendors (.html) + js/ + css/
```

## Run on XAMPP
1. Start **MySQL** in the XAMPP Control Panel.
2. In a terminal:
```
cd backend
copy .env.example .env        (Mac/Linux: cp)
npm install
npm run db:setup              (drops and recreates the tables, loads the sample data)
npm start
```
3. Open http://localhost:3000 (the backend also serves the `frontend` folder). The top bar shows **DB: ONLINE**.

`.env` defaults match XAMPP: host 127.0.0.1, user `root`, empty password. If MySQL is down the server stays up and the API answers **503**.
Works on XAMPP (MariaDB 10.2+) and MySQL 8.0.16+.

## What the system does
- **Part A** `schema.sql` / `seed.sql`: the 8 required tables plus `packaging_prices` (a different price per box size) and `payments` (cash, mobile money). Stock is stored per fruit and box size. Fruits can be assigned a category; blank categories appear as **Uncategorized** in the POS. Suppliers and vendors also store the latitude/longitude of the map pin chosen at registration.
- **Part B** organised folders, `mysql2`, `.env`, async/await with try/catch, no crash when the database is down.
- **Part C** REST API (200 / 201 / 400 / 404 / 409 / 500 / 503):

| Resource | Endpoints |
|---|---|
| Suppliers | `GET/POST /api/suppliers`, `GET/PUT/DELETE /api/suppliers/:id` |
| Fruits & stock | `GET/POST /api/fruits`, `GET/PUT /api/fruits/:id`, `GET /api/fruits/:id/stock`, `GET /api/stock`, `GET /api/stock/low?threshold=` |
| Vendors | `GET/POST /api/vendors` (`?search=` name or phone), `GET/PUT /api/vendors/:id`, `GET /api/vendors/balances` |
| Purchases | `GET/POST /api/purchases`, `GET /api/purchases/:id` |
| Sales | `GET/POST /api/sales`, `GET /api/sales/:id`, `POST /api/sales/:id/payments`, `POST /api/vendors/:id/payments` |
| Reports | `/api/reports/top-fruits`, `/revenue?from=&to=`, `/top-vendor`, `/stock-levels` |

- **Part D** totals are calculated by the server (prices come from `packaging_prices`); purchases raise and sales lower the stock of the matching fruit and size; negative stock is impossible; a sale with any unavailable item is rolled back completely (`BEGIN` / `COMMIT` / `ROLLBACK`); payments can be cash, mobile money or credit with status PAID / PARTIALLY_PAID / UNPAID and an outstanding balance per vendor.

### Stock messages
Every stock row has a status: **AVAILABLE**, **LOW STOCK** (100 boxes or fewer) or **NOT AVAILABLE** (0 boxes). In the POS the requested quantity is checked live and shows *Available*, *Insufficient* or *Not available*. If a sale still contains an unavailable item the API returns 400 and nothing is saved.
The POS shows a live line amount as quantity changes. Large-box sales are limited to 8 per fruit per sale, enforced by both the interface and API.

### Fruit categories
New and existing fruits are **Uncategorized** by default. Assign or change a fruit's category from **Fruits & Stock**; the POS lists Uncategorized first, followed by tabs for each assigned category. To move a fruit back, clear its category.

For an existing database, apply `backend/database/migrations/001_add_fruit_category.sql` once before starting the updated app. Fresh installs already include the category column in `schema.sql`.

### Vendor / supplier details and map
Click a vendor or supplier name (or **Details & map**) to see all their details and a live OpenStreetMap showing the pin chosen at registration. Vendor and debtor lists link directly to the same saved coordinates in Google Maps. In the registration form click the map, drag the pin, search a place, press **My location**, or paste Google Maps coordinates (latitude, longitude) or a coordinate-bearing Google Maps URL and choose **Use exact pin**. The saved coordinates are the exact location; the text location is a human-readable description. (Map tiles need an internet connection.)

## Demo video steps
1. Show tables and data. 2. Dashboard: the 4 reports. 3. Record a purchase and show the stock rise. 4. POS: sell on credit and show the stock fall. 5. Ask for more boxes than exist: *Insufficient*, the sale is rejected, stock unchanged. 6. Vendors: open a vendor with the map, pay part of the debt. 7. Register a supplier by pinning the map. 8. Run the rollback demo from `reports.sql`.

## Live link
Host `backend` on any Node host (for example Render, Root Directory `backend`, start command `npm start`) with a hosted MySQL database. Set `DATABASE_URL` (or `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) and `DB_SSL=true` as environment variables, and run `npm run db:setup` once against that database.
