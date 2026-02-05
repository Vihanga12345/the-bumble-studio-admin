
import React from 'react';
import { Link } from 'react-router-dom';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  const { isAuthenticated } = useERPAuth();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center animate-fade-in">
      <h1 className="text-7xl font-bold text-muted-foreground mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="gap-2">
        <Link to={isAuthenticated ? "/" : "/login"}>
          <Home size={18} />
          {isAuthenticated ? "Back to Dashboard" : "Back to Login"}
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
