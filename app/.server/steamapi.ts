

export class SteamAPI {
    private apiKey: string;
    private baseUrl: string;

    constructor(key: string) {
        this.apiKey = key;
        this.baseUrl = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + this.apiKey + "&steamids=";
    }

    async getUserSummary(steamId: string) {
        return fetch(this.baseUrl + steamId)
            .then((response) => response.json())
            .then((data) => {
                if (data.response.players.length > 0) {
                    return data.response.players[0];
                } else {
                    throw new Error("No player found with the given Steam ID.");
                }
            })
    }
}