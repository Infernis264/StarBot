import {Document, Schema} from "mongoose";
import * as mongoose from "mongoose";

const StarCount = new mongoose.Schema({
	brown: Number,
	gold: Number,
	green: Number,
	silver: Number
});

const User = mongoose.model("User", new Schema({
	name: String,
	channel: String,
	stars: StarCount
}));

interface UserType {
	name: string;
	channel: string;
	stars: Stars;
}
interface Stars {
	[key: string]: number;
	brown: number;
	gold: number;
	green: number;
	silver: number;
}

type Color = "brown" | "gold" | "green" | "silver";

export default class StarDB {
	/**
	 * Creates a new StarDB with a provided mongodb url
	 * @param url the database url
	 */
	constructor(url: string) {
		mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
		mongoose.set("returnOriginal", false);
	}

	/**
	 * Creates a new user in the database
	 * @param name the name of the user that will be added to the database
	 * @returns the created User document
	 */
	public async createUser(name: string, channel: string): Promise<Document<UserType>> {
		let chatUser = new User({
			name: name.toLowerCase(),
			channel: channel.toLowerCase(),
			stars: {
				green: 0,
				gold: 0,
				brown: 0,
				silver: 0
			}
		});
		await chatUser.save();
		return chatUser;
	}

	/**
	 * Gets the user with a specified name from the database. If no user with
	 * that name exists, then a user is created with that name
	 * @param name the name of the user 
	 * @returns the User document for the specified name
	 */
	private async getUser(name: string, channel: string, createNew: boolean): Promise<Document<UserType>> {
		let chatUser = await User.findOne({name: name.toLowerCase(), channel: channel.toLowerCase()}).exec();
		if (!chatUser && createNew) {
			chatUser = await this.createUser(name, channel);
		}
		return chatUser;
	}

	/**
	 * Adds a specified color star to the specified user's star totals
	 * @param name the name of the user to add a star to
	 * @param color the color of the star being added to the user
	 * @returns the user's updated star count
	 */
	public async addStar(name: string, channel: string, color: Color, number?: number): Promise<Stars> {
		let chatUser = await this.getUser(name, channel, true);
		let userStars = (chatUser.toObject() as any).stars as Stars;
		// increment the user's star total for the specified color by one
		userStars[color] += number ? number : 1;
		// update the user's star count in the database
		await User.findByIdAndUpdate(chatUser.id, {stars: userStars});
		return userStars;
	}

	/**
	 * Checks a user's star count
	 * @param name the user whose star count is being checked
	 * @returns the user's star count
	 */
	public async getStars(name: string, channel: string): Promise<Stars> {
		let chatUser = await this.getUser(name, channel, false);
		if (chatUser) return (chatUser.toObject() as any).stars as Stars;
		return null;
	}

	/**
	 * Resets the star totals of a specified user in a channel
	 * @param name the username of the person whose stars are being reset
	 * @param channel the channel in which this person's star count is being reset
	 * @param color if not specified, resets all star counts to zero, otherwise resets the color's star count to zero
	 * @returns whether the database was able to complete the query
	 */
	public async resetUser(name: string, channel: string, color?: Color): Promise<boolean> {
		let updatedCount = color ? {[`stars.${color}`]:0} : {
			stars: {green: 0, brown: 0, gold: 0, silver: 0}
		}
		return (await User.updateOne({
			name: name.toLowerCase(),
			channel: channel.toLowerCase()}, 
			updatedCount
		).exec()).nModified > 0;
	}

	/**
	 * Sets a user's colored stars to a specified amount 
	 * @param name the username of the person whose stars are being reset
	 * @param channel the channel in which this person's star count is being set
	 * @param color not optional; the color of star whose value is being set
	 * @param amount the amount of colored stars the user should have
	 * @returns whether the database was able to complete the query
	 */
	public async setStars(name: string, channel: string, color: Color, amount: number): Promise<boolean>{
		return (await User.updateOne({
			name: name.toLowerCase(),
			channel: channel.toLowerCase()},
			{[`stars.${color}`]: amount}
		).exec()).nModified > 0;
	}
	
	/**
	 * Checks if a user in a channel exists in the database
	 * @param name the username of the person whose existence is being checked
	 * @param channel the channel the user is in
	 * @returns true if the document exists, false if the document doesn't exist
	 */
	public async userExists(name: string, channel: string): Promise<boolean> {
		return (await User.countDocuments({channel: channel, name: name}).exec()) === 1;
	}
}
