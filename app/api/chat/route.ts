import { createGroq } from '@ai-sdk/groq';
import { HfInference } from '@huggingface/inference';
import { streamText } from 'ai';
import { DataAPIClient } from '@datastax/astra-db-ts';

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GROQ_API_KEY,
  HUGGINGFACE_API_KEY,
} = process.env;

const groq = createGroq({
  apiKey: GROQ_API_KEY,
});

const hf = new HfInference(HUGGINGFACE_API_KEY);

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
  try {
    console.log('API called');
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content;
    console.log('Latest message:', latestMessage);

    let docContext = '';

    // Use Hugging Face for embeddings
    console.log('Creating embedding...');
    const embedding = await hf.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: latestMessage,
    });
    console.log('Embedding created');

    // Convert to array if needed
    const vector = Array.isArray(embedding) ? embedding as number[] : Array.from(embedding as any) as number[];

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: {
          $vector: vector,
        },
        limit: 10,
      });

      const documents = await cursor.toArray();

      const docsMap = documents?.map((doc) => doc.text);
      docContext = JSON.stringify(docsMap);
    } catch (dbError) {
      console.log('Database error:', dbError);
      docContext = '';
    }

    const template = {
      role: 'system',
      content: `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from wikipedia, the official F1 website and others. If the context doesn't include the information you need answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include. Format responses using markdown where applicable and don't return images.
      ---------
      START CONTEXT
      ${docContext}
      END CONTEXT
      ---------
      QUESTION: ${latestMessage}
      ---------
      `,
    };

    const result = await streamText({
      model: groq('llama-3.1-8b-instant'),
      messages: [template, ...messages],
      temperature: 0.7,
    });
    
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request', details: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}