import { useAuth } from "react-oidc-context";
import Dashboard from "./Dashboard";

export default function App() {
  const auth = useAuth();

  // Loading state
  if (auth.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 text-lg">
        Loading...
      </div>
    );
  }

  // Error state
  if (auth.error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-red-500">Error: {auth.error.message}</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white shadow-lg rounded-2xl p-10 w-[380px] text-center">
          <h1 className="text-3xl font-semibold text-gray-800">
            YOLOv12 Cloud
          </h1>

          <p className="text-gray-500 mt-3">
            Please sign in to access image analysis and inference services.
          </p>

          <button
            onClick={() => auth.signinRedirect()}
            className="mt-8 w-full py-3 rounded-xl bg-blue-600 text-white text-lg hover:bg-blue-700 transition"
          >
            Sign in with Cognito
          </button>
        </div>

        <p className="text-gray-400 mt-8 text-sm">
          Secure Login • Powered by AWS Cognito
        </p>
      </div>
    );
  }

  return (
    <Dashboard
      userEmail={auth.user?.profile.email}
      onSignOut={() => auth.signoutRedirect()}
    />
  );
}
