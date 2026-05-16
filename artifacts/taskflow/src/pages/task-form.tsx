import { useEffect } from "react";
import { 
  useCreateTask, 
  useGetTask, 
  useUpdateTask, 
  useGetUsers,
  getGetTasksQueryKey,
  TaskStatus
} from "@workspace/api-client-react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assigned_to: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});

export default function TaskForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isEditing = Boolean(params.id && params.id !== "new");
  const taskId = isEditing ? parseInt(params.id as string, 10) : 0;

  const { data: users, isLoading: usersLoading } = useGetUsers();
  const { data: task, isLoading: taskLoading } = useGetTask(taskId, {
    query: { enabled: isEditing } as any
  });

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigned_to: "none",
      due_date: "",
      status: "pending",
    },
  });

  useEffect(() => {
    if (task && isEditing) {
      form.reset({
        title: task.title,
        description: task.description || "",
        assigned_to: task.assigned_to ? task.assigned_to.toString() : "none",
        due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "",
        status: task.status,
      });
    }
  }, [task, isEditing, form]);

  function onSubmit(values: z.infer<typeof taskSchema>) {
    const data = {
      title: values.title,
      description: values.description || undefined,
      assigned_to: values.assigned_to && values.assigned_to !== "none" ? parseInt(values.assigned_to, 10) : null,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
      status: values.status as any,
    };

    if (isEditing) {
      updateMutation.mutate({ id: taskId, data }, {
        onSuccess: () => {
          toast({ title: "Task updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          setLocation("/tasks");
        },
        onError: (err) => {
          toast({ title: "Failed to update task", description: (err as any).data?.error, variant: "destructive" });
        }
      });
    } else {
      createMutation.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Task created successfully" });
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          setLocation("/tasks");
        },
        onError: (err) => {
          toast({ title: "Failed to create task", description: (err as any).data?.error, variant: "destructive" });
        }
      });
    }
  }

  if (isEditing && taskLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation("/tasks")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isEditing ? "Edit Task" : "Create Task"}</h1>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Q3 Marketing Report" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Details about this task..." className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="assigned_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setLocation("/tasks")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
