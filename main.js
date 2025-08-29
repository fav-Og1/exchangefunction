import { fetch } from 'undici';
import { Client, Databases, Permission, Role, Query } from "node-appwrite"


const DB_ID = process.env.APPWRITE_DATABASE_ID
const EX_COL_ID = process.env.APPWRITE_EXCHANGERATE_COLLECTION_ID


 
export default async function ({ req, res }) {

    const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  
  
    const databases = new Databases(client)
try{
    const response = await fetch('https://api.exchangerate.host/latest?base=USD');
    const data = await response.json();
    
  if (data){
    // Use the date as the document ID (e.g., "2024-06-08")
    const docId = data.date || new Date().toISOString().slice(0, 10);

    // Check if document for this date already exists
    const existing = await databases.listDocuments(
        DB_ID,
        EX_COL_ID,
        [
            Query.equal('$id', docId)
        ]
    );

    if (existing.documents.length > 0) {
        // Update existing document
        await databases.updateDocument(
            DB_ID,
            EX_COL_ID,
            docId,
            { ...data }
        );
        return res.text('Exchange rate updated successfully.');
    } else {
        // Create new document
        await databases.createDocument(
            DB_ID,
            EX_COL_ID,
            docId,
            { ...data },
            [
                Permission.read(Role.any)
            ]
         )
            return res.text('Exchange rate saved successfully.');
    }
  }
}catch(error){
  return res.text(error.message)
}
  return res.text('Invalid path');
};
