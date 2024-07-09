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

function cleanDB () {
	let currentTime = (new Date()).getTime();
	adminLogDB.remove({date: {$lte: new Date(currentTime - 30 * 24 * 3600 * 1000)}});
	activityLogDB.remove({date: {$lte: new Date(currentTime - 7 * 24 * 3600 * 1000)}});
	mailLogDB.remove({date: {$lte: new Date(currentTime - 30 * 24 * 3600 * 1000)}});
	deletedUserRepo.remove({date: {$lte: new Date(currentTime - 365 * 24 * 3600 * 1000)}});
	recordAdminLog('system', 'cleanDB', 'server', '', 'DBs cleaned', 'server');
};

function cleanUnfinishedExpSession () {
	let currentTime = new Date();
	Meteor.users.update({'runExpRecord.challenging': false,
		'runExpRecord.startTime': {$lte: new Date(currentTime.getTime() - 24 * 2 * 3600 * 1000)}}, 
		{$unset: {runExpRecord: ''}});
	Meteor.users.find({'runExpRecord.running': true, 
		'runExpRecord.startTime': {$lte: new Date(currentTime.getTime() - 24 * 14 * 3600 * 1000)}}).forEach((user)=>{
			let runExpRecord = user.runExpRecord, userId = user._id;
			let expId = runExpRecord.expId;
			if(runExpRecord.sessionN > 1) {
				let exp = experimentDB.findOne({_id: expId});
				if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
					experimentDB.update({_id: expId}, {$inc: {'status.currentSubj': 1}, $set: {'status.state': 'complete', 'completedAt': new Date()}});
				}
				else {
					experimentDB.update({_id: expId}, {$inc: {'status.currentSubj': 1}});
				}	
			}
			Meteor.users.update({_id: userId}, {$unset: {runExpRecord: ''}, $push: {'profile.exp.participated': expId}});	
		});
	Meteor.users.find({'runExpRecord.stage': 'repeat', 'runExpRecord.running': false, 
		'runExpRecord.startTime': {$lte: new Date(currentTime.getTime() - 24 * 14 * 3600 * 1000)}}).forEach((user)=>{
		let userId = user._id, expId = user.runExpRecord.expId, exp = experimentDB.findOne({_id: expId});
		Meteor.users.update({_id: userId}, {$unset: {runExpRecord: ''}, $push: {'profile.exp.participated': expId}});
		if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
			experimentDB.update({_id: expId}, {$inc: {'status.currentSubj': 1}, $set: {'status.state': 'complete', 'completedAt': new Date()}});
		}
		else {
			experimentDB.update({_id: expId}, {$inc: {'status.currentSubj': 1}});
		}
	});
	recordAdminLog('system', 'cleanUnfinishedExpSession', 'server', '', 'Unfinished sessions cleaned', 'server');
};

function experimentStats () {
	experimentDB.find({}).forEach((exp)=>{
		let expId = exp._id;
		let allExpStats = expStatsDB.find({expId: expId, lowAcc: {$ne: true}}).fetch();
		let allExpStatsN = allExpStats.length;
		if(allExpStatsN > 0) {
			let allCorrPercs = 0, allCorrRTMeans = 0, allRTMeans = 0;
			for(let i=0 ; i<allExpStatsN ; i++) {
				let stats = allExpStats[i];
				allCorrPercs += stats.correctPerc;
				allCorrRTMeans += stats.correctRTMean;
				allRTMeans += stats.allRTMean;
			}
			experimentDB.update({_id: expId}, 
				{$set: {'stats.correctPerc': Math.round(allCorrPercs*10/allExpStatsN)/10, 'stats.allRTMean': Math.round(allRTMeans*10/allExpStatsN)/10, 'stats.correctRTMean': Math.round(allCorrRTMeans*10/allExpStatsN)/10}});
		}
	});
	recordAdminLog('system', 'experimentStats', 'server', '', 'Exp stats calculated', 'server');
};

