export type Entry = {
    id: number;
    name: string;
    locationName: string;
    imageUrl?: string;
    size?: "small" | "medium" | "large" | null; 
};