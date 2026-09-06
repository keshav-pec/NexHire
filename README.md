# NexHire — AI Mock Interview Platform

NexHire is an AI-powered mock interview platform designed to help candidates practice, prepare, and perfect their interviewing skills. By leveraging 3D graphics, NexHire simulates real-world interview scenarios with a lifelike AI interviewer, providing users with objective, actionable feedback to enhance their career readiness.

## ✨ Key Features

- **Immersive 3D AI Interviewer**: Engage with a lifelike 3D avatar that conducts the interview, making the practice session feel incredibly realistic.
- **Powered by Google Gemini**: Advanced natural language processing capabilities allow the AI to ask relevant questions, follow up dynamically, and evaluate responses objectively.
- **Comprehensive Analytics & Feedback**: Receive detailed post-interview evaluations and track your progress over time through intuitive learning curves.
- **Secure Authentication & Session Management**: Secure user registration, login, and interview history tracking so you can pick up where you left off.
- **Responsive & Modern UI**: A sleek, accessible, and fast frontend built with the latest web technologies.

## 🔄 User Workflow

1. **Sign Up / Log In**: Users create a secure account or log into an existing one to access their personalized dashboard.
2. **Start an Interview**: From the dashboard, users initiate a new mock interview session.
3. **Practice**: Users interact with the 3D AI interviewer, answering questions verbally. The AI adapts dynamically to user responses.
4. **Get Evaluated**: Once the interview concludes, the platform processes the session using the Gemini API to provide objective feedback, highlighting strengths and areas for improvement.
5. **Track Progress**: Users can review past sessions and visualize their improvement over time using the platform's detailed reports and learning curves.

## 🛠️ Tech Stack

NexHire is structured as a full-stack monorepo with the following technologies:

### **Frontend**
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (Custom Design System)
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Data Visualization**: Recharts
- **Routing**: React Router DOM v7
- **AI Integration**: `@google/genai`

### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **AI Integration**: `@google/genai`

---

## 🚀 Quick Start Guide

### 1. Configure the Backend

Navigate to the `backend` directory and set up your environment variables:

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in your details:
- `MONGODB_URI`: Your MongoDB connection string.
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `JWT_SECRET`: A secure secret key for token signing.
- `PORT`: (Optional) Defaults to `8056`.

### 2. Start the Backend Server

Install dependencies and start the Express REST API:

```bash
cd backend
npm install
npm run dev
```
*The backend will run on `http://localhost:8056`*

### 3. Start the Frontend Application

Navigate to the `frontend` directory, install dependencies, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```
*The frontend will run on `http://localhost:3056`*

---

## 📡 API Routes Reference

| Method | Route | Auth Required | Description |
|--------|-------|---------------|-------------|
| **POST** | `/api/auth/register` | No | Register a new user account |
| **POST** | `/api/auth/login` | No | Authenticate user and return JWT |
| **GET** | `/api/auth/me` | Yes | Retrieve the currently authenticated user profile |
| **GET** | `/api/gemini/key` | Yes | Securely fetch the Gemini API key for client-side use |
| **POST** | `/api/interviews` | Yes | Initialize a new interview session |
| **GET** | `/api/interviews` | Yes | List all historical sessions for the current user |
| **PATCH** | `/api/interviews/:id` | Yes | Update an ongoing or completed session's status |
| **GET** | `/api/health` | No | Backend health check endpoint |
