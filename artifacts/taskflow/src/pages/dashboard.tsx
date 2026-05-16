import { useGetDashboardStats, useGetRecentActivity, ActivityItemStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  ListTodo, 
  Users,
  Bell
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const statusConfig: Record<ActivityItemStatus, { label: string; color: string; icon: any }> = {
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-500", icon: Clock },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-500", icon: AlertCircle },
};

function StatCard({ title, value, icon: Icon, description }: { title: string, value: number | string, icon: any, description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  if (statsLoading || activityLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.full_name}. Here's an overview of your workspace.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Tasks" 
          value={stats.total_tasks} 
          icon={ListTodo} 
          description={`${stats.completed} completed, ${stats.in_progress} in progress`}
        />
        <StatCard 
          title="Due Today" 
          value={stats.due_today} 
          icon={Calendar} 
          description={stats.overdue > 0 ? `${stats.overdue} tasks overdue` : 'All caught up on past tasks'}
        />
        {isAdmin ? (
          <StatCard 
            title="Team Members" 
            value={stats.total_employees || 0} 
            icon={Users} 
            description="Active employees"
          />
        ) : (
          <StatCard 
            title="Pending Actions" 
            value={stats.pending} 
            icon={AlertCircle} 
            description="Tasks waiting to be started"
          />
        )}
        <StatCard 
          title="Notifications" 
          value={stats.unread_notifications || 0} 
          icon={Bell} 
          description={stats.unread_notifications === 0 ? "You're all caught up" : "Requires attention"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 border-muted/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-muted/40">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!activity || activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity to show
              </div>
            ) : (
              <div className="space-y-6">
                {activity.map((item, i) => {
                  const StatusIcon = statusConfig[item.status].icon;
                  return (
                    <div key={item.id} className="flex items-start gap-4">
                      <div className={`mt-0.5 rounded-full p-1.5 ${statusConfig[item.status].color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          <Link href="/tasks" className="hover:underline hover:text-primary">
                            {item.task_title}
                          </Link>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isAdmin ? (
                            <>Updated to <span className="font-medium text-foreground">{statusConfig[item.status].label}</span> by {item.assigned_to_name || "Unassigned"}</>
                          ) : (
                            <>Status changed to <span className="font-medium text-foreground">{statusConfig[item.status].label}</span></>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(item.updated_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-1 border-muted/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-muted/40">
            <CardTitle className="text-base font-semibold">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
            {/* Visual representation of stats instead of relying on external charts for speed */}
            <div className="w-full max-w-xs space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-emerald-500 font-medium"><CheckCircle2 className="w-4 h-4"/> Completed</span>
                  <span className="font-bold">{stats.completed}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total_tasks > 0 ? (stats.completed / stats.total_tasks) * 100 : 0}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-blue-500 font-medium"><Clock className="w-4 h-4"/> In Progress</span>
                  <span className="font-bold">{stats.in_progress}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.total_tasks > 0 ? (stats.in_progress / stats.total_tasks) * 100 : 0}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-amber-500 font-medium"><AlertCircle className="w-4 h-4"/> Pending</span>
                  <span className="font-bold">{stats.pending}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.total_tasks > 0 ? (stats.pending / stats.total_tasks) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}