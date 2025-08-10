export type PlantCareEntry = {
  id: number;
  name: string;
  interval: number;
  method: string;
  volume: number;
};

export type ChangedProperties = {
  name?:   string
  interval?: number | null
  volume?:   number | null
  method?:   string
}