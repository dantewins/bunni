"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const Schema = z.object({
    title: z.string().min(1, "Title is required"),
    desc: z.string().optional(),
    time: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

export function TaskForm({ loading, setShowForm, onSubmit }: { loading: boolean; setShowForm: (v: boolean) => void; onSubmit?: (values: FormValues) => Promise<void> | void; }) {
    const form = useForm<FormValues>({
        resolver: zodResolver(Schema),
        defaultValues: { title: "", desc: "", time: "" },
    });

    const handleSubmit = async (values: FormValues) => {
        await onSubmit?.(values);
        form.reset();
    };

    return (
        <Form {...form}>
            <form className={`w-full border border-gray-200 bg-white/70 p-4 ${loading && 'hidden'}`} autoComplete="off" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="space-y-4">
                    <FormField control={form.control} name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title *</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="New task"
                                        className="focus-visible:ring-1 focus-visible:ring-gray-300"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="desc"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Optional details"
                                        className="min-h-24 focus-visible:ring-1 focus-visible:ring-gray-300"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Time</FormLabel>
                                <FormControl>
                                    <Input
                                        type="time"
                                        className="focus-visible:ring-1 focus-visible:ring-gray-300"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" className="h-9 px-3" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="h-9 px-3">
                            Add Task
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
