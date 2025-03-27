# Flight Booking System

A modern flight booking system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- User authentication (sign up, sign in, sign out)
- Flight search with filters
- Flight booking with passenger details
- Booking management
- Responsive design

## Prerequisites

- Node.js 16+ and npm
- Supabase account and project

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/keshavashiya/thena.git
cd thena
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env.local` file with your Supabase credentials
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

4. Create the SQL execution function in Supabase
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the following SQL to create the function needed for migrations:
   ```sql
   CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
   RETURNS void AS $$
   BEGIN
     EXECUTE sql_string;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

5. Create database tables using the migration script
```bash
npm run migrate
```

6. Seed the database with sample data
```bash
npm run seed
```

7. Start the development server
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

The application uses Supabase as its backend. The database schema consists of the following tables:

- `airports`: Stores airport information
- `flights`: Stores flight details
- `bookings`: Stores booking information
- `passengers`: Stores passenger details

You can modify the database schema by editing the migration file at `src/lib/migrations/create_tables.sql`.

## Authentication

Authentication is handled using NextAuth.js integrated with Supabase Auth. Users can:

1. Sign up with email and password
2. Sign in with existing credentials
3. Access protected routes when authenticated

## Deployment

The application can be deployed to Vercel:

```bash
npm run build
npm run start
```

## License

[MIT](LICENSE)