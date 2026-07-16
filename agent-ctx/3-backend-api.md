# Task 3 - Backend API Developer Work Record

## Task
Create authentication system and ALL API routes for the E-Wallet / Financial Tracker backend.

## Files Created

### Library Files
1. **`/src/lib/auth.ts`** - NextAuth v4 configuration
   - Credentials provider (email + password)
   - JWT session strategy
   - Custom JWT and session callbacks to include user id, name, email, role
   - Secret: "ewallet-secret-key-2024"

2. **`/src/lib/auth-helper.ts`** - Authentication helper
   - `getSessionUser()` function using `getServerSession(authOptions)`
   - Returns `{ id, name, email, role }` or null

### Auth API Routes
3. **`/src/app/api/auth/[...nextauth]/route.ts`** - NextAuth handler (GET, POST)
4. **`/src/app/api/auth/register/route.ts`** - User registration (POST)
   - Validates required fields, password length
   - Hashes password with bcryptjs (12 salt rounds)
   - Creates user + wallet (balance 0) + 13 default categories in single Prisma call
   - Default categories: 8 expense + 5 income
5. **`/src/app/api/auth/me/route.ts`** - Get current user (GET, requires auth)

### Transaction API Routes
6. **`/src/app/api/transactions/route.ts`**
   - GET: List with pagination, search, filters (type, categoryId, date range, status, sort)
   - POST: Create transaction + atomic wallet balance update
7. **`/src/app/api/transactions/[id]/route.ts`**
   - GET: Single transaction with category
   - PUT: Update transaction + wallet balance recalculation (atomic)
   - DELETE: Delete transaction + reverse wallet balance change (atomic)

### Category API Routes
8. **`/src/app/api/categories/route.ts`**
   - GET: List categories (optional type filter)
   - POST: Create custom category (validates uniqueness)
9. **`/src/app/api/categories/[id]/route.ts`**
   - PUT: Update category
   - DELETE: Delete category only if no transactions reference it

### Wallet API Route
10. **`/src/app/api/wallet/route.ts`**
    - GET: Get wallet info
    - PUT: Manual balance adjustment

### Stats API Route
11. **`/src/app/api/stats/route.ts`**
    - GET: Financial statistics (total balance, monthly income/expense, daily/monthly charts data, category breakdown, recent transactions)

### Admin API Routes
12. **`/src/app/api/admin/users/route.ts`**
    - GET: List all users with wallet balances and transaction counts (admin only)
13. **`/src/app/api/admin/stats/route.ts`**
    - GET: System-wide statistics (admin only)

## Key Design Decisions
- All wallet balance updates use Prisma `$transaction` for atomicity
- Authentication checked on all routes except register and NextAuth endpoints
- Admin routes enforce role check (403 for non-admins)
- Registration creates user + wallet + 13 default categories in one Prisma create call (no explicit $transaction needed since it's a single nested create)
- Fixed unique constraint issue: income "Lainnya 💵" vs expense "Lainnya 📦" to avoid `@@unique([name, userId])` collision

## Testing Results
- ESLint: 0 errors, 0 warnings
- All endpoints compile and respond correctly
- Registration tested and verified (creates user, wallet, categories)
- Unauthenticated access returns 401 on all protected routes
