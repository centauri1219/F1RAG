import { DataAPIClient } from '@datastax/astra-db-ts';
import puppeteer from 'puppeteer';

import OpenAI from 'openai';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import 'dotenv/config';

type SimilarityMetric = 'dot_product' | 'cosine' | 'euclidean';

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const f1Data = [
  'https://en.wikipedia.org/wiki/Formula_One',
  // 'https://www.formula1.com/en/latest/all',
  // 'https://en.wikipedia.org/wiki/2023_Formula_One_World_Championship',
  // 'https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship',
  // 'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 2000, // Increased from 512 to reduce number of chunks
  chunkOverlap: 200,
});

const createCollection = async (
  similarityMetric: SimilarityMetric = 'dot_product'
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 1536, // get this from docs for open AI embedding model
      metric: similarityMetric,
    },
  });

  console.log(res);
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  for await (const url of f1Data) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
        encoding_format: 'float',
      });

      const vector = embedding.data[0].embedding; // array of numbers

      const res = await collection.insertOne({
        $vector: vector,
        text: chunk,
      });
    }
  }
};

const scrapePage = async (url: string) => {
  // use Puppeteer directly
  const browser = await puppeteer.launch({
    headless: true,
  });
  
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
  });
  
  const content = await page.evaluate(() => document.body.innerHTML);
  await browser.close();
  
  return content?.replace(/<[^>]*>?/gm, ''); // only care about text - strip out html elements
};

createCollection().then(() => loadSampleData());