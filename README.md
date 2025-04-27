# Explorify - Mobile Travel Exploration App

Explorify is a mobile application that allows users to explore attractions around the world and interact with other travelers. Through map browsing, social interaction, and real-time chat features, it provides users with a comprehensive travel experience.

## Main Features

- **Map Exploration**: Browse and discover tourist attractions on an interactive map
- **User Community**: View and comment on other users' travel experiences
- **Real-time Chat**: Communicate directly with other travelers about travel experiences
- **Profile Management**: Manage your personal information and travel experiences
- **Post Creation**: Share your travel stories and photos
- **Favorites Function**: Save places and posts you're interested in

## Technology Stack

- **Frontend Framework**: React Native with Expo
- **Routing**: Expo Router
- **Map Services**: React Native Maps and MapLibre
- **Backend Services**: Supabase (Authentication, Database, Storage)
- **State Management**: React Context API
- **UI Components**: Expo component library and @rneui/themed

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Expo CLI
- Android Studio or iOS Simulator (optional, for local development)

### Installation Steps

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd explorify
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Start the application

   ```bash
   npx expo start
   ```

   In the output, you will find the following options to run the application:
   - Development build
   - Android emulator
   - iOS simulator
   - Expo Go (for testing on physical devices)

## Project Structure

```
explorify/
├── app/                  # Main application code
│   ├── (main)/           # Main application routes
│   ├── (admin)/          # Admin panel routes
│   ├── (dev)/            # Development tools routes
│   ├── _layout.jsx       # Application layout
│   ├── index.jsx         # Entry point
│   ├── Login.jsx         # Login page
│   └── Signup.jsx        # Registration page
├── components/           # Reusable components
├── constants/            # Constants and configurations
├── contexts/             # React contexts
├── helpers/              # Helper functions
├── lib/                  # Library files
│   └── supabase.js       # Supabase client configuration
├── services/             # Service APIs
├── types/                # TypeScript type definitions
└── assets/               # Static resources
```

## Supabase Database Configuration

### Database Structure for Messaging Feature

To implement the chat functionality in the application, the following tables and functions need to be configured in Supabase:

#### Table Structure

1. **conversations** - Store conversations
```sql
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

2. **conversation_participants** - Store conversation participants
```sql
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);
```

3. **messages** - Store messages
```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Indexes and Stored Procedures

The application uses multiple indexes and stored procedures to optimize query performance for conversations and messages. For detailed configuration, please refer to the Supabase project settings.

## Contribution Guidelines

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](https://choosealicense.com/licenses/mit/)

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
