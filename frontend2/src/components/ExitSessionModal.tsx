import { useNavigate, useSearchParams } from "react-router-dom";
import { X, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExitSessionModalProps {
  teamId: string;
}

export function ExitSessionModal({ teamId }: ExitSessionModalProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSessionEnded = searchParams.get("ended") === "true";

  const handleExitClick = () => {
    setSearchParams({ ended: "true" });
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  const handleModalClose = () => {
    if (!isSessionEnded) {
      setSearchParams({});
    }
  };

  return (
    <>
      {/* Session Ended Modal */}
      <Dialog open={isSessionEnded} onOpenChange={handleModalClose}>
        <DialogContent
          className="max-w-[90vw] max-h-[50vh] rounded-xl p-6"
          aria-modal="true"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleModalClose();
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            handleModalClose();
          }}
        >
          <DialogHeader className="text-center space-y-3">
            <DialogTitle className="text-lg font-pixel text-foreground">
              Session Ended
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-muted-foreground">
              This session is no longer active.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleBackToHome}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-3 rounded-lg font-medium transition-all touch-button"
              style={{ minHeight: "44px" }}
              autoFocus
            >
              Back to Home
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
