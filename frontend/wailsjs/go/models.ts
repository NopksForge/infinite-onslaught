export namespace craft {
	
	export class Item {
	    name: string;
	    description: string;
	    emoji: string;
	    created_from: string[][];
	
	    static createFrom(source: any = {}) {
	        return new Item(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.emoji = source["emoji"];
	        this.created_from = source["created_from"];
	    }
	}

}

export namespace main {
	
	export class CraftResult {
	    name: string;
	    description: string;
	    emoji: string;
	    created_from: string[][];
	    is_new_item: boolean;
	    is_new_combination: boolean;
	
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

