import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Key } from "lucide-react";
import {
  PixelButton,
  PixelCard,
  PixelCardHeader,
  PixelCardTitle,
  PixelCardContent,
  PageContent,
} from "@/ui";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [loginMethod, setLoginMethod] = useState<"credentials" | "token">(
    "token",
  );
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTokenLogin = async () => {
    if (!adminToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter your admin token.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Test the token by making a simple API call
      const response = await fetch(
        "http://localhost:8001/api/v1/admin/dashboard",
        {
          headers: {
            "X-Admin-Token": adminToken.trim(),
          },
        },
      );

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem("adminToken", adminToken.trim());
        toast({
          title: "Login Successful",
          description: "Welcome to the admin console!",
        });
        navigate("/admin/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid admin token. Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the admin API. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Credentials Required",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement JWT login endpoint
      toast({
        title: "Not Implemented",
        description:
          "Username/password login is not yet implemented. Please use token login.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContent>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <PixelCard>
            <PixelCardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
              </div>
              <PixelCardTitle className="font-pixel text-2xl">
                Admin Login
              </PixelCardTitle>
              <p className="text-muted-foreground font-mono text-sm mt-2">
                Access the Story-Twister admin console
              </p>
            </PixelCardHeader>

            <PixelCardContent className="p-6">
              {/* Login Method Toggle */}
              <div className="flex gap-2 mb-6">
                <PixelButton
                  variant={loginMethod === "token" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLoginMethod("token")}
                  className="flex-1"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Token
                </PixelButton>
                <PixelButton
                  variant={
                    loginMethod === "credentials" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setLoginMethod("credentials")}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Credentials
                </PixelButton>
              </div>

              {/* Token Login Form */}
              {loginMethod === "token" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-sm font-medium mb-2">
                      Admin Token
                    </label>
                    <input
                      type="password"
                      value={adminToken}
                      onChange={(e) => setAdminToken(e.target.value)}
                      placeholder="Enter your admin token"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleTokenLogin()
                      }
                    />
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      Development token: dev-admin-token
                    </p>
                  </div>

                  <PixelButton
                    onClick={handleTokenLogin}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Authenticating..." : "Login with Token"}
                  </PixelButton>
                </div>
              )}

              {/* Credentials Login Form */}
              {loginMethod === "credentials" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-sm font-medium mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-sm font-medium mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleCredentialsLogin()
                      }
                    />
                  </div>

                  <PixelButton
                    onClick={handleCredentialsLogin}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Authenticating..." : "Login"}
                  </PixelButton>

                  <p className="text-xs text-muted-foreground font-mono text-center">
                    Default: admin / ChangeMe123!
                  </p>
                </div>
              )}

              {/* Back to Home */}
              <div className="mt-6 pt-4 border-t border-border">
                <PixelButton
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Back to Home
                </PixelButton>
              </div>
            </PixelCardContent>
          </PixelCard>
        </div>
      </div>
    </PageContent>
  );
}
