"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Table,
    TableCaption,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "./ui/input";
import * as minMaxValues from "@/utils/sharedValues";
import type { PlantCareEntry, ChangedProperties } from "@/types/plantCareEntry";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export default function PlantCareList() {
    const [showTable, setShowTable] = useState(false);
    const [careEntries, setCareEntries] = useState<PlantCareEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [newName, setNewName] = useState("");
    const [newInterval, setNewInterval] = useState<number | null>(null);
    const [newVolume, setNewVolume] = useState<number | null>(null);
    const [newMethod, setNewMethod] = useState("");

    // Button click handler to open table
    const handleOpen = async () => {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/plant-care-update");
        const json = await res.json();
        if (!res.ok) {
            setError(json.error || "Fehler beim Laden der Pflegeprofile.");
            setLoading(false);
            return;
        }
        if (json.data) {
            setCareEntries(
                json.data.map((entry: any) => ({
                    id: entry.id,
                    name: entry.name,
                    interval: entry.interval,
                    method: entry.method,
                    volume: entry.volume,
                }))
            );
        }
        setLoading(false);
        setShowTable(true);
    };

    // Update form submission handler
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId === null) return;

        // Validations
        if (
            newName.trim() &&
            careEntries.some((e) => e.name === newName && e.id !== editingId)
        ) {
            toast.error("Diese Pflanzenart existiert bereits.");
            return;
        }

        if (
            newInterval === null ||
            newInterval < minMaxValues.minInterval ||
            newInterval > minMaxValues.maxInterval
        ) {
            toast.error(
                `Das Gießintervall muss mindestens ${minMaxValues.minInterval} Tag sein und darf maximal ${minMaxValues.maxInterval} Tage betragen.`
            );
            return;
        }

        if (
            newVolume === null ||
            newVolume < minMaxValues.minVolume ||
            newVolume > minMaxValues.maxVolume
        ) {
            toast.error(
                `Das Volumen muss mindestens ${minMaxValues.minVolume} ml und maximal ${minMaxValues.maxVolume} betragen.`
            );
            return;
        }

        // Collect changes
        const updates: ChangedProperties = {};
        const current = careEntries.find((e) => e.id === editingId);
        if (current) {
            if (newName && newName !== current.name) updates.name = newName;
            if (newInterval != null && newInterval !== current.interval)
                updates.interval = newInterval;
            if (newMethod && newMethod !== current.method)
                updates.method = newMethod;
            if (newVolume != null && newVolume !== current.volume)
                updates.volume = newVolume;
        }
        if (!Object.keys(updates).length) {
            setEditingId(null);
            return;
        }

        setLoading(true);
        setError(null);

        const res = await fetch("/api/plant-care-update", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingId, ...updates }),
        });
        const json = await res.json();
        setLoading(false);
        if (!res.ok) {
            setError(json.error || "Fehler beim Aktualisieren.");
            return;
        }

        // Reload entries
        await handleOpen();

        // Reset form state
        setEditingId(null);
        setNewName("");
        setNewInterval(null);
        setNewMethod("");
        setNewVolume(null);
    };

    const handleDelete = async (id: number) => {
        if (
            !window.confirm(
                `Soll der Eintrag mit ID ${id} wirklich gelöscht werden? Diese Aktion löscht alle Pflanzen, welche dieser Art angehören aus der Datenbank!`
            )
        )
            return;

        setLoading(true);
        setError(null);
        const res = await fetch("/api/plant-care-update", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        const json = await res.json();
        setLoading(false);
        if (!res.ok) {
            toast.error(`Fehler beim Löschen der ID ${id}: ${json.error}`);
        } else {
            setCareEntries((prev) => prev.filter((entry) => entry.id !== id));
            toast.success(`Eintrag mit ID ${id} gelöscht.`);
        }
    };

    const updateForm = (
        <TableCell colSpan={6}>
            <form
                onSubmit={handleUpdate}
                className="flex flex-wrap items-center space-x-4"
            >
                <div className="flex flex-col">
                    <Label htmlFor="new-name">Pflanzenart</Label>
                    <Input
                        id="new-name"
                        value={newName}
                        className="mt-2 border text-gray-700 border-gray-300 dark:text-gray-200 dark:border-gray-500"
                        onChange={(e) => setNewName(e.target.value)}
                    />
                </div>

                <div className="flex flex-col">
                    <Label>Methode</Label>
                    <div className="mt-2">
                        <Select value={newMethod} onValueChange={setNewMethod}>
                            <SelectTrigger className="cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800">
                                <SelectValue placeholder="Methode wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="über die Blätter gießen">
                                    über die Blätter gießen
                                </SelectItem>
                                <SelectItem value="nur die Erde gießen">
                                    nur die Erde gießen
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col">
                    <Label htmlFor="new-interval">Intervall (Tage)</Label>
                    <Input
                        id="new-interval"
                        type="number"
                        value={newInterval ?? ""}
                        onChange={(e) => setNewInterval(Number(e.target.value))}
                        placeholder="z.B. 7"
                        className="mt-2 border text-gray-700 border-gray-300 dark:text-gray-200 dark:border-gray-500"
                    />
                </div>

                <div className="flex flex-col">
                    <Label htmlFor="new-volume">Menge (ml)</Label>
                    <Input
                        id="new-volume"
                        type="number"
                        value={newVolume ?? ""}
                        onChange={(e) => setNewVolume(Number(e.target.value))}
                        placeholder="z.B. 500"
                        className="mt-2 border text-gray-700 border-gray-300 dark:text-gray-200 dark:border-gray-500"
                    />
                </div>

                <Button
                    className="cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 mt-5"
                    type="submit"
                >
                    Speichern
                </Button>
                <Button
                    className="cursor-pointer border text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800 mt-5"
                    type="button"
                    onClick={() => setEditingId(null)}
                >
                    Abbrechen
                </Button>
            </form>
        </TableCell>
    );

    return (
        <>
            <Dialog
                open={showTable}
                onOpenChange={(open) => {
                    setShowTable(open);
                    if (!open) setEditingId(null);
                }}
            >
                <DialogTrigger asChild>
                    <Button
                        onClick={handleOpen}
                        className="cursor-pointer bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                        Pflanzenarten auflisten
                    </Button>
                </DialogTrigger>
                <DialogContent className="!w-[90vw] !max-w-6xl">
                    <DialogTitle>Pflegeinformationen</DialogTitle>

                    {loading && <p>Lädt Daten...</p>}
                    {error && (
                        <p className="text-destructive">Fehler: {error}</p>
                    )}

                    {!loading && !error && (
                        <Table>
                            <TableCaption>
                                Alle Arten & ihre Pflegeinfos
                            </TableCaption>

                            {/* Header nur anzeigen, wenn nicht editiert wird */}
                            {editingId === null && (
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Methode</TableHead>
                                        <TableHead>
                                            Gießintervall (ganze Tage)
                                        </TableHead>
                                        <TableHead>Volumen (ml)</TableHead>
                                        <TableHead>Bearbeiten</TableHead>
                                        <TableHead>Löschen</TableHead>
                                    </TableRow>
                                </TableHeader>
                            )}

                            <TableBody>
                                {careEntries.map((entry) =>
                                    editingId === entry.id ? (
                                        <TableRow key={entry.id}>
                                            {updateForm}
                                        </TableRow>
                                    ) : (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                {entry.name ?? "Unbenannt"}
                                            </TableCell>
                                            <TableCell>
                                                {entry.method ?? "k.A."}
                                            </TableCell>
                                            <TableCell>
                                                {entry.interval
                                                    ? `${entry.interval} Tage`
                                                    : "k.A."}
                                            </TableCell>
                                            <TableCell>
                                                {entry.volume ?? "k.A."}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon"
                                                    className="cursor-pointer"
                                                    aria-label="Bearbeiten"
                                                    onClick={() => {
                                                        setEditingId(entry.id);
                                                        setNewName(
                                                            entry.name ?? ""
                                                        );
                                                        setNewInterval(
                                                            entry.interval
                                                        );
                                                        setNewMethod(
                                                            entry.method ?? ""
                                                        );
                                                        setNewVolume(
                                                            entry.volume
                                                        );
                                                    }}
                                                >
                                                    <Pencil className="w-5 h-5" />
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="icon"
                                                    className="cursor-pointer"
                                                    aria-label="Löschen"
                                                    onClick={() =>
                                                        handleDelete(entry.id)
                                                    }
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                )}
                            </TableBody>
                        </Table>
                    )}

                    <DialogClose asChild>
                        <Button className="cursor-pointer mt-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white">
                            Schließen
                        </Button>
                    </DialogClose>
                </DialogContent>
            </Dialog>
        </>
    );
}
