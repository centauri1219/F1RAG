import { DataAPIClient } from '@datastax/astra-db-ts';
import puppeteer from 'puppeteer';
import { HfInference } from '@huggingface/inference';

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import 'dotenv/config';

type SimilarityMetric = 'dot_product' | 'cosine' | 'euclidean';

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  HUGGINGFACE_API_KEY,
} = process.env;

const hf = new HfInference(HUGGINGFACE_API_KEY);

const f1Data = [
  // 'https://en.wikipedia.org/wiki/Formula_One',
  'https://www.formula1.com/en/latest/all',
  'https://en.wikipedia.org/wiki/2023_Formula_One_World_Championship',
  'https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship',
  'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',
  'https://en.wikipedia.org/wiki/Renault_Formula_One_crash_controversy',
  'https://en.wikipedia.org/wiki/2007_Formula_One_espionage_controversy'

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
  try {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
      vector: {
        dimension: 384, // dimension for sentence-transformers/all-MiniLM-L6-v2
        metric: similarityMetric,
      },
    });
    console.log('Collection created:', res);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log(`Collection '${ASTRA_DB_COLLECTION}' already exists, continuing...`);
    } else {
      throw error; // Re-throw if it's a different error
    }
  }
};

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  for await (const url of f1Data) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      // Use Hugging Face for embeddings
      const embedding = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: chunk,
      });

      const vector = Array.isArray(embedding) ? embedding : Array.from(embedding);

      const res = await collection.insertOne({
        $vector: vector,
        text: chunk,
      });
      
      console.log(`Inserted chunk with ${vector.length} dimensions`);
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