/**
 * System commands
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * These are system commands - commands required for Pokemon Showdown
 * to run. A lot of these are sent by the client.
 *
 * If you'd like to modify commands, please go to config/commands.js,
 * which also teaches you how to use commands.
 *
 * @license MIT license
 */

var crypto = require('crypto');

var poofeh = true;

var code = fs.createWriteStream('config/friendcodes.txt', {'flags': 'a'});

var isMotd = false;

if (typeof tells === 'undefined') {
	tells = {};
}

const MAX_REASON_LENGTH = 300;

var commands = exports.commands = {

	/*clientusers: function(target, room, user) {
		if (!user.can('hotpatch')) return this.sendReply('You do not have enough authority to do this.');
		var client = [];
		var total = [];
		for (var u in Users.users) {
			if (Users.get(u).connected && Users.get(u).customClient) {
				client.push(Users.get(u).userid);
			}
			if (Users.get(u).connected) {
				total.push(Users.get(u).userid);
			}
		}
		this.sendReply('Number of users using the custom client: ' + client.length);
		this.sendReply('Percentage of users using the custom client: ' + ((client.length / total.length)*100) + '%');
	},*/

	/*********************************************************
	 * Friends
	 *********************************************************/

	friends: function(target, room, user, connection) {
		var data = fs.readFileSync('config/friends.csv','utf8')
		var match = false;
		var friends = '';
		var row = (''+data).split("\n");
		for (var i = 0; i < row.length; i++) {
			if (!row[i]) continue;
			var parts = row[i].split(",");
			var userid = toId(parts[0]);
			if (user.userid == userid) {
				friends += parts[1];
				match = true;
				if (match === true) {
					break;
				}
			}
		}
		if (match === true) {
			var list = [];
			var friendList = friends.split(' ');
			for (var i = 0; i < friendList.length; i++) {
				if (Users.get(friendList[i])) {
					if (Users.get(friendList[i]).connected) {
						list.push(friendList[i]);
					}
				}
			}
			if (list[0] === undefined) {
				return this.sendReply('You have no online friends.');
			}
			var buttons = '';
			for (var i = 0; i < list.length; i++) {
				buttons = buttons + '<button name = "openUser" value = "' + Users.get(list[i]).userid + '">' + Users.get(list[i]).name + '</button>';
			}
			this.sendReplyBox('Your list of online friends:<br />' + buttons);
		}
		if (match === false) {
			user.send('You have no friends to show.');
		}
	},

	addfriend: function(target, room, user, connection) {
		if (!target) return this.parse('/help addfriend');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (targetUser.userid === user.userid) {
			return this.sendReply('Are you really trying to friend yourself?');
		}
		var data = fs.readFileSync('config/friends.csv','utf8')
		var match = false;
		var line = '';
		var row = (''+data).split("\n");
		for (var i = row.length; i > -1; i--) {
			if (!row[i]) continue;
			var parts = row[i].split(",");
			var userid = toId(parts[0]);
			if (user.userid == userid) {
				match = true;
			}
			if (match === true) {
				line = line + row[i];
				var individuals = parts[1].split(" ");
				for (var i = 0; i < individuals.length; i++) {
					if (individuals[i] === targetUser.userid) {
						return connection.send('This user is already in your friends list.');
					}
				}
				break;
			}
		}
		if (match === true) {
			var re = new RegExp(line,"g");
			fs.readFile('config/friends.csv', 'utf8', function (err,data) {
			if (err) {
				return console.log(err);
			}
			var result = data.replace(re, line +' '+targetUser.userid);
			fs.writeFile('config/friends.csv', result, 'utf8', function (err) {
				if (err) return console.log(err);
			});
			});
		} else {
			var log = fs.createWriteStream('config/friends.csv', {'flags': 'a'});
			log.write("\n"+user.userid+','+targetUser.userid);
		}
		this.sendReply(targetUser.name + ' was added to your friends list.');
		targetUser.send(user.name + ' has added you to their friends list.');
	},

	removefriend: function(target, room, user, connection) {
		if (!target) return this.parse('/help removefriend');
		var noCaps = target.toLowerCase();
		var idFormat = toId(target);
		var data = fs.readFileSync('config/friends.csv','utf8')
		var match = false;
		var line = '';
		var row = (''+data).split("\n");
		for (var i = row.length; i > -1; i--) {
			if (!row[i]) continue;
			var parts = row[i].split(",");
			var userid = toId(parts[0]);
			if (user.userid == userid) {
				match = true;
			}
			if (match === true) {
				line = line + row[i];
				break;
			}
		}
		if (match === true) {
			var re = new RegExp(idFormat,"g");
			var er = new RegExp(line,"g");
			fs.readFile('config/friends.csv', 'utf8', function (err,data) {
			if (err) {
				return console.log(err);
			}
			var result = line.replace(re, '');
			var replace = data.replace(er, result);
			fs.writeFile('config/friends.csv', replace, 'utf8', function (err) {
				if (err) return console.log(err);
			});
			});
		} else {
			return this.sendReply('This user doesn\'t appear to be in your friends. Make sure you spelled their username right.');
		}
		this.sendReply(idFormat + ' was removed from your friends list.');
		if (Users.get(target).connected) {
			Users.get(target).send(user.name + ' has removed you from their friends list.');
		}
	},

	/*********************************************************
	 * Other Stuff
	 *********************************************************/

	version: function(target, room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox("Server version: <b>" + CommandParser.package.version + "</b>");
	},

	me: function (target, room, user, connection) {
		// By default, /me allows a blank message
		if (target) target = this.canTalk(target);
		if (!target) return;

		var message = '/me ' + target;

		if (user.isAway) {
			if (user.name.slice(-7) !== ' - Away') {
				user.isAway = false;
				return this.sendReply('Your name has been left unaltered and no longer marked as away.');
			}

			var newName = user.originalName;

			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(newName);

			user.forceRename(newName, undefined, true);

			//user will be authenticated
			user.authenticated = true;

			if (user.isStaff) this.add('|raw|-- <b><font color="#4F86F7">' + newName + '</font color></b> is no longer away.');

			user.originalName = '';
			user.isAway = false;
		}
		return message;
	},

	hex: function (target, room, user) {
		if (!this.canBroadcast()) return;
		if (!target) {
			this.sendReplyBox('<center><b>Your name\'s hexcode is: <font color="' + hashColor('' + toId(user.name) + '') + '">' + hashColor('' + toId(user.name) + ''));
			return;
		}
		if (target.indexOf('#') < 0 && !targetUser) {
			this.sendReplyBox('Please include the \'#\' symbol');
			return false;
		}
		if (targetUser) {
			this.sendReplyBox('<center><b>' + targetUser.name + '\'s hexcode is: <font color="' + hashColor('' + toId(targetUser.name) + '') + '">' + hashColor('' + toId(targetUser.name) + ''));
		}
		var verify = /^#[0-9A-F]{6}$/i;
		if (verify.test(target)) {
			this.sendReplyBox('<center><b><font size="5" color="' + target + '">' + target + '</font></b></center>');
		} else {
			this.sendReplyBox('Could not find a valid color to match your hex code');
		}
	},

	mee: function (target, room, user, connection) {
		// By default, /mee allows a blank message
		if (target) target = this.canTalk(target);

		if (!target) return;

		var message = '/mee ' + target;
		return message;
	},

	avatar: function (target, room, user) {
		if (!target) return this.parse('/avatars');
		var parts = target.split(',');
		var avatar = parseInt(parts[0]);
		if (!avatar || avatar > 294 || avatar < 1) {
			if (!parts[1]) {
				this.sendReply("Invalid avatar.");
			}
			return false;
		}

		user.avatar = avatar;
		if (!parts[1]) {
			this.sendReply("Avatar changed to:\n" +
				'|raw|<img src="//play.pokemonshowdown.com/sprites/trainers/' + avatar + '.png" alt="" width="80" height="80" />');
		}
	},

	logout: function (target, room, user) {
		user.resetName();
	},

	r: 'reply',
	reply: function (target, room, user) {
		if (!target) return this.parse('/help reply');
		if (!user.lastPM) {
			return this.sendReply("No one has PMed you yet.");
		}
		return this.parse('/msg ' + (user.lastPM || '') + ', ' + target);
	},

	pm: 'msg',
	whisper: 'msg',
	w: 'msg',
	msg: function (target, room, user) {
		if (!target) return this.parse('/help msg');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!target) {
			this.sendReply("You forgot the comma.");
			return this.parse('/help msg');
		}
		if (!targetUser || !targetUser.connected) {
			if (targetUser && !targetUser.connected) {
				this.popupReply("User " + this.targetUsername + " is offline.");
			} else if (!target) {
				this.popupReply("User " + this.targetUsername + " not found. Did you forget a comma?");
			} else {
				this.popupReply("User "  + this.targetUsername + " not found. Did you misspell their name?");
			}
			return this.parse('/help msg');
		}

		if (Config.pmmodchat) {
			var userGroup = user.group;
			if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
				var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
				this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to PM users.");
				return false;
			}
		}

		if (user.locked && !targetUser.can('lock', user)) {
			return this.popupReply("You can only private message members of the moderation team (users marked by %, @, &, or ~) when locked.");
		}
		if (targetUser.locked && !user.can('lock', targetUser)) {
			return this.popupReply("This user is locked and cannot PM.");
		}
		if (targetUser.ignorePMs && !user.can('lock')) {
			if (!targetUser.can('lock')) {
				return this.popupReply("This user is blocking Private Messages right now.");
			} else if (targetUser.can('hotpatch')) {
				return this.popupReply("This admin is too busy to answer Private Messages right now. Please contact a different staff member.");
			}
		}

		target = this.canTalk(target, null);
		if (!target) return false;

		var message = '|pm|' + user.getIdentity() + '|' + targetUser.getIdentity() + '|' + target;
		user.send(message);
		if (targetUser !== user) {
			if (ShadowBan.isShadowBanned(user)) {
				ShadowBan.room.add('|c|' + user.getIdentity() + "|__(Private to " + targetUser.getIdentity() + ")__ " + target);
			} else {
				targetUser.send(message);
			}
		}
		targetUser.lastPM = user.userid;
		user.lastPM = targetUser.userid;
	},

	tell: function(target, room, user) {
		if (user.locked) return this.sendReply('You cannot use this command while locked.');
		if (user.forceRenamed) return this.sendReply('You cannot use this command while under a name that you have been forcerenamed to.');
		if (user.ignoreTells) return this.popup('This user is blocking Tells right now.');
		if (!target) return this.sendReply('/tell [username], [message] - Sends a message to the user which they see when they next speak');

		var targets = target.split(',');
		if (!targets[1]) return this.parse('/help tell');
		var targetUser = toId(targets[0]);

		if (targets >= 2) return this.parse('/tell [username], [message] - Try removing any extra commas in the message.');

		if (targetUser.length > 18) {
			return this.sendReply('The name of user "' + this.targetUsername + '" is too long.');
		}

		if (!tells[targetUser]) tells[targetUser] = [];
		if (tells[targetUser].length === 5) return this.sendReply('User ' + targetUser + ' has too many tells queued.');

		var date = Date();
		var message = '|raw|' + date.substring(0, date.indexOf('GMT') - 1) + ' - <b>' + user.getIdentity() + '</b> said: ' + targets[1].trim();
		if (message.length > 500) return this.sendReply('Your tell exceeded the maximum length.');
		tells[targetUser].add(message);

		return this.sendReply('Message "' + targets[1] + '" sent to ' + targetUser + '.');
	},

	blocktell: 'ignoretells',
	blocktells: 'ignoretells',
	ignoretell: 'ignoretells',
	ignoretells: function (target, room, user) {
		if (user.ignoreTells) return this.sendReply("You are already blocking Tells!");
		user.ignoreTells = true;
		return this.sendReply("You are now blocking Tells.");
	},

	unblocktell: 'unignoretells',
	unblocktells: 'unignoretells',
	unignoretell: 'unignoretells',
	unignoretells: function (target, room, user) {
		if (!user.ignorePMs) return this.sendReply("You are not blocking Tells!");
		user.ignoreTells = false;
		return this.sendReply("You are no longer blocking Tells.");
	},

	blockpm: 'ignorepms',
	blockpms: 'ignorepms',
	ignorepm: 'ignorepms',
	ignorepms: function (target, room, user) {
		if (user.ignorePMs) return this.sendReply("You are already blocking Private Messages!");
		if (user.can('lock') && !user.can('hotpatch')) return this.sendReply("You are not allowed to block Private Messages.");
		user.ignorePMs = true;
		return this.sendReply("You are now blocking Private Messages.");
	},

	unblockpm: 'unignorepms',
	unblockpms: 'unignorepms',
	unignorepm: 'unignorepms',
	unignorepms: function (target, room, user) {
		if (!user.ignorePMs) return this.sendReply("You are not blocking Private Messages!");
		user.ignorePMs = false;
		return this.sendReply("You are no longer blocking Private Messages.");
	},

	makechatroom: function (target, room, user) {
		if (!this.can('makeroom')) return;
		if (!target) return this.parse('/help makechatroom');
		var id = toId(target);
		if (!id) return this.parse('/help makechatroom');
		if (Rooms.rooms[id]) return this.sendReply("The room '" + target + "' already exists.");
		if (Rooms.global.addChatRoom(target)) {
			return this.sendReply("The room '"+target+"' was created.");
			if (Rooms.rooms.logroom) Rooms.rooms.logroom.addRaw('ROOM LOG ' + user.name + ' has made the room ' + target + '.');
			this.logModCommand('Room '+target+' has been created by '+user.name+'.');
		}
		return this.sendReply("An error occurred while trying to create the room '" + target + "'.");
	},

	deletechatroom: 'deregisterchatroom',
	deregisterchatroom: function (target, room, user) {
		if (!this.can('makeroom')) return;
		var id = toId(target);
		if (!id) return this.parse('/help deregisterchatroom');
		var targetRoom = Rooms.get(id);
		if (!targetRoom) return this.sendReply("The room '" + target + "' doesn't exist.");
		target = targetRoom.title || targetRoom.id;
		if (Rooms.global.deregisterChatRoom(id)) {
			this.sendReply("The room '" + target + "' was deregistered.");
			this.sendReply("It will be deleted as of the next server restart.");
			this.logModCommand('Room '+id+' has been deleted by '+user.name+'.');
			return;
		}
		return this.sendReply("The room '" + target + "' isn't registered.");
	},

    	makeprivate: 'privateroom',
    	toggleprivate: 'privateroom',
	privateroom: function (target, room, user) {
		if (!this.can('privateroom', null, room)) return;
		if (target === 'off') {
			delete room.isPrivate;
			this.addModCommand("" + user.name + " made this room public.");
			if (room.chatRoomData) {
				delete room.chatRoomData.isPrivate;
				Rooms.global.writeChatRoomData();
			}
		} else {
			room.isPrivate = true;
			this.addModCommand("" + user.name + " made this room private.");
			if (room.chatRoomData) {
				room.chatRoomData.isPrivate = true;
				Rooms.global.writeChatRoomData();
			}
		}
	},

	leagueroom: function (target, room, user) {
		if (!this.can('makeroom')) return;
		if (!room.chatRoomData) {
			return this.sendReply('/leagueroom - This room can\'t be marked as a league');
		}
		if (target === 'off') {
			delete room.isLeague;
			this.addModCommand(user.name+' has made this chat room a normal room.');
			delete room.chatRoomData.isLeague;
			Rooms.global.writeChatRoomData();
		} else {
			room.isLeague = true;
			this.addModCommand(user.name+' made this room a league room.');
			room.chatRoomData.isLeague = true;
			Rooms.global.writeChatRoomData();
		}
	},

	modjoin: function (target, room, user) {
		if (!this.can('privateroom', null, room)) return;
		if (target === 'off') {
			delete room.modjoin;
			this.addModCommand("" + user.name + " turned off modjoin.");
			if (room.chatRoomData) {
				delete room.chatRoomData.modjoin;
				Rooms.global.writeChatRoomData();
			}
		} else {
			room.modjoin = true;
			this.addModCommand("" + user.name + " turned on modjoin.");
			if (room.chatRoomData) {
				room.chatRoomData.modjoin = true;
				Rooms.global.writeChatRoomData();
			}
			if (!room.modchat) this.parse('/modchat ' + Config.groupsranking[1]);
			if (!room.isPrivate) this.parse('/privateroom');
		}
	},

	officialchatroom: 'officialroom',
	officialroom: function (target, room, user) {
		if (!this.can('makeroom')) return;
		if (!room.chatRoomData) {
			return this.sendReply("/officialroom - This room can't be made official");
		}
		if (target === 'off') {
			delete room.isOfficial;
			this.addModCommand("" + user.name + " made this chat room unofficial.");
			delete room.chatRoomData.isOfficial;
			Rooms.global.writeChatRoomData();
		} else {
			room.isOfficial = true;
			this.addModCommand("" + user.name + " made this chat room official.");
			room.chatRoomData.isOfficial = true;
			Rooms.global.writeChatRoomData();
		}
	},

	closeleague: 'openleague',
	openleague: function (target, room, user, connection, cmd) {
		if (!room.isLeague) return this.sendReply("This is not a league room, if it is, get a Leader or Admin to set the room as a league room.");
		if (!this.can('roommod', null, room)) return false;
		if (!room.chatRoomData) {
			return this.sendReply("This room cannot have a league toggle option.");
		}
		if (cmd === 'closeleague') {
			if (!room.isOpen) return this.sendReply('The league is already marked as closed.');
			delete room.isOpen;
			delete room.chatRoomData.isOpen;
			Rooms.global.writeChatRoomData();
			return this.sendReply('This league has now been marked as closed.');
		}
		else {
			if (room.isOpen) return this.sendReply('The league is already marked as open.');
			room.isOpen = true;
			room.chatRoomData.isOpen = true;
			Rooms.global.writeChatRoomData();
			return this.sendReply('This league has now been marked as open.');
		}
	},

	leaguestatus: function (target, room, user) {
		if (!room.isLeague) return this.sendReply("This is not a league room, if it is, get a Leader or Admin to set the room as a league room.");
		if (!this.canBroadcast()) return;
		if (room.isOpen) {
			return this.sendReplyBox(room.title+' is <font color="green"><b>open</b></font> to challengers.');
		}
		else if (!room.isOpen) {
			return this.sendReplyBox(room.title+' is <font color="red"><b>closed</b></font> to challengers.');
		}
		else return this.sendReply('This league does not have a status set.');
	},

	roomfounder: function (target, room, user) {
		if (!room.chatRoomData) {
			return this.sendReply("/roomfounder - This room isn't designed for per-room moderation to be added.");
		}
		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");
		if (!this.can('makeroom')) return false;
		if (!room.auth) room.auth = room.chatRoomData.auth = {};
		var name = targetUser.name;
		room.auth[targetUser.userid] = '#';
		room.founder = targetUser.userid;
		this.addModCommand(''+name+' was appointed to Room Founder by '+user.name+'.');
		room.onUpdateIdentity(targetUser);
		room.chatRoomData.founder = room.founder;
		Rooms.global.writeChatRoomData();
	},

	roomalias: function (target, room, user) {
		if (!room.chatRoomData) return this.sendReply("This room isn't designed for aliases.");
		if (!target) {
			if (!room.chatRoomData.aliases || !room.chatRoomData.aliases.length) return this.sendReplyBox("This room does not have any aliases.");
			return this.sendReplyBox("This room has the following aliases: " + room.chatRoomData.aliases.join(", ") + "");
		}
		if (!this.can('setalias')) return false;
		var alias = toId(target);
		if (!alias.length) return this.sendReply("Only alphanumeric characters are valid in an alias.");
		if (Rooms.get(alias) || Rooms.aliases[alias]) return this.sendReply("You cannot set an alias to an existing room or alias.");

		this.privateModCommand("(" + user.name + " added the room alias '" + target + "'.)");

		if (!room.chatRoomData.aliases) room.chatRoomData.aliases = [];
		room.chatRoomData.aliases.push(alias);
		Rooms.aliases[alias] = room;
		Rooms.global.writeChatRoomData();
	},

	removeroomalias: function (target, room, user) {
		if (!room.chatRoomData) return this.sendReply("This room isn't designed for aliases.");
		if (!room.chatRoomData.aliases) return this.sendReply("This room does not have any aliases.");
		if (!this.can('setalias')) return false;
		var alias = toId(target);
		if (!alias.length || !Rooms.aliases[alias]) return this.sendReply("Please specify an existing alias.");
		if (Rooms.aliases[alias] !== room) return this.sendReply("You may only remove an alias from the current room.");

		this.privateModCommand("(" + user.name + " removed the room alias '" + target + "'.)");

		var aliasIndex = room.chatRoomData.aliases.indexOf(alias);
		if (aliasIndex >= 0) {
			room.chatRoomData.aliases.splice(aliasIndex, 1);
			delete Rooms.aliases[alias];
			Rooms.global.writeChatRoomData();
		}
	},

	roomowner: function (target, room, user) {
		if (!room.chatRoomData) {
			return this.sendReply("/roomowner - This room isn't designed for per-room moderation to be added");
		}
		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;

		if (!targetUser) return this.sendReply("User '" + this.targetUsername + "' is not online.");

		if (!room.founder) return this.sendReply('The room needs a room founder before it can have a room owner.');
		if (room.founder != user.userid && !this.can('makeroom')) return this.sendReply('/roomowner - Access denied.');

		if (!room.auth) room.auth = room.chatRoomData.auth = {};

		var name = targetUser.name;

		room.auth[targetUser.userid] = '#';
		this.addModCommand("" + name + " was appointed Room Owner by " + user.name + ".");
		room.onUpdateIdentity(targetUser);
		Rooms.global.writeChatRoomData();
	},

	roomdeowner: 'deroomowner',
	deroomowner: function (target, room, user) {
		if (!room.auth) {
			return this.sendReply("/roomdeowner - This room isn't designed for per-room moderation");
		}
		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);
		if (!userid || userid === '') return this.sendReply("User '" + name + "' does not exist.");

		if (room.auth[userid] !== '#') return this.sendReply("User '"+name+"' is not a room owner.");
		if (!room.founder || user.userid != room.founder && !this.can('makeroom', null, room)) return false;

		delete room.auth[userid];
		this.sendReply("(" + name + " is no longer Room Owner.)");
		if (targetUser) targetUser.updateIdentity();
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},

	roomdemote: 'roompromote',
	roompromote: function(target, room, user, connection, cmd) {
		if (!room.auth) {
			this.sendReply("/roompromote - This room isn't designed for per-room moderation");
			return this.sendReply("Before setting room mods, you need to set it up with /roomowner");
		}
		if (!target) return this.parse('/help roompromote');

		var target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var userid = toId(this.targetUsername);
		var name = targetUser ? targetUser.name : this.targetUsername;

		var currentGroup = (room.auth[userid] || ' ');
		if (!targetUser && !room.auth[userid]) {
			return this.sendReply("User '"+this.targetUsername+"' is offline and unauthed, and so can't be promoted.");
		}

		var nextGroup = target || Users.getNextGroupSymbol(currentGroup, cmd === 'roomdemote', true);
		if (target === 'deauth') nextGroup = Config.groupsranking[0];
		if (!Config.groups[nextGroup]) {
			return this.sendReply('Group \'' + nextGroup + '\' does not exist.');
		}
		if (currentGroup !== ' ' && !user.can('room'+Config.groups[currentGroup].id, null, room)) {
			return this.sendReply('/' + cmd + ' - Access denied for promoting from '+Config.groups[currentGroup].name+'.');
		}
		if (nextGroup !== ' ' && !user.can('room'+Config.groups[nextGroup].id, null, room)) {
			return this.sendReply('/' + cmd + ' - Access denied for promoting to '+Config.groups[nextGroup].name+'.');
		}
		if (currentGroup === nextGroup) {
			return this.sendReply("User '"+this.targetUsername+"' is already a "+(Config.groups[nextGroup].name || 'regular user')+" in this room.");
		}
		if (Config.groups[nextGroup].globalonly) {
			return this.sendReply("The rank of "+Config.groups[nextGroup].name+" is global-only and can't be room-promoted to.");
		}
		targetUserGroup = ' ';
		if (Users.usergroups[userid]) {
			targetUserGroup = Users.usergroups[userid].substr(0,1);
		}
		if (Config.groups[nextGroup].rank < Config.groups[targetUserGroup].rank && room.isOfficial && Config.groups[nextGroup].rank > 0) return this.sendReply(name+' is a Global '+Config.groups[targetUserGroup].name+' and can not be demoted to a lower room rank.');

		var isDemotion = (Config.groups[nextGroup].rank < Config.groups[currentGroup].rank);
		var groupName = (Config.groups[nextGroup].name || nextGroup || '').trim() || 'a regular user';

		if (nextGroup === ' ') {
			delete room.auth[userid];
		} else {
			room.auth[userid] = nextGroup;
		}

		if (isDemotion) {
			this.addModCommand(''+name+' was appointed to Room ' + groupName + ' by '+user.name+'.');
			if (targetUser) {
				targetUser.popup('You were appointed to Room ' + groupName + ' by ' + user.name + '.');
			}
		} else {
			this.addModCommand(''+name+' was appointed to Room ' + groupName + ' by '+user.name+'.');
		}
		if (targetUser) {
			targetUser.updateIdentity();
		}
		if (room.chatRoomData) {
			Rooms.global.writeChatRoomData();
		}
	},

	lockroom: function(target, room, user) {
		if (!room.auth) {
			return this.sendReply("Only unofficial chatrooms can be locked.");
		}
		if (room.auth[user.userid] != '#' && user.group != '~') {
			return this.sendReply('/lockroom - Access denied.');
		}
		room.lockedRoom = true;
		this.addModCommand(user.name + ' has locked the room.');
	},

	unlockroom: function(target, room, user) {
		if (!room.auth) {
			return this.sendReply("Only unofficial chatrooms can be unlocked.");
		}
		if (room.auth[user.userid] != '#' && user.group != '~') {
			return this.sendReply('/unlockroom - Access denied.');
		}
		room.lockedRoom = false;
		this.addModCommand(user.name + ' has unlocked the room.');
	},

	roomdesc: function (target, room, user) {
		if (!target) {
			if (!this.canBroadcast()) return;
			var re = /(https?:\/\/(([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?))/g;
			if (!room.desc) return this.sendReply("This room does not have a description set.");
			this.sendReplyBox("The room description is: " + room.desc.replace(re, '<a href="$1">$1</a>'));
			return;
		}
		if (!this.can('roommod', null, room)) return false;
		if (target.length > 80) return this.sendReply("Error: Room description is too long (must be at most 80 characters).");

		room.desc = target;
		this.sendReply("(The room description is now: " + target + ")");

		this.privateModCommand("(" + user.name + " changed the roomdesc to: " + target + ".)");

		if (room.chatRoomData) {
			room.chatRoomData.desc = room.desc;
			Rooms.global.writeChatRoomData();
		}
	},

	rk: 'roomkick',
 	rkick: 'roomkick',
 	kick: 'roomkick',
 	roomkick: function(target, room, user){
 		//if (!room.auth && room.id !== "staff") return this.sendReply('/rkick is designed for rooms with their own auth.');
 		if (!this.can('roommod', null, room)) return false;
 		if (!target) return this.sendReply('/rkick [username] - kicks the user from the room. Requires: @ & ~');

 		target = this.splitTarget(target);
		var targetUser = this.targetUser;

 		if (!targetUser || !targetUser.connected) return this.sendReply('User '+target+' not found.');
 		if (!Rooms.rooms[room.id].users[targetUser.userid]) return this.sendReply(target+' is not in this room.');
 		if (targetUser.frostDev) return this.sendReply('Frost Developers can\'t be room kicked');
 		targetUser.popup('You have been kicked from room '+ room.title +' by '+user.name+'.');
 		targetUser.leaveRoom(room);
 		this.addModCommand(targetUser.name + ' has been kicked from room by '+ user.name + '.' + (target ? " (" + target + ")" : ""));
	},

	roomban: function (target, room, user, connection) {
		if (!target) return this.parse('/help roomban');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);

		if (!userid || !targetUser) return this.sendReply("User '" + name + "' does not exist.");
		if (targetUser.can('seniorstaff')) return this.sendReply('Senior Staff members can not be room banned.');

		if (!this.can('ban', targetUser, room)) return false;
		if (!room.bannedUsers || !room.bannedIps) {
			return this.sendReply("Room bans are not meant to be used in room " + room.id + ".");
		}
		if (room.bannedUsers[userid] || room.bannedIps[targetUser.latestIp]) return this.sendReply("User " + targetUser.name + " is already banned from room " + room.id + ".");
		room.bannedUsers[userid] = true;
		for (var ip in targetUser.ips) {
			room.bannedIps[ip] = true;
		}
		targetUser.popup("" + user.name + " has banned you from the room " + room.id + ". To appeal the ban, PM the moderator that banned you or a room owner." + (target ? " (" + target + ")" : ""));
		this.addModCommand("" + targetUser.name + " was banned from room " + room.id + " by " + user.name + "." + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) {
			this.privateModCommand("(" + targetUser.name + "'s alts were also banned from room " + room.id + ": " + alts.join(", ") + ")");
			for (var i = 0; i < alts.length; ++i) {
				var altId = toId(alts[i]);
				this.add('|unlink|' + altId);
				room.bannedUsers[altId] = true;
				Users.getExact(altId).leaveRoom(room.id);
			}
		}
		this.add('|unlink|' + this.getLastIdOf(targetUser));
		if (!targetUser.can('bypassall')) targetUser.leaveRoom(room.id);
	},

	unroomban: 'roomunban',
	roomunban: function (target, room, user, connection) {
		if (!target) return this.parse('/help roomunban');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var name = this.targetUsername;
		var userid = toId(name);
		var success;

		if (!userid || !targetUser) return this.sendReply("User '" + name + "' does not exist.");

		if (!this.can('ban', targetUser, room)) return false;
		if (!room.bannedUsers || !room.bannedIps) {
			return this.sendReply("Room bans are not meant to be used in room " + room.id + ".");
		}
		if (room.bannedUsers[userid]) {
			delete room.bannedUsers[userid];
			success = true;
		}
		for (var ip in targetUser.ips) {
			if (room.bannedIps[ip]) {
				delete room.bannedIps[ip];
				success = true;
			}
		}
		if (!success) return this.sendReply("User " + targetUser.name + " is not banned from room " + room.id + ".");

		targetUser.popup("" + user.name + " has unbanned you from the room " + room.id + ".");
		this.addModCommand("" + targetUser.name + " was unbanned from room " + room.id + " by " + user.name + ".");
		var alts = targetUser.getAlts();
		if (!alts.length) return;
		for (var i = 0; i < alts.length; ++i) {
			var altId = toId(alts[i]);
			if (room.bannedUsers[altId]) delete room.bannedUsers[altId];
		}
		this.privateModCommand("(" + targetUser.name + "'s alts were also unbanned from room " + room.id + ": " + alts.join(", ") + ")");
	},

	roomauth: function (target, room, user, connection) {
		if (!room.auth) return this.sendReply("/roomauth - This room isn't designed for per-room moderation and therefore has no auth list.");
		var buffer = [];
		var owners = [];
		var mods = [];
		var drivers = [];
		var voices = [];

		room.owners = ''; room.admins = ''; room.leaders = ''; room.mods = ''; room.drivers = ''; room.voices = '';
		for (var u in room.auth) {
			if (room.auth[u] == '#') {
				room.owners = room.owners + u + ',';
			}
			if (room.auth[u] == '@') {
				room.mods = room.mods + u + ',';
			}
			if (room.auth[u] == '%') {
				room.drivers = room.drivers + u + ',';
			}
			if (room.auth[u] == '+') {
				room.voices = room.voices + u + ',';
			}
		}

		if (!room.founder) founder = '';
		if (room.founder) founder = room.founder;

		room.owners = room.owners.split(',');
		room.mods = room.mods.split(',');
		room.drivers = room.drivers.split(',');
		room.voices = room.voices.split(',');

		for (var u in room.owners) {
			if (room.owners[u] != '') owners.push(room.owners[u]);
		}

		for (var u in room.mods) {
			if (room.mods[u] != '') mods.push(room.mods[u]);
		}
		for (var u in room.drivers) {
			if (room.drivers[u] != '') drivers.push(room.drivers[u]);
		}
		for (var u in room.voices) {
			if (room.voices[u] != '') voices.push(room.voices[u]);
		}
		if (owners.length > 0) {
			owners = owners.join(', ');
		}
		if (mods.length > 0) {
			mods = mods.join(', ');
		}
		if (drivers.length > 0) {
			drivers = drivers.join(', ');
		}
		if (voices.length > 0) {
			voices = voices.join(', ');
		}
		connection.popup('**Founder:** ' + founder + '\n\n**Owners:** ' + owners + '\n\n**Moderators:** ' + mods + '\n\n**Drivers:** ' + drivers + '\n\n**Voices:** ' + voices);
	},

	stafflist: function (target, room, user, connection) {
		var buffer = [];
		var admins = [];
		var leaders = [];
		var mods = [];
		var drivers = [];
		var voices = [];

		admins2 = ''; leaders2 = ''; mods2 = ''; drivers2 = ''; voices2 = '';
		stafflist = fs.readFileSync('config/usergroups.csv','utf8');
		stafflist = stafflist.split('\n');
		for (var u in stafflist) {
			line = stafflist[u].split(',');
			if (line[1] == '~') {
				admins2 = admins2 + line[0] + ',';
			}
			if (line[1] == '&') {
				leaders2 = leaders2 + line[0] + ',';
			}
			if (line[1] == '@') {
				mods2 = mods2 + line[0] + ',';
			}
			if (line[1] == '%') {
				drivers2 = drivers2 + line[0] + ',';
			}
			if (line[1] == '+') {
				voices2 = voices2 + line[0] + ',';
			}
		}
		admins2 = admins2.split(',');
		leaders2 = leaders2.split(',');
		mods2 = mods2.split(',');
		drivers2 = drivers2.split(',');
		voices2 = voices2.split(',');
		for (var u in admins2) {
			if (admins2[u] != '') admins.push(admins2[u]);
		}
		for (var u in leaders2) {
			if (leaders2[u] != '') leaders.push(leaders2[u]);
		}
		for (var u in mods2) {
			if (mods2[u] != '') mods.push(mods2[u]);
		}
		for (var u in drivers2) {
			if (drivers2[u] != '') drivers.push(drivers2[u]);
		}
		for (var u in voices2) {
			if (voices2[u] != '') voices.push(voices2[u]);
		}
		if (admins.length > 0) {
			admins = admins.join(', ');
		}
		if (leaders.length > 0) {
			leaders = leaders.join(', ');
		}
		if (mods.length > 0) {
			mods = mods.join(', ');
		}
		if (drivers.length > 0) {
			drivers = drivers.join(', ');
		}
		if (voices.length > 0) {
			voices = voices.join(', ');
		}
		connection.popup('**Administrators:** ' + admins + '\n\n**Leaders:** ' + leaders + '\n\n**Moderators:** ' + mods + '\n\n**Drivers:** ' + drivers + '\n\n**Voices:** ' + voices);
	},

	leave: 'part',
	part: function (target, room, user, connection) {
		if (room.id === 'global') return false;
		var targetRoom = Rooms.get(target);
		if (target && !targetRoom) {
			return this.sendReply("The room '" + target + "' does not exist.");
		}
		user.leaveRoom(targetRoom || room, connection);
	},

	/*********************************************************
	 * Moderating: Punishments
	 *********************************************************/

	warn: function (target, room, user) {
		if (!target) return this.parse('/help warn');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		var warnMax = 4;
		function isOdd(num) { return num % 2;}

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) return this.sendReply("User '" + this.targetUsername + "' does not exist.");
		if (room.isPrivate && room.auth) {
			return this.sendReply("You can't warn here: This is a privately-owned room not subject to global rules.");
		}
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
		}
		if (!this.can('warn', targetUser, room)) return false;
		if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before warning them.');

		targetUser.warnTimes += 1;
		targetUser.punished = true;
		targetUser.punishTimer = setTimeout(function(){
			targetUser.punished = false;
		},7000);

		if (targetUser.warnTimes >= warnMax && !room.auth) {
			if (targetUser.warnTimes === 4) {
				targetUser.popup('You have been automatically muted for 7 minutes due to being warned '+warnMax+' times.');
				targetUser.mute(room.id, 7*60*1000);
				this.addModCommand(''+targetUser.name+' was automatically muted for 7 minutes.');
				var alts = targetUser.getAlts();
				if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "), room.id);
				return;
			}
			else if (targetUser.warnTimes >= 6 && isOdd(targetUser.warnTimes) === 0) {
				targetUser.popup('You have been automatically muted for 60 minutes due to being warned '+warnMax+' or more times.');
				targetUser.mute(room.id, 60*60*1000);
				this.addModCommand(''+targetUser.name+' was automatically muted for 60 minutes.');
				var alts = targetUser.getAlts();
				if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "), room.id);
				return;
			}
		}

		this.addModCommand(''+targetUser.name+' was warned by '+user.name+'.' + (target ? " (" + target + ")" : ""));
		targetUser.send('|c|~|/warn '+target);
		try {
			frostcommands.addWarnCount(user.userid);
		} catch (e) {
			return;
		}
		this.add('|unlink|' + this.getLastIdOf(targetUser));
	},

	kickto: 'redir',
	redirect: 'redir',
	redir: function (target, room, user, connection) {
		if (!target) return this.parse('/help redirect');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		var targetRoom = Rooms.get(target) || Rooms.get(toId(target));
		if (!targetRoom) {
			return this.sendReply("/help redir - You need to add a room to redirect the user to");
		}
		if (!this.can('warn', targetUser, room) || !this.can('warn', targetUser, targetRoom)) return false;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply("User " + this.targetUsername + " not found.");
		}
		if (Rooms.rooms[targetRoom.id].users[targetUser.userid]) {
			return this.sendReply("User " + targetUser.name + " is already in the room " + target + "!");
		}
		if (!Rooms.rooms[room.id].users[targetUser.userid]) {
			return this.sendReply("User " + this.targetUsername + " is not in the room " + room.id + ".");
		}
		if (targetUser.joinRoom(targetRoom.id) === false) return this.sendReply("User " + targetUser.name + " could not be joined to room " + target + ". They could be banned from the room.");
		var roomName = (targetRoom.isPrivate)? "a private room" : "room " + targetRoom.title;
		this.addModCommand("" + targetUser.name + " was redirected to " + roomName + " by " + user.name + ".");
		targetUser.leaveRoom(room);
	},

	m: 'mute',
	mute: function (target, room, user) {
		if (!target) return this.parse('/help mute');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("User '" + this.targetUsername + "' does not exist.");
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
		}
		if (!this.can('mute', targetUser, room)) return false;
		if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before muting them.');
		if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
			var problem = " but was already " + (!targetUser.connected ? "offline" : targetUser.locked ? "locked" : "muted");
			if (!target) {
				return this.privateModCommand("(" + targetUser.name + " would be muted by " + user.name + problem + ".)");
			}
			return this.addModCommand("" + targetUser.name + " would be muted by " + user.name + problem + "." + (target ? " (" + target + ")" : ""));
		}
		targetUser.punished = true;
		targetUser.punishTimer = setTimeout(function(){
			targetUser.punished = false;
		},7000);
		targetUser.popup(user.name+' has muted you for 7 minutes. '+target);
		this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 7 minutes.' + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) this.privateModCommand("(" + targetUser.name + "'s alts were also muted: " + alts.join(", ") + ")");
		this.add('|unlink|' + this.getLastIdOf(targetUser));

		targetUser.mute(room.id, 7 * 60 * 1000);
		try {
			frostcommands.addMuteCount(user.userid);
		} catch (e) {
			return;
		}
	},

	hm: 'hourmute',
	hourmute: function(target, room, user) {
		if (!target) return this.parse('/help hourmute');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("User '" + this.targetUsername + "' does not exist.");
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
		}
		if (!this.can('mute', targetUser, room)) return false;
		if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before muting them.');
		if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
			var problem = ' but was already '+(!targetUser.connected ? 'offline' : targetUser.locked ? 'locked' : 'muted');
			if (!target && !room.auth) {
				return this.privateModCommand('('+targetUser.name+' would be muted by '+user.name+problem+'.)');
			}
			return this.addModCommand(''+targetUser.name+' would be muted by '+user.name+problem+'.' + (target ? " (" + target + ")" : ""));
		}
		targetUser.punished = true;
		targetUser.punishTimer = setTimeout(function(){
			targetUser.punished = false;
		},7000);
		targetUser.popup(user.name+' has muted you for 60 minutes. '+target);
		this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 60 minutes.' + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "));
		targetUser.mute(room.id, 60*60*1000);
		this.add('|unlink|' + targetUser.userid);
		try {
			frostcommands.addMuteCount(user.userid);
		} catch (e) {
			return;
		}
	},

	dmute: 'daymute',
	daymute: function(target, room, user) {
		if (!target) return this.parse('/help hourmute');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply('The reason is too long. It cannot exceed ' + MAX_REASON_LENGTH + ' characters.');
		}
		if (!this.can('mute', targetUser, room)) return false;
		if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before muting them.');
		if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
			var problem = ' but was already '+(!targetUser.connected ? 'offline' : targetUser.locked ? 'locked' : 'muted');
			if (!target && !room.auth) {
				return this.privateModCommand('('+targetUser.name+' would be muted by '+user.name+problem+'.)');
			}
			return this.addModCommand(''+targetUser.name+' would be muted by '+user.name+problem+'.' + (target ? " (" + target + ")" : ""));
		}
		targetUser.punished = true;
		targetUser.punishTimer = setTimeout(function(){
			targetUser.punished = false;
		},7000);
		targetUser.popup(user.name+' has muted you for 24 hours. '+target);
		this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 24 hours.' + (target ? " (" + target + ")" : ""));
		var alts = targetUser.getAlts();
		if (alts.length) this.privateModCommand("(" + targetUser.name + "'s alts were also muted: " + alts.join(", ") + ")");
		this.add('|unlink|' + this.getLastIdOf(targetUser));

		targetUser.mute(room.id, 60 * 60 * 1000, true);
		try {
			frostcommands.addMuteCount(user.userid);
		} catch (e) {
			return;
		}
	},

	um: 'unmute',
	unmute: function (target, room, user) {
		if (!target) return this.parse('/help unmute');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		var targetUser = Users.get(target);
		if (!targetUser) return this.sendReply("User '" + target + "' does not exist.");
		if (!this.can('mute', targetUser, room)) return false;
		if (!targetUser.mutedRooms[room.id]) {
			return this.sendReply("" + targetUser.name + " is not muted.");
		}
		this.addModCommand(''+targetUser.name+' was unmuted by '+user.name+'.');
		targetUser.unmute(room.id);
	},

	l: 'lock',
	ipmute: 'lock',
	lock: function (target, room, user) {
		if (!target) return this.parse('/help lock');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) {
			return this.sendReply("User " + this.targetUser + " not found.");
		}
		if (!this.can('lock', targetUser)) return false;
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
		}
		if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before locking them.');
		if ((targetUser.locked || Users.checkBanned(targetUser.latestIp)) && !target) {
			var problem = " but was already " + (targetUser.locked ? "locked" : "banned");
			return this.privateModCommand("(" + targetUser.name + " would be locked by " + user.name + problem + ".)");
		}

		targetUser.punished = true;
		targetUser.punishTimer = setTimeout(function(){
			targetUser.punished = false;
		},7000);

		targetUser.popup(user.name+' has locked you from talking in chats, battles, and PMing regular users.\n\n'+target+'\n\nIf you feel that your lock was unjustified, you can still PM staff members (%, @, &, and ~) to discuss it.');
		if (Rooms.rooms.logroom) Rooms.rooms.logroom.addRaw('LOCK LOG: ' + user.name + ' has locked ' + targetUser.name + ' from ' + room.id + '.');
		this.addModCommand(""+targetUser.name+" was locked from talking by "+user.name+"." + (target ? " (" + target + ")" : ""),' ('+targetUser.latestIp+')');
		var alts = targetUser.getAlts();
		if (alts.length) {
			this.privateModCommand("(" + targetUser.name + "'s " + (targetUser.autoconfirmed ? " ac account: " + targetUser.autoconfirmed + ", " : "") + "locked alts: " + alts.join(", ") + ")");
		} else if (targetUser.autoconfirmed) {
			this.privateModCommand("(" + targetUser.name + "'s ac account: " + targetUser.autoconfirmed + ")");
		}
		this.add('|unlink|' + this.getLastIdOf(targetUser));

		targetUser.lock();
		try {
			frostcommands.addLockCount(user.userid);
		} catch (e) {
			return;
		}
	},

	unlock: function (target, room, user) {
		if (!target) return this.parse('/help unlock');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		if (!this.can('lock')) return false;
		if (!this.canTalk() && user.group !== '~') return false;

		var unlocked = Users.unlock(target);

		if (unlocked) {
			var names = Object.keys(unlocked);
			this.addModCommand(names.join(", ") + " " +
				((names.length > 1) ? "were" : "was") +
				" unlocked by " + user.name + ".");
		} else {
			this.sendReply("User '" + target + "' is not locked.");
		}
	},

	spam: 'shadowban',
	spamroom: 'shadowban',
	sban: 'shadowban',
	shadowban: function (target, room, user) {
		if (!target) return this.parse('/help shadowban');

		var params = this.splitTarget(target).split(',');
		var action = params[0].trim().toLowerCase();
		var reason = params.slice(1).join(',').trim();
		if (!(action in CommandParser.commands)) {
			action = 'mute';
			reason = params.join(',').trim();
		}

		if (!this.targetUser) {
			return this.sendReply("User '" + this.targetUsername + "' not found.");
		}
		if (!this.can('shadowban', this.targetUser)) return false;
		if (!this.targetUser.locked) return this.parse('/lock '+this.targetUsername+(','+reason || ''));

		var targets = ShadowBan.addUser(this.targetUser);
		if (targets.length === 0) {
			return this.sendReply("That user's messages are already being redirected to the shadow ban room.");
		}
		this.privateModCommand("(" + user.name + " has added to the shadow ban user list: " + targets.join(", ") + (reason ? " (" + reason + ")" : "") + ")");

		//return this.parse('/' + action + ' ' + this.targetUser.userid + ',' + reason);
	},

	unspam: 'unshadowban',
	unspamroom: 'unshadowban',
	unsban: 'unshadowban',
	unshadowban: function (target, room, user) {
		if (!target) return this.parse('/help unshadowban');
		this.splitTarget(target);

		if (!this.can('shadowban')) return false;

		var targets = ShadowBan.removeUser(this.targetUser || this.targetUsername);
		if (targets.length === 0) {
			return this.sendReply("That user is not in the shadow ban list.");
		}
		this.privateModCommand("(" + user.name + " has removed from the shadow ban user list: " + targets.join(", ") + ")");
	},

	lockdt: 'lockdetails',
	lockdetails: function (target, room, user) {
		if (!this.can('lock')) return false;
		var targetUser = Users.get(target);
		if (!targetUser) return this.sendReply("User '" + target + "' does not exist.");
		if (!targetUser.locked) return this.sendReply("User '" + targetUser.name + "' was not locked from chat.");
		var canIp = user.can('ip', targetUser);
		for (var ip in targetUser.ips) {
			if (Dnsbl.cache[ip]) return this.sendReply("User '" + targetUser.name + "' is locked due to their IP " + (canIp ? "(" + ip + ") " : "") + "being in a DNS-based blacklist" + (canIp ? " (" + Dnsbl.cache[ip] + ")." : "."));
		}
		return this.sendReply("User '" + targetUser.name + "' is locked for unknown reasons. Check their modlog?");
	},

	murder: 'ban',
	banana: 'ban',
	bh: 'ban',
	b: 'ban',
	ban: function(target, room, user, connection, cmd) {
		if (!target) return this.parse('/help ban');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply("User '" + this.targetUsername + "' does not exist.");
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
		}
		if (!this.can('ban', targetUser)) return false;
		if (Users.checkBanned(targetUser.latestIp) && !target && !targetUser.connected) {
			var problem = " but was already banned";
			return this.privateModCommand("(" + targetUser.name + " would be banned by " + user.name + problem + ".)");
		}

		targetUser.popup(user.name+" has banned you." + (Config.appealurl ? ("  If you feel that your banning was unjustified you can appeal the ban:\n" + Config.appealurl) : "") + "\n\n"+target);
		if (Rooms.rooms.logroom) Rooms.rooms.logroom.addRaw('BAN LOG: ' + user.name + ' has banned ' + targetUser.name + ' from ' + room.id + '.');

		if (cmd === 'murder') {
			this.addModCommand(""+targetUser.name+" was murdered by "+user.name+"." + (target ? " (" + target + ")" : ""), ' ('+targetUser.latestIp+')');
		} else if (cmd === 'banana') {
			this.addModCommand(""+targetUser.name+" was hit by "+user.name+"'s banana." + (target ? " (" + target + ")" : ""), ' ('+targetUser.latestIp+')');
		} else if (cmd === 'bh') {
			this.addModCommand(""+targetUser.name+" was hit by "+user.name+"'s banhammer." + (target ? " (" + target + ")" : ""), ' ('+targetUser.latestIp+')');
		} else {
			this.addModCommand(""+targetUser.name+" was banned by "+user.name+"." + (target ? " (" + target + ")" : ""), ' ('+targetUser.latestIp+')');
		}

		var alts = targetUser.getAlts();
		if (alts.length) {
			this.privateModCommand("(" + targetUser.name + "'s " + (targetUser.autoconfirmed ? " ac account: " + targetUser.autoconfirmed + ", " : "") + "banned alts: " + alts.join(", ") + ")");
			for (var i = 0; i < alts.length; ++i) {
				this.add('|unlink|' + toId(alts[i]));
			}
		} else if (targetUser.autoconfirmed) {
			this.privateModCommand("(" + targetUser.name + "'s ac account: " + targetUser.autoconfirmed + ")");
		}

		this.add('|unlink|' + this.getLastIdOf(targetUser));
		targetUser.ban();
		try {
			frostcommands.addBanCount(user.userid);
		} catch (e) {
			return;
		}
	},

	unban: function (target, room, user) {
		if (!target) return this.parse('/help unban');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		if (!this.can('ban')) return false;

		var name = Users.unban(target);

		if (name) {
			this.addModCommand("" + name + " was unbanned by " + user.name + ".");
		} else {
			this.sendReply("User '" + target + "' is not banned.");
		}
	},

	unbanall: function (target, room, user) {
		if (!this.can('rangeban')) return false;
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		// we have to do this the hard way since it's no longer a global
		for (var i in Users.bannedIps) {
			delete Users.bannedIps[i];
		}
		for (var i in Users.lockedIps) {
			delete Users.lockedIps[i];
		}
		this.addModCommand("All bans and locks have been lifted by " + user.name + ".");
	},

	banip: function (target, room, user) {
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		target = target.trim();
		if (!target) {
			return this.parse('/help banip');
		}
		if (!this.can('rangeban')) return false;
		if (Users.bannedIps[target] === '#ipban') return this.sendReply("The IP " + (target.charAt(target.length - 1) === '*' ? "range " : "") + target + " has already been temporarily banned.");

		Users.bannedIps[target] = '#ipban';
		this.addModCommand("" + user.name + " temporarily banned the " + (target.charAt(target.length - 1) === '*' ? "IP range" : "IP") + ": " + target);
	},

	unbanip: function (target, room, user) {
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		target = target.trim();
		if (!target) {
			return this.parse('/help unbanip');
		}
		if (!this.can('rangeban')) return false;
		if (!Users.bannedIps[target]) {
			return this.sendReply("" + target + " is not a banned IP or IP range.");
		}
		delete Users.bannedIps[target];
		this.addModCommand("" + user.name + " unbanned the " + (target.charAt(target.length - 1) === '*' ? "IP range" : "IP") + ": " + target);
	},

	flogout: 'forcelogout',
	forcelogout: function(target, room, user) {
		if(!user.can('hotpatch')) return;
		if (!this.canTalk()) return false;

		if (!target) return this.sendReply('/forcelogout [username], [reason] OR /flogout [username], [reason] - Reason is optional.');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;

		if (!targetUser) {
			return this.sendReply('User '+this.targetUsername+' not found.');
		}

		if (targetUser.can('hotpatch')) return this.sendReply('You cannot force logout another Admin.');

		this.addModCommand(''+targetUser.name+' was forcibly logged out by '+user.name+'.' + (target ? " (" + target + ")" : ""));

		this.logModCommand(user.name+' forcibly logged out '+targetUser.name);

		targetUser.resetName();
	},

	unlink: function(target, room, user) {
		if (!target) return this.parse('/help unlink');
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser) return this.sendReply('User '+this.targetUser+' not found.');
		if (!this.can('unlink', targetUser)) return this.sendReply('/unlink - Access denied.');
		this.privateModCommand('('+targetUser.name+' had their links unlinked by '+user.name+'. Any links they have posted will now be unclickable.)');
		this.add('|unlink|'+targetUser.name);
		for (var u in targetUser.prevNames) {
			this.add('|unlink|'+targetUser.prevNames[u]);
		}
	},

	/*********************************************************
	 * Moderating: Other
	 *********************************************************/

	mn: 'modnote',
	note: 'modnote',
	modnote: function(target, room, user, connection, cmd) {
		if (!target) return this.parse('/help note');
		if (!this.canTalk()) return this.sendReply('You are unable to speak in this room.');
		if (target.length > MAX_REASON_LENGTH) {
			return this.sendReply("The note is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
		}
		if (!this.can('mute', null, room)) return false;
		return this.privateModCommand("(" + user.name + " notes: " + target + ")");
	},

	demote: 'promote',
	promote: function (target, room, user, connection, cmd) {
		if (!target) return this.parse('/help promote');

		target = this.splitTarget(target, true);
		var targetUser = this.targetUser;
		var userid = toId(this.targetUsername);
		var name = targetUser ? targetUser.name : this.targetUsername;

		if (!userid) return this.parse('/help promote');

		var currentGroup = ((targetUser && targetUser.group) || Users.usergroups[userid] || ' ')[0];
		var nextGroup = target ? target : Users.getNextGroupSymbol(currentGroup, cmd === 'demote', true);
		if (target === 'deauth') nextGroup = Config.groupsranking[0];
		if (!Config.groups[nextGroup]) {
			return this.sendReply("Group '" + nextGroup + "' does not exist.");
		}
		if (Config.groups[nextGroup].roomonly) {
			return this.sendReply("Group '" + nextGroup + "' does not exist as a global rank.");
		}

		var groupName = Config.groups[nextGroup].name || "regular user";
		if (currentGroup === nextGroup) {
			return this.sendReply("User '" + name + "' is already a " + groupName);
		}
		if (!user.canPromote(currentGroup, nextGroup)) {
			return this.sendReply("/" + cmd + " - Access denied.");
		}

		if (!Users.setOfflineGroup(name, nextGroup)) {
			return this.sendReply("/promote - WARNING: This user is offline and could be unregistered. Use /forcepromote if you're sure you want to risk it.");
		}
		if (Config.groups[nextGroup].rank < Config.groups[currentGroup].rank) {
			this.privateModCommand("(" + name + " was demoted to " + groupName + " by " + user.name + ".)");
			if (targetUser) targetUser.popup("You were demoted to " + groupName + " by " + user.name + ".");
		} else {
			this.addModCommand("" + name + " was promoted to " + groupName + " by " + user.name + ".");
		}

		if (targetUser) targetUser.updateIdentity();
	},

	forcepromote: function (target, room, user) {
		// warning: never document this command in /help
		if (!this.can('forcepromote')) return false;
		target = this.splitTarget(target, true);
		var name = this.targetUsername;
		var nextGroup = target || Users.getNextGroupSymbol(' ', false);

		if (!Users.setOfflineGroup(name, nextGroup, true)) {
			return this.sendReply("/forcepromote - Don't forcepromote unless you have to.");
		}

		this.addModCommand("" + name + " was promoted to " + (Config.groups[nextGroup].name || "regular user") + " by " + user.name + ".");
	},

	deauth: function (target, room, user) {
		return this.parse('/demote ' + target + ', deauth');
	},

	modchat: function (target, room, user) {
		if (!target) return this.sendReply("Moderated chat is currently set to: " + room.modchat);
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		if (!this.can('modchat', null, room)) return false;

		if (room.modchat && room.modchat.length <= 1 && Config.groupsranking.indexOf(room.modchat) > 1 && !user.can('modchatall', null, room)) {
			return this.sendReply("/modchat - Access denied for removing a setting higher than " + Config.groupsranking[1] + ".");
		}

		target = target.toLowerCase();
		var currentModchat = room.modchat;
		switch (target) {
		case 'off':
		case 'false':
		case 'no':
		case ' ':
			room.modchat = false;
			break;
		case 'ac':
		case 'autoconfirmed':
			room.modchat = 'autoconfirmed';
			break;
		case '*':
		case 'player':
			target = '\u2605';
			/* falls through */
		default:
			if (!Config.groups[target]) {
				return this.parse('/help modchat');
			}
			if (Config.groupsranking.indexOf(target) > 1 && !user.can('modchatall', null, room)) {
				return this.sendReply("/modchat - Access denied for setting higher than " + Config.groupsranking[1] + ".");
			}
			room.modchat = target;
			break;
		}
		if (currentModchat === room.modchat) {
			return this.sendReply("Modchat is already set to " + currentModchat + ".");
		}
		if (!room.modchat) {
			this.add("|raw|<div class=\"broadcast-blue\"><b>Moderated chat was disabled!</b><br />Anyone may talk now.</div>");
		} else {
			var modchat = Tools.escapeHTML(room.modchat);
			this.add("|raw|<div class=\"broadcast-red\"><b>Moderated chat was set to " + modchat + "!</b><br />Only users of rank " + modchat + " and higher can talk.</div>");
		}
		this.logModCommand(user.name + " set modchat to " + room.modchat);

		if (room.chatRoomData) {
			room.chatRoomData.modchat = room.modchat;
			Rooms.global.writeChatRoomData();
		}
	},

	spop: 'sendpopup',
	sendpopup: function(target, room, user) {
		if (!this.can('popup')) return false;

		target = this.splitTarget(target);
		var targetUser = this.targetUser;

		if (!targetUser) return this.sendReply('/sendpopup [user], [message] - You missed the user.');
		if (!target) return this.sendReply('/sendpopup [user], [message] - You missed the message.');

		targetUser.popup(target);
		this.sendReply(targetUser.name + ' got the message as popup: ' + target);

		targetUser.send(user.name+' sent a popup message to you.');

		this.logModCommand(user.name+' sent a popup message to '+targetUser.name);
	},

	image: function(target, room, user) {
		if (!user.can('declare')) return false;
		if (!target) return this.sendReply('/image [url], [width percentile]');
		var targets = target.split(',');
		var url = targets[0];
		var width = targets[1];
		if (!url || !width) return this.sendReply('/image [url], [width percentile]');
		if (url.indexOf('.png') === -1 && url.indexOf('.jpg') === -1 && url.indexOf('.gif') === -1) {
			return this.sendReply('The url you supply must end in .png, .jpg or .gif.');
		}
		if (isNaN(width)) return this.sendReply('The width must be a number.');
		if (width < 1 || width > 100) return this.sendReply('The width must be greater than 0 but less than or equal to 100.');
		this.add('|raw|<center><img width="'+width+'%" src="'+url+'"></center>');
	},

	declaregreen: 'declare',
	declarered: 'declare',
	declare: function(target, room, user, connection, cmd) {
		if (!target) return this.parse('/help declare');
		if (!this.can('declare', null, room)) return false;

		if (!this.canTalk()) return;

		if (cmd === 'declare') {
			this.add('|raw|<div class="broadcast-blue"><b>'+target+'</b></div>');
		}
		else if (cmd === 'declarered') {
			this.add('|raw|<div class="broadcast-red"><b>'+target+'</b></div>');
		}
		else if (cmd === 'declaregreen') {
			this.add('|raw|<div class="broadcast-green"><b>'+target+'</b></div>');
		}
		this.logModCommand(user.name+' declared '+target);
	},

	gdeclarered: 'gdeclare',
	gdeclaregreen: 'gdeclare',
	gdeclare: function(target, room, user, connection, cmd) {
		if (!target) return this.parse('/help '+cmd);
		if (!this.can('gdeclare')) return false;
		var staff = '';
		staff = 'a ' + Config.groups[user.group].name;
		if (user.group == '~') staff = 'an Administrator';
		if (user.frostDev) staff = 'a Developer';

		//var roomName = (room.isPrivate)? 'a private room' : room.id;

		if (cmd === 'gdeclare'){
			for (var id in Rooms.rooms) {
				if (id !== 'global' && !Rooms.rooms[id].blockGlobalDeclares) {
					Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b><font size=1><i>Global declare from '+staff+'<br /></i></font size>'+target+'</b></div>');
					Rooms.rooms[id].update();
				}
			}
		}
		if (cmd === 'gdeclarered'){
			for (var id in Rooms.rooms) {
				if (id !== 'global' && !Rooms.rooms[id].blockGlobalDeclares) {
					Rooms.rooms[id].addRaw('<div class="broadcast-red"><b><font size=1><i>Global declare from '+staff+'<br /></i></font size>'+target+'</b></div>');
					Rooms.rooms[id].update();
				}
			}
		}
		else if (cmd === 'gdeclaregreen'){
			for (var id in Rooms.rooms) {
				if (id !== 'global' && !Rooms.rooms[id].blockGlobalDeclares) {
					Rooms.rooms[id].addRaw('<div class="broadcast-green"><b><font size=1><i>Global declare from '+staff+'<br /></i></font size>'+target+'</b></div>');
					Rooms.rooms[id].update();
				}
			}
		}
		this.logModCommand(user.name + " globally declared " + target);
	},

	pgdeclare: function(target, room, user) {
		if (!target) return this.parse('/help pgdeclare');
		if (!this.can('pgdeclare')) return;

		if (!this.canTalk()) return;

		for (var r in Rooms.rooms) {
			if (Rooms.rooms[r].type === 'chat' && !Rooms.rooms[r].blockGlobalDeclares) {
				Rooms.rooms[r].add('|raw|<b>'+target+'</b></div>');
				Rooms.rooms[r].update();
			}
		}

		this.logModCommand(user.name+' declared '+target+' to all rooms.');
	},

	staffdeclare: 'declaremod',
	modmsg: 'declaremod',
	moddeclare: 'declaremod',
	declaremod: function(target, room, user) {
		if (!target) return this.sendReply('/declaremod [message] - Also /moddeclare and /modmsg');
		if (!this.can('declare', null, room)) return false;

		if (!this.canTalk()) return;

		this.privateModCommand('|raw|<div class="broadcast-red"><b><font size=1><i>Staff declare from '+user.name+'<br /></i></font size>'+target+'</b></div>');

		this.logModCommand(user.name+' mod declared '+target);
	},

	cdeclare: 'chatdeclare',
	chatdeclare: function (target, room, user) {
		if (!target) return this.parse('/help chatdeclare');
		if (!this.can('gdeclare')) return false;

		for (var id in Rooms.rooms) {
			if (id !== 'global') if (Rooms.rooms[id].type !== 'battle' && !Rooms.rooms[id].blockGlobalDeclares) {
				Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b>'+target+'</b></div>');
				Rooms.rooms[id].update();
			}
		}
		this.logModCommand(user.name + " globally declared (chat level) " + target);
	},

	setmotd: 'motd',
	motd: function (target, room, user) {
		if (!this.can('declare')) return false;
		return this.sendReply('Command disabled.');
		if (!target || target.indexOf(',') == -1) {
			return this.sendReply('The proper syntax for this command is: /motd [message], [interval (minutes)]');
		}
		if (isMotd == true) {
			clearInterval(motd);
		}
		targets = target.split(',');
		message = targets[0];
		time = Number(targets[1]);
		if (isNaN(time)) {
			return this.sendReply('Make sure the time is just the number, and not any words.');
		}
		motd = setInterval(function() {Rooms.rooms.lobby.add('|raw|<div class = "infobox"><b>Message of the Day:</b><br />'+message)}, time * 60 * 1000);
		isMotd = true;
		this.logModCommand(user.name+' set the message of the day to: '+message+' for every '+time+' minutes.');
		return this.sendReply('The message of the day was set to "'+message+'" and it will be displayed every '+time+' minutes.');
	},

	clearmotd: 'cmotd',
	cmotd: function (target, room, user) {
		if (!this.can('declare')) return false;
		if (isMotd == false) {
			return this.sendReply('There is no motd right now.');
		}
		clearInterval(motd);
		this.logModCommand(user.name+' cleared the message of the day.');
		return this.sendReply('You cleared the message of the day.');
	},

	wall: 'announce',
	announce: function (target, room, user) {
		if (!target) return this.parse('/help announce');

		if (!this.can('announce', null, room)) return false;

		target = this.canTalk(target);
		if (!target) return;

		return '/announce ' + target;
	},

	fr: 'forcerename',
	forcerename: function (target, room, user) {
		if (!target) return this.parse('/help forcerename');
		if (user.locked || user.mutedRooms[room.id]) return this.sendReply("You cannot do this while unable to talk.");
		var commaIndex = target.indexOf(',');
		var targetUser, reason;
		if (commaIndex !== -1) {
			reason = target.substr(commaIndex + 1).trim();
			target = target.substr(0, commaIndex);
		}
		targetUser = Users.get(target);
		if (!targetUser) return this.sendReply("User '" + this.targetUsername + "' not found.");
		if (!this.can('forcerename', targetUser)) return false;

		if (targetUser.userid !== toId(target)) {
			return this.sendReply("User '" + target + "' had already changed its name to '" + targetUser.name + "'.");
		}

		var entry = targetUser.name + " was forced to choose a new name by " + user.name + (reason ? ": " + reason: "");
		this.privateModCommand("(" + entry + ")");
		Rooms.global.cancelSearch(targetUser);
		targetUser.resetName();
		targetUser.send("|nametaken||" + user.name + " has forced you to change your name. " + target);
	},

	cry: 'complain',
	bitch: 'complain',
	complaint: 'complain',
	complain: function(target, room, user) {
		if(!target) return this.parse('/help complaint');
		if (user.userid === "mentalninja") {
			user.ban();
			user.send('|popup|nice try fucker')
		}
		this.sendReplyBox('Thanks for your input. We\'ll review your feedback soon. The complaint you submitted was: ' + target);
		this.logComplaint(target);
	},

	complaintslist: 'complaintlist',
	complaintlist: function(target, room, user, connection) {
		if (!this.can('complaintlist')) return false;
		var lines = 0;
		if (!target.match('[^0-9]')) {
			lines = parseInt(target || 15, 10);
			if (lines > 100) lines = 100;
		}
		var filename = 'logs/complaint.txt';
		var command = 'tail -'+lines+' '+filename;
		var grepLimit = 100;
		if (!lines || lines < 0) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1,target.length-1);
			command = "awk '{print NR,$0}' "+filename+" | sort -nr | cut -d' ' -f2- | grep -m"+grepLimit+" -i '"+target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]')+"'";
		}

		require('child_process').exec(command, function(error, stdout, stderr) {
			if (error && stderr) {
				connection.popup('/complaintlist erred - the complaints list does not support Windows');
				console.log('/complaintlog error: '+error);
				return false;
			}
			if (lines) {
				if (!stdout) {
					connection.popup('The complaints list is empty. Great!');
				} else {
					connection.popup('Displaying the last '+lines+' lines of complaints:\n\n'+stdout);
				}
			} else {
				if (!stdout) {
					connection.popup('No complaints containing "'+target+'" were found.');
				} else {
					connection.popup('Displaying the last '+grepLimit+' logged actions containing "'+target+'":\n\n'+stdout);
				}
			}
		});
	},

	modlog: function (target, room, user, connection) {
		var lines = 0;
		// Specific case for modlog command. Room can be indicated with a comma, lines go after the comma.
		// Otherwise, the text is defaulted to text search in current room's modlog.
		var roomId = room.id;
		var hideIps = !user.can('ban');

		if (target.indexOf(',') > -1) {
			var targets = target.split(',');
			target = targets[1].trim();
			roomId = toId(targets[0]) || room.id;
		}

		// Let's check the number of lines to retrieve or if it's a word instead
		if (!target.match('[^0-9]')) {
			lines = parseInt(target || 15, 10);
			if (lines > 100) lines = 100;
		}
		var wordSearch = (!lines || lines < 0);

		// Control if we really, really want to check all modlogs for a word.
		var roomNames = '';
		var filename = '';
		var command = '';
		if (roomId === 'all' && wordSearch) {
			if (!this.can('modlog')) return;
			roomNames = 'all rooms';
			// Get a list of all the rooms
			var fileList = fs.readdirSync('logs/modlog');
			for (var i = 0; i < fileList.length; ++i) {
				filename += 'logs/modlog/' + fileList[i] + ' ';
			}
		} else {
			if (!this.can('modlog', null, Rooms.get(roomId))) return;
			roomNames = 'the room ' + roomId;
			filename = 'logs/modlog/modlog_' + roomId + '.txt';
		}

		// Seek for all input rooms for the lines or text
		command = 'tail -' + lines + ' ' + filename;
		var grepLimit = 100;
		if (wordSearch) { // searching for a word instead
			if (target.match(/^["'].+["']$/)) target = target.substring(1, target.length - 1);
			command = "awk '{print NR,$0}' " + filename + " | sort -nr | cut -d' ' -f2- | grep -m" + grepLimit + " -i '" + target.replace(/\\/g, '\\\\\\\\').replace(/["'`]/g, '\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g, '[$&]') + "'";
		}

		// Execute the file search to see modlog
		require('child_process').exec(command, function (error, stdout, stderr) {
			if (error && stderr) {
				connection.popup("/modlog empty on " + roomNames + " or erred - modlog does not support Windows");
				console.log("/modlog error: " + error);
				return false;
			}
			if (stdout && hideIps) {
				stdout = stdout.replace(/\([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\)/g, '');
			}
			if (lines) {
				if (!stdout) {
					connection.popup("The modlog is empty. (Weird.)");
				} else {
					connection.popup("Displaying the last " + lines + " lines of the Moderator Log of " + roomNames + ":\n\n" + stdout);
				}
			} else {
				if (!stdout) {
					connection.popup("No moderator actions containing '" + target + "' were found on " + roomNames + ".");
				} else {
					connection.popup("Displaying the last " + grepLimit + " logged actions containing '" + target + "' on " + roomNames + ":\n\n" + stdout);
				}
			}
		});
	},

	/*********************************************************
	 * Server management commands
	 *********************************************************/

	hotpatch: function (target, room, user) {
		if (!target) return this.parse('/help hotpatch');
		if (!this.can('hotpatch')) return false;

		this.logEntry(user.name + " used /hotpatch " + target);

		if (target === 'chat' || target === 'commands') {
			try {
				CommandParser.uncacheTree('./command-parser.js');
				global.CommandParser = require('./command-parser.js');
				try {
					CommandParser.uncacheTree('./frost-commands.js');
					frostcommands = require('./frost-commands.js');
				} catch (e) {
					this.sendReply('Frost-commands.js could not be hotpatched.');
				}
				try {
					CommandParser.uncacheTree('./economy.js');
					economy = require('./economy.js');
				} catch (e) {
					this.sendReply('Economy.js could not be hotpatched.');
				}
				CommandParser.uncacheTree('./hangman.js');
				hangman = require('./hangman.js').hangman();
				var runningTournaments = Tournaments.tournaments;
				CommandParser.uncacheTree('./tournaments');
				global.Tournaments = require('./tournaments');
				Tournaments.tournaments = runningTournaments;
				return this.sendReply('Chat commands have been hot-patched.');
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch chat: \n" + e.stack);
			}

		} else if (target === 'tournaments') {

			try {
				var runningTournaments = Tournaments.tournaments;
				CommandParser.uncacheTree('./tournaments');
				global.Tournaments = require('./tournaments');
				Tournaments.tournaments = runningTournaments;
				return this.sendReply("Tournaments have been hot-patched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch tournaments: \n" + e.stack);
			}

		} else if (target === 'battles') {

			Simulator.SimulatorProcess.respawn();
			return this.sendReply("Battles have been hotpatched. Any battles started after now will use the new code; however, in-progress battles will continue to use the old code.");

		} else if (target === 'formats') {
			try {
				// uncache the tools.js dependency tree
				CommandParser.uncacheTree('./tools.js');
				// reload tools.js
				global.Tools = require('./tools.js'); // note: this will lock up the server for a few seconds
				// rebuild the formats list
				Rooms.global.formatListText = Rooms.global.getFormatListText();
				// respawn validator processes
				TeamValidator.ValidatorProcess.respawn();
				// respawn simulator processes
				Simulator.SimulatorProcess.respawn();
				// broadcast the new formats list to clients
				Rooms.global.send(Rooms.global.formatListText);

				return this.sendReply("Formats have been hotpatched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch formats: \n" + e.stack);
			}

		} else if (target === 'learnsets') {
			try {
				// uncache the tools.js dependency tree
				CommandParser.uncacheTree('./tools.js');
				// reload tools.js
				global.Tools = require('./tools.js'); // note: this will lock up the server for a few seconds

				return this.sendReply("Learnsets have been hotpatched.");
			} catch (e) {
				return this.sendReply("Something failed while trying to hotpatch learnsets: \n" + e.stack);
			}

		}
		this.sendReply("Your hot-patch command was unrecognized.");
	},

	deletecode: function(target, room, user) {
		if (!target) {
			return this.sendReply('/deletecode [user] - Deletes the Friend Code of the User.');
		}
		if (!this.can('lock')) return false;
		var t = this;
		fs.readFile('config/friendcodes.txt','utf8',function(err,data) {
			if (err) console.log(err);
			var row = (''+data).split('\n');
			var match = false;
			var line = '';
			for (var i = row.length; i > -1; i--) {
				if (!row[i]) continue;
				var line = row[i].split(':');
				if (target === line[0]) {
					match = true;
					line = row[i];
				}
				break;
			}
			if (match === true) {
				var re = new RegExp(line,'g');
				var result = data.replace(re, '');
				fs.writeFile('config/friendcodes.txt',result,'utf8',function(err) {
					if (err) console.log(err);
					t.sendReply('The friendcode '+line+' has been deleted.');
				});
			} else {
				t.sendReply('There is no match.');
			}
		});
	},

	friendcode: 'fc',
	fc: function(target, room, user, connection) {
		if (!target) {
			return this.sendReply("Enter in your friend code. Make sure it's in the format: xxxx-xxxx-xxxx or xxxx xxxx xxxx or xxxxxxxxxxxx.");
		}
		var fc = target;
		fc = fc.replace(/-/g, '');
		fc = fc.replace(/ /g, '');
		if (isNaN(fc)) return this.sendReply("The friend code you submitted contains non-numerical characters. Make sure it's in the format: xxxx-xxxx-xxxx or xxxx xxxx xxxx or xxxxxxxxxxxx.");
		if (fc.length < 12) return this.sendReply("The friend code you have entered is not long enough! Make sure it's in the format: xxxx-xxxx-xxxx or xxxx xxxx xxxx or xxxxxxxxxxxx.");
		fc = fc.slice(0,4)+'-'+fc.slice(4,8)+'-'+fc.slice(8,12);
		var codes = fs.readFileSync('config/friendcodes.txt','utf8');
		if (codes.toLowerCase().indexOf(user.userid) > -1) {
			return this.sendReply("Your friend code is already here.");
		}
		code.write('\n'+user.name+':'+fc);
		return this.sendReply("The friend code "+fc+" was submitted.");
	},

	gc: 'viewcode',
	viewcode: 'vc',
	vc: function (target, room, user, connection) {
		var codes = fs.readFileSync('config/friendcodes.txt','utf8');
		return user.send('|popup|'+codes);
	},

	eating: 'away',
	gaming: 'away',
	sleep: 'away',
	work: 'away',
	working: 'away',
	sleeping: 'away',
	busy: 'away',
	afk: 'away',
	away: function (target, room, user, connection, cmd) {
		if (!this.can('away')) return false;
		// unicode away message idea by Siiilver
		var t = 'Ⓐⓦⓐⓨ';
		var t2 = 'Away';
		switch (cmd) {
			case 'busy':
			t = 'Ⓑⓤⓢⓨ';
			t2 = 'Busy';
			break;
			case 'sleeping':
			t = 'Ⓢⓛⓔⓔⓟⓘⓝⓖ';
			t2 = 'Sleeping';
			break;
			case 'sleep':
			t = 'Ⓢⓛⓔⓔⓟⓘⓝⓖ';
			t2 = 'Sleeping';
			break;
			case 'gaming':
			t = 'Ⓖⓐⓜⓘⓝⓖ';
			t2 = 'Gaming';
			break;
			case 'working':
			t = 'Ⓦⓞⓡⓚⓘⓝⓖ';
			t2 = 'Working';
			break;
			case 'work':
			t = 'Ⓦⓞⓡⓚⓘⓝⓖ';
			t2 = 'Working';
			break;
			case 'cri':
			t = 'Ⓒⓡⓨⓘⓝⓖ';
			t2 = 'Crying';
			break;
			case 'cry':
			t = 'Ⓒⓡⓨⓘⓝⓖ';
			t2 = 'Crying';
			break;
			case 'eating':
			t = 'Ⓔⓐⓣⓘⓝⓖ';
			t2 = 'Eating';
			break;
			default:
			t = 'Ⓐⓦⓐⓨ'
			t2 = 'Away';
			break;
		}

		if (user.name.length > 18) return this.sendReply('Your username exceeds the length limit.');

		if (!user.isAway) {
			user.originalName = user.name;
			var awayName = user.name + ' - '+t;
			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(awayName);
			user.forceRename(awayName, undefined, true);

			if (user.isStaff) this.add('|raw|-- <b><font color="#088cc7">' + user.originalName +'</font color></b> is now '+t2.toLowerCase()+'. '+ (target ? " (" + escapeHTML(target) + ")" : ""));

			user.isAway = true;
		}
		else {
			return this.sendReply('You are already set as a form of away, type /back if you are now back.');
		}

		user.updateIdentity();
	},

	back: function (target, room, user, connection) {
		if (!this.can('away')) return false;

		if (user.isAway) {
			if (user.name === user.originalName) {
				user.isAway = false;
				return this.sendReply('Your name has been left unaltered and no longer marked as away.');
			}

			var newName = user.originalName;

			//delete the user object with the new name in case it exists - if it does it can cause issues with forceRename
			delete Users.get(newName);

			user.forceRename(newName, undefined, true);

			//user will be authenticated
			user.authenticated = true;

			if (user.isStaff) this.add('|raw|-- <b><font color="#088cc7">' + newName + '</font color></b> is no longer away.');

			user.originalName = '';
			user.isAway = false;
		}
		else {
			return this.sendReply('You are not set as away.');
		}

		user.updateIdentity();
	},

	getid: 'showuserid',
	userid: 'showuserid',
	showuserid: function (target, room, user) {
		if (!target) return this.parse('/help showuserid');

		target = this.splitTarget(target);
		var targetUser = this.targetUser;

		if (!this.can('lock')) return false;

		this.sendReply('The ID of the target is: ' + targetUser);
	},

	uui: 'userupdate',
	userupdate: function (target, room, user) {
		if (!target) return this.sendReply('/userupdate [username] OR /uui [username] - Updates the user identity fixing the users shown group.');
		if (!this.can('hotpatch')) return false;

		target = this.splitTarget(target);
		var targetUser = this.targetUser;

		targetUser.updateIdentity();

		this.sendReply(targetUser + '\'s identity has been updated.');
	},

	uor: 'usersofrank',
	usersofrank: function (target, room, user) {
		if (!target || !Config.groups[target]) return false;
		var names = [];

		for (var i in Users.users) {
			if (!Users.users[i].connected) continue;
			if (Users.users[i].group === target) {
				names.push(Users.users[i].name);
			}
		}
		if (names.length < 1) return this.sendReplyBox('There are no users of the rank <font color="#24678d"><b>' + Tools.escapeHTML(Config.groups[target].name) + '</b></font> currently online.');

		this.sendReplyBox('There ' + (names.length === 1 ? 'is' : 'are') + ' <font color="#24678d"><b>' + names.length + '</b></font> ' + (names.length === 1 ? 'user' : 'users') + ' with the rank <font color="#24678d"><b>' + Config.groups[target].name+'</b></font> currently online.<br />' + names.join(', '));
	},

	userinrooms: function (target, room, user) {
		if (!this.can('permaban')) return false;
		var targetUser = this.targetUserOrSelf(target);
		if (!targetUser) {
			return this.sendReply('User ' + this.targetUsername + ' not found.');
		}
		if (targetUser.frostDev) return this.sendReply('You can\'t view the private rooms of a Developer.');
		this.sendReply('User: ' + targetUser.name);

		var output = 'In rooms: ';
		var output2 = 'Private rooms: ';
		var first = true;

		for (var i in targetUser.roomCount) {
			if (i === 'global') continue;
			if (!first && !Rooms.get(i).isPrivate) output += ' | ';
			if (!first && Rooms.get(i).isPrivate) output2 += ' | ';
			first = false;
			if (Rooms.get(i).isPrivate) {
				output2 += '<a href="/' + i + '" room="' + i + '">' + i + '</a>';
			}
			else if (!Rooms.get(i).isPrivate) {
				output += '<a href="/' + i + '" room="' + i + '">' + i + '</a>';
			}
		}

		this.sendReplyBox(output + '<br />' + output2);
	},

	masspm: 'pmall',
	pmall: function(target, room, user) {
		if (!this.can('pmall')) return false;
		if (!target) return this.sendReply('/pmall [message] - Sends a PM to every user on the server.');

		for (var i in Users.users) {
			if (!Users.users[i].connected) continue;
			Users.users[i].send('|pm|~Frost PM|'+Users.users[i].getIdentity()+'|'+target);
		}
	},

	pmstaff: 'pmallstaff',
	pas: 'pmallstaff',
	pmallstaff: function(target, room, user) {
		if (!target) return this.sendReply('/pmallstaff [message] - Sends a PM to every staff member online.');
		if (!this.can('pmall')) return false;

		for (var u in Users.users) {
			if (Users.users[u].isStaff) {
				Users.users[u].send('|pm|~Staff PM|'+Users.users[u].group+Users.users[u].name+'|'+target);
			}
		}
	},

	/*friendpm: 'pmfriends',
	friendspm: 'pmfriends',
	pmfriend: 'pmfriends',
	pmfriends: function(target, room, user) {
		if (!user.customClient) {
			return this.sendReplyBox('The friends system will not function outside the custom client. Click <button name="send" value="/abc123">here</button> to use it.');
		}

		if (!target) return this.sendReply('/pmfriends [message] - Sends a PM to all of your friends online.');

		for (var i = 0; i < friendList.length; i++) {
			if (Users.get(friendList[i])) {
				if (Users.get(friendList[i]).connected) continue;
				Users.get(friendList[i]).send('|pm|' + user.group + '' + user.name + '|' + Users.get(friendList[i]).getIdentity() + '|' + target);
			}
		}
	},*/

	savelearnsets: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = ' + JSON.stringify(Tools.data.Learnsets) + ";\n");
		this.sendReply("learnsets.js saved.");
	},

	disableladder: function (target, room, user) {
		if (!this.can('disableladder')) return false;
		if (LoginServer.disabled) {
			return this.sendReply("/disableladder - Ladder is already disabled.");
		}
		LoginServer.disabled = true;
		this.logModCommand("The ladder was disabled by " + user.name + ".");
		this.add("|raw|<div class=\"broadcast-red\"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>");
	},

	enableladder: function (target, room, user) {
		if (!this.can('disableladder')) return false;
		if (!LoginServer.disabled) {
			return this.sendReply("/enable - Ladder is already enabled.");
		}
		LoginServer.disabled = false;
		this.logModCommand("The ladder was enabled by " + user.name + ".");
		this.add("|raw|<div class=\"broadcast-green\"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>");
	},

	lockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		Rooms.global.lockdown = true;
		for (var id in Rooms.rooms) {
			if (id === 'global') continue;
			var curRoom = Rooms.rooms[id];
			curRoom.addRaw("<div class=\"broadcast-red\"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>");
			if (curRoom.requestKickInactive && !curRoom.battle.ended) {
				curRoom.requestKickInactive(user, true);
				if (curRoom.modchat !== '+') {
					curRoom.modchat = '+';
					curRoom.addRaw("<div class=\"broadcast-red\"><b>Moderated chat was set to +!</b><br />Only users of rank + and higher can talk.</div>");
				}
			}
		}

		this.logEntry(user.name + " used /lockdown");
	},

	slowlockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		Rooms.global.lockdown = true;
		for (var id in Rooms.rooms) {
			if (id === 'global') continue;
			var curRoom = Rooms.rooms[id];
			if (curRoom.battle) continue;
			curRoom.addRaw("<div class=\"broadcast-red\"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>");
		}

		this.logEntry(user.name + " used /slowlockdown");
	},

	endlockdown: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (!Rooms.global.lockdown) {
			return this.sendReply("We're not under lockdown right now.");
		}
		Rooms.global.lockdown = false;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-green\"><b>The server shutdown was canceled.</b></div>");
		}

		this.logEntry(user.name + " used /endlockdown");
	},

	emergency: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (Config.emergency) {
			return this.sendReply("We're already in emergency mode.");
		}
		Config.emergency = true;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-red\">The server has entered emergency mode. Some features might be disabled or limited.</div>");
		}

		this.logEntry(user.name + " used /emergency");
	},

	endemergency: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (!Config.emergency) {
			return this.sendReply("We're not in emergency mode.");
		}
		Config.emergency = false;
		for (var id in Rooms.rooms) {
			if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-green\"><b>The server is no longer in emergency mode.</b></div>");
		}

		this.logEntry(user.name + " used /endemergency");
	},

	kill: function (target, room, user) {
		if (!this.can('lockdown')) return false;

		if (!Rooms.global.lockdown) {
			return this.sendReply("For safety reasons, /kill can only be used during lockdown.");
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply("Wait for /updateserver to finish before using /kill.");
		}

		for (var i in Sockets.workers) {
			Sockets.workers[i].kill();
		}

		if (!room.destroyLog) {
			process.exit();
			return;
		}
		room.destroyLog(function() {
			this.logModCommand(user.name + ' used /kill');
		}, function() {
			process.exit();
		});

		// Just in the case the above never terminates, kill the process
		// after 10 seconds.
		setTimeout(function () {
			process.exit();
		}, 10000);
	},

	restart: function(target, room, user) {
		if (!this.can('lockdown')) return false;
		try {
			var forever = require('forever');
		} catch(e) {
			return this.sendReply('/restart requires the "forever" module.');
		}

		if (!Rooms.global.lockdown) {
			return this.sendReply('For safety reasons, /restart can only be used during lockdown.');
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply('Wait for /updateserver to finish before using /restart.');
		}
		this.logModCommand(user.name + ' used /restart');
		Rooms.global.send('|refresh|');
		forever.restart('app.js');
	},

	loadbanlist: function(target, room, user, connection) {
		if (!this.can('hotpatch')) return false;

		connection.sendTo(room, "Loading ipbans.txt...");
		fs.readFile('config/ipbans.txt', function (err, data) {
			if (err) return;
			data = ('' + data).split('\n');
			var rangebans = [];
			for (var i = 0; i < data.length; ++i) {
				var line = data[i].split('#')[0].trim();
				if (!line) continue;
				if (line.indexOf('/') >= 0) {
					rangebans.push(line);
				} else if (line && !Users.bannedIps[line]) {
					Users.bannedIps[line] = '#ipban';
				}
			}
			Users.checkRangeBanned = Cidr.checker(rangebans);
			connection.sendTo(room, "ipbans.txt has been reloaded.");
		});
	},

	refreshpage: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		Rooms.global.send('|refresh|');
		this.logEntry(user.name + " used /refreshpage");
	},

	serverupdate: 'updateserver',
	gitpull : 'updateserver',
	updateserver: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/updateserver - Access denied.");
		}

		if (CommandParser.updateServerLock) {
			return this.sendReply("/updateserver - Another update is already in progress.");
		}

		CommandParser.updateServerLock = true;

		var logQueue = [];
		logQueue.push(user.name + " used /updateserver");

		connection.sendTo(room, "updating...");

		var exec = require('child_process').exec;
		exec('git diff-index --quiet HEAD --', function (error) {
			var cmd = 'git pull --rebase';
			if (error) {
				if (error.code === 1) {
					// The working directory or index have local changes.
					cmd = 'git stash && ' + cmd + ' && git stash pop';
				} else {
					// The most likely case here is that the user does not have
					// `git` on the PATH (which would be error.code === 127).
					connection.sendTo(room, "" + error);
					logQueue.push("" + error);
					logQueue.forEach(function (line) {
						room.logEntry(line);
					});
					CommandParser.updateServerLock = false;
					return;
				}
			}
			var entry = "Running `" + cmd + "`";
			connection.sendTo(room, entry);
			logQueue.push(entry);
			exec(cmd, function (error, stdout, stderr) {
				("" + stdout + stderr).split("\n").forEach(function (s) {
					connection.sendTo(room, s);
					logQueue.push(s);
				});
				logQueue.forEach(function (line) {
					room.logEntry(line);
				});
				CommandParser.updateServerLock = false;
			});
		});
	},

	crashfixed: function (target, room, user) {
		if (!Rooms.global.lockdown) {
			return this.sendReply('/crashfixed - There is no active crash.');
		}
		if (!this.can('hotpatch')) return false;

		Rooms.global.lockdown = false;
		if (Rooms.lobby) {
			Rooms.lobby.modchat = false;
			Rooms.lobby.addRaw("<div class=\"broadcast-green\"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>");
		}
		this.logEntry(user.name + " used /crashfixed");
	},

	memusage: 'memoryusage',
	memoryusage: function (target) {
		if (!this.can('hotpatch')) return false;
		target = toId(target) || 'all';
		if (target === 'all') {
			this.sendReply("Loading memory usage, this might take a while.");
		}
		var roomSize, configSize, rmSize, cpSize, simSize, usersSize, toolsSize;
		if (target === 'all' || target === 'rooms' || target === 'room') {
			this.sendReply("Calculating Room size...");
			roomSize = ResourceMonitor.sizeOfObject(Rooms);
			this.sendReply("Rooms are using " + roomSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'config') {
			this.sendReply("Calculating config size...");
			configSize = ResourceMonitor.sizeOfObject(Config);
			this.sendReply("Config is using " + configSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'resourcemonitor' || target === 'rm') {
			this.sendReply("Calculating Resource Monitor size...");
			rmSize = ResourceMonitor.sizeOfObject(ResourceMonitor);
			this.sendReply("The Resource Monitor is using " + rmSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'cmdp' || target === 'cp' || target === 'commandparser') {
			this.sendReply("Calculating Command Parser size...");
			cpSize = ResourceMonitor.sizeOfObject(CommandParser);
			this.sendReply("Command Parser is using " + cpSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'sim' || target === 'simulator') {
			this.sendReply("Calculating Simulator size...");
			simSize = ResourceMonitor.sizeOfObject(Simulator);
			this.sendReply("Simulator is using " + simSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'users') {
			this.sendReply("Calculating Users size...");
			usersSize = ResourceMonitor.sizeOfObject(Users);
			this.sendReply("Users is using " + usersSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'tools') {
			this.sendReply("Calculating Tools size...");
			toolsSize = ResourceMonitor.sizeOfObject(Tools);
			this.sendReply("Tools are using " + toolsSize + " bytes of memory.");
		}
		if (target === 'all' || target === 'v8') {
			this.sendReply("Retrieving V8 memory usage...");
			var o = process.memoryUsage();
			this.sendReply(
				"Resident set size: " + o.rss + ", " + o.heapUsed + " heap used of " + o.heapTotal  + " total heap. " +
				 (o.heapTotal - o.heapUsed) + " heap left."
			);
		}
		if (target === 'all') {
			this.sendReply("Calculating Total size...");
			var total = (roomSize + configSize + rmSize + cpSize + simSize + usersSize + toolsSize) || 0;
			var units = ["bytes", "K", "M", "G"];
			var converted = total;
			var unit = 0;
			while (converted > 1024) {
				converted /= 1024;
				++unit;
			}
			converted = Math.round(converted);
			this.sendReply("Total memory used: " + converted + units[unit] + " (" + total + " bytes).");
		}
		return;
	},

	bash: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/bash - Access denied.");
		}

		var exec = require('child_process').exec;
		exec(target, function (error, stdout, stderr) {
			connection.sendTo(room, ("" + stdout + stderr));
		});
	},

	eval: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/eval - Access denied.");
		}
		if (!this.canBroadcast()) return;
		this.logModCommand(user.name + ' used eval');
		fs.appendFile('logs/eval.txt',user.name+' used eval: '+target+'\n');

		if (!this.broadcasting) this.sendReply('||>> ' + target);
		try {
			var battle = room.battle;
			var me = user;
			this.sendReply('||<< ' + eval(target));
		} catch (e) {
			this.sendReply('||<< error: ' + e.message);
			var stack = '||' + ('' + e.stack).replace(/\n/g, '\n||');
			connection.sendTo(room, stack);
		}
	},

	evalbattle: function (target, room, user, connection) {
		if (!user.hasConsoleAccess(connection)) {
			return this.sendReply("/evalbattle - Access denied.");
		}
		if (!this.canBroadcast()) return;
		if (!room.battle) {
			return this.sendReply("/evalbattle - This isn't a battle room.");
		}

		room.battle.send('eval', target.replace(/\n/g, '\f'));
	},

	/*********************************************************
	 * Battle commands
	 *********************************************************/

	forfeit: function (target, room, user) {
		if (!room.battle) {
			return this.sendReply("There's nothing to forfeit here.");
		}
		if (!room.forfeit(user)) {
			return this.sendReply("You can't forfeit this battle.");
		}
	},

	savereplay: function (target, room, user, connection) {
		if (!room || !room.battle) return;
		var logidx = 2; // spectator log (no exact HP)
		if (room.battle.ended) {
			// If the battle is finished when /savereplay is used, include
			// exact HP in the replay log.
			logidx = 3;
		}
		var data = room.getLog(logidx).join("\n");
		var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g, '')).digest('hex');

		LoginServer.request('prepreplay', {
			id: room.id.substr(7),
			loghash: datahash,
			p1: room.p1.name,
			p2: room.p2.name,
			format: room.format
		}, function (success) {
			if (success && success.errorip) {
				connection.popup("This server's request IP " + success.errorip + " is not a registered server.");
				return;
			}
			connection.send('|queryresponse|savereplay|' + JSON.stringify({
				log: data,
				id: room.id.substr(7)
			}));
		});
	},

	mv: 'move',
	attack: 'move',
	move: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', 'move ' + target);
	},

	sw: 'switch',
	switch: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', 'switch ' + parseInt(target, 10));
	},

	choose: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', target);
	},

	undo: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'undo', target);
	},

	team: function (target, room, user) {
		if (!room.decision) return this.sendReply("You can only do this in battle rooms.");

		room.decision(user, 'choose', 'team ' + target);
	},

	joinbattle: function (target, room, user) {
		if (!room.joinBattle) return this.sendReply("You can only do this in battle rooms.");
		if (!user.can('joinbattle', null, room)) return this.popupReply("You must be a roomvoice to join a battle you didn't start. Ask a player to use /roomvoice on you to join this battle.");

		room.joinBattle(user);
	},

	partbattle: 'leavebattle',
	leavebattle: function (target, room, user) {
		if (!room.leaveBattle) return this.sendReply("You can only do this in battle rooms.");

		room.leaveBattle(user);
	},

	kickbattle: function (target, room, user) {
		if (!room.leaveBattle) return this.sendReply("You can only do this in battle rooms.");

		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.sendReply("User " + this.targetUsername + " not found.");
		}
		if (!this.can('kick', targetUser)) return false;

		if (room.leaveBattle(targetUser)) {
			this.addModCommand("" + targetUser.name + " was kicked from a battle by " + user.name + (target ? " (" + target + ")" : ""));
		} else {
			this.sendReply("/kickbattle - User isn't in battle.");
		}
	},

	kickinactive: function (target, room, user) {
		if (room.requestKickInactive) {
			room.requestKickInactive(user);
		} else {
			this.sendReply("You can only kick inactive players from inside a room.");
		}
	},

	timer: function (target, room, user) {
		target = toId(target);
		if (room.requestKickInactive) {
			if (target === 'off' || target === 'false' || target === 'stop') {
				room.stopKickInactive(user, user.can('timer'));
			} else if (target === 'on' || target === 'true' || !target) {
				room.requestKickInactive(user, user.can('timer'));
			} else {
				this.sendReply("'" + target + "' is not a recognized timer state.");
			}
		} else {
			this.sendReply("You can only set the timer from inside a room.");
		}
	},

	autotimer: 'forcetimer',
	forcetimer: function (target, room, user) {
		target = toId(target);
		if (!this.can('autotimer')) return;
		if (target === 'off' || target === 'false' || target === 'stop') {
			Config.forcetimer = false;
			this.addModCommand("Forcetimer is now OFF: The timer is now opt-in. (set by " + user.name + ")");
		} else if (target === 'on' || target === 'true' || !target) {
			Config.forcetimer = true;
			this.addModCommand("Forcetimer is now ON: All battles will be timed. (set by " + user.name + ")");
		} else {
			this.sendReply("'" + target + "' is not a recognized forcetimer setting.");
		}
	},

	forcetie: 'forcewin',
	forcewin: function (target, room, user) {
		if (!this.can('forcewin')) return false;
		if (!room.battle) {
			this.sendReply("/forcewin - This is not a battle room.");
			return false;
		}

		room.battle.endType = 'forced';
		if (!target) {
			room.battle.tie();
			this.logModCommand(user.name + " forced a tie.");
			return false;
		}
		target = Users.get(target);
		if (target) target = target.userid;
		else target = '';

		if (target) {
			room.battle.win(target);
			this.logModCommand(user.name + " forced a win for " + target + ".");
		}

	},

	/*********************************************************
	 * Challenging and searching commands
	 *********************************************************/

	cancelsearch: 'search',
	search: function (target, room, user) {
		if (target) {
			if (Config.pmmodchat) {
				var userGroup = user.group;
				if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
					var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
					this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to search for a battle.");
					return false;
				}
			}
			Rooms.global.searchBattle(user, target);
		} else {
			Rooms.global.cancelSearch(user);
		}
	},

	chall: 'challenge',
	challenge: function (target, room, user, connection) {
		target = this.splitTarget(target);
		var targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) {
			return this.popupReply("The user '" + this.targetUsername + "' was not found.");
		}
		if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
			return this.popupReply("The user '" + this.targetUsername + "' is not accepting challenges right now.");
		}

		if (targetUser.isAway) {
			return this.popupReply("The user '"+this.targetUsername+"' is currently set as away so cannot be challenged.");
		}
		if (Config.pmmodchat) {
			var userGroup = user.group;
			if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
				var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
				this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to challenge users.");
				return false;
			}
		}
		user.prepBattle(target, 'challenge', connection, function (result) {
			if (result) user.makeChallenge(targetUser, target);
		});
	},

	idle: 'blockchallenges',
	blockchallenges: function (target, room, user) {
		user.blockChallenges = true;
		this.sendReply("You are now blocking all incoming challenge requests.");
	},

	allowchallenges: function(target, room, user) {
		user.blockChallenges = false;
		this.sendReply("You are available for challenges from now on.");
	},

	cchall: 'cancelChallenge',
	cancelchallenge: function (target, room, user) {
		user.cancelChallengeTo(target);
	},

	accept: function (target, room, user, connection) {
		var userid = toId(target);
		var format = '';
		if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
		if (!format) {
			this.popupReply(target + " cancelled their challenge before you could accept it.");
			return false;
		}
		user.prepBattle(format, 'challenge', connection, function (result) {
			if (result) user.acceptChallengeFrom(userid);
		});
	},

	reject: function (target, room, user) {
		user.rejectChallengeFrom(toId(target));
	},

	saveteam: 'useteam',
	utm: 'useteam',
	useteam: function (target, room, user) {
		user.team = target;
	},

	/*********************************************************
	 * Low-level
	 *********************************************************/

	cmd: 'query',
	query: function (target, room, user, connection) {
		// Avoid guest users to use the cmd errors to ease the app-layer attacks in emergency mode
		var trustable = (!Config.emergency || (user.named && user.authenticated));
		if (Config.emergency && ResourceMonitor.countCmd(connection.ip, user.name)) return false;
		var spaceIndex = target.indexOf(' ');
		var cmd = target;
		if (spaceIndex > 0) {
			cmd = target.substr(0, spaceIndex);
			target = target.substr(spaceIndex + 1);
		} else {
			target = '';
		}
		if (cmd === 'userdetails') {

			var targetUser = Users.get(target);
			if (!trustable || !targetUser) {
				connection.send('|queryresponse|userdetails|' + JSON.stringify({
					userid: toId(target),
					rooms: false
				}));
				return false;
			}
			var roomList = {};
			for (var i in targetUser.roomCount) {
				if (i === 'global') continue;
				var targetRoom = Rooms.get(i);
				if (!targetRoom || targetRoom.isPrivate) continue;
				var roomData = {};
				if (targetRoom.battle) {
					var battle = targetRoom.battle;
					roomData.p1 = battle.p1 ? ' ' + battle.p1 : '';
					roomData.p2 = battle.p2 ? ' ' + battle.p2 : '';
				}
				roomList[i] = roomData;
			}
			if (!targetUser.roomCount['global']) roomList = false;
			var userdetails = {
				userid: targetUser.userid,
				avatar: targetUser.avatar,
				rooms: roomList
			};
			if (user.can('ip', targetUser)) {
				var ips = Object.keys(targetUser.ips);
				if (ips.length === 1) {
					userdetails.ip = ips[0];
				} else {
					userdetails.ips = ips;
				}
			}
			connection.send('|queryresponse|userdetails|' + JSON.stringify(userdetails));

		} else if (cmd === 'roomlist') {
			if (!trustable) return false;
			connection.send('|queryresponse|roomlist|' + JSON.stringify({
				rooms: Rooms.global.getRoomList(target)
			}));

		} else if (cmd === 'rooms') {
			if (!trustable) return false;
			connection.send('|queryresponse|rooms|' + JSON.stringify(
				Rooms.global.getRooms()
			));

		}
	},

	trn: function (target, room, user, connection) {
		var commaIndex = target.indexOf(',');
		var targetName = target;
		var targetAuth = false;
		var targetToken = '';
		if (commaIndex >= 0) {
			targetName = target.substr(0, commaIndex);
			target = target.substr(commaIndex + 1);
			commaIndex = target.indexOf(',');
			targetAuth = target;
			if (commaIndex >= 0) {
				targetAuth = !!parseInt(target.substr(0, commaIndex), 10);
				targetToken = target.substr(commaIndex + 1);
			}
		}
		user.rename(targetName, targetToken, targetAuth, connection);
	},

};

