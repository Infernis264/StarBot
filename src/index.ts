import * as TMI from "tmi.js";
import CommandHandler from "./modules/CommandHandler";
import ChatActivityLog from "./modules/ChatActivityLog";
import Auth from "./auth/Auth";

const CHANNELS = Auth.CHANNELS; // the list of channels the bot is active in
const PREFIX = "#";
const log = new ChatActivityLog(CHANNELS);
const commands = new CommandHandler(CHANNELS, log);

const client = new TMI.client({
	connection: {reconnect: true},
	identity: {
		username: Auth.USER, // bot account name
		password: Auth.PASS // bot account password
	},
	channels: CHANNELS.slice()
});


client.on("message", async (channel: string, user: TMI.ChatUserstate, message: string) => {
	let split = message.split(" ");
	let command = split[0].match(new RegExp(`(?<=${PREFIX}).+`));
	log.addUser(channel.replace(/#/g, ""), user.username);
	if (command) {
		if (CommandHandler.ENABLED.includes(command[0])) {
			let message = await commands.handle(command[0], split.slice(1), user, channel.replace(/\W/g, ""));
			if (message) {
				client.say(channel, message.toString());
			}
		}
	}
});

client.connect();
