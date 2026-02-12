import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Components & Pages
import Shell from "@/components/layout/Shell";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import SessionView from "@/pages/SessionView";
import JoinSession from "@/pages/JoinSession";
import ImportWizard from "@/pages/ImportWizard";
import { Loader2 } from "lucide-react";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/join">
        <Shell><JoinSession /></Shell>
      </Route>
      <Route path="/dashboard">
        <PrivateRoute component={() => <Shell><Dashboard /></Shell>} />
      </Route>
      <Route path="/import">
        <PrivateRoute component={() => <Shell><ImportWizard /></Shell>} />
      </Route>
      <Route path="/session/:id">
        {(params) => (
          <PrivateRoute component={() => <Shell><SessionView /></Shell>} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