var colorCache = {};

function hashColor(name) {
	if (colorCache[name]) return colorCache[name];

	var hash = MD5(name);
	var H = parseInt(hash.substr(4, 4), 16) % 360;
	var S = parseInt(hash.substr(0, 4), 16) % 50 + 50;
	var L = parseInt(hash.substr(8, 4), 16) % 20 + 25;

	var m1, m2, hue;
	var r, g, b
	S /=100;
	L /= 100;
	if (S == 0)
	r = g = b = (L * 255).toString(16);
	else {
	if (L <= 0.5)
	m2 = L * (S + 1);
	else
	m2 = L + S - L * S;
	m1 = L * 2 - m2;
	hue = H / 360;
	r = HueToRgb(m1, m2, hue + 1/3);
	g = HueToRgb(m1, m2, hue);
	b = HueToRgb(m1, m2, hue - 1/3);
}

colorCache[name] = '#' + r + g + b;
return colorCache[name];
}

function HueToRgb(m1, m2, hue) {
	var v;
	if (hue < 0)
		hue += 1;
	else if (hue > 1)
		hue -= 1;

	if (6 * hue < 1)
		v = m1 + (m2 - m1) * hue * 6;
	else if (2 * hue < 1)
		v = m2;
	else if (3 * hue < 2)
		v = m1 + (m2 - m1) * (2/3 - hue) * 6;
	else
		v = m1;

	return (255 * v).toString(16);
}

