import puppeteer from "puppeteer";
import { writeFileSync } from "fs";

import type { Conference, Journal } from "./types";

const user_id = process.argv[2];
let output_file = process.argv[3];
let number_results = Number(process.argv[4]);

switch (true) {
	case !user_id:
		throw new Error("User id is required");
	case !output_file:
		throw new Error("Output file is required");
	case !number_results:
		throw new Error("Number of results is required");
	case number_results < 1 || number_results > 100:
		throw new Error("Number of results must be between 1 and 100");
	default:
		break;
}

if (output_file.endsWith(".json")) {
	output_file = output_file.slice(0, -5);
}

const url = `https://scholar.google.com/citations?user=${user_id}&hl=en-US&oe=UTF8&view_op=list_works&sortby=pubdate&pagesize=${number_results}`;

async function scrapeGoogleScholar() {
	console.log("Starting Google Scholar scraper...");
	console.log(`Fetching up to ${number_results} publications for user ID: ${user_id}`);
	console.log("Opening browser...");
	const browser = await puppeteer.launch();

	try {
		const page = await browser.newPage();

		console.log(`Navigating to Google Scholar page...`);
		await page.goto(url, { waitUntil: "networkidle0" });

		const publi_rows = await page.$$(".gsc_a_tr");
		console.log(`Found ${publi_rows.length} publications. Fetching basic details...`);

		const results = await Promise.all(
			publi_rows.map(async (row) => {
				const title = await row.$eval(".gsc_a_at", (el) => el.innerHTML);
				const gsc_url = await row.$eval(".gsc_a_at", (el) => el.getAttribute("href"));
				const year = Number(await row.$eval(".gsc_a_y span", (el) => el.innerHTML));

				return {
					title,
					gsc_url,
					year,
				};
			})
		);

		console.log(`Basic details fetched. Now retrieving full information for each publication...\n`);

		let all_publications: (Conference | Journal)[] = [];

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			console.log(`Processing publication ${i + 1} of ${results.length}: "${result.title}"`);
			try {
				await page.goto("https://scholar.google.com" + result.gsc_url + "&oe=UTF8", {
					waitUntil: "networkidle0",
				});

				const url_element = await page.$(".gsc_oci_title_link");

				if (!url_element) {
					console.log(`  Skipping: No URL found for "${result.title}"`);
					continue;
				}

				const url = (await page.$eval(".gsc_oci_title_link", (el) => el.getAttribute("href")))!;

				const table_rows = await page.$$(".gs_scl");

				const keys = await Promise.all(
					table_rows.map(async (row) => {
						const key = await row.$eval(".gsc_oci_field", (el) => el.innerHTML);
						return key;
					})
				);

				let pub_type: "Conference" | "Journal" | null =
					keys.includes("Conference") || keys.includes("Book")
						? "Conference"
						: keys.includes("Journal")
						? "Journal"
						: null;

				if (!pub_type) {
					console.log(`  Skipping: Unable to determine publication type for "${result.title}"`);
					continue;
				}

				let publication: Conference | Journal = {
					title: result.title,
					year: result.year,
					url,
					authors: "",
					...(pub_type === "Conference" ? { conference: "" } : { journal: "", volume: "" }),
				} as Conference | Journal;

				for (const row of table_rows) {
					const key = await row.$eval(".gsc_oci_field", (el) => el.innerHTML);
					const value = await row.$eval(".gsc_oci_value", (el) => el.innerHTML);

					if (key === "Authors") publication.authors = value;

					if (pub_type === "Conference") {
						if (key === "Conference" || key === "Book") (publication as Conference).conference = value;
					} else if (pub_type === "Journal") {
						if (key === "Journal") (publication as Journal).journal = value;
						if (key === "Volume") (publication as Journal).volume = value;
					}
				}

				all_publications.push(publication);
				console.log(`  Successfully processed: "${result.title}"\n`);
			} catch (error) {
				console.error(`  Error processing "${result.title}": ${error.message}\n`);
			}
		}

		console.log(`All publications processed. Saving results...`);
		writeFileSync(`${output_file}.json`, JSON.stringify(all_publications, null, 4));
		console.log(`Results saved to ${output_file}.json`);
		console.log(`Total publications saved: ${all_publications.length}`);
	} catch (error) {
		console.error("An error occurred:", error);
	} finally {
		console.log("Closing browser...");
		await browser.close();
	}
}

scrapeGoogleScholar();
