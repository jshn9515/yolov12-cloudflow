import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import App from "./App";
import "./index.css";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Q1udERgxq",
  client_id: "1cndv0hnai7i8vtm8llvrincqq",
  redirect_uri: "https://dv0l1l3woumqj.cloudfront.net/callback",
  post_logout_redirect_uri: "https://dv0l1l3woumqj.cloudfront.net/",
  response_type: "code",
  scope: "email openid phone",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
