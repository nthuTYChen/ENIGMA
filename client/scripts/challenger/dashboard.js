import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import '../../template/challenger/dashboard.html';
import '../../template/challenger/menus.html';
import './menus.js';

let expData = new ReactiveVar(null), countDown = new ReactiveVar(0);
let countDownInt;

let interfaceL = new ReactiveVar(null), chaTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	let userData = Meteor.user();
	if(userData && userData.runExpRecord) {
		Session.set('expId', userData.runExpRecord.expId);
	}
	expData.set(experimentDB.findOne({_id: Session.get('expId')}));
	chaTexts.set(translationDB.findOne({docType: 'challenger'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
});

Template.dashboard_cha.onRendered(()=>{
	Session.set('browseSession', 'challengerHome');
	Meteor.callAsync('funcEntryWindow', 'exp', 'wmExpRecordCleaner', {expId: ''});
	$('section > div').each((index)=>{
		$('section > div').eq(index).delay(index * 200).animate({'opacity': 1}, 300);
	});
	Tracker.afterFlush(()=>{
		let checkTextInt = Meteor.setInterval(()=>{
			let em = $('h2 + p > em');
			if($('h2 + p > span:last-child').text().length > 0 && em && em.position()) {
				let factLeft = em.position().left;
				let screenWidth = $(document).width();
				if((screenWidth < 1200 && factLeft <= screenWidth * 0.02) || 
					(screenWidth >= 1200 && factLeft <= screenWidth * 0.17)) {
					$('h2 + p > span:last-child').addClass('rolling');
				}
				$('h2 + p > span:last-child').css('visibility', 'visible');
				Meteor.clearInterval(checkTextInt);
			}
		}, 100);
	});
});

Template.dashboard_cha.helpers({
	challengeState (state) {
		let user = Meteor.user();
		if(state === 'noChallenge' && user && !user.runExpRecord) {
			return true;
		}
		else if(state === 'withChallenge' && user && user.runExpRecord) {
			return true;
		}
		return false;
	},
	challengeType (type) {
		let userData = Meteor.user();
		if(userData.runExpRecord && type === 'abnormal') {
			return true;
		}
		else if(userData.runExpRecord && type === 'repeat') {
			if(userData.runExpRecord.stage === 'repeat') {
				return true;
			}
		}
		return false;
	},
	chaTranslation (col) {
		let texts = chaTexts.get();
		return texts && texts[col];
	},
	countDown () {
		return countDown.get();
	},
	currentLogin () {
		let user = Meteor.user();
		return user && user.profile.loginAttemptIP.currentLogin;
	},
	currentLoginTime () {
		let user = Meteor.user();
		let currentLoginTime = user && user.profile.loginAttemptIP.currentLoginTime;
		if(currentLoginTime) {
			currentLoginTime = timeCalibrater(currentLoginTime);
			return currentLoginTime.getFullYear() + '-' + (currentLoginTime.getMonth() + 1) + '-' + currentLoginTime.getUTCDate();
		}
		return;
	},
	deleteDate () {
		let user = Meteor.user();
		let deleteTime = user && user.profile.verifyDue;
		if(deleteTime) {
			return timeCalibrater(deleteTime);
		}
		return;
	},
	endTime () {
		let userData = Meteor.user();
		if(userData.runExpRecord) {
			let end = userData.runExpRecord.endTime;
			end = timeCalibrater(end);
			let endMinute = '';
			if(end.getMinutes() > 10) {
				endMinute = end.getMinutes();
			}
			else {
				endMinute = '0' + end.getMinutes();
			}
			return end.getFullYear() + '-' + (end.getMonth() + 1) + '-' + end.getUTCDate() + ' ' +
				end.getHours() + ':' + endMinute;
		}
		return;
	},
	expTitle () {
		let userData = Meteor.user();
		return userData && userData.runExpRecord && userData.runExpRecord.expTitle;
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	// Need to change this setting with users' own icon set and network settings
	iconURL () {
		return domainURL + 'yourFolder/icons/';
	},
	notVerified () {
		let user = Meteor.user();
		return user && !user.emails[0].verified;
	},
	passTimeLimit () {
		let endTime = Meteor.user().profile.exp.lastParticipation;
		let currentTime = (new Date()).getTime(), gapHour = expData.get() && expData.get().basicInfo.gapHour * 3600 * 1000;
		if(!endTime || (typeof gapHour === 'number' && 
			(gapHour + endTime.getTime() <= currentTime))) {
			return true;
		}
		if(typeof gapHour === 'number') {
			nextSessionCounter(gapHour + endTime.getTime() - currentTime);
		}
		return false;
	},
	randomLanguageFact () {
		let allFacts = languageFactsDB.find({}).fetch();
		let randomIndex = Math.floor(Math.random() * allFacts.length);
		return allFacts[randomIndex];
	},
	sessionN () {
		let userData = Meteor.user();
		return userData && userData.runExpRecord && userData.runExpRecord.sessionN;
	},
	sideNotes (type) {
		let userData = Meteor.user();
		return userData && userData.profile.exp.sideNotes[type].recorded;
	},
	sideNotesDate (type) {
		let userData = Meteor.user();
		let sideNotesTime = timeCalibrater(userData.profile.exp.sideNotes[type].date);
		return sideNotesTime.getFullYear() + '-' + (sideNotesTime.getMonth() + 1) + '-' + sideNotesTime.getUTCDate();
	},
	statsNum (type) {
		let user = Meteor.user(), texts = chaTexts.get();
		if(user && user.profile.gaming[type].nums) {
			return user && user.profile.gaming[type].nums;
		}
		return texts && texts['none'];
	},
	siteRanking (type) {
		let user = Meteor.user(), texts = chaTexts.get();
		if(user && user.profile.gaming[type].ranking) {
			return user.profile.gaming[type].ranking;
		}
		return texts && texts['none'];
	},
	targetN () {
		let data = expData.get();
		return data && data.basicInfo.multipleN;
	},
	username () {
		let user = Meteor.user();
		let username = user && user.username;
		if(username) {
			return username.split('@')[0];
		}
		return;
	},
	wmStats (type) {
		let user = Meteor.user(), texts = chaTexts.get();
		if(user && user.profile.wm[type]) {
			return user.profile.wm[type];
		}
		return texts && texts['none'];
	}
});

Template.dashboard_cha.events({
	'touchend #chaDashboardHelp, click #chaDashboardHelp' (event) {
		if(Tools.swipeCheck(event)) {
			let target = event.currentTarget.id.replace('Help', '');
			Tools.getAndShowInstruction(target);
		}
	},
	'touchend #closeInstruction, click #closeInstruction' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.closeInstruction();
		}
	},
	'touchend #explore, click #explore' (event) {
		if(Tools.swipeCheck(event)) {
			if(!Meteor.user().runExpRecord) {
				FlowRouter.go('userhome', {subpage: 'explore'});
			}
			else {
				Styling.showWarning('expongoing', 'challenger');
			}
		}
	},
	'touchend #repeatChallenge, click #repeatChallenge' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			let expId = event.currentTarget.id.replace('run_', '');
			Session.set('expType', 'formal');
			Session.set('expSession', 'loadingSettings');
			FlowRouter.go('runExp', {expid: expId});
		}
	},
	'touchend #withdraw, click #withdraw' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Styling.showWarning('withdrawing', 'challenger');
			Meteor.callAsync('funcEntryWindow', 'exp', 'expRecordCleaner', {withdraw: true}).then(()=>{
				if(countDownInt) {
					Meteor.clearInterval(countDownInt);
				}
				Styling.showWarning('withdrew', 'challenger');
			});
		}
	},
	'touchend #runWM, click #runWM' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Meteor.callAsync('funcEntryWindow', 'exp', 'wmExpInitializer', {test: null}).then(()=>{
				FlowRouter.go('wmExp');
			}).catch((err)=>{
				Styling.showWarning(err.error, 'challenger');
			});
		}
	},
	'touchend #wmHistory, click #wmHistory' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			let wmRecords = wmStatsDB.find({}).fetch();
			if(wmRecords.length > 0) {
				FlowRouter.go('wmHistory');
			}
			else {
				Styling.showWarning('nowmhistory', 'challenger');
			}
		}
	}
});

Template.dashboard_cha.onDestroyed(()=>{
	Meteor.clearInterval(countDownInt);
	Session.set('expId', '');
});

function timeCalibrater (time) {
	return new Date(time.getTime() - (8 * 60 * 60 * 1000) - (time.getTimezoneOffset() * 60 * 1000));
};

function nextSessionCounter (ms) {
	let sec = Math.floor(ms / 1000);
	countDown.set(sec);
	countDownInt = Meteor.setInterval(()=>{
		if(sec > 0) {
			sec--;
			countDown.set(sec);
		}
		else {
			Meteor.clearInterval(countDownInt);
		}
	}, 1000);
};