import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({path: "../../../.env"});

export async function connectToDatabase() {
    const uri = process.env.ATLAS_URI;
    console.log(uri);
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const collections = await client.db("gamecc").collections();
        console.log("Connected to MongoDB Atlas. Collections:");
        collections.forEach((collection) => console.log(`- ${collection.collectionName}`));
    } catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
    } finally {
        await client.close();
    }
}
