# SonicMirror Frontend

This is the frontend for SonicMirror, an AI-powered Spotify stats and insights app built with Next.js 15 and React 19.

## 🚀 Features

- **Spotify Integration**: Connect with your Spotify account to analyze your music taste
- **AI-Powered Insights**: Get roasted, personality analysis, mood detection, and recommendations
- **Beautiful Dashboard**: Visualize your top artists, tracks, genres, and audio features
- **Share & Download**: Share your stats on social media or download as PNG/PDF
- **Responsive Design**: Works great on desktop and mobile

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── analysis/        # Analysis page
│   │   ├── dashboard/       # Main dashboard
│   │   ├── login/           # Login page
│   │   ├── roast/           # Roast page
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/
│   │   └── ui/              # Reusable UI components
│   │       ├── Button.tsx   # Button component
│   │       ├── Card.tsx     # Card component
│   │       ├── Loading.tsx  # Loading/skeleton components
│   │       ├── Modal.tsx    # Modal component
│   │       ├── ErrorBoundary.tsx # Error handling
│   │       └── Tooltip.tsx  # Tooltip component
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Authentication hook
│   │   ├── useSpotifyData.ts # Spotify data fetching
│   │   └── useLLMFeatures.ts # AI feature hooks
│   ├── lib/                 # Utilities and services
│   │   ├── api.ts           # API service layer
│   │   ├── config.ts        # Configuration
│   │   └── utils.ts         # Utility functions
│   ├── types/               # TypeScript types
│   │   └── spotify.ts       # Spotify-related types
│   └── pages/               # Legacy pages (for compatibility)
└── public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.4
- **React**: React 19
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Charts**: Recharts
- **PDF Export**: jsPDF + dom-to-image-more
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend server running (see backend README)

### Installation

```bash
# Install dependencies
npm install

# Create environment file (optional - defaults work for local dev)
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file for custom configuration:

```env
# Backend API URL (default: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Enable debug logging
NEXT_PUBLIC_DEBUG=false
```

## 📦 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🎨 Component Library

The project includes a set of reusable UI components:

### Button
```tsx
import { Button } from '@/components/ui';

<Button variant="spotify" size="lg" loading={isLoading}>
  Connect Spotify
</Button>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card color="purple">
  <CardHeader>
    <CardTitle>Top Artists</CardTitle>
  </CardHeader>
  <CardContent>
    {/* content */}
  </CardContent>
</Card>
```

### Loading States
```tsx
import { Spinner, LoadingPage, CardSkeleton } from '@/components/ui';

<Spinner size="lg" />
<LoadingPage message="Fetching your music..." />
<CardSkeleton />
```

## 🪝 Custom Hooks

### useAuth
```tsx
import { useAuth } from '@/hooks';

const { isAuthenticated, login, logout, checkAuth } = useAuth();
```

### useSpotifyData
```tsx
import { useSpotifyData } from '@/hooks';

const { 
  profile, 
  topArtists, 
  topTracks, 
  isLoading 
} = useSpotifyData(accessToken);
```

### useLLMFeatures
```tsx
import { useLLMFeatures } from '@/hooks';

const { 
  getRoast, 
  roast, 
  isLoadingRoast 
} = useLLMFeatures();
```

## 🚀 Deployment

### Render (Recommended)

1. Connect your repository to Render
2. Create a new Web Service
3. Set build command: `npm run build`
4. Set start command: `npm run start`
5. Add environment variables as needed

### Vercel

```bash
npm i -g vercel
vercel
```

## 📄 License

MIT

