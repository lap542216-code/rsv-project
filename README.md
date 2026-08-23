# MSV Catering Order Hub

MSV Catering food ordering web application with PostgreSQL, Prisma, Express backend and TanStack Start React frontend.

## Development

### Prerequisites
- Node.js (v18+)
- PostgreSQL instance (Neon / Railway / hosted)

### Setup & Run
1. Start the backend:
   ```sh
   cd server
   npm install
   npx prisma migrate dev
   npm run seed
   npm run dev
   ```

2. Start the frontend:
   ```sh
   npm install
   npm run dev
   ```

## Built with
- TanStack Start & React
- Express & Node.js
- Prisma ORM & PostgreSQL
- Tailwind CSS & Radix UI