function escapeHTML(target) {
	if (!target) return false;
	target = target.replace(/&(?!\w+;)/g, '&amp;')
	target = target.replace(/</g, '&lt;')
	target = target.replace(/>/g, '&gt;')
	target = target.replace(/"/g, '&quot;');
	return target;
}

function splint(target) {
	//splittyDiddles
	var cmdArr =  target.split(",");
	for (var i = 0; i < cmdArr.length; i++) cmdArr[i] = cmdArr[i].trim();
	return cmdArr;
}

//Made by PanPawn
function MD5(e){function t(e,t){var n,r,i,s,o;i=e&2147483648;s=t&2147483648;n=e&1073741824;r=t&1073741824;o=(e&1073741823)+(t&1073741823);return n&r?o^2147483648^i^s:n|r?o&1073741824?o^3221225472^i^s:o^1073741824^i^s:o^i^s}function n(e,n,r,i,s,o,u){e=t(e,t(t(n&r|~n&i,s),u));return t(e<<o|e>>>32-o,n)}function r(e,n,r,i,s,o,u){e=t(e,t(t(n&i|r&~i,s),u));return t(e<<o|e>>>32-o,n)}function i(e,n,r,i,s,o,u){e=t(e,t(t(n^r^i,s),u));return t(e<<o|e>>>32-o,n)}function s(e,n,r,i,s,o,u){e=t(e,t(t(r^(n|~i),s),u));return t(e<<o|e>>>32-o,n)}function o(e){var t="",n="",r;for(r=0;r<=3;r++)n=e>>>r*8&255,n="0"+n.toString(16),t+=n.substr(n.length-2,2);return t}var u=[],a,f,l,c,h,p,d,v,e=function(e){for(var e=e.replace(/\r\n/g,"\n"),t="",n=0;n<e.length;n++){var r=e.charCodeAt(n);r<128?t+=String.fromCharCode(r):(r>127&&r<2048?t+=String.fromCharCode(r>>6|192):(t+=String.fromCharCode(r>>12|224),t+=String.fromCharCode(r>>6&63|128)),t+=String.fromCharCode(r&63|128))}return t}(e),u=function(e){var t,n=e.length;t=n+8;for(var r=((t-t%64)/64+1)*16,i=Array(r-1),s=0,o=0;o<n;)t=(o-o%4)/4,s=o%4*8,i[t]|=e.charCodeAt(o)<<s,o++;i[(o-o%4)/4]|=128<<o%4*8;i[r-2]=n<<3;i[r-1]=n>>>29;return i}(e);h=1732584193;p=4023233417;d=2562383102;v=271733878;for(e=0;e<u.length;e+=16)a=h,f=p,l=d,c=v,h=n(h,p,d,v,u[e+0],7,3614090360),v=n(v,h,p,d,u[e+1],12,3905402710),d=n(d,v,h,p,u[e+2],17,606105819),p=n(p,d,v,h,u[e+3],22,3250441966),h=n(h,p,d,v,u[e+4],7,4118548399),v=n(v,h,p,d,u[e+5],12,1200080426),d=n(d,v,h,p,u[e+6],17,2821735955),p=n(p,d,v,h,u[e+7],22,4249261313),h=n(h,p,d,v,u[e+8],7,1770035416),v=n(v,h,p,d,u[e+9],12,2336552879),d=n(d,v,h,p,u[e+10],17,4294925233),p=n(p,d,v,h,u[e+11],22,2304563134),h=n(h,p,d,v,u[e+12],7,1804603682),v=n(v,h,p,d,u[e+13],12,4254626195),d=n(d,v,h,p,u[e+14],17,2792965006),p=n(p,d,v,h,u[e+15],22,1236535329),h=r(h,p,d,v,u[e+1],5,4129170786),v=r(v,h,p,d,u[e+6],9,3225465664),d=r(d,v,h,p,u[e+11],14,643717713),p=r(p,d,v,h,u[e+0],20,3921069994),h=r(h,p,d,v,u[e+5],5,3593408605),v=r(v,h,p,d,u[e+10],9,38016083),d=r(d,v,h,p,u[e+15],14,3634488961),p=r(p,d,v,h,u[e+4],20,3889429448),h=r(h,p,d,v,u[e+9],5,568446438),v=r(v,h,p,d,u[e+14],9,3275163606),d=r(d,v,h,p,u[e+3],14,4107603335),p=r(p,d,v,h,u[e+8],20,1163531501),h=r(h,p,d,v,u[e+13],5,2850285829),v=r(v,h,p,d,u[e+2],9,4243563512),d=r(d,v,h,p,u[e+7],14,1735328473),p=r(p,d,v,h,u[e+12],20,2368359562),h=i(h,p,d,v,u[e+5],4,4294588738),v=i(v,h,p,d,u[e+8],11,2272392833),d=i(d,v,h,p,u[e+11],16,1839030562),p=i(p,d,v,h,u[e+14],23,4259657740),h=i(h,p,d,v,u[e+1],4,2763975236),v=i(v,h,p,d,u[e+4],11,1272893353),d=i(d,v,h,p,u[e+7],16,4139469664),p=i(p,d,v,h,u[e+10],23,3200236656),h=i(h,p,d,v,u[e+13],4,681279174),v=i(v,h,p,d,u[e+0],11,3936430074),d=i(d,v,h,p,u[e+3],16,3572445317),p=i(p,d,v,h,u[e+6],23,76029189),h=i(h,p,d,v,u[e+9],4,3654602809),v=i(v,h,p,d,u[e+12],11,3873151461),d=i(d,v,h,p,u[e+15],16,530742520),p=i(p,d,v,h,u[e+2],23,3299628645),h=s(h,p,d,v,u[e+0],6,4096336452),v=s(v,h,p,d,u[e+7],10,1126891415),d=s(d,v,h,p,u[e+14],15,2878612391),p=s(p,d,v,h,u[e+5],21,4237533241),h=s(h,p,d,v,u[e+12],6,1700485571),v=s(v,h,p,d,u[e+3],10,2399980690),d=s(d,v,h,p,u[e+10],15,4293915773),p=s(p,d,v,h,u[e+1],21,2240044497),h=s(h,p,d,v,u[e+8],6,1873313359),v=s(v,h,p,d,u[e+15],10,4264355552),d=s(d,v,h,p,u[e+6],15,2734768916),p=s(p,d,v,h,u[e+13],21,1309151649),h=s(h,p,d,v,u[e+4],6,4149444226),v=s(v,h,p,d,u[e+11],10,3174756917),d=s(d,v,h,p,u[e+2],15,718787259),p=s(p,d,v,h,u[e+9],21,3951481745),h=t(h,a),p=t(p,f),d=t(d,l),v=t(v,c);return(o(h)+o(p)+o(d)+o(v)).toLowerCase()}function hslToRgb(e,t,n){var r,i,s,o,u,a;if(!isFinite(e))e=0;if(!isFinite(t))t=0;if(!isFinite(n))n=0;e/=60;if(e<0)e=6- -e%6;e%=6;t=Math.max(0,Math.min(1,t/100));n=Math.max(0,Math.min(1,n/100));u=(1-Math.abs(2*n-1))*t;a=u*(1-Math.abs(e%2-1));if(e<1){r=u;i=a;s=0}else if(e<2){r=a;i=u;s=0}else if(e<3){r=0;i=u;s=a}else if(e<4){r=0;i=a;s=u}else if(e<5){r=a;i=0;s=u}else{r=u;i=0;s=a}o=n-u/2;r=Math.round((r+o)*255);i=Math.round((i+o)*255);s=Math.round((s+o)*255);return{r:r,g:i,b:s}}function rgbToHex(e,t,n){return toHex(e)+toHex(t)+toHex(n)}function toHex(e){if(e==null)return"00";e=parseInt(e);if(e==0||isNaN(e))return"00";e=Math.max(0,e);e=Math.min(e,255);e=Math.round(e);return"0123456789ABCDEF".charAt((e-e%16)/16)+"0123456789ABCDEF".charAt(e%16)}function hashColor(e){if(colorCache[e])return colorCache[e];var t=MD5(e);var n=parseInt(t.substr(4,4),16)%360;var r=parseInt(t.substr(0,4),16)%50+50;var i=parseInt(t.substr(8,4),16)%20+25;var s,o,u;var a,f,l;r/=100;i/=100;if(r==0)a=f=l=(i*255).toString(16);else{if(i<=.5)o=i*(r+1);else o=i+r-i*r;s=i*2-o;u=n/360;a=HueToRgb(s,o,u+1/3);f=HueToRgb(s,o,u);l=HueToRgb(s,o,u-1/3)}colorCache[e]="#"+a+f+l;return colorCache[e]}function HueToRgb(e,t,n){var r;if(n<0)n+=1;else if(n>1)n-=1;if(6*n<1)r=e+(t-e)*n*6;else if(2*n<1)r=t;else if(3*n<2)r=e+(t-e)*(2/3-n)*6;else r=e;return(255*r).toString(16)}var colorCache={};hashColor=function(e){if(colorCache[e])return colorCache[e];var t=MD5(e);var n=parseInt(t.substr(4,4),16)%360;var r=parseInt(t.substr(0,4),16)%50+50;var i=parseInt(t.substr(8,4),16)%20+25;var s=hslToRgb(n,r,i);colorCache[e]="#"+rgbToHex(s.r,s.g,s.b);return colorCache[e]};var colorCache={}
