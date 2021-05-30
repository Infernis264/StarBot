import fetch from "node-fetch";
import * as similarity from "similarity";
import StarDB from "./StarDB";
import ChatActivityLog from "./ChatActivityLog";

interface ChannelList {
	[key: string]: Channel
}
interface Channel {
	superusers: string[],
	chatters: string[]
}

interface UserAPIResponse {
	_links: any;
	chatter_count: number;
	chatters: {
		broadcaster: string[];
		vips: string[];
		moderators: string[];
		staff: string[];
		admins: string[];
		global_mods: string[];
		viewers: string[];
	}
}

export default class UserTracker {

	private static FETCH_INTERVAL = 60 * 1000;
	private static MIN_SIMILARITY = 0.7;
	private channels: string[];
	private channelList: ChannelList;
	private db: StarDB;
	private log: ChatActivityLog;

	constructor(channels: string[], db: StarDB, log: ChatActivityLog) {
		this.channelList = {};
		this.db = db;
		// filter out any non-alphanumeric characters from the channel name
		this.channels = channels.map(c=>c.replace(/\W/g, ""));
		// prepare the user list for population
		channels.forEach(channel => {
			this.channelList[channel] = {
				superusers: [],
				chatters: []
			}
		});
		this.populateLists();
		setInterval(this.populateLists.bind(this), UserTracker.FETCH_INTERVAL);
		this.log = log;
	}

	private async populateLists() {
		for(let channel of this.channels) {
			try {
				let request = await fetch(`https://tmi.twitch.tv/group/user/${channel}/chatters`);
				let data = (await request.json() as UserAPIResponse).chatters;
				this.channelList[channel] = {
					superusers: [...data.broadcaster, ...data.moderators],
					chatters: [...data.viewers, ...data.staff, ...data.admins, ...data.vips]
				};
				// any user who views the channel will get a database entry for them
				for (let user of [...this.channelList[channel].superusers, ...this.channelList[channel].chatters]) {
					// if user doesn't exist
					if (!(await this.db.userExists(user, channel))) {
						// make the user
						this.db.createUser(user, channel);
					}
				}
			} catch(e) {
				console.log(e);
			}
		}
	}

	public getUsers(channel: string): Channel {
		return this.channelList[channel];
	}

	/**
	 * Checks whether a user is currently joined in a twitch irc chat channel
	 * @param channel the channel to check the chat of
	 * @param user the user you are searching for
	 * @param useFuzzy whether or not to use fuzzy string similarity for matching usernames
	 * @returns the found user as a string, null if not found
	 */
	public isUserInChat(channel: string, user: string, useFuzzy: boolean): string {
		let allUsers = [...this.channelList[channel].chatters, ...this.channelList[channel].superusers, ...this.log.getList(channel)];
		if (useFuzzy) {
			let match = this.findBestMatch(allUsers, user);
			return match ? match : null;
		}
		return allUsers.includes(user) ? user : null;
	}

  /** @deprecated */
	public isSuperUser(channel: string, user: string): boolean {
		return this.channelList[channel].superusers.includes(user);
	}

	/**
	 * Checks if a target is in a list of words using loose string similarity and returns the closest
	 * matching string in the list.
	 * @param list The list of words to compare to the target
	 * @param target the string that a similar or exact copy should be found in list
	 * @returns the string in the list that best matches the target, or null if there isn't one
	 */
	private findBestMatch(list: string[], target: string): string {
		let weights: number[] = []; 
		for (let i = 0; i < list.length; i++) {
			weights.push(similarity(list[i], target));
		}
		let max = Math.max(...weights);
		return (max >= UserTracker.MIN_SIMILARITY) ? list[weights.indexOf(max)] : null;
	}
}
