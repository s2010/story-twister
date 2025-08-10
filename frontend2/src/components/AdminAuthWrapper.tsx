import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface AdminAuthWrapperProps {
  children: React.ReactNode;
}

export default function AdminAuthWrapper({ children }: AdminAuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      try {
        // Verify token is still valid by testing API call
        const response = await fetch(
          "http://localhost:8001/api/v1/admin/dashboard",
          {
            headers: {
              "X-Admin-Token": token,
            },
          },
        );

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid, remove it and redirect to login
          localStorage.removeItem("adminToken");
          navigate("/admin/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-pixel text-lg mb-2">
            Checking authentication...
          </div>
          <div className="font-mono text-sm text-muted-foreground">
            Please wait
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
