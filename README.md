# google-scholar-scraper

Google Scholar scraper that gets the latest publications of a user.

## Prerequisites

-   [Bun](https://bun.sh/)

## Usage

Install dependencies:

```bash
bun install
```

or

```bash
bun i
```

Run the script:

```bash
bun run ./index.ts user_id output file number_of_results
```

Range for number_of_results is 1-100.

## How to get user id

1. Go to Google Scholar;
2. Click on the profile you want to scrape;
3. On the url, there will be query called user, like this:

    scholar.google.com/citations?user=<user_id>&...;

4. Get everything after user= and before the &.
