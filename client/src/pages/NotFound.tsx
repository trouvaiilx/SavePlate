import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="max-w-sm w-full border border-border p-8 text-center bg-white shadow-sm">
        <FileQuestion size={36} className="text-muted-foreground mx-auto mb-4" />
        <h1 className="font-serif text-2xl text-foreground mb-2">Page Not Found</h1>
        <p className="text-sm text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-full h-11 bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          
          <Link 
            to={isAuthenticated ? "/dashboard" : "/login"}
            className="w-full h-11 border border-input bg-white text-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <Home size={16} /> {isAuthenticated ? "Return to Dashboard" : "Return to Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
