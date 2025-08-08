"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const Schema = z.object({
    parentPageId: z.string().min(1, "Parent Page ID is required"),
    calendarDatabaseId: z.string().min(1, "Calendar Database ID is required"),
});

type FormValues = z.infer<typeof Schema>;

export function SyncForm({ loading, onCancel, onSubmit, defaultValues: initialValues }: { loading: boolean; onCancel: () => void; onSubmit?: (values: FormValues) => Promise<void> | void; defaultValues?: Partial<FormValues> }) {
    const form = useForm<FormValues>({
        resolver: zodResolver(Schema),
        defaultValues: { parentPageId: "", calendarDatabaseId: "" },
    });

    useEffect(() => {
        form.reset({
            parentPageId: initialValues?.parentPageId || "",
            calendarDatabaseId: initialValues?.calendarDatabaseId || "",
        });
    }, [initialValues, form]);

    const handleSubmit = async (values: FormValues) => {
        await onSubmit?.(values);
    };

    return (
        <Form {...form}>
            <form className="w-full border border-gray-200 bg-white/70 p-4" autoComplete="off" onSubmit={form.handleSubmit(handleSubmit)}>
                <div className="space-y-4">
                    <FormField control={form.control} name="parentPageId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parent Page ID *</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter parent page ID"
                                        className="focus-visible:ring-1 focus-visible:ring-gray-300"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="calendarDatabaseId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Calendar Database ID *</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter calendar database ID"
                                        className="focus-visible:ring-1 focus-visible:ring-gray-300"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" className="h-9 px-3" onClick={onCancel} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" className="h-9 px-3" disabled={loading}>
                            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sync</> : 'Sync'}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}