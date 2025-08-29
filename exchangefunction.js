import { fetch } from 'undici';
import { Client, Databases, Permission, Role, Query } from "node-appwrite"


const DB_ID = process.env.APPWRITE_DATABASE_ID
const EX_COL_ID = process.env.APPWRITE_EXCHANGERATE_COLLECTION_ID

export default async function ({ req, res, log }) {
    // Log environment variables for debugging
    log(`DB_ID: ${DB_ID}`);
    log(`EX_COL_ID: ${EX_COL_ID}`);
    log(`API_ENDPOINT: ${process.env.APPWRITE_FUNCTION_API_ENDPOINT}`);
    log(`PROJECT_ID: ${process.env.APPWRITE_FUNCTION_PROJECT_ID}`);

    if (!DB_ID || !EX_COL_ID || !process.env.APPWRITE_FUNCTION_API_ENDPOINT || !process.env.APPWRITE_FUNCTION_PROJECT_ID) {
        log('Missing required environment variables.');
        return res.text('Missing required environment variables.');
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(req.headers['x-appwrite-key'] ?? '');

    const databases = new Databases(client)
    try {
        const response = await fetch(`https://api.exchangerate.host/live?access_key=${process.env.PUBLIC_API_EXCHANGE_RATES_KEY}`);
        const data = await response.json();

        log(`Fetched data: ${JSON.stringify(data)}`);

        if (data) {
            const docId = data.date || new Date().toISOString().slice(0, 10);

            // Check if document for this date already exists
            const existing = await databases.listDocuments(
                DB_ID,
                EX_COL_ID,
                [
                    Query.equal('$id', docId)
                ]
            );

            log(`Existing documents: ${JSON.stringify(existing.documents)}`);

            if (existing.documents.length > 0) {
                // Update existing document
                const updateResult = await databases.updateDocument(
                    DB_ID,
                    EX_COL_ID,
                    docId,
                    { ...data }
                );
                log(`Update result: ${JSON.stringify(updateResult)}`);
                return res.text('Exchange rate updated successfully.');
            } else {
                // Create new document
                const createResult = await databases.createDocument(
                    DB_ID,
                    EX_COL_ID,
                    docId,
                    { ...data }
                   
                );
                log(`Create result: ${JSON.stringify(createResult)}`);
                return res.text('Exchange rate saved successfully.');
            }
        } else {
            log('No data received from API.');
            return res.text('No data received from API.');
        }
    } catch (error) {
        log(`Error: ${error.message}`);
        return res.text(error.message)
    }
    return res.text('Invalid path');
};
