# Bachelor Thesis Project - Plant Database & Management System

Title: "Entwicklung einer softwaregestützten Bewässerungserinnerung für Pflanzen auf Büroflächen mit Desk-Sharing"

## 📋 Project Structure

```
├── Backend/          # Node.js/TypeScript backend with Slack integration
├── Frontend/         # Next.js frontend applications
│   └── src/frontend/
│       └── plant-db/ # Main plant database web app
└── README.md
```

## 🚀 Quick Setup

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Supabase** account
- **Slack** workspace (for bot integration)

### 1. Clone the Repository

```bash
git clone https://github.com/basecom/2025-Bachelorarbeit-Jacob-Flender.git
cd 2025-Bachelorarbeit-Jacob-Flender
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install

# Install plant-db app dependencies
cd src/frontend/plant-db
npm install
```

### 3. Environment Configuration

The project uses `.env` files for configuration. Copy the provided example templates and replace the anonymized values with your actual credentials:

```bash
# Copy example files to actual .env files
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
cp Frontend/src/frontend/plant-db/.env.local.example Frontend/src/frontend/plant-db/.env.local
```

Then edit each `.env` file and replace the **ANONYMIZED** values with your actual:

#### Required Credentials:
- **Supabase Project URL** (from your Supabase dashboard)
- **Supabase Anon Key** (from Settings > API in Supabase)
- **Supabase Service Role Key** (from Settings > API in Supabase)
- **Slack Bot Token** (from your Slack app configuration)
- **Slack Signing Secret** (from your Slack app configuration)

⚠️ **Important**: All example values are anonymized and will not work. You must replace them with real credentials.

## 🗄️ Database Setup

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys from Settings > API
3. Set up your database schema using the Supabase SQL editor or migrations

### Required Tables
- `plants` - Plant information and metadata
- `plant_instances` - Individual plant instances
- `plant_care` - Care records and watering schedules
- `locations` - Physical locations and floors
- `employees` - User/employee information

## 🏃‍♂️ Running the Application

### Development Mode

#### Start Backend Services
```bash
cd Backend
npm run dev
# or
tsx src/backend/api/server.ts
```

#### Start Frontend Plant-DB App
```bash
cd Frontend/src/frontend/plant-db
npm run dev
```

The applications will be available at:
- **Plant-DB Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (or configured port)

### Production Mode

```bash
# Build the applications
cd Frontend/src/frontend/plant-db
npm run build
npm start

cd ../../../Backend
npm run build
npm start
```

## 📱 Features

### Plant Management
- Add, edit, and delete plants
- Track plant instances and locations
- Upload and manage plant images
- Monitor plant care schedules

### Automated Watering System
- Scheduled watering task generation
- Slack notifications for watering reminders
- Employee assignment and tracking
- Care history logging

### Slack Integration
- Bot commands for plant management
- Automated notifications
- Employee interaction tracking

### Modern UI
- Responsive design with Tailwind CSS
- Dark/light theme support
- Real-time updates
- Image upload and management

## 🛠️ Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Supabase** for database and authentication
- **Slack Bolt SDK** for bot integration
- **Next.js API routes** for backend services

### Frontend
- **Next.js 15** with **React 19**
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Supabase client** for data fetching

## 📝 Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

### Frontend (Plant-DB)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Slack Bot Setup
1. Create a new Slack app at [api.slack.com](https://api.slack.com)
2. Configure bot permissions and scopes
3. Install the app to your workspace
4. Add bot token to environment variables

### Supabase Configuration
1. Set up RLS (Row Level Security) policies
2. Configure authentication providers if needed
3. Set up storage buckets for image uploads
4. Configure database functions and triggers

## 🐛 Troubleshooting

### Common Issues

**Dependencies not installing:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Environment variables not loading:**
- Ensure `.env` files are in the correct directories
- Restart the development servers after changing env variables
- Check that variable names match exactly (case-sensitive)

**Database connection issues:**
- Verify Supabase project URL and keys
- Check network connectivity
- Ensure RLS policies allow access

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Slack Bolt SDK](https://slack.dev/bolt-js/concepts)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of a bachelor thesis and is for educational purposes.

---

**Author**: Jacob Flender  
**Institution**: Basecom  
**Year**: 2025
