import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity, Pill, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const navigate = useNavigate();
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
        <p className="text-sm text-muted-foreground">Common tasks</p>
      </div>
  
      <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:space-y-3 md:gap-0">
        <Button className="w-full justify-center md:justify-start h-auto py-4 md:py-2" variant="outline" onClick={() => navigate("/vitals")}> 
          <Activity className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
          <span className="hidden md:inline">Capture Blood Pressure</span>
        </Button>
        <Button className="w-full justify-center md:justify-start h-auto py-4 md:py-2" variant="outline" onClick={() => navigate("/self-check?tab=symptoms")}> 
          <Plus className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
          <span className="hidden md:inline">Record Symptoms</span>
        </Button>
        <Button className="w-full justify-center md:justify-start h-auto py-4 md:py-2" variant="outline" disabled>
          <Pill className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
          <span className="hidden md:inline">View Medications</span>
        </Button>
        <Button className="w-full justify-center md:justify-start h-auto py-4 md:py-2" variant="outline" onClick={() => navigate("/education")}> 
          <BookOpen className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
          <span className="hidden md:inline">Educational Content</span>
        </Button>
      </div>
    </Card>
  );
};

export default QuickActions;
