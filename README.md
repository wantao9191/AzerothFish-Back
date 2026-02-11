# AzerothFish Backend

Based on Next.js, Drizzle ORM, and PostgreSQL.

## Setup

1.  **Install Dependencies**:
    Since the automatic initialization failed due to network issues, please run:
    ```bash
    pnpm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory with the following content:
    ```env
    DATABASE_URL="postgres://user:password@localhost:5432/azeroth_fish"
    WX_APP_ID="your_wx_app_id"
    WX_APP_SECRET="your_wx_app_secret"
    ```

3.  **Database Migration**:
    ```bash
    pnpm db:generate
    pnpm db:migrate
    ```

4.  **Run Development Server**:
    ```bash
    pnpm dev
    ```

## API Endpoints

### Login (WeChat)
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**: `{ "code": "wx_login_code" }`

### File Upload
- **URL**: `/api/upload`
- **Method**: `POST`
- **Body**: `FormData` with key `file` (text file).
