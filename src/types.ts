export type Split = { seq:number; code:string; split?:number; cum?:number };
export type Competitor = {
id:string; name:string; club?:string; status?:string; pos?:string; timeS?:number; splits:Split[];
};
export type ClassData = { name:string; competitors:Competitor[] };
export type EventData = { id:string; name:string; date?:string; classes:Record<string,ClassData> };
