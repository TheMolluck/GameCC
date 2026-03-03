
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

export type SteamGameDetails = {
    name: string;
    detailed_description: string;
    short_description: string;
    header_image: string;
    capsule_image: string;
    controller_support: string;
    website: string;
    pc_requirements: {
        minimum: string;
        recommended?: string;
    };
    developers: string[];
    publishers: string[];
    metacritic: {
        score: number;
        url: string;
    };
    categories: {
        id: number;
        description: string;
    }[];
    genres: {
        id: number;
        description: string;
    }[];
    screenshots: {
        id: number;
        path_thumbnail: string;
        path_full: string;
    }[];
    release_date: {
        coming_soon: boolean;
        date: string;
    };
    background: string;
};

export type SteamGrid = {
	id: number;
	url: string;
	width: number;
	height: number;
	style: string;
	mime: string;
	language: string;
	nsfw: boolean;
	lock: boolean;
	upvotes: number;
	downvotes: number;
	author: {
		name: string;
		steam64: string;
		avatar: string;
	};
};

export type SteamGames = SteamGame[];
