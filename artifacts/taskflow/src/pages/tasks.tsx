import { useState } from "react";
import { 
  useGetTasks, 
  useGetMyTasks, 
  useDeleteTask,
  useUpdateTaskStatus,
  getGetTasksQueryKey,
  getGetMyTasksQueryKey,
  TaskStatus,
  GetTasksDueFilter,
  GetTasksStatus
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, isPast, isToday } from "date-fns";
import { 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
};

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<GetTasksStatus | "all">("all");
  const [dueFilter, setDueFilter] = useState<GetTasksDueFilter | "all">("all");
  const [search, setSearch] = useState("");

  const params = {
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(dueFilter !== "all" ? { due_filter: dueFilter } : {})
  };

  const { data: allTasks, isLoading: allTasksLoading } = useGetTasks(params, { 
    query: { enabled: isAdmin } as any
  });
  
  const { data: myTasks, isLoading: myTasksLoading } = useGetMyTasks(
    statusFilter !== "all" ? { status: statusFilter as GetTasksStatus } : {}, 
    { query: { enabled: !isAdmin } as any }
  );

  const deleteTaskMutation = useDeleteTask();
  const updateStatusMutation = useUpdateTaskStatus();

  const isLoading = isAdmin ? allTasksLoading : myTasksLoading;
  const rawTasks = isAdmin ? allTasks : myTasks;
  
  // Client-side search and filtering for things the API doesn't support well yet
  const tasks = rawTasks?.filter(task => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase()) && !task.description?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (!isAdmin && dueFilter !== "all") {
      if (dueFilter === "no_deadline" && task.due_date) return false;
      if (dueFilter === "today" && (!task.due_date || !isToday(new Date(task.due_date)))) return false;
      if (dueFilter === "overdue" && (!task.due_date || !isPast(new Date(task.due_date)) || isToday(new Date(task.due_date)))) return false;
    }
    return true;
  }) || [];

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    deleteTaskMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Task deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Failed to delete task", description: (err as any).data?.error, variant: "destructive" });
      }
    });
  };

  const handleStatusChange = (id: number, status: TaskStatus) => {
    updateStatusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Failed to update status", description: (err as any).data?.error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isAdmin ? "All Tasks" : "My Tasks"}</h1>
          <p className="text-muted-foreground">Manage and track your execution pipeline.</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/tasks/new">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Link>
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-lg p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dueFilter} onValueChange={(v: any) => setDueFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Due Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Time</SelectItem>
              <SelectItem value="today">Due Today</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="no_deadline">No Deadline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-lg shadow-sm border-dashed">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No tasks found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            {search || statusFilter !== "all" || dueFilter !== "all" 
              ? "Try adjusting your filters to see more results." 
              : isAdmin 
                ? "Create your first task to get the team started." 
                : "You don't have any tasks assigned to you right now."}
          </p>
          {isAdmin && tasks.length === 0 && !search && statusFilter === "all" && dueFilter === "all" && (
            <Button asChild className="mt-4">
              <Link href="/tasks/new">Create Task</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_150px_150px_120px_50px] gap-4 p-4 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            <div>Task</div>
            <div>Assignee</div>
            <div>Due Date</div>
            <div>Status</div>
            <div className="text-center"></div>
          </div>
          <div className="divide-y">
            {tasks.map(task => {
              const StatusIcon = statusConfig[task.status].icon;
              const isTaskOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';
              
              return (
                <div key={task.id} className="flex flex-col md:grid md:grid-cols-[1fr_150px_150px_120px_50px] gap-2 md:gap-4 p-4 group hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</div>
                    )}
                    {/* Mobile meta row */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 md:hidden">
                      <Badge variant="outline" className={`${statusConfig[task.status].color} border gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[task.status].label}
                      </Badge>
                      {task.due_date && (
                        <span className={`text-xs ${isTaskOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {format(new Date(task.due_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span className="text-xs text-muted-foreground">{task.assigned_to_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:block text-sm text-muted-foreground truncate">
                    {task.assigned_to_name || "Unassigned"}
                  </div>
                  <div className="hidden md:block text-sm">
                    {task.due_date ? (
                      <span className={isTaskOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 italic">None</span>
                    )}
                  </div>
                  <div className="hidden md:block">
                    <Badge variant="outline" className={`${statusConfig[task.status].color} border gap-1 w-full justify-center`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'pending')} disabled={task.status === 'pending' || updateStatusMutation.isPending}>
                          Mark Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')} disabled={task.status === 'in_progress' || updateStatusMutation.isPending}>
                          Mark In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'completed')} disabled={task.status === 'completed' || updateStatusMutation.isPending}>
                          Mark Completed
                        </DropdownMenuItem>
                        
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/tasks/${task.id}/edit`}>
                                <Edit className="w-4 h-4 mr-2" /> Edit Task
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}