import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import type { SteamGames, User } from "../types";
dotenv.config({path: "../../../.env"});

const uri = process.env.ATLAS_URI;
export const dbClient = new MongoClient(uri as string);

// TODO: Add error handling and connection pooling for better performance and reliability.
// TODO: Add retry logic for connection attempts in case of network issues or database unavailability.
export async function connectToDatabase() {
    try {
        await dbClient.connect();
        const collections = await dbClient.db("gamecc").collections();
        collections.forEach((collection) => console.log(`- ${collection.collectionName}`));
    } catch (error) {
        console.error("Error connecting to DB:", error);
    } 
}

export async function storeSteamUserandGames(user: User , games: SteamGames) { 
	try {
		await dbClient.db("gamecc").collection("users").updateMany(
            { steamid: user.steamid },
            { $set: { ...user, games: games } },
            { upsert: true }
        );
        console.log(`User ${user.steamid} has been upserted.`);
	} catch (error) {
		console.error("Error connecting to MongoDB Atlas:", error);
	} finally {
		await dbClient.close();
	}
}

export async function getGamesByUserId(steamid: string) {
    try {
        const user = await dbClient.db("gamecc").collection("users").findOne({ steamid: steamid });
        if (user) {
            return user.games as SteamGames;
        } else {
            throw new Error("User not found with the given Steam ID.");
        }
    } catch (error) {
        console.error("Error connecting to MongoDB Atlas:", error);
        throw error;
    }
}
