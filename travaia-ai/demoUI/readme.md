High-Level Architecture
The demoUI is a single-page application (SPA) built with React and Vite. Its primary purpose is to provide a development and testing interface for the AI agent. It communicates with the backend via a series of REST API calls, which are proxied by the Vite development server to the live backend service.

2. Key Files Involved
demoUI/.env.local: Stores the Firebase credentials as environment variables (e.g., VITE_FIREBASE_API_KEY). This keeps secrets out of the source code.
demoUI/src/firebase.ts: Reads the environment variables from .env.local and uses them to initialize and configure the connection to your Firebase project. It exports the auth object that is used for authentication.
demoUI/src/App.tsx: The heart of the application. It's a stateful component that manages the user's authentication status, session details (userId, sessionId), chat messages, and the connection to the backend.
demoUI/src/components/LoginPage.tsx: The first component a user sees. It contains the "Sign in with Google" button and handles the initial authentication.
demoUI/src/components/ChatMessagesView.tsx: The main chat interface where all interactions are displayed.
demoUI/src/components/InputForm.tsx: The text input field where the user types their prompts.
3. Step-by-Step Data Flow
Step 1: Authentication
Initial Load: When you first load the demoUI, the App.tsx component mounts. Its useEffect hook immediately subscribes to Firebase's onAuthStateChanged listener.
Check Auth State: This listener checks if Firebase has a cached user session.
If NOT logged in: The user state in App.tsx remains null. The component renders the <LoginPage />.
If already logged in: The listener receives the user object from Firebase, updates the state, and the app proceeds directly to the main interface, which is why you weren't seeing the login page initially.
User Login: The user clicks the "Sign in with Google" button in the LoginPage.
This triggers the handleLogin function, which uses signInWithPopup from the Firebase SDK to open the Google login window.
Upon successful authentication, the onAuthStateChanged listener in App.tsx fires again with the new user object.
The user state is updated, and the LoginPage is replaced by the main application UI.
Step 2: Session Creation
First Message: The first time the user sends a message (via the handleSubmit function in App.tsx), the application checks if it has a sessionId. Since it's the first message, it doesn't.
API Request: It then calls the createSession function. This function makes a POST request to the backend:
Endpoint: /api/apps/app/users/{user.uid}/sessions
user.uid: This is the critical part. The uid is the unique ID of the authenticated user, dynamically retrieved from the Firebase user object.
Backend Response: The backend receives this request, creates a new session associated with the user's uid, and returns a JSON object containing the newly created sessionId, the userId (which it gets from the URL), and the appName.
State Update: The demoUI receives this response and uses setSessionId, setUserId, and setAppName to store these details in the App.tsx component's state for all future requests in this session.
Step 3: Sending a Chat Message
User Input: The user types a message into the InputForm and hits send. This triggers the handleSubmit function in App.tsx.
API Request: handleSubmit now has a valid session. It makes a POST request to the /api/run_sse endpoint to send the prompt to the agent.
Data Sent: The body of this request is a JSON object with the following structure:
{
  "appName": "app",
  "userId": "...", // The user's Firebase UID
  "sessionId": "...", // The session ID received from the backend
  "newMessage": {
    "parts": [{ "text": "Your prompt here" }],
    "role": "user"
  },
  "streaming": false // This should likely be true for SSE
}
4. Receiving and Presenting Information (Server-Sent Events)
The backend does not send back a single response. Instead, it streams back a series of Server-Sent Events (SSE) as the AI agent works through the problem. The demoUI listens for these events and updates the UI in real-time.

Event Stream: The handleSubmit function uses the fetch API to open a connection that stays open, receiving events from the /api/run_sse endpoint.
Processing Events: Each event is a chunk of data. The processSseEventData function in App.tsx is responsible for parsing these events. Each event is a JSON object that typically contains an author (the name of the agent that sent it) and a content payload.
Real-time UI Updates: Based on the author and content of each event, the UI is updated dynamically:
Agent Steps (Timeline): If the event is from an agent like plan_generator or section_researcher, its content is not displayed as a chat message. Instead, it's added to the messageEvents map. This map is passed to the <ActivityTimeline /> component, which renders the step-by-step progress of the AI's "thought process."
"Thinking..." Indicator: While isLoading is true, a "Thinking..." spinner is displayed at the bottom of the chat.
Final Answer: When an event comes from an agent like interactive_planner_agent or report_composer_with_citations, the text from its content.parts is accumulated and displayed directly in the main AI message bubble in the ChatMessagesView.
Citations and Reports: If the final event contains a fully composed report with <cite> tags, the citation_replacement_callback (on the backend, but the result is streamed) turns these into clickable Markdown links, which are then rendered correctly in the UI.
Website Count: Events from research agents can update the websiteCount state, which is displayed in the UI to show how many sources the agent has consulted.
This entire process creates a rich, real-time view into the agent's operations, providing much more than a simple "request-response" chat.