import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import '../../template/exp/expResults.html';
import '../../template/menus.html';
import '../menus.js';

let resultsId = 'testResultId', sessionN = 0;
let expResults = new ReactiveVar(null);
let expTranslation = new ReactiveVar(null), chaTranslation = new ReactiveVar(null);
let correctPerc = new ReactiveVar(0), allRTMean = new ReactiveVar(0), correctRTMean = new ReactiveVar(0);

Tracker.autorun(()=>{
	expTranslation.set(translationDB.findOne({docType: 'experiment'}));
	chaTranslation.set(translationDB.findOne({docType: 'challenger'}));
});

Template.expResults.onRendered(()=>{
	Session.set('browseSession', 'expResults');
	let resultsId = FlowRouter.getParam('results');
	sessionN = FlowRouter.getParam('session');
	let userData = Meteor.user();
	let lang = Session.get('expLang');
	if(!Session.equals('expType', 'demo')) {
		Meteor.callAsync('funcEntryWindow', 'exp', 'getExpResults', 
			{expId: Session.get('expId'), resultsId: resultsId, sessionN: Number(sessionN), userLang: lang}).then((res)=>{
				if(res.type === 'testRun') {
					let runExpRecord = userData && userData.runExpRecord;
					let testRunStats = runExpRecord && runExpRecord.respsStats;
					testRunStats.expTitle = runExpRecord.expTitle;
					testRunStats.condition = runExpRecord.condition[0] === '' ? runExpRecord.condition[0] : runExpRecord.condition[1];
					testRunStats.expCorrPerc = 0 + '(test)';
					testRunStats.expAllRTMean = 0 + '(test)';
					testRunStats.expCorrRTMean = 0 + '(test)';
					testRunStats.debriefing = res.debriefing;
					expResults.set(testRunStats);
				}
				else {
					expResults.set(res.expResults);
				}
				animateStats();
			}).catch((err)=>{
				if(err.error === 'too-many-requests') {
					Styling.showWarning('slowdown');
				}
				else {
					alert('Challenge Records Unavailable');
					if(Meteor.user()) {
						FlowRouter.go('userhome', {subpage: 'dashboard'});
					}
					else {
						FlowRouter.go('home');
					}
				}
			});
	}
	else {
		testRunStats = Session.get('demoExpRes');
		testRunStats.expCorrPerc = 'NA (test run)';
		testRunStats.expAllRTMean = 'NA (test run)';
		testRunStats.expCorrRTMean = 'NA (test run)';
		expResults.set(testRunStats);
		animateStats();
	}
	
	$('tfoot > tr:last-of-type > td').html(
		'<div style="display: inline-block; vertical-align: top;" class="fb-share-button" data-href="'+
		window.location.href+'" data-layout="button" data-size="large"><a target="_blank" href="https://www.facebook.com/sharer/sharer.php?u={{currentURL}}&amp;src=sdkpreparse" class="fb-xfbml-parse-ignore">Share</a></div> '+
		'<a class="twitter-share-button" href="https://twitter.com/intent/tweet" data-size="large" data-url="'+window.location.href+' data-hashtags="ENIGMA" data-via="twitterdev" data-related="twitterapi,twitter">Tweet</a>'
		);
});

Template.expResults.helpers({
	achievements () {
		let res = expResults.get();
		return res && res.achievements;
	},
	allRTMean () {
		return allRTMean.get();
	},
	challengeN () {
		let challengeNText = expTranslation.get() && expTranslation.get().challengeN;
		if(challengeNText) {
			let res = expResults.get();
			let sessionN = res && res.sessionN;
			let targetN = res && res.targetN;
			let remainingN = targetN - sessionN;
			challengeNText = challengeNText.replace('%N', sessionN).replace('%M', remainingN);
			return challengeNText;
		}
		return;
	},
	chaTranslation (field) {
		let texts = chaTranslation.get();
		return texts && texts[field];
	},
	checkStage (stage) {
		let userData = Meteor.user();
		if(!Session.equals('expType', 'demo') && (!userData || (userData.runExpRecord && userData.runExpRecord.stage === stage))) {
			return true;
		}
		return false;
	},
	condition () {
		let res = expResults.get();
		return res && res.condition;
	},
	correctPerc () {
		return correctPerc.get();
	},
	correctRTMean () {
		return correctRTMean.get();
	},
	getDate (origDate) {
		let newDate = timeCalibrater(new Date());
		return newDate.getFullYear() + '-' + (newDate.getMonth() + 1) + '-' + newDate.getUTCDate();
	},
	iconNote (type) {
		let target = type + 'note';
		let texts = chaTranslation.get();
		return texts && texts[target];
	},
	// Need to change the setting according to your own server configuration
	iconURL () {
		return domainURL + 'yourFolder/icons/';
	},
	isDebriefing () {
		if(expResults.get() && expResults.debriefing) {
			return true;
		}
		return false;
	},
	isDemo () {
		return Session.equals('expType', 'demo');
	},
	repeatExp () {
		let userData = Meteor.user();
		if(userData && userData.runExpRecord && userData.runExpRecord.stage === 'repeat') {
			return true;
		}
		return false;
	},
	resultsData (field) {
		let res = expResults.get();
		if(field === 'debriefing' && res && res['debriefing']) {
			let textLines = res['debriefing'].split('\n');
			let processedTexts = [];
			for(let i=0 ; i<textLines.length ; i++) {
				if(textLines[i].trim() !== '') {
					processedTexts.push(textLines[i]);
				}
			}
			return processedTexts;
		}
		return res && res[field];
	},
	translation (field) {
		let texts = expTranslation.get();
		return texts && texts[field];
	}
});

Template.expResults.events({
	'touchend #backHome, click #backHome' (event) {
		if(Tools.swipeCheck(event)) {
			if(!Session.equals('expType', 'demo')) {
				FlowRouter.go('userhome', {subpage: 'dashboard'});
			}
			else {
				FlowRouter.go('home');
			}
		}
	},
	'touchend #signUp, click #signUp' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('userCat', 'challenger');
			FlowRouter.go('register');
		}
	}
});

Template.expResults.onDestroyed(()=>{
	correctPerc.set(0);
	allRTMean.set(0);
	correctRTMean.set(0);
	if(!Session.equals('expType', 'demo')) {
		Meteor.callAsync('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: Session.get('expId')});
	}
});

function animateStats () {
	let perc = expResults.get().correctPerc;
	let percGap = Math.round(1000 / perc);
	let percInterval = Meteor.setInterval(()=>{
		let currentPerc = correctPerc.get();
		currentPerc++;
		if(currentPerc > perc) {
			correctPerc.set(perc);
			Meteor.clearInterval(percInterval);
		}
		else {
			correctPerc.set(currentPerc);
		}
	}, percGap);
	let allMean = expResults.get().allRTMean;
	let allGap = Math.round(2500 / allMean);
	Meteor.setTimeout(()=>{
		let allRTInterval = Meteor.setInterval(()=>{
			let currentRT = allRTMean.get();
			currentRT++;
			if(currentRT > allMean) {
				allRTMean.set(allMean);
				Meteor.clearInterval(allRTInterval);
			}
			else {
				allRTMean.set(currentRT);
			}
		}, allGap);
	}, 300);
	let corrMean = expResults.get().correctRTMean;
	let corrGap = Math.round(3500 / corrMean);
	Meteor.setTimeout(()=>{
		let allRTInterval = Meteor.setInterval(()=>{
			let currentRT = correctRTMean.get();
			currentRT++;
			if(currentRT > corrMean) {
				correctRTMean.set(corrMean);
				Meteor.clearInterval(allRTInterval);
			}
			else {
				correctRTMean.set(currentRT);
			}
		}, corrGap);
	}, 600);
};

function timeCalibrater (time) {
	return new Date(time.getTime() - (8 * 60 * 60 * 1000) - (time.getTimezoneOffset() * 60 * 1000));
};