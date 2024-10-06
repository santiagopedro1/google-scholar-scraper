interface BasePublication {
	title: string;
	url: string;
	authors: string;
	year: number;
}

interface Conference extends BasePublication {
	conference: string;
}

interface Journal extends BasePublication {
	journal: string;
	volume: string;
}

export { Conference, Journal };
