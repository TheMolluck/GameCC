

export class SteamAPI {
    private apiKey: string;

    constructor(key: string) {
        this.apiKey = key;
    }

    async getUserSummary(steamId: string) {
        return fetch("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=" + this.apiKey + "&steamids=" + steamId)
            .then((response) => response.json())
            .then((data) => {
                if (data.response.players.length > 0) {
                    return data.response.players[0];
                } else {
                    throw new Error("No player found with the given Steam ID.");
                }
            })
    }

    async getUserOwnedGames(steamId: string) { 
        return fetch("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=" + this.apiKey + "&steamid=" + steamId + "&include_appinfo=true&include_played_free_games=true")
            .then((response) => response.json())
            .then((data) => {
                if (data.response.game_count > 0) {
                    return data.response.games;
                } else {
                    throw new Error("No games found for the given Steam ID.");
                }
            })
    }
}