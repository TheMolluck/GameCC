import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import type { SteamGames, User } from "../types";
dotenv.config({path: "../../../.env"});

const uri = process.env.ATLAS_URI;
export const dbClient = new MongoClient(uri as string);


let clientConnection: Promise<MongoClient> | null = null;

async function ensureConnected() {
    if (!clientConnection) {
        clientConnection = dbClient.connect().then(() => dbClient);
    }
    await clientConnection;
    return dbClient;
}

export async function closeDatabase() {
    if (clientConnection) {
        await dbClient.close();
        clientConnection = null;
    }
}

export async function connectToDatabase() {
    try {
        const client = await ensureConnected();
        const collections = await client.db("gamecc").collections();
        collections.forEach((collection) => console.log(`- ${collection.collectionName}`));
    } catch (error) {
        console.error("Error connecting to DB:", error);
    }
}

export async function storeSteamUserandGames(user: User, games: SteamGames) {
    try {
        const client = await ensureConnected();
        await client
            .db("gamecc")
            .collection("users")
            .updateMany(
                { steamid: user.steamid },
                { $set: { ...user, games: games } },
                { upsert: true }
            );
        console.log(`User ${user.steamid} has been upserted.`);
    } catch (error) {
        console.error("Error storing steam user and games:", error);
        throw error;
    }
}

export async function getGamesByUserId(steamid: string) {
    try {
        const client = await ensureConnected();
        const user = await client.db("gamecc").collection("users").findOne({ steamid });
        if (user) {
            return user.games as SteamGames;
        } else {
            throw new Error("User not found with the given Steam ID.");
        }
    } catch (error) {
        console.error("Error fetching games by user id:", error);
        throw error;
    }
}