function challengerRanking () {
	let corrNRank = [], corrRTMeanRank = [], sessionNRank = [];
	Meteor.users.find({'profile.userCat': 'challenger'}).forEach((user)=>{
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
			Meteor.users.update({_id: user._id}, {$set: {'profile.gaming.allCorrRTMean.nums': userCorrRTMean}});
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
		let user = Meteor.users.findOne({_id: rankData.userId});
		let userAchievements = user.profile.gaming.achievements, newAchievements = checkRankingAchievements(i, userAchievements);
		userAchievements = userAchievements.concat(newAchievements);
		Meteor.users.update({_id: rankData.userId}, 
			{$set: {'profile.gaming.correctRespN.ranking': i + 1, 'profile.gaming.achievements': userAchievements, 'profile.gaming.newAchieve': newAchievements.length}});
	}
	let sessionNRankN = sessionNRank.length;
	for(let i=0 ; i<sessionNRankN ; i++) {
		let rankData = sessionNRank[i];
		let user = Meteor.users.findOne({_id: rankData.userId});
		let userAchievements = user.profile.gaming.achievements, newAchievements = checkRankingAchievements(i, userAchievements);
		userAchievements = userAchievements.concat(newAchievements);
		Meteor.users.update({_id: rankData.userId}, 
			{$set: {'profile.gaming.session.ranking': i + 1, 'profile.gaming.achievements': userAchievements, 'profile.gaming.newAchieve': newAchievements.length}});
	}
	let corrRTMeanRankN = corrRTMeanRank.length;
	for(let i=0 ; i<corrRTMeanRankN ; i++) {
		let rankData = corrRTMeanRank[i];
		let user = Meteor.users.findOne({_id: rankData.userId});
		let userAchievements = user.profile.gaming.achievements, newAchievements = checkRankingAchievements(i, userAchievements);
		userAchievements = userAchievements.concat(newAchievements);
		Meteor.users.update({_id: rankData.userId}, 
			{$set: {'profile.gaming.allCorrRTMean.ranking': i + 1, 'profile.gaming.achievements': userAchievements, 'profile.gaming.newAchieve': newAchievements.length}});
	}
	recordAdminLog('system', 'challengerRanking', 'server', '', 'Challenger ranking calculated', 'server');
};

function calcWMStats () {
	if(!siteStatsDB.findOne({docType: 'wmStats'})) {
		siteStatsDB.insert({
			docType: 'wmStats',
			lastUpdate: new Date(),
			totalWMSessions: 0,
			ageGroupMean: [0, 0, 0, 0, 0]
		});
	}
	let sessionN = wmStatsDB.find({}).fetch().length;
	let groupMean = [];
	let subsetSessions = wmStatsDB.find({age: {$lte: 20}}).fetch();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = wmStatsDB.find({$and: [{age: {$gte: 21}}, {age: {$lte: 30}}]}).fetch();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = wmStatsDB.find({$and: [{age: {$gte: 31}}, {age: {$lte: 40}}]}).fetch();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = wmStatsDB.find({$and: [{age: {$gte: 41}}, {age: {$lte: 50}}]}).fetch();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	subsetSessions = wmStatsDB.find({age: {$gte: 51}}).fetch();
	groupMean.push(calcWMSubsetMean(subsetSessions));
	siteStatsDB.update({docType: 'wmStats'}, {$set: {lastUpdate: new Date(), totalWMSessions: sessionN, ageGroupMean: groupMean}});
	recordAdminLog('system', 'calcWMStats', 'server', '', 'WM stats calculated', 'server');
};

function deleteAccountNote () {
	let currentTime = new Date();
	Meteor.users.find({'emails.0.verified': false, 'profile.verifyDue': {$lte: new Date(currentTime.getTime() + 24 * 3600 * 1000)}}).forEach((user)=>{
		let mailLog = mailLogDB.findOne({type: 'unverifiednote', user: user.username, date: {$gte: new Date(currentTime.getTime() - 12 * 3600 * 1000)}})
		if(!mailLog) {
			let email = {
				to: user.username,
				from: 'ENIGMA Admin <enigma@lngproc.hss.nthu.edu.tw>',
				subject: 'ENIGMA: Your unverified account will be deleted automatically!',
				text: '',
				type: 'unverifiednote'
			};
			if(user.profile.userLang === 'zh-tw') {
				email.subject = '字謎：您未經驗證的帳號即將被自動刪除！';
			}
			let deleteAccountBody = Assets.getText('emails/unverifiedNote_'+user.profile.userLang+'.txt');
			deleteAccountBody = deleteAccountBody.replace('[deleteTime]', user.profile.verifyDue);
			email.text = deleteAccountBody;
			sendEmail(email);
		}
	});
	recordAdminLog('system', 'deleteaccountnote', 'server', '', 'send delete account notes', 'server');
};

function repeatedExpNote () {
	Meteor.users.find({'runExpRecord.stage': 'repeat', 'runExpRecord.challenging': true, 'runExpRecord.running': false}).forEach((user)=>{
		let runExpRecord = user.runExpRecord, lastParticipation = user.profile.exp.lastParticipation, currentTime = new Date();
		let expId = runExpRecord.expId;
		let exp = experimentDB.findOne({_id: expId}), mailLog = mailLogDB.findOne({type: 'expnote', user: user.username, date: {$gte: new Date(currentTime.getTime() - 48 * 3600 * 1000)}});
		if(exp && !mailLog) {
			let gap = exp.basicInfo.gapHour;
			if(!lastParticipation || lastParticipation.getTime() + gap * 3600 * 1000 <= currentTime.getTime()) {
				sendExpNote(user);
			}
		}
	});
	recordAdminLog('system', 'repeatedexpnote', 'server', '', 'send repeated exp notes', 'server');
};

function repeatedWMNote () {
	Meteor.users.find({'profile.subscribe': true, 'profile.wm.record': {$gte: 0}}).forEach((user)=>{
		let wmRecord = user.profile.wm, lastWM = wmStatsDB.findOne({userId: user._id}, {sort: {endTime: -1}}), currentTime = new Date();
		let mailLog = mailLogDB.findOne({type: 'wmnote', user: user.username, date: {$gte: new Date(currentTime.getTime() - 24 * 30 * 3600 * 1000)}});
		if(lastWM && !mailLog && (currentTime.getTime() - lastWM.endTime.getTime()) > 30 * 24 * 3600 * 1000) {
			sendWMNote(user.username, user.profile.userLang, user._id, wmRecord, lastWM);
		}
	});
	recordAdminLog('system', 'repeatedwmnote', 'server', '', 'send wm notes', 'server');
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

function recordAdminLog (logType, func, userIP, expId, logNote, userName) {
	adminLogDB.insert({
		type: logType,
		function: func,
		user: userName,
		exp: expId,
		note: logNote,
		ipAddress: userIP,
		date: new Date()
	});	
};

function sendExpNote (user) {
	let expTitle = user.runExpRecord.expTitle;
	let userLang = user.profile.userLang;
	let email = {
		to: user.username,
		from: 'ENIGMA Admin <enigma@lngproc.hss.nthu.edu.tw>',
		subject: 'ENIGMA: Your next session is ready!',
		text: '',
		type: 'expnote'
	};
	if(userLang === 'zh-tw') {
		email.subject = '字謎：你的下一個實驗回合時間到囉！';
	}
	let expNoteBody = Assets.getText('emails/expNote_'+userLang+'.txt');
	email.text = expNoteBody.replace('[expTitle]', expTitle);
	sendEmail(email);
};

function sendWMNote(username, userLang, userId, wmStats, lastWM) {
	let email = {
		to: username,
		from: 'ENIGMA Admin <enigma@lngproc.hss.nthu.edu.tw>',
		subject: 'ENIGMA: Come back and test your working memory again!',
		text: '',
		type: 'wmnote'
	};
	if(userLang === 'zh-tw') {
		email.subject = '字謎：再來測試看看你的工作記憶吧！';
	}
	let wmNoteBody = Assets.getText('emails/wmNote_'+userLang+'.txt');
	wmNoteBody = wmNoteBody.replace('[wmDate]', lastWM.endTime);
	wmNoteBody = wmNoteBody.replace('[wmScore]', lastWM.totalScore);
	email.text = wmNoteBody.replace('[wmHighScore]', wmStats.record);
	sendEmail(email);
};

function sendEmail (email) {
	Email.send({to: email.to, from: email.from, subject: email.subject, text: email.text});
	mailLogDB.insert({type: email.type, user: email.to, date: new Date()});
};