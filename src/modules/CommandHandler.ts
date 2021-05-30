import {ChatUserstate} from "tmi.js";
import StarDB from "./StarDB";
import Message from "./Message";
import UserTracker from "./UserTracker";
import ChatActivityLog from "./ChatActivityLog";

const db = new StarDB("" /* mongodb database url */);

type Color = "gold" | "brown" | "green";

let colors = ["green", "gold", "brown"];

export default class CommandHandler {

	public static ENABLED = ["goldstar", "brownstar", "greenstar", "stars", "reset", "set"];

	private tracker: UserTracker;

	constructor(channels: string[], log: ChatActivityLog) {
		
		this.tracker = new UserTracker(channels, db, log);

	}

	async handle(command: string, params: string[], user: ChatUserstate, channel: string): Promise<Message> {
		
		params[0] = params[0] ? params[0].replace(/\W/g, "") : params[0];
		user.username = user.username.toLowerCase(); // just for consistency; probably not necessary
		
		switch(command) {
			// [color]star {user} {number (optional)}
			case "goldstar":
			case "greenstar":
			case "brownstar":
				// return early if no user is specified
				if (!params[0]) return new Message({template: "noStar"});
				if(this.hasPermission(user)) {
					return await this.giveStar(params[0], channel, command.slice(0,-4) as Color, Number(params[1]));
				}
			break;
		
			// stars {user (optional)}
			case "stars":
				// if no username is specified, return the star total of the user running the command
				if(!params[0]) params[0] = user.username;
				return await this.listStars(params[0], channel);
		
			// reset {user} {color}
			case "reset":
				if (this.hasPermission(user) && params[0]) {
					// return early if a color is specified that isn't valid
					if (params[1]) if (!colors.includes(params[1])) return null;
					return await this.reset(params[0], channel, params[1] as Color);
				}
			break;
		
			// set {user} {color} {amount}
			case "set":
				if (this.hasPermission(user) && params[0] && colors.includes(params[1]) && Number(params[2]) >= 0) {
					return await this.setStars(
						params[0],
						channel,
						params[1] as Color,
						Number(params[2])
					);
				}
			break;
		}
	}
		
	/**
	 * Gives a designated user in a channel a colored star.
	 * @param user the username of the person who is receiving a star
	 * @param channel the twitch channel the star is being given on
	 * @param color the color star being given to a user
	 * @returns a message with the response that should be sent to chat
	 */
	async giveStar(user: string, channel: string, color: Color, number?: number): Promise<Message> {
		let chatUser: string = this.tracker.isUserInChat(channel, user, true);
		if (!chatUser) chatUser = await db.userExists(user, channel) ? user : null;
		if (chatUser) {
			let starCount = await db.addStar(chatUser, channel, color, number);
			return new Message({
				starColors: starCount,
				active: color,
				user: chatUser,
				ngiven: number,
				template: "giveStar"
			});
		} else {
			return new Message({
				user: user,
				template: "absentUser"
			});
		}
	}

	/**
	 * Fetches star totals for a user from the database and returns a response message
	 * @param user the user whose stars are trying to be fetched
	 * @param channel the twitch channel name the user is on
	 * @returns a chat message detailing the individual star counts of a user
	 */
	async listStars(user: string, channel: string): Promise<Message> {
		let chatUser = this.tracker.isUserInChat(channel, user, true) as string;
		let starCount = await db.getStars(chatUser ? chatUser : user, channel);
		if (starCount) {
			return new Message({
				starColors: starCount,
				user: chatUser ? chatUser : user,
				template: "listStars"
			});
		} else {
			return new Message({
				template: "noUser"
			});
		}
	}

	/**
	 * Resets a user's star total for all stars by default and only a specific color if specified
	 * @param user the username of the person whose stars are being reset
	 * @param channel the twitch channel on which the stars for the user are being reset
	 * @param color if specified, will reset only a specific color star instead of all stars which is the default
	 * @returns a chat message that is to be sent in response to the command in the twitch channel
	 */
	async reset(user: string, channel: string, color?: Color): Promise<Message> {
		let success = await db.resetUser(user, channel, color);
		if (success) {
			return new Message({
				template: "resetSuccess",
				user: user,
				active: color
			});
		} else {
			return new Message({
				template:"resetFail",
				user: user
			});
		}
	}
		
	/**
	 * Sets a user's star count for a specified color star to an amount greater than or equal to 0
	 * @param user the username of the person whose stars are being set
	 * @param channel the twitch channel on which the star totals are being updated
	 * @param color the color star that is being modified
	 * @param amount the amount of stars the specified color should be set to
	 * @returns a chat message to send in the twitch channel in response to the command
	 */
	async setStars(user: string, channel: string, color: Color, amount: number): Promise<Message> {
		let success = await db.setStars(user, channel, color, amount);
		if (success) {
			return new Message({
				template: "setStars",
				user: user, 
				active: color, 
				starColors: {[color]:amount} as any
			});
		}
		return new Message({
			template: "setSyntax"
		});
	}

	/**
	 * Checks if a chat user has elevated permissions over a viewer
	 * @param user the chat user whose permissions are being checked
	 * @returns true if the user is a mod or broadcaster, false if they are anything else
	 */
	public hasPermission(user: ChatUserstate): boolean {
		if (!user["badges-raw"]) user["badges-raw"] = "";
		return user.mod || user["badges-raw"].includes("broadcaster");
	}
}
