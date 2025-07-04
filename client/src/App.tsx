import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useGlobalLoading } from "./hooks/useGlobalLoading";
import Home from "./pages/home";
import NotFound from "./pages/not-found";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import PaymentSuccess from "./pages/payment-success";
import PaymentCancel from "./pages/payment-cancel";
import Dashboard from "./pages/dashboard";
import SettingsPage from "./pages/settings";
import AgentChatPage from "./pages/agent-chat";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import AIAgenticSetupPage from "./pages/ai-agentic-setup";
import LeadQualificationTestPage from "./pages/lead-qualification-test";

import ScrollToTop from "./components/ScrollToTop";
import { Toaster } from "./components/ui/toaster";

function Router() {
  const { isInitialLoading, setAppReady } = useGlobalLoading();

  // Mark app as ready once Router is mounted and React is initialized
  useEffect(() => {
    if (isInitialLoading) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setAppReady();
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, setAppReady]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/dashboard/settings" component={SettingsPage} />
      <Route path="/dashboard/ai-agents" component={AgentChatPage} />
      <Route
        path="/dashboard/ai-agentic-setup"
        component={AIAgenticSetupPage}
      />
      <Route
        path="/dashboard/lead-qualification-test"
        component={LeadQualificationTestPage}
      />
      <Route path="/owner/dashboard" component={OwnerDashboardPage} />
      <Route path="/dashboard" component={Dashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ScrollToTop />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
