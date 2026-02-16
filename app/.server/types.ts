export type User = {
    steamid: string;
    avatar: string;
    avatarfull: string;
    avatarhash: string;
    personaname: string;
    profileurl: string;
};
export type SteamGame = {
    appid: number;
    name: string;
    playtime_forever: number;
    img_icon_url: string;
    rtime_last_played: number;
};

export type SteamGames = SteamGame[];

