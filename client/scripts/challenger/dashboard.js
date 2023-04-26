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
	Meteor.call('funcEntryWindow', 'exp', 'wmExpRecordCleaner', {expId: ''});
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
		if(state === 'noChallenge' && Meteor.user() && !Meteor.user().runExpRecord) {
			return true;
		}
		else if(state === 'withChallenge' && Meteor.user() && Meteor.user().runExpRecord) {
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
		return chaTexts.get() && chaTexts.get()[col];
	},
	countDown () {
		return countDown.get();
	},
	currentLogin () {
		return Meteor.user() && Meteor.user().profile.loginAttemptIP.currentLogin;
	},
	currentLoginTime () {
		let currentLoginTime = Meteor.user() && Meteor.user().profile.loginAttemptIP.currentLoginTime;
		if(currentLoginTime) {
			currentLoginTime = timeCalibrater(currentLoginTime);
			return currentLoginTime.getFullYear() + '-' + (currentLoginTime.getMonth() + 1) + '-' + currentLoginTime.getUTCDate();
		}
		return;
	},
	deleteDate () {
		let deleteTime = Meteor.user() && Meteor.user().profile.verifyDue;
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
		return Meteor.user() && !Meteor.user().emails[0].verified;
	},
	passTimeLimit () {
		let endTime = Meteor.user().profile.exp.lastParticipation;
		let currentTime = (new Date()).getTime(), gapHour = expData.get() && expData.get().basicInfo.gapHour * 3600 * 1000;
		if(!endTime || (expData.get() && expData.get().basicInfo.gapHour && 
			(gapHour + endTime.getTime() <= currentTime))) {
			return true;
		}
		if(gapHour) {
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
		if(Meteor.user() && Meteor.user().profile.gaming[type].nums) {
			return Meteor.user() && Meteor.user().profile.gaming[type].nums;
		}
		return chaTexts.get() && chaTexts.get()['none'];
	},
	siteRanking (type) {
		if(Meteor.user() && Meteor.user().profile.gaming[type].ranking) {
			return Meteor.user().profile.gaming[type].ranking;
		}
		return chaTexts.get() && chaTexts.get()['none'];
	},
	targetN () {
		return expData.get() && expData.get().basicInfo.multipleN;
	},
	username () {
		let username = Meteor.user() && Meteor.user().username;
		if(username) {
			return username.split('@')[0];
		}
		return;
	},
	wmStats (type) {
		if(Meteor.user() && Meteor.user().profile.wm[type]) {
			return Meteor.user().profile.wm[type];
		}
		return chaTexts.get() && chaTexts.get()['none'];
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
			//Router.go('runExp', {expid: expId});
			FlowRouter.go('runExp', {expid: expId});
		}
	},
	'touchend #withdraw, click #withdraw' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Styling.showWarning('withdrawing', 'challenger');
			Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {withdraw: true}, function(err, res) {
				if(res) {
					if(countDownInt) {
						Meteor.clearInterval(countDownInt);
					}
					Styling.showWarning('withdrew', 'challenger');
				}
			});
		}
	},
	'touchend #runWM, click #runWM' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Meteor.call('funcEntryWindow', 'exp', 'wmExpInitializer', {test: null}, function(err, res) {
				if(err) {
					Styling.showWarning(err.error, 'challenger');
				}
				else {
					FlowRouter.go('wmExp');
				}
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