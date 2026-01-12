# ThaiSave App (Platform for Disaster Response)

This is a Next.js application for ThaiSave, a platform for reporting and managing disaster incidents.

## 🛠 Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** JavaScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Firebase (Firestore, Authentication, Storage)
- **Maps:** Leaflet / React-Leaflet
- **Charts:** Recharts

## 📋 Prerequisites
- **Node.js**: Version 18.17.0 or higher
- **npm**: Version 9.6.0 or higher

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd thaisave-app
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add the following variables.
> **Note:** Obtain these keys from the Firebase Console and Hugging Face.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |

### 4. Run Locally
To start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Build & Deployment

### Build for Production
```bash
npm run build
```
This command compiles the application into the `.next` folder.

### Start Production Server
```bash
npm start
```
Runs the built application on the default port (3000).

## 📂 Project Structure

```bash
├── public/              # Static assets (images, icons)
├── src/
│   ├── app/             # Next.js App Router pages & layouts
│   ├── components/      # Reusable React components
│   ├── context/         # React Context (AuthContext, etc.)
│   ├── lib/             # Utility functions & Firebase config
│   │   ├── firebase/    # Firebase & AI service logic
│   │   └── ...
│   └── ...
├── .env.local           # Environment variables (not committed)
├── next.config.js       # Next.js configuration
├── package.json         # Dependencies and scripts/
└── README.md            # Project documentation
```

## ⚠️ Important Notes for DevOps
- **Node Environment**: Ensure `NODE_ENV=production` is set when running `npm start`.
- **Firebase Config**: The Firebase Admin SDK/Security Rules are not part of this client-side repo but are required for proper backend enforcement.
- **Port:** The application runs on port `3000` by default. Can be changed using `PORT=8080 npm start`.
