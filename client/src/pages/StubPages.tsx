import Navbar from '@/components/Navbar';
import { Bell, BarChart2, UtensilsCrossed } from 'lucide-react';

const Placeholder = ({
  icon: Icon, title, owner, description, iteration,
}: {
  icon: React.FC<{ size: number; className?: string }>;
  title: string; owner: string; description: string; iteration: string;
}) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="pb-5 border-b border-border mb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">{owner}</p>
        <h1 className="font-serif text-3xl">{title}</h1>
      </div>
      <div className="border border-border border-l-4 border-l-muted-foreground/30 px-6 py-12 flex flex-col items-start gap-4">
        <Icon size={28} className="text-muted-foreground" />
        <div>
          <p className="font-semibold text-sm">{iteration}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
        </div>
        <div className="mt-2 border border-border px-3 py-1.5 bg-muted/30">
          <p className="text-xs text-muted-foreground font-mono">Status: <span className="text-amber-700 font-semibold">Planned · Due 23 May 2026</span></p>
        </div>
      </div>
    </div>
  </div>
);

export function Notifications() {
  return <Placeholder
    icon={Bell} title="Notifications" owner="UC5"
    iteration="Coming in Iteration 2"
    description="Expiry alerts, donation status updates, meal planning reminders, and account security notifications."
  />;
}

export function Analytics() {
  return <Placeholder
    icon={BarChart2} title="Food Analytics" owner="UC4"
    iteration="Coming in Iteration 2"
    description="Visual reports on food saved, donations made, and trends filterable by date range and category."
  />;
}

export function MealPlan() {
  return <Placeholder
    icon={UtensilsCrossed} title="Weekly Meal Planner" owner="UC6"
    iteration="Coming in Iteration 2"
    description="Plan meals for the week using your inventory. System suggests recipes based on items nearing expiry."
  />;
}
