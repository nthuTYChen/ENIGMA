import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import Styling from '../styling/stylingFuncs.js';
import runExpFunc from './runexpfunc.js';
import Tools from '../lib/commonTools.js';

import '../../template/exp/runWMExp.html';

let chaTranslation = new ReactiveVar(null);
let expTranslation = new ReactiveVar(null);
let wmInstructions = new ReactiveVar(null);
let wmStimuli = new ReactiveVar(null);
let groupN = 1, itemN = 2, stimulusCount = 0;
let allTrialResps = [], recallList = [], recallShuffle = [], recalledNum = [], onset = null;
let incorrectJudge = 0, incorrectRecall = 0, incorrectGroup = 0;

Tracker.autorun(()=>{
	chaTranslation.set(translationDB.findOne({docType: 'challenger'}));
	expTranslation.set(translationDB.findOne({docType: 'experiment'}));
	wmStimuli.set(Meteor.user() && Meteor.user().runWMRecord && Meteor.user().runWMRecord.stimuliList);
});

Template.expWMPanels.onRendered(()=>{
	allTrialResps = [];
	recalledNum = [];
	recallList = [];
	groupN = 1;
	itemN = 2;
	stimulusCount = 0;
	incorrectGroup = 0;
	Session.set('browseSession', 'runWMExp');
	Session.set('expSession', 'wmInstruction');
	Session.set('expLang', Session.get('userLang'));
	Meteor.call('funcEntryWindow', 'exp', 'getWMInstruction', {session: Session.get('browseSession')}, (err, res)=>{
		if(err) {}
		else {
			wmInstructions.set(res.msg);
		}
	});
	runExpFunc.enterFullScreen();
});

Template.expWMPanels.helpers({
	expSession (session) {
		return Session.equals('expSession', session);
	}
});

Template.expWMPanels.onDestroyed(()=>{
	Meteor.clearTimeout(stimulusCounter);
	Meteor.clearTimeout(wmRecallCountDown);
	Meteor.clearInterval(wmRecallCountInt);
	Meteor.clearInterval(countDownInt);
	Session.set('expSession', '');
	Session.set('expLang', '');
	runExpFunc.exitFullScreen();
});

Template.wmInstruction.helpers({
	availableLang () {
		return allLangList.find({code: {$in: ['en-us', 'zh-tw']}});
	},
	chaTranslation (field) {
		return chaTranslation.get() && chaTranslation.get()[field];
	},
	defaultLang (code) {
		if(Session.equals('userLang', code)) {
			return 'selected';
		}
		return;
	},
	expTranslation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	},
	wmInstruction (field) {
		if(wmInstructions.get() && wmInstructions.get()[Session.get('expLang')]) {
			return runExpFunc.processLongTexts(wmInstructions.get()[Session.get('expLang')]);
		}
		return;
	}
});

Template.wmInstruction.events({
	'change #changeExpLang' (event) {
		let newLang = event.target.value;
		Session.set('expLang', newLang);
	},
	'touchend #startWM, click #startWM' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('expSession', 'wmTrial');
		}
	}
});

let countDownInt;

Template.wmTrial.onRendered(()=>{
	incorrectJudge = 0;
	incorrectRecall = 0;
	recallShuffle = [];
	let countDown = 5;
	$('div.trialPresent > h3').eq(1).text(countDown);
	countDownInt = Meteor.setInterval(()=>{
		countDown--;
		$('div.trialPresent > h3').eq(1).text(countDown);
		if(countDown === 0) {
			Meteor.clearInterval(countDownInt);
			$('div.trialPresent').remove();
			runWMTrial();
		}
	}, 1000);
});

Template.wmTrial.helpers({
	chaTranslation (field) {
		return chaTranslation.get() && chaTranslation.get()[field];
	}
});

let targetSelectNum = new ReactiveVar(0), wmRecallCounter = new ReactiveVar(10);
let wmRecallCountDown, wmRecallCountInt;

Template.wmRecall.onRendered(()=>{
	targetSelectNum.set(itemN + 0);
	wmRecallCounter.set(4 + (2 * (itemN - 1)));
	wmRecallCountInt = Meteor.setInterval(()=>{
		let counter = wmRecallCounter.get();
		counter--;
		wmRecallCounter.set(counter);
		if(counter === 0) {
			Meteor.clearInterval(wmRecallCountInt);
		}
	}, 1000);
	wmRecallCountDown = Meteor.setTimeout(()=>{
		let remainTargetsN = targetSelectNum.get();
		for(let i=0 ; i<remainTargetsN ; i++) {
			recalledNum.push(-100);
		}
		incorrectRecall += remainTargetsN;
		endWMRecall();
		Session.set('expSession', 'wmTrial');
	}, 4000 + (2 * 1000 * (itemN - 1)));
});

Template.wmRecall.helpers({
	chaTranslation (field) {
		return chaTranslation.get() && chaTranslation.get()[field];
	},
	recallGrid () {
		return recallShuffle;
	},
	targetSelectNum () {
		return targetSelectNum.get();
	},
	wmRecallCounter () {
		return wmRecallCounter.get();
	}
});

Template.wmRecall.events({
	'touchend section > div:not(.selected), click section > div:not(.selected)' (event) {
		let gridId = event.currentTarget.id;
		$('#'+gridId).addClass('selected');
		let selectedNum = Number(gridId.replace('recall_', ''));
		recalledNum.push(selectedNum);
		if(recallList.indexOf(selectedNum) < 0) {
			incorrectRecall++;
		}
		let currentSelectNum = targetSelectNum.get();
		currentSelectNum--;
		targetSelectNum.set(currentSelectNum);
		if(currentSelectNum === 0) {
			endWMRecall();
		}
	}
});

async function runWMTrial () {
	let stimuli = wmStimuli.get();
	for(let i=0 ; i<itemN ; i++) {
		let stimulus = stimuli[stimulusCount];
		let displayECRes = await displayEyeCross();
		let displayFormulaRes = await displayFormula(stimulus);
		recallList.push(stimulus.answer);
	}
	recallShuffle = shuffleRecallList(recallList);
	Session.set('expSession', 'wmRecall');
};


let displayEyeCross = async function() {
	return new Promise(function(resolve, reject) {
		$('#expBody').append('<h3 style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);">+</h3>');
		Meteor.setTimeout(()=>{
			$('#expBody > h3').remove();
			resolve('resolvedEC');
		}, 1000);
	});
};

let stimulusCounter;

let displayFormula = async function(stimulus) {
	return new Promise(function(resolve, reject) {
		stimulusCounter = Meteor.setTimeout(()=>{
			resolve();
			incorrectJudge++;
			allTrialResps.push({resp: 'na', rt: 'na'});
			endWMTrial();
		}, 5000);
		$('#expBody').append('<h3 style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);">'+stimulus.formula+' = '+stimulus.answer+'</h3>');
			onset = new Date();
			$(document).on('keydown', (event)=>{
				if(respChecker(event, 'key', stimulus)) {
					Meteor.clearTimeout(stimulusCounter);
					resolve();
				}
			});
			if($(document).width() < 1200) {
				$('div.respButtons').css('display', 'flex');
				$('div.respButtons > div').on('click touchend', (event)=>{
					if(respChecker(event, 'button', stimulus)) {
						Meteor.clearTimeout(stimulusCounter);
						resolve();
					}
				});
			}
	});
};

function respChecker (event, type, stimulus) {
	let resp = null, offset = new Date();
	if(type === 'key') {
		let pressedKey = event.which || event.keyCode;
		let parsedKey = String.fromCharCode(pressedKey).toLowerCase();
		if(parsedKey === 'a') {
			resp = 'yes';
		}
		else if(parsedKey === 'l') {
			resp = 'no';
		}
	}
	else {
		resp = event.currentTarget.id;
	}
	if(resp === 'yes' || resp === 'no') {
		if(resp !== stimulus.correct) {
			incorrectJudge++;
		}
		allTrialResps.push({resp: resp, rt: offset.getTime() - onset.getTime()});
		endWMTrial();
		return true;
	}
	return false;
};

function endWMTrial () {
	$('#expBody > h3').remove();
	$('div.respButtons').css('display', 'none');
	$('div.respButtons > div').off();
	$(document).off();
	stimulusCount++;
};

function shuffleRecallList (targets) {
	let shuffledList = new Array(targets.length * 2);
	for(let i=0 ; i<shuffledList.length ; i++) {
		shuffledList[i] = null;
	}
	let filledPos = [], offTargets = [];
	for(let i=0 ; i<targets.length ; i++) {
		let target = targets[i];
		let noise = 0;
		let dice = 0;
		let offTarget = 0;
		do {
			noise = Math.floor(Math.random() * 8 + 1);
			dice = Math.floor(Math.random() * 2);
			if(dice) {
				offTarget = target + noise;
			}
			else {
				offTarget = target - noise;
			}
		}
		while(targets.indexOf(offTarget) > -1 || offTargets.indexOf(offTarget) > -1);
		offTargets.push(offTarget);
	}
	targets = targets.concat(offTargets);
	for(let i=0 ; i<targets.length ; i++) {
		let pos = Math.floor(Math.random() * shuffledList.length);
		do {
			pos = Math.floor(Math.random() * shuffledList.length);
		}
		while(filledPos.indexOf(pos) > -1);
		filledPos.push(pos);
		shuffledList[pos] = targets[i];
	}
	return shuffledList;
};

function endWMRecall () {
	recallList = [];
	Meteor.clearTimeout(wmRecallCountDown);
	Meteor.clearInterval(wmRecallCountInt);
	if(incorrectRecall / itemN >= 0.5 || incorrectJudge / itemN >= 0.5) {
		incorrectGroup++;
	}
	else {
		incorrectGroup = 0;
	}
	if(incorrectGroup === 3 || (groupN === 3 && itemN === 8)) {
		incorrectGroup = 0;
		Meteor.call('funcEntryWindow', 'exp', 'completeWMTest', {trials: allTrialResps, recall: recalledNum}, (err, res)=>{
			if(res) {
				runExpFunc.exitFullScreen();
				Session.set('expSession', '');
				FlowRouter.go('wmHistory');
			}
		});
	}
	else {
		if(groupN < 3) {
			groupN++;
			Session.set('expSession', 'wmTrial');
		}
		else if(itemN < 8) {
			groupN = 1;
			itemN++;
			Session.set('expSession', 'wmTrial');
		}
	}		
};