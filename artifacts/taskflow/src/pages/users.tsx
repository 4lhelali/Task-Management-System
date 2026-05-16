import { useState } from "react";
import { 
  useGetUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser,
  getGetUsersQueryKey,
  UserInputRole
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { 
  Users, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ShieldAlert, 
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const userSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  role: z.enum(["admin", "employee"]),
});

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: rawUsers, isLoading } = useGetUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const users = rawUsers?.filter(u => 
    !search || 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: "",
      username: "",
      password: "",
      role: "employee",
    },
  });

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    form.reset({
      full_name: "",
      username: "",
      password: "",
      role: "employee",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setEditingUserId(user.id);
    form.reset({
      full_name: user.full_name,
      username: user.username,
      password: "", // Don't prefill password
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this user? This may affect their assigned tasks.")) return;
    
    deleteUserMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "User deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Failed to delete user", description: (err as any).data?.error, variant: "destructive" });
      }
    });
  };

  const onSubmit = (values: z.infer<typeof userSchema>) => {
    if (editingUserId) {
      const data: any = {
        full_name: values.full_name,
        username: values.username,
        role: values.role as any,
      };
      if (values.password) {
        data.password = values.password;
      }
      
      updateUserMutation.mutate({ id: editingUserId, data }, {
        onSuccess: () => {
          toast({ title: "User updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          setIsDialogOpen(false);
        },
        onError: (err) => {
          toast({ title: "Failed to update user", description: (err as any).data?.error, variant: "destructive" });
        }
      });
    } else {
      if (!values.password) {
        form.setError("password", { message: "Password is required for new users" });
        return;
      }
      
      createUserMutation.mutate({ 
        data: {
          full_name: values.full_name,
          username: values.username,
          password: values.password,
          role: values.role as UserInputRole
        }
      }, {
        onSuccess: () => {
          toast({ title: "User created successfully" });
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          setIsDialogOpen(false);
        },
        onError: (err) => {
          toast({ title: "Failed to create user", description: (err as any).data?.error, variant: "destructive" });
        }
      });
    }
  };

  const isSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage your team access and roles.</p>
        </div>
        <Button onClick={handleOpenNewUser}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-4 shadow-sm">
        <Input 
          placeholder="Search by name or username..." 
          className="max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-lg shadow-sm">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No users found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2">
            Try adjusting your search query.
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_150px_150px_150px_50px] gap-4 p-4 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            <div>User</div>
            <div>Username</div>
            <div>Role</div>
            <div>Joined</div>
            <div className="text-center"></div>
          </div>
          <div className="divide-y">
            {users.map(user => (
              <div key={user.id} className="flex flex-col md:grid md:grid-cols-[1fr_150px_150px_150px_50px] gap-2 md:gap-4 p-4 group hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="font-medium truncate">{user.full_name}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 md:hidden">
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                    <Badge variant="outline" className={`gap-1 text-xs ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                      {user.role === 'admin' ? <ShieldAlert className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                      <span className="capitalize">{user.role}</span>
                    </Badge>
                  </div>
                </div>
                <div className="hidden md:block text-sm text-muted-foreground truncate">
                  @{user.username}
                </div>
                <div className="hidden md:block">
                  <Badge variant="outline" className={`gap-1 ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                    {user.role === 'admin' ? <ShieldAlert className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                    <span className="capitalize">{user.role}</span>
                  </Badge>
                </div>
                <div className="hidden md:block text-sm text-muted-foreground">
                  {format(new Date(user.created_at), 'MMM d, yyyy')}
                </div>
                <div className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUserId ? "New Password (Optional)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={editingUserId ? "Leave blank to keep current" : "Min. 6 characters"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}