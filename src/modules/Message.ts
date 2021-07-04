interface MessageParameters {
	starColors?: {
		[key: string]: number;
		green: number;
		gold: number;
		brown: number;
		silver: number;
	};
	active?: "green" | "gold" | "brown" | "silver";
	user?: string;
	template: string;
	ngiven?: number;
}

export default class Message {

	public static templates = {
		listStars: "{user} has {gold} gold stars, {brown} brown stars, {green} green stars, and {silver} silver stars",
		giveStar: "{user} received {ngiven} {color} star{ngplural}! {colormsg} They have {total} {color} stars in total",
		absentUser: "It seems like {user} isn't here right now. Try giving them some stars later!",
		noStar: "You can't give a star to nobody!",
		noUser: "It looks like this person has not gotten any stars yet",
		setStars: "Set {user}'s {color} star total to {total}!",
		resetSuccess: "{user}'s {color} stars have been reset!",
		resetFail: "{user} has no {color} stars to reset",
		setSyntax: "Usage: set [user] [star color] [number greater than or equal to 0]",
		error: "welp, @infernis__ you've got some programming to do"
	} as {[key:string]: string};

	public static colorFlavor = {
		green: "Gross.",
		gold: "You will now have happy time and good life!",
		brown: "Now go and think about what you've done.",
		silver: "Hectique looks upon you favorably."
	} as {[key: string]: string};

	private content: string;

	constructor(msg: MessageParameters) {
		if (msg.template && Message.templates[msg.template]) {
			let message = Message.templates[msg.template];
			this.content = message.replace(/\{[a-zA-Z]+\}/g, sub => {
				sub = sub.replace(/[\{\}]/g, "");
				switch(sub) {
					case "green":
					case "gold":
					case "brown":
					case "silver":
						return this.cap(msg.starColors[sub]+"");
					case "colormsg":
						return Message.colorFlavor[msg.active];
					case "color":
						return msg.active ? msg.active : "";
					case "user":
						return msg.user;
					case "total":
						return "" + msg.starColors[msg.active];
					case "ngiven":
						return msg.ngiven ? msg.ngiven + "" : "a";
					case "ngplural":
						return msg.ngiven > 1 ? "s" : "";
					default: 
						return "";
				}
			});
		} else {
			this.content = Message.templates.error;
		}
	}
	private cap(string: string): string {
		return string.slice(0,1).toUpperCase() + string.slice(1);
	}
	toString() {
		return this.content;
	}
}
