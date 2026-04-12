export namespace backend {
	
	export class CraftResult {
	    name: string;
	    description: string;
	    emoji: string;
	    created_from: string[][];
	    is_new_item: boolean;
	    is_new_combination: boolean;
	    defender_type: string;
	    stats: craft.DefenderStats;
	
	    static createFrom(source: any = {}) {
	        return new CraftResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.emoji = source["emoji"];
	        this.created_from = source["created_from"];
	        this.is_new_item = source["is_new_item"];
	        this.is_new_combination = source["is_new_combination"];
	        this.defender_type = source["defender_type"];
	        this.stats = this.convertValues(source["stats"], craft.DefenderStats);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class OllamaStatus {
	    ready: boolean;
	    model: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new OllamaStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ready = source["ready"];
	        this.model = source["model"];
	        this.error = source["error"];
	    }
	}

}

export namespace craft {
	
	export class DefenderStats {
	    speed_mult: number;
	    damage_mult: number;
	    duration_mult: number;
	    range_mult: number;
	    area_mult: number;
	
	    static createFrom(source: any = {}) {
	        return new DefenderStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.speed_mult = source["speed_mult"];
	        this.damage_mult = source["damage_mult"];
	        this.duration_mult = source["duration_mult"];
	        this.range_mult = source["range_mult"];
	        this.area_mult = source["area_mult"];
	    }
	}
	export class Item {
	    name: string;
	    description: string;
	    emoji: string;
	    created_from: string[][];
	    defender_type: string;
	    stats: DefenderStats;
	
	    static createFrom(source: any = {}) {
	        return new Item(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.emoji = source["emoji"];
	        this.created_from = source["created_from"];
	        this.defender_type = source["defender_type"];
	        this.stats = this.convertValues(source["stats"], DefenderStats);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

