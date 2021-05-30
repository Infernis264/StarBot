export default class ChatActivityLog {
	private userList: {[key: string]: string[]};
	constructor(channels: string[]) {
		this.userList = {}
		channels.forEach(c=>{
			this.userList[c] = [];
		});
	}
	public getList(channel: string) {
		return this.userList[channel];
	}
	public addUser(channel: string, name: string) {
		if (!this.userList[channel].includes(name.toLowerCase())) this.userList[channel].push(name.toLowerCase());
	}
}
