import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

Meteor.startup(()=>{
	Meteor.setInterval(experimentStats, 24 * 3600 * 1000);
	Meteor.setInterval(challengerRanking, 24 * 3600 * 1000);
	Meteor.setInterval(calcWMStats, 24 * 2 * 3600 * 1000);
	Meteor.setInterval(repeatedExpNote, 3600 * 2 * 1000);
	Meteor.setInterval(repeatedWMNote, 3600 * 24 * 1000);
	Meteor.setInterval(deleteAccountNote, 3600 * 1 * 1000);
	Meteor.setInterval(cleanUnfinishedExpSession, 3600 * 12 * 1000);
	Meteor.setInterval(cleanDB, 3600 * 1000);
});

async function cleanDB () {
	let currentTime = (new Date()).getTime();
	await adminLogDB.removeAsync({date: {$lte: new Date(currentTime - 30 * 24 * 3600 * 1000)}});
	await activityLogDB.removeAsync({date: {$lte: new Date(currentTime - 7 * 24 * 3600 * 1000)}});
	await mailLogDB.removeAsync({date: {$lte: new Date(currentTime - 30 * 24 * 3600 * 1000)}});
	await deletedUserRepo.removeAsync({date: {$lte: new Date(currentTime - 365 * 24 * 3600 * 1000)}});
	await recordAdminLog('system', 'cleanDB', 'server', '', 'DBs cleaned', 'server');
};

async function cleanUnfinishedExpSession () {
	let currentTime = new Date();
	await Meteor.users.updateAsync({'runExpRecord.challenging': false,
		'runExpRecord.startTime': {$lte: new Date(currentTime.getTime() - 24 * 2 * 3600 * 1000)}}, 
		{$unset: {runExpRecord: ''}});
	Meteor.users.find({'runExpRecord.running': true, 
		'runExpRecord.startTime': {$lte: new Date(currentTime.getTime() - 24 * 14 * 3600 * 1000)}}).forEachAsync(async (user)=>{
			let runExpRecord = user.runExpRecord, userId = user._id;
			let expId = runExpRecord.expId;
			if(runExpRecord.sessionN > 1) {
				let exp = await experimentDB.findOneAsync({_id: expId});
				if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
					await experimentDB.updateAsync({_id: expId}, {$inc: {'status.currentSubj': 1}, $set: {'status.state': 'complete', 'completedAt': new Date()}});
				}
				else {
					await experimentDB.updateAsync({_id: expId}, {$inc: {'status.currentSubj': 1}});
				}	
			}
			await Meteor.users.updateAsync({_id: userId}, {$unset: {runExpRecord: ''}, $push: {'profile.exp.participated': expId}});	
		});
	Meteor.users.find({'runExpRecord.stage': 'repeat', 'runExpRecord.running': false, 
		'runExpRecord.startTime': {$lte: new Date(currentTime.getTime() - 24 * 14 * 3600 * 1000)}}).forEachAsync(async (user)=>{
		let userId = user._id, expId = user.runExpRecord.expId, exp = await experimentDB.findOneAsync({_id: expId});
		await Meteor.users.updateAsync({_id: userId}, {$unset: {runExpRecord: ''}, $push: {'profile.exp.participated': expId}});
		if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
			await experimentDB.updateAsync({_id: expId}, {$inc: {'status.currentSubj': 1}, $set: {'status.state': 'complete', 'completedAt': new Date()}});
		}
		else {
			await experimentDB.updateAsync({_id: expId}, {$inc: {'status.currentSubj': 1}});
		}
	});
	await recordAdminLog('system', 'cleanUnfinishedExpSession', 'server', '', 'Unfinished sessions cleaned', 'server');
};

async function experimentStats () {
	experimentDB.find({}).forEachAsync(async (exp)=>{
		let expId = exp._id;
		let allExpStats = await expStatsDB.find({expId: expId, lowAcc: {$ne: true}}).fetchAsync();
		let allExpStatsN = allExpStats.length;
		if(allExpStatsN > 0) {
			let allCorrPercs = 0, allCorrRTMeans = 0, allRTMeans = 0;
			for(let i=0 ; i<allExpStatsN ; i++) {
				let stats = allExpStats[i];
				allCorrPercs += stats.correctPerc;
				allCorrRTMeans += stats.correctRTMean;
				allRTMeans += stats.allRTMean;
			}
			await experimentDB.updateAsync({_id: expId}, 
				{$set: {'stats.correctPerc': Math.round(allCorrPercs*10/allExpStatsN)/10, 'stats.allRTMean': Math.round(allRTMeans*10/allExpStatsN)/10, 'stats.correctRTMean': Math.round(allCorrRTMeans*10/allExpStatsN)/10}});
		}
	});
	await recordAdminLog('system', 'experimentStats', 'server', '', 'Exp stats calculated', 'server');
};

async function challengerRanking () {
	let corrNRank = [], corrRTMeanRank = [], sessionNRank = [];
	Meteor.users.find({'profile.userCat': 'challenger'}).forEachAsync(async (user)=>{
		let userCorrN = user.profile.gaming.correctRespN.nums;
		let corrNRankN = corrNRank.length;
		if(userCorrN > 0) {
			if(corrNRankN === 0) {
				corrNRank.push({userId: user._id, num: userCorrN});
			}
			else {
				for(let i=0 ; i<corrNRankN ; i++) {
					let rankData = corrNRank[i];
					if(userCorrN >= rankData.nums) {
						corrNRank.splice(i, 0, {userId: user._id, num: userCorrN});
						break;
					}
					else if(i === corrNRankN - 1) {
						corrNRank.push({userId: user._id, num: userCorrN});
					}
				}
			}
		}	
		let userSessionN = user.profile.gaming.session.nums;
		let sessionNRankN = sessionNRank.length;
		if(userSessionN > 0) {
			if(sessionNRankN === 0) {
				sessionNRank.push({userId: user._id, num: userSessionN});
			}
			else {
				for(let i=0 ; i<sessionNRankN ; i++) {
					let rankData = sessionNRank[i];
					if(userSessionN >= rankData.nums) {
						sessionNRank.splice(i, 0, {userId: user._id, num: userSessionN});
						break;
					}
					else if(i === sessionNRankN - 1) {
						sessionNRank.push({userId: user._id, num: userSessionN});
					}
				}
			}
		}
		let userCorrRTMeans = user.profile.gaming.allCorrRTMean.records;
		let userCorrRTMeansN = userCorrRTMeans.length;
		if(userCorrRTMeansN > 0) {
			let userRTSum = 0;
			for(let i=0 ; i<userCorrRTMeansN ; i++) {
				userRTSum += userCorrRTMeans[i];
			}
			let userCorrRTMean = Math.round(userRTSum * 10 / userCorrRTMeansN) / 10;
			await Meteor.users.updateAsync({_id: user._id}, {$set: {'profile.gaming.allCorrRTMean.nums': userCorrRTMean}});
			let corrRTMeanRankN = corrRTMeanRank.length;
			if(corrRTMeanRankN === 0) {
				corrRTMeanRank.push({userId: user._id, num: userCorrRTMean});
			}
			else {
				for(let i=0 ; i<corrRTMeanRankN ; i++) {
					let rankData = corrRTMeanRank[i];
					if(userCorrRTMean >= rankData.nums) {
						corrRTMeanRank.splice(i, 0, {userId: user._id, nums: userCorrRTMean});
						break;
					}
					else if(i === corrRTMeanRankN - 1) {
						corrRTMeanRank.push({userId: user._id, nums: userCorrRTMean});
					}
				}
			}
		}
	});
	let corrNRankN = corrNRank.length;
	for(let i=0 ; i<corrNRankN ; i++) {
		let rankData = corrNRank[i];
		let user = await Meteor.users.findOneAsync({_id: rankData.userId});
		let userAchievements = user.profile.gaming.achievements, newAchievements = checkRankingAchievements(i, userAchievements);
		userAchievements = userAchievements.concat(newAchievements);
		await Meteor.users.updateAsync({_id: rankData.userId}, 
			{$set: {'profile.gaming.correctRespN.ranking': i + 1, 'profile.gaming.achievements': userAchievements, 'profile.gaming.newAchieve': newAchievements.length}});
	}
	let sessionNRankN = sessionNRank.length;
	for(let i=0 ; i<sessionNRankN ; i++) {
		let rankData = sessionNRank[i];
		let user = await Meteor.users.findOneAsync({_id: rankData.userId});
		let userAchievements = user.profile.gaming.achievements, newAchievements = checkRankingAchievements(i, userAchievements);
		userAchievements = userAchievements.concat(newAchievements);
		await Meteor.users.updateAsync({_id: rankData.userId}, 
			{$set: {'profile.gaming.session.ranking': i + 1, 'profile.gaming.achievements': userAchievements, 'profile.gaming.newAchieve': newAchievements.length}});
	}
	let corrRTMeanRankN = corrRTMeanRank.length;
	for(let i=0 ; i<corrRTMeanRankN ; i++) {
		let rankData = corrRTMeanRank[i];
		let user = await Meteor.users.findOneAsync({_id: rankData.userId});
		let userAchievements = user.profile.gaming.achievements, newAchievements = checkRankingAchievements(i, userAchievements);
		userAchievements = userAchievements.concat(newAchievements);
		await Meteor.users.updateAsync({_id: rankData.userId}, 
			{$set: {'profile.gaming.allCorrRTMean.ranking': i + 1, 'profile.gaming.achievements': userAchievements, 'profile.gaming.newAchieve': newAchievements.length}});
	}
	await recordAdminLog('system', 'challengerRanking', 'server', '', 'Challenger ranking calculated', 'server');
};

async function calcWMStats () {
	if(!await siteStatsDB.findOneAsync({docType: 'wmStats'})) {
		await siteStatsDB.insertAsync({
			docType: 'wmStats',
			lastUpdate: new Date(),
			totalWMSessions: 0,
			ageGroupMean: [0, 0, 0, 0, 0]
		});
	}
	let sessionN = await wmStatsDB.find({}).fetchAsync().length;
	let groupMean = [];
	let subsetSessions = await wmStatsDB.find({age: {$lte: 20}}).fetchAsync();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = await wmStatsDB.find({$and: [{age: {$gte: 21}}, {age: {$lte: 30}}]}).fetchAsync();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = await wmStatsDB.find({$and: [{age: {$gte: 31}}, {age: {$lte: 40}}]}).fetchAsync();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = await wmStatsDB.find({$and: [{age: {$gte: 41}}, {age: {$lte: 50}}]}).fetchAsync();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = await wmStatsDB.find({age: {$gte: 51}}).fetchAsync();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	await siteStatsDB.updateAsync({docType: 'wmStats'}, {$set: {lastUpdate: new Date(), totalWMSessions: sessionN, ageGroupMean: groupMean}});
	await recordAdminLog('system', 'calcWMStats', 'server', '', 'WM stats calculated', 'server');
};

async function deleteAccountNote () {
	let currentTime = new Date();
	Meteor.users.find({'emails.0.verified': false, 'profile.verifyDue': {$lte: new Date(currentTime.getTime() + 24 * 3600 * 1000)}}).forEachAsync(async (user)=>{
		let mailLog = await mailLogDB.findOneAsync({type: 'unverifiednote', user: user.username, date: {$gte: new Date(currentTime.getTime() - 12 * 3600 * 1000)}})
		if(!mailLog) {
			let email = {
				to: user.username,
				from: 'ENIGMA Admin <no-reply@enigma-lang.org>',
				subject: 'ENIGMA: Your unverified account will be deleted automatically!',
				text: '',
				type: 'unverifiednote'
			};
			if(user.profile.userLang === 'zh-tw') {
				email.subject = '字謎：您未經驗證的帳號即將被自動刪除！';
			}
			let deleteAccountBody = await Assets.getTextAsync('emails/unverifiedNote_'+user.profile.userLang+'.txt');
			deleteAccountBody = deleteAccountBody.replace('[deleteTime]', user.profile.verifyDue);
			email.text = deleteAccountBody;
			await sendEmail(email);
		}
	});
	await recordAdminLog('system', 'deleteaccountnote', 'server', '', 'send delete account notes', 'server');
};

async function repeatedExpNote () {
	Meteor.users.find({'runExpRecord.stage': 'repeat', 'runExpRecord.challenging': true, 'runExpRecord.running': false}).forEachAsync(async (user)=>{
		let runExpRecord = user.runExpRecord, lastParticipation = user.profile.exp.lastParticipation, currentTime = new Date();
		let expId = runExpRecord.expId;
		let exp = await experimentDB.findOneAsync({_id: expId}), 
			mailLog = await mailLogDB.findOneAsync({type: 'expnote', user: user.username, date: {$gte: new Date(currentTime.getTime() - 48 * 3600 * 1000)}});
		if(exp && !mailLog) {
			let gap = exp.basicInfo.gapHour;
			if(!lastParticipation || lastParticipation.getTime() + gap * 3600 * 1000 <= currentTime.getTime()) {
				sendExpNote(user);
			}
		}
	});
	await recordAdminLog('system', 'repeatedexpnote', 'server', '', 'send repeated exp notes', 'server');
};

async function repeatedWMNote () {
	Meteor.users.find({'profile.subscribe': true, 'profile.wm.record': {$gte: 0}}).forEachAsync(async (user)=>{
		let wmRecord = user.profile.wm, lastWM = await wmStatsDB.findOneAsync({userId: user._id}, {sort: {endTime: -1}}), currentTime = new Date();
		let mailLog = await mailLogDB.findOneAsync({type: 'wmnote', user: user.username, date: {$gte: new Date(currentTime.getTime() - 24 * 30 * 3600 * 1000)}});
		if(lastWM && !mailLog && (currentTime.getTime() - lastWM.endTime.getTime()) > 30 * 24 * 3600 * 1000) {
			sendWMNote(user.username, user.profile.userLang, user._id, wmRecord, lastWM);
		}
	});
	await recordAdminLog('system', 'repeatedwmnote', 'server', '', 'send wm notes', 'server');
};

// ---------------------- Below are NOT regularly executed functions ------------------

function checkRankingAchievements (ranking, oldAchievements) {
	let newlyAdded = [];
	let bigThree = false, perfectTen = false;
	if(ranking < 10) {
		for(let i=0 ; i<oldAchievements.length ; i++) {
			let achievement = oldAchievements[i];
			if(achievement.type === 'bigthree') {
				bigThree = true;
			}
			else if(achievement.type === 'perfectten') {
				perfectTen = true;
			}
		}
		if(i < 3 && !bigThree) {
			newlyAdded.push({type: 'bigthree', date: new Date()});
		}
		if(i < 10 && !perfectTen) {
			newlyAdded.push({type: 'perfectten', date: new Date()});
		}
	}
	return newlyAdded;
};

function calcWMSubsetMean (subset) {
	if(subset.length > 0) {
		let allScores = 0;
		for(let i=0 ; i<subset.length ; i++) {
			allScores += subset[i].totalScore;
		}
		return Math.round(allScores * 10 / subset.length) / 10;
	}
	return 0;
};

async function recordAdminLog (logType, func, userIP, expId, logNote, userName) {
	await adminLogDB.insertAsync({
		type: logType,
		function: func,
		user: userName,
		exp: expId,
		note: logNote,
		ipAddress: userIP,
		date: new Date()
	});	
};

async function sendExpNote (user) {
	let expTitle = user.runExpRecord.expTitle;
	let userLang = user.profile.userLang;
	let email = {
		to: user.username,
		from: 'ENIGMA Admin <no-reply@enigma-lang.org>',
		subject: 'ENIGMA: Your next session is ready!',
		text: '',
		type: 'expnote'
	};
	if(userLang === 'zh-tw') {
		email.subject = '字謎：你的下一個實驗回合時間到囉！';
	}
	let expNoteBody = await Assets.getTextAsync('emails/expNote_'+userLang+'.txt');
	email.text = expNoteBody.replace('[expTitle]', expTitle);
	await sendEmail(email);
};

async function sendWMNote(username, userLang, userId, wmStats, lastWM) {
	let email = {
		to: username,
		from: 'ENIGMA Admin <no-reply@enigma-lang.org>',
		subject: 'ENIGMA: Come back and test your working memory again!',
		text: '',
		type: 'wmnote'
	};
	if(userLang === 'zh-tw') {
		email.subject = '字謎：再來測試看看你的工作記憶吧！';
	}
	let wmNoteBody = await Assets.getTextAsync('emails/wmNote_'+userLang+'.txt');
	wmNoteBody = wmNoteBody.replace('[wmDate]', lastWM.endTime);
	wmNoteBody = wmNoteBody.replace('[wmScore]', lastWM.totalScore);
	wmNoteBody = wmNoteBody.replace('[wmHighScore]', wmStats.record);
	email.text = wmNoteBody.replace('[url]', 'https://enigma-lang.org/unsubscribe/' + 
		userLang + '/' + userId);
	await sendEmail(email);
};

async function sendEmail (email) {
	Email.send({to: email.to, from: email.from, subject: email.subject, text: email.text});
	await mailLogDB.insertAsync({type: email.type, user: email.to, date: new Date()});
};