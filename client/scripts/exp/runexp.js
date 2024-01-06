import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';
import runExpFunc from './runexpfunc.js';

import '../../template/exp/runexp.html';

let expData = new ReactiveVar(null);
let expTranslation = new ReactiveVar(null);
let termsAndCondition = new ReactiveVar(null);
let stimuliByBlock = {}, loadedStimuli = [];
let blocks, blockCount = 0, trialRecorded = false;
let preloading = new ReactiveVar(false), preloadedPerc = new ReactiveVar(0);
let allStimuli, trainingStimuli, testStimuli;

Tracker.autorun(()=>{
	expTranslation.set(translationDB.findOne({docType: 'experiment'}));
	expData.set(experimentDB.findOne({_id: Session.get('expId')}));
});

Template.expPanels.onRendered(()=>{
	expData.set(experimentDB.findOne({_id: Session.get('expId')}));
	Session.set('expLang', Session.get('userLang'));
	loadedStimuli = [];
	runExpFunc.enterFullScreen();
	Meteor.call('funcEntryWindow', 'user', 'getUserAgreement', 
		{userCat: 'challenger', userLang: Session.get('userLang')}, (err, result)=>{
		if(err) {
			Tools.callErrorHandler(err, 'server');
		}
		else {
			let agreement = result.agreement.replace(/\/{0,1}\<w+\>/g, '');
			termsAndCondition.set(agreement);
		}
	});
});

Template.expPanels.helpers({
	expSession (session) {
		return Session.equals('expSession', session);
	}
});

Template.expPanels.onDestroyed(()=>{
	runExpFunc.exitFullScreen();
	endExp();
});

Template.expLoadingSettings.helpers({
	availableLang () {
		let availableLang = expData.get() && expData.get().availableLang;
		if(availableLang) {
			return allLangList.find({code: {$in: availableLang}});
		}
		return;
	},
	creator () {
		return expData.get() && expData.get().userAccount;
	},
	defaultLang (code) {
		if(Session.equals('expLang', code)) {
			return 'selected';
		}
		return;
	},
	expBasicInfo (field) {
		if(expData.get()) {
			let data = expData.get().basicInfo;
			return data[field];
		}
	},
	expCompleted () {
		let exp = expData.get(), user = Meteor.user();
		return (!Session.equals('expType', 'preview') && ((exp && exp.status === 'complete') || 
			(exp && user && user.profile && user.profile.exp.participated.indexOf(exp._id) > -1)));
	},
	hour () {
		return expData.get() && expData.get().basicInfo.estTime.hour;
	},
	loadLongTexts (text) {
		let exp = expData.get();
		if(exp && exp.orientation) {
			let longText = exp.orientation[text][Session.get('expLang')] || exp.orientation[text]['en-us'];
			return runExpFunc.processLongTexts(longText);
		} 
		return;
	},
	min () {
		return expData.get() && expData.get().basicInfo.estTime.min;
	},
	termsAndCondition () {
		return termsAndCondition.get();
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.expLoadingSettings.events({
	'change #changeExpLang' (event) {
		let newLang = event.target.value;
		Session.set('expLang', newLang);
	},
	'touchend #compensation, click #compensation' (event) {
		if(Tools.swipeCheck(event)) {
			$('#compensationBlock').css('display', 'block');
		}
	},
	'touchend #consentForm, click #consentForm' (event) {
		if(Tools.swipeCheck(event)) {
			$('#consentFormBlock').css('display', 'block');
		}
	},
	'touchend #termsAndCondition, click #termsAndCondition' (event) {
		if(Tools.swipeCheck(event)) {
			$('#termsAndConditionBlock').css('display', 'block');
		}
	},
	'touchend #agreeAndContinue, click #agreeAndContinue' (event) {
		if(Tools.swipeCheck(event)) {
			if(Session.equals('expType', 'demo')) {
				$('#instructionContainer').hide().html('');
				Session.set('expSession', 'loadingMultimedia');
			}
			else {
				let signature = $('#signature').val();
				let runExpRecord = Meteor.user().runExpRecord;
				if(!Session.equals('expType', 'demo') && !runExpRecord) {
					Styling.showWarning('slowdown');
				}
				else if(signature.length === 0) {
					Styling.showWarning('signaturee', 'challenger');
				}
				else {
					Meteor.call('funcEntryWindow', 'exp', 'signConsent', {signature: signature, expLang: Session.get('expLang')}, (err, res)=>{
						if(err) {
							Tools.callErrorHandler(err, 'server');
						}
						else {
							$('#instructionContainer').hide().html('');
							// Update Jan 6
							let exp = expData.get();
							let useQuestionnaire = exp.orientation.questionnaire.use;
							if(useQuestionnaire && runExpRecord.sessionN === 1 &&
								(Meteor.user().profile.userCat === 'challenger' && 
									!Meteor.user().profile.exp.participated.includes(Session.get('expId'))) &&
								exp.status.state !== 'complete') {
								Session.set('expSession', 'questionnaire');
							}
							else {
								Session.set('expSession', 'loadingMultimedia');
							}
						}
					});
				}
			}
			
		}
	},
	'touchend #stopAndBack, click #stopAndBack' (event) {
		if(Tools.swipeCheck(event)) {
			let userData = Meteor.user();
			if(userData && userData.profile.userCat === 'challenger') {
				if(Meteor.user().runExpRecord.stage === 'repeat') {
					FlowRouter.go('userhome', {subpage: 'dashboard'});
				}
				else {
					FlowRouter.go('userhome', {subpage: 'explore'});
				}
			}
			else if(userData && userData.profile.userCat === 'experimenter') {
				FlowRouter.go('configExp', {subpage: 'basicInfo', expid: Session.get('expId')});
			}
			else {
				FlowRouter.go('home');
			}
			Session.set('expType', '')
			Session.set('expSession', '');
			Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: ''});
		}
	}
});

Template.expCustomQuestionnaire.helpers({
	expQuestionnaire () {
		let exp = expData.get();
		if(exp && exp.orientation) {
			let questionnaire = exp.orientation.questionnaire[Session.get('expLang')] || exp.orientation.questionnaire['en-us'];
			return runExpFunc.processLongTexts(questionnaire);
		}
		return;
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.expCustomQuestionnaire.events({
	'touchend #continue, click #continue' (event) {
		if(Tools.swipeCheck(event)) {
			let resp = $('#questionResp').val().trim();
			if(resp.length === 0) {
				Styling.showWarning('questionrespe', 'challenger');
			}
			else {
				let resp = $('#questionResp').val();
				Meteor.call('funcEntryWindow', 'exp', 'logQuestionnaireResp', {resp: resp}, (err, res)=>{
					if(err) {
						Tools.callErrorHandler(err, 'server');
					}
					else {
						Session.set('expSession', 'loadingMultimedia');
					}
				});
			}
		}
	},
	'touchend #back, click #back' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('expSession', 'loadingSettings');
		}
	}
});

Template.expLoadingMultimedia.onRendered(()=>{
	$('#expPresentChild').css(
		'transform', 'translate(-50%, -50%)'
	);
});

Template.expLoadingMultimedia.helpers({
	audioFiles () {
		let found = false;
		if(!Session.equals('expType', 'demo')) {
			allStimuli = Meteor.user().runExpRecord.stimuliList;
		}
		else {
			let demoTraining = expData.get() && expData.get().training.stimuli;
			let demoTest = expData.get() && expData.get().test.stimuli;
			allStimuli = [demoTraining, demoTest];
		}
		loop1:
		for(let i=0 ; i<allStimuli.length ; i++) {
			let stimuli = allStimuli[i];
			for(let key in stimuli) {
				if(key.indexOf('URL') > -1) {
					let col = stimuli[key];
					for(let j=0 ; j<col.length ; j++) {
						if(col[j].match(/\.wav$|\.mp3$|\.ogg$|\.avi$|\.mp4$|\.flac$/ig)) {
							found = true;
							break loop1;
						}
					}
				}
			}
		}
		return found;
	},
	loadingPercentage () {
		return preloadedPerc.get();
	},
	mediaFiles () {
		let found = false;
		if(!Session.equals('expType', 'demo')) {
			allStimuli = Meteor.user().runExpRecord.stimuliList;
		}
		else {
			let demoTraining = expData.get() && expData.get().training.stimuli;
			let demoTest = expData.get() && expData.get().test.stimuli;
			allStimuli = [demoTraining, demoTest];
		}
		loop1:
		for(let i=0 ; i<allStimuli.length ; i++) {
			let stimuli = allStimuli[i];
			for(let key in stimuli) {
				if(key.indexOf('URL') > -1) {
					found = true;
					break loop1;
				}
			}
		}
		return found;
	},
	preloading () {
		return preloading.get();
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.expLoadingMultimedia.events({
	'touchend #playSample, click #playSample' (event) {
		if(Tools.swipeCheck(event)) {
			let sampleAudio = new Audio(), sampleVideo = $('video')[0];
			if(!Session.equals('expType', 'demo')) {
				sampleSrc = Meteor.user().runExpRecord.mediaSample;
			}
			else {
				sampleSrc = 'https://lngproc.hss.nthu.edu.tw/expFiles/Chen2020Rep/Control/pina.wav';
			}
			if(sampleSrc.match(/\.mp4$|\.avi$/gi)) {
				sampleVideo.src = sampleSrc;
				sampleVideo.play();
			}
			else if(sampleSrc.match(/\.wav$|\.mp3$|\.ogg$/gi)) {
				sampleAudio.src = sampleSrc;
				sampleAudio.play();
			}
		}
	},
	'touchend #continue, touchend #reloadStimuli, click #reloadStimuli, click #continue' (event) {
		if(Tools.swipeCheck(event)) {
			preloadStimuli();
		}
	},
	'touchend #back, click #back' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('expSession', 'loadingSettings');
		}
	}
});

Template.expLoadingMultimedia.onDestroyed(()=>{
	preloadedPerc.set(0);
	preloading.set(false);
	blockStimuliDistributor();
});

Template.expTrainingInstruction.helpers({
	expTrainingInstruction () {
		let exp = expData.get();
		if(exp && exp.orientation) {
			let trainingIns = exp.orientation.trainingInstructions[Session.get('expLang')] || exp.orientation.trainingInstructions['en-us'];
			return runExpFunc.processLongTexts(trainingIns);
		}
		return;
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.expTrainingInstruction.events({
	'touchend #start, click #start' (event) {
		if(Tools.swipeCheck(event)) {
			if(!Session.equals('expType', 'demo')) {
				Meteor.call('funcEntryWindow', 'exp', 'expTracker', {expId: Session.get('expId'), key: 'stage', value: 'training'});
			}
			if(window.WebKitPoint) {
				let trainingBlocks = stimuliByBlock.training;
				for(let i=0 ; i<trainingBlocks.length ; i++) {
					let blockStimuli = trainingBlocks[i];
					for(let j=0 ; j<blockStimuli.length ; j++) {
						let stimuliIndex = blockStimuli[j];
						for(let key in loadedStimuli[0]) {
							if((key.indexOf('AudioURL') > -1 || key.indexOf('VideoURL') > -1) 
								&& key.indexOf('loaded') > -1) {
								let currentLoadedStimuli = loadedStimuli[0][key][stimuliIndex];
								currentLoadedStimuli.volume = 0;
								currentLoadedStimuli.play();
								currentLoadedStimuli.pause();
								currentLoadedStimuli.currentTime = 0;
								currentLoadedStimuli.volume = 1;
							}
						}
					}
				}
			}
			Session.set('expSession', 'training');
		}
	},
	'touchend #back, click #back' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('expSession', 'loadingSettings');
		}
	}
});

Template.expTrainingTrial.onRendered(()=>{
	let countDown = 5, nRep = 1;
	let blocks = expData.get().training.blocks;
	$('h3').eq(1).text(countDown);
	let intervalId = Meteor.setInterval(()=> {
		countDown--;
		$('h3').eq(1).text(countDown);
		if(countDown === 0) {
			Meteor.clearInterval(intervalId);
			$('.trialPresent').remove();
			$('#expBody').css('display', 'none');
			trialRunner('training', blocks, stimuliByBlock.training, expData.get().training.random);
		}
	}, 1000);
});

Template.expTrainingTrial.helpers({
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.expLowAccuracy.onRendered(()=>{
	runExpFunc.exitFullScreen();
});

Template.expLowAccuracy.helpers({
	accRate () {
		return Meteor.user() && Meteor.user().runExpRecord && Meteor.user().runExpRecord.respsStats.correctPerc;
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	},
	verifyCode () {
		return Meteor.user() && Meteor.user().runExpRecord && Meteor.user().runExpRecord.verifyCode;
	}
});

Template.expLowAccuracy.events({
	'touchend #endExp, click #endExp' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	}
});

Template.expLowAccuracy.onDestroyed(()=>{
	Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: ''});
});

Template.expTestInstruction.onRendered(()=>{
	blockCount = 0;
	emCount = 0;
});

Template.expTestInstruction.helpers({
	expTestInstruction () {
		let exp = expData.get();
		if(exp && exp.orientation) {
			let testIns = exp.orientation.testInstructions[Session.get('expLang')] || exp.orientation.testInstructions['en-us'];
			return runExpFunc.processLongTexts(testIns);
		}
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.expTestInstruction.events({
	'touchend #start, click #start' (event) {
		if(Tools.swipeCheck(event)) {
			if(!Session.equals('expType', 'demo')) {
				Meteor.call('funcEntryWindow', 'exp', 'expTracker', {expId: Session.get('expId'), key: 'stage', value: 'test'});
			}
			if(window.WebKitPoint) {
				let testBlocks = stimuliByBlock.test;
				for(let i=0 ; i<testBlocks.length ; i++) {
					let blockStimuli = testBlocks[i];
					for(let j=0 ; j<blockStimuli.length ; j++) {
						let stimuliIndex = blockStimuli[j];
						for(let key in loadedStimuli[1]) {
							if((key.indexOf('AudioURL') > -1 || key.indexOf('VideoURL') > -1) 
								&& key.indexOf('loaded') > -1) {
								let currentLoadedStimuli = loadedStimuli[1][key][stimuliIndex];
								currentLoadedStimuli.volume = 0;
								currentLoadedStimuli.play();
								currentLoadedStimuli.pause();
								currentLoadedStimuli.currentTime = 0;
								currentLoadedStimuli.volume = 1;
							}
						}
					}
				}
			}
			Session.set('expSession', 'test');
		}
	}
});

Template.expTestTrial.onRendered(()=>{
	let countDown = 5, nRep = 1;
	let blocks = expData.get().test.blocks;
	$('h3').eq(1).text(countDown);
	let intervalId = Meteor.setInterval(()=> {
		countDown--;
		$('h3').eq(1).text(countDown);
		if(countDown === 0) {
			Meteor.clearInterval(intervalId);
			$('.trialPresent').remove();
			$('#expBody').css('display', 'none');
			trialRunner('test', blocks, stimuliByBlock.test, expData.get().test.random);
		}
	}, 1000);
});

Template.expTestTrial.helpers({
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.noResp.onRendered(()=>{
	runExpFunc.exitFullScreen();
});

Template.noResp.helpers({
	respRate () {
		return Meteor.user() && Meteor.user().runExpRecord && Meteor.user().runExpRecord.respsStats.respRate;
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.noResp.events({
	'touchend #endExp, click #endExp' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	}
});

Template.noResp.onDestroyed(()=>{
	Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: ''});
});

Template.fastResp.onRendered(()=>{
	runExpFunc.exitFullScreen();
});

Template.fastResp.helpers({
	meanRT () {
		return Meteor.user() && Meteor.user().runExpRecord && Meteor.user().runExpRecord.respsStats.allRTMean;
	},
	translation (field) {
		return expTranslation.get() && expTranslation.get()[field];
	}
});

Template.fastResp.events({
	'touchend #endExp, click #endExp' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	}
});

Template.fastResp.onDestroyed(()=>{
	Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: ''});
});

function blockStimuliDistributor () {
	let trainingBlocks = expData.get().training.blocks, testBlocks = expData.get().test.blocks;
	let skipTraining = expData.get().training.skip;
	if(Session.equals('expType', 'demo')) {
		loadedStimuli = [expData.get().training.stimuli, expData.get().test.stimuli];
	}
	stimuliByBlock = runExpFunc.stimuliOrderer(loadedStimuli, trainingBlocks, testBlocks, skipTraining);
};

function preloadStimuli () {
	preloadedPerc.set(0);
	let exp = expData.get();
	let allStimuliN = 0, allMediaCols = [], allMediaColN = 0;
	let stimuliListN = exp.training.skip ? 1 : 0; 
	let mediaColItem = 0, mediaColItemN = 0;
	let loadedStimuliN = 0, stimuli = null;
	let userData = Meteor.user();
	loadedStimuli = allStimuli;
	for(let i=0 ; i<loadedStimuli.length ; i++) {
		let stimuliList = loadedStimuli[i], mediaCols = [];
		for(let key in stimuliList) {
			if(key.match(/(AudioURL)|(VideoURL)|(ImageURL)/g)) {
				allStimuliN += stimuliList[key].length;
				mediaCols.push(key);
			}
		}
		allMediaCols.push(mediaCols);
	}
	stimuli = loadedStimuli[stimuliListN];
	let loadStimuli = function() {
		let currentKey = allMediaCols[stimuliListN][allMediaColN];
		mediaColItemN = stimuli[currentKey].length;
		if(!stimuli[currentKey + '-loaded']) {
			stimuli[currentKey + '-loaded'] = [];
		}
		let currentStimuliURL = stimuli[currentKey][mediaColItem];
		if(currentKey.indexOf('AudioURL') > -1) {
			let audio = new Audio();
			audio.addEventListener('canplaythrough', preloaded, false);
			audio.src = currentStimuliURL;
			audio.load();
			stimuli[currentKey + '-loaded'].push(audio);
		}
		else if(currentKey.indexOf('VideoURL') > -1) {
			let video = document.createElement('video');
			video.addEventListener('canplaythrough', preloaded, false);
			video.src = currentStimuliURL;
			video.load();
			stimuli[currentKey + '-loaded'].push(video);
		}
		else {
			let image = new Image();
			image.src = currentStimuliURL;
			image.onload = preloaded;
			stimuli[currentKey + '-loaded'].push(image);
		}
	};
	let preloaded = function() {
		this.removeEventListener('canplaythrough', preloaded);
		loadedStimuliN++;
		mediaColItem++;
		let currentPerc = Math.floor(loadedStimuliN*1000/allStimuliN)/10;
		preloadedPerc.set(currentPerc);
		if(mediaColItem === mediaColItemN) {
			allMediaColN++;
			mediaColItem = 0;
		}
		if(allMediaColN === allMediaCols[stimuliListN].length) {
			loadedStimuli[stimuliListN] = stimuli;
			stimuliListN++;
			allMediaColN = 0;
			stimuli = loadedStimuli[stimuliListN];
		}
		if(currentPerc === 100) {
			$('#reloadStimuli').hide();
			Meteor.setTimeout(()=> {
				endPreloadStage();
			}, 2500);
		}
		else {
			loadStimuli();
		}
	};
	if(allStimuliN > 0) {
		preloading.set(true);
		loadStimuli();
	}
	else {
		endPreloadStage();
	}
};

function endPreloadStage () {
	let exp = expData.get(), userData = Meteor.user();
	if(exp && !Session.equals('expType', 'demo') && (exp.training.skip || 
		(userData.runExpRecord && userData.runExpRecord.sessionN > 1 && 
			!exp.basicInfo.multipleTrain))) {
		Session.set('expSession', 'testInstruction');
	}
	else {
		Session.set('expSession', 'trainingInstruction');
	}
};

let resolves = [], timeouts, multimedia;
let keepExpRunning = true, hasRandomTest = false, presentRT = false;
let randomTracking, trialN, allTrials, blockTitle;

let trialRunner = async function(session, blocks, stimuli, randomBlock) {
	keepExpRunning = true;
	trialN = 0;
	allTrials = [];
	randomTracking = {
		beforeRandomN: 0,
		currentRandomN: -1,
		randomNRange: [],
		stimuliContent: '',
		stimuliType: '',
		accStimuli: [],
		currentStimuli: []
	};
	let orderCount = 1, stimulus = {}, listN = session === 'training' ? 0 : 1;
	let randomBlockN = [], randomBlocks = [], randomStimuli = [];
	if(randomBlock) {
		do {
			let newPos;
			do {
				newPos = Math.floor(Math.random() * blocks.length);
			} 
			while(randomBlockN.indexOf(newPos) > -1);
			randomBlockN.push(newPos);
			randomBlocks.push(blocks[newPos]);
			randomStimuli.push(stimuli[newPos]);
		}
		while(randomBlockN.length < blocks.length);
		blocks = randomBlocks;
		stimuli = randomStimuli;
	}
	loop1:
	while(blocks.length > 0) {
		blockTitle = blocks[0].title;
		while(blocks[0].rep > 0) {
			let ems = blocks[0].elements, blockStimuli = stimuli[0];
			let currentEms = [];
			for(let stimuliN = 0 ; stimuliN < blockStimuli.length ; stimuliN++) {
				presentRT = false;
				trialN++;
				stimulus = blockStimuli[stimuliN];
				let emsLen = ems.length;
				for(let i=0 ; i<emsLen ; i++) {
					let em = ems[i];
					if(em.type === 'randomTest') {
						randomTracking.stimuliType = em.stimuli.type;
						randomTracking.stimuliContent = em.stimuli.content;
						if(randomTracking.stimuliContent.match(/AudioURL[A-Za-z]*|[A-Za-z]*VideoURL[A-Za-z]*|[A-Za-z]*ImageURL*[A-Za-z]/g)) {
							randomTracking.stimuliContent = '[[' + dropVarBrackets(randomTracking.stimuliContent) + '-loaded]]';
						}
						randomTracking.randomNRange = em.randomTest.interval.split('-');
						break;
					}
				}
				randomTracking.beforeRandomN += 1;
				while(orderCount !== 0) {
					trialRecorded = false;
					for(let i=0 ; i<emsLen ; i++) {
						let em = ems[i];
						if(em.order === orderCount) {
							if(randomTracking.currentRandomN === -1) {
								randomTracking.currentRandomN =
									Math.round(Math.random() * 
										(Number(randomTracking.randomNRange[1]-Number(randomTracking.randomNRange[0])))) + 
										Number(randomTracking.randomNRange[0]);
							}
							currentEms.push(em);
							if(em.type === 'randomTest') {
								hasRandomTest = true;
								if(randomTracking.beforeRandomN === randomTracking.currentRandomN) {
									presentRT = true;
								}
							}
						}
					}
					orderCount++;
					let emPresentResult = await emPresenter(listN, currentEms, stimulus);
					hasRandomTest = false;
					if(currentEms.length === 0 || !keepExpRunning) {
						break;
					}
					currentEms = [];
				}
				if(!keepExpRunning) {
					break loop1;
				}
				orderCount = 1;
			}
			resetRandomTracking();
			blocks[0].rep = blocks[0].rep - 1;
		}
		stimuli.splice(0, 1);
		blocks.splice(0, 1);
	}
	$('#expBody').css('display', 'block');
	if(Session.equals('expSession', 'training')) {
		if(!Session.equals('expType', 'demo')) {
			Meteor.call('funcEntryWindow', 'exp', 'expTracker', {expId: Session.get('expId'), key: 'trainingResults', value: allTrials}, function(err, res) {
				if(err) {}
				else {
					if(res.msg === 'lowAcc') {
						Session.set('expSession', 'lowAccuracy');
					} else {
						Session.set('expSession', 'testInstruction');
					}
				}
			});
		}
		else {
			Session.set('expSession', 'testInstruction');
		}
	}
	else if(Session.equals('expSession', 'test')) {
		if(!Session.equals('expType', 'demo')) {
			Meteor.call('funcEntryWindow', 'exp', 'expTracker', {expId: Session.get('expId'), key: 'testResults', value: allTrials, expType: Session.get('expType')}, function(err, res) {
				if(err) {
					if(err.error === 'noresp') {
						Session.set('expSession', 'noResp');
					}
					else {
						Session.set('expSession', 'fastResp');
					}
				}
				else {
					let userData = Meteor.user();
					FlowRouter.go('expResults', {lang: Session.get('userLang'), results: res.msg, session: res.sessionN});
					Session.set('expSession', '');
				}
			});
		}
		else {
			calcDemoRes();
			FlowRouter.go('expResults', {lang: Session.get('userLang'), results: 'demoExp', session: 1});
		}
	}
};

const emPresenter = async function(listN, targetEms, stimulus) {
	let promises = [];
	resolves = [], timeouts = new Array(targetEms.length), multimedia = [];
	for(let i=0 ; i<timeouts.length ; i++) {
		timeouts[i] = [];
	}
	for(let i=0 ; i<targetEms.length ; i++) {
		let em = targetEms[i];
		let start = 0, len = 0, rtPromptLen = 0, rtCorrect = '';
		let posX = -50, posY = -50, portraitView = ($(document).width() < 1200);
		let orderLabel = 'Order'+em.order, emLabel = 'Em'+em.title.replace(/\s/g, ''), emType = em.type;
		let stimuliType = em.stimuli.type, collectResp = em.resp.collect;
		let targetKeys = em.resp.keys.split(',');
		let content = '', stimuliID = loadedStimuli[listN]['StimuliID'] && loadedStimuli[listN]['StimuliID'][stimulus];
		let isRandomTest = (em.type === 'randomTest');
		let presentEm = ((!isRandomTest && !hasRandomTest && !presentRT) || 
			(!isRandomTest && hasRandomTest && presentRT) || (isRandomTest && presentRT));
		let usedInRandomTest = false;
		if(!isNaN(Number(em.length))) {
			len = Number(em.length) * 1000;
		}
		else {
			let variable = dropVarBrackets(em.length);
			variable += '-loaded';
			len = loadedStimuli[listN][variable][stimulus].duration * 1000;
		}
		if(em.stimuli.content === randomTracking.stimuliContent || em.stimuli.content === randomTracking.stimuliContent.replace('-loaded', '')) {
			usedInRandomTest = true;
		}
		if(isNaN(Number(em.start))) {
			let variable = dropVarBrackets(em.start);
			if(variable === 'Delay') {
				start = loadedStimuli[listN]['Delay'] * 1000;
			}
			else {
				variable += '-loaded';
				start = loadedStimuli[listN][variable][stimulus].duration * 1000;
			}
		}
		else {
			start = Number(em.start) * 1000;
		}
		if(isNaN(Number(em.pos.x))) {
			let posCol = dropVarBrackets(em.pos.x);
			posX += Number(loadedStimuli[listN][posCol][stimulus]);
		}
		else {
			posX += Number(em.pos.x);
		}
		if(isNaN(Number(em.pos.y))) {
			let posCol = dropVarBrackets(em.pos.y);
			posY += Number(loadedStimuli[listN][posCol][stimulus]);
		}
		else {
			posY += Number(em.pos.y);
		}
		if(presentEm && isRandomTest) {
			rtPromptLen = em.randomTest.promptLength * 1000;
			if(rtPromptLen < 0) {
				rtPromptLen = 3600000;
			}
			let dice = Math.random();
			let randomContent = dropVarBrackets(randomTracking.stimuliContent);
			if(dice > 0.5) {
				content = loadedStimuli[listN][randomContent][randomTracking.currentStimuli[0]];
				rtCorrect = targetKeys[0];
			}
			else {
				let accStimuli = randomTracking.accStimuli;
				let randomIndex = Math.floor(Math.random() * (accStimuli.length-2));
				content = loadedStimuli[listN][randomContent][accStimuli[randomIndex]];
				rtCorrect = targetKeys[1];
			}
		}
		else if(presentEm && em.stimuli.content.indexOf('[[') > -1 && em.stimuli.content.indexOf(']]') > -1) {		
			let variable = dropVarBrackets(em.stimuli.content);
			if(variable.match(/(AudioURL)|(VideoURL)|(ImageURL)/g)) {
				variable += '-loaded';
			}
			content = loadedStimuli[listN][variable][stimulus];
		}
		else if(presentEm) {
			content = em.stimuli.content;
		}
		let newResolve = {}, newAudio = {};
		promises.push(new Promise(function(resolve, reject) {
			newResolve.resolve = resolve;
			resolves.push(newResolve);
			let panel;
			let respType = '', respButtons = $(respType);
			let respTexts = em.resp.keyTexts.split(',');
			let respInfo = {};
			if(presentEm) {
				$('#expBody').append('<div class="trialPresent '+orderLabel+'" style="display: none; position: fixed; top: 50%; left: 50vw; transform: translate('+posX+'%, '+posY+'%);" id="'+emLabel+'"></div>');
				panel = $('div#'+emLabel);
				if(stimuliType === 'text')  {
					panel.append('<h3>'+content+'</h3>');
					if(len < 0) {
						len = 3600000;
					}
				}
				else if(stimuliType === 'audio') {
					newAudio.audio = content;
					multimedia[i] = newAudio;
					if(len < 0) {
						len = content.duration * 1000;
					}
				}
				else if(stimuliType === 'video') {
					panel.append($(content.cloneNode()));
					panel.children('video').css({
						'max-width': '80vw',
						'height': 'auto'
					});
					panel.children('video').attr('playsinline', '');
					if(len < 0) {
						len = content.duration * 1000;
					}
				}
				else {
					panel.append(content);
					panel.children('img').css({
						'max-width': '80vw',
						'height': 'auto'
					});
					if(len < 0) {
						len = 3600000;
					}
				}
				if(!isRandomTest) {
					randomTestTrackUpdate(presentEm, usedInRandomTest, stimulus);
				}
				respInfo = {
					targets: targetKeys,
					order: orderLabel,
					elem: em,
					isPortrait: portraitView,
					isRandomTest: isRandomTest,
					rtCorrect: rtCorrect,
					withResp: true,
					trialInfo: {
						stimuliID: stimuliID,
						trialOrder: trialN,
						trialLength: 0,
						block: blockTitle,
						em: emLabel,
						emOrder: em.order,
						emType: emType,
						pressedKey: 'na',
						correctKey: 'na',
						rt: 'na',
						correct: 'na'
					}
				};
				if(typeof content === 'string') {
					respInfo.trialInfo.content = content + '';
				}
				else {
					respInfo.trialInfo.content = content.src;
				}
			}
			if(portraitView && collectResp) {
				respType = em.resp.type, respButtons = $('div#'+respType+' > div');
				if(respType === 'unary') {
					respButtons.text(respTexts[0]);
					respButtons.attr('id', targetKeys[0]);
				}
				else if(respType === 'binary' || isRandomTest) {
					respButtons.eq(0).text(respTexts[0]);
					respButtons.eq(1).text(respTexts[1]);
					respButtons.eq(0).attr('id', targetKeys[0]);
					respButtons.eq(1).attr('id', targetKeys[1]);
				}
				else {
					for(let j=0 ; j<7 ; j++) {
						if(j < respTexts.length) {
							respButtons.eq(j).text(respTexts[j]);
							respButtons.eq(j).attr('id', targetKeys[j]);
							respButtons.eq(j).css('display', 'initial');
						}
						else {
							respButtons.eq(j).css('display', 'none');
						}
					}
				}
			}
			if(presentEm) {
				let startTimeout = Meteor.setTimeout(function() {
					respInfo.trialInfo.onsetTime = (new Date()).getTime();
					if(presentEm && isRandomTest) {
						let rtPrompt = em.randomTest.prompt;
						$('#expBody').prepend('<h3 class="rtPrompt" style="position: fixed; top: 50%; left: 50vw; margin: 0; transform: translate(-50%, -50%);"></h3>');
						$('#expBody > h3.rtPrompt').text(rtPrompt);
					}
					let rtTimeout = Meteor.setTimeout(function() {
						if(isRandomTest) {
							$('#expBody > h3.rtPrompt').remove();
						}
						if(collectResp) {
							$(document).on('keydown', respAction.bind(this, listN, respInfo, stimulus, i));
							if(portraitView) {
								respButtons.on('touchstart', respAction.bind(this, listN, respInfo, stimulus, i));
								$('div#'+respType).css('display', 'flex');
							}
						}
						if(stimuliType === 'audio') {
							content.play();
						}
						else if(stimuliType === 'video') {
							panel.css('display', 'block');
							panel.children('video').get(0).play();
						}
						else {
							panel.css('display', 'block');
						}
						let endTimeout = Meteor.setTimeout(function() {
							if(collectResp) {
								deactivateResp();
							}
							respInfo.trialInfo.offsetTime = (new Date()).getTime();
							if(stimuliType === 'audio') {
								content.pause();
								content.currentTime = 0;
							}
							else if(stimuliType === 'video') {
								panel.children('video').get(0).pause();
								panel.children('video').get(0).currentTime = 0;
							}
							panel.remove();
							respInfo.trialInfo.trialLength = 
								respInfo.trialInfo.offsetTime - respInfo.trialInfo.onsetTime;
							if(collectResp) {
								respInfo.withResp = false;
								respAction(listN, respInfo, stimulus, i);
							}
							else {
								resolve('resolved');
								allTrials.push(respInfo.trialInfo);
							}
						}, len);
						timeouts[i].push(endTimeout);
					}, rtPromptLen);
					timeouts[i].push(rtTimeout);
				}, start);
				timeouts[i].push(startTimeout);
			}
			else {
				stopEms('all');
				resolver('all');
			}
		}));
		if(i === targetEms.length - 1) {
			$('#expBody').css('display', 'block');
		}
	}
	return Promise.all(promises);
};

function dropVarBrackets (variable) {
	let newVar = variable.replace(/\[\[/g, '');
	newVar = newVar.replace(/\]\]/g, '');
	return newVar;
};

function randomTestTrackUpdate (present, used, stimulus) {
	if(present && used) {
		randomTracking.currentStimuli = [];
		randomTracking.currentStimuli.push(stimulus);
		randomTracking.accStimuli.push(stimulus);
	};
};

function respAction (listN, resp, stimulus, emN) {
	let event, pressedKeyNum, pressedKeyChar, targetKey, correctKey;
	if(resp.isRandomTest) {
		correctKey = resp.rtCorrect;
	}
	else if(resp.elem.resp.correctResp.indexOf('[[') > -1 && resp.elem.resp.correctResp.indexOf(']]') > -1) {
		correctKey = loadedStimuli[listN][dropVarBrackets(resp.elem.resp.correctResp)][stimulus];
	}
	else {
		correctKey = resp.elem.resp.correctResp;
	}
	resp.trialInfo.correctKey = correctKey;
	let correctKeyArray = correctKey.split(',');
	if(resp.withResp) {
		resp.trialInfo.offsetTime = new Date();
		if(resp.isPortrait) {
			pressedKeyChar = this.event.currentTarget.id;
		}
		else {
			event = this.event;
			pressedKeyNum = event.which || event.keyCode;
			pressedKeyChar = String.fromCharCode(pressedKeyNum).toLowerCase();
		}
		if(pressedKeyChar === ' ') {
			pressedKeyChar = 'space';
		}
		targetKey = resp.targets.indexOf(pressedKeyChar);
		if(targetKey > -1) {
			deactivateResp();
			resp.trialInfo.rt = 
				resp.trialInfo.offsetTime - resp.trialInfo.onsetTime;
			resp.trialInfo.pressedKey = pressedKeyChar;
			if(resp.isRandomTest) {
				resetRandomTracking();
			}
			if(resp.elem.resp.terminate) {
				$('div.'+resp.order).remove();
			}
			else {
				$('div.'+resp.order).eq(emN).remove();
			}
			if(correctKeyArray.indexOf(resp.targets[targetKey]) > -1) {
				if(resp.elem.resp.check) {
					resp.trialInfo.correct = 'yes';
				}
				postRespAction(resp.elem.resp, true, emN);
			}
			else {
				if(resp.elem.resp.check) {
					resp.trialInfo.correct = 'no';
				}
				postRespAction(resp.elem.resp, false, emN);
			}
		}
	}
	else {
		if(resp.elem.resp.terminate) {
			$('div.'+resp.order).remove();
		}
		else {
			$('div.'+resp.order).eq(emN).remove();
		}
		if(resp.elem.resp.check) {
			resp.trialInfo.correct = 'no';
		}
		if(resp.isRandomTest) {
			resetRandomTracking();
		}
		postRespAction(resp.elem.resp, false, emN);
	}
	resp.trialInfo.trialLength = 
			resp.trialInfo.offsetTime - resp.trialInfo.onsetTime;
	if(!trialRecorded) {
		allTrials.push(resp.trialInfo);
		trialRecorded = true;
	}
};

function deactivateResp () {
	$(document).off('keydown');
	$('div.respButtons'+' > div').off('touchstart');
	$('div.respButtons').css('display', 'none');
};

function resetRandomTracking () {
	randomTracking.accStimuli = [];
	randomTracking.beforeRandomN = 0;
	randomTracking.currentRandomN = -1;
};

function postRespAction (respConfig, correct, emNumber) {
	let correctMsg, terminate = respConfig.terminate;
	if(respConfig.feedback && respConfig.feedback.show) {
		if(respConfig.feedback && respConfig.feedback.texts) {
			correctMsg = respConfig.feedback.texts.split(',');
		}
		$('#expBody').append('<div class="trialPresent" id="feedback" style="position: fixed; top: 50%; left: 50vw; transform: translate(-50%, -50%);"></div>');
		if(correct) {
			$('.trialPresent#feedback').append('<h3>'+correctMsg[0]+'</h3>');
		}
		else {
			$('.trialPresent#feedback').append('<h3>'+correctMsg[1]+'</h3>');
		}
		stopEms('all');
		Meteor.setTimeout(function() {
			$('.trialPresent').remove();
			resolver('all');
		}, respConfig.feedback.length * 1000);
	}
	else {
		if(terminate) {
			resolver('all');
			stopEms('all');
		}
		else {
			resolver(emNumber);
			stopEms(emNumber);
		}
	}
};

function stopEms (index) {
	if(index === 'all') {
		for(let i=0 ; i<timeouts.length ; i++) {
			for(let j=0 ; j<timeouts[i].length ; j++) {
				Meteor.clearTimeout(timeouts[i][j]);
			}
		}
		for(let i=0 ; i<multimedia.length ; i++) {
			if(multimedia[i] && multimedia[i].audio) {
				multimedia[i].audio.pause();
				multimedia[i].audio.currentTime = 0;
			}
		}
	}
	else {
		for(let i=0 ; i<timeouts[index].length ; i++) {
			Meteor.clearTimeout(timeouts[index][i]);
		}
		if(multimedia && multimedia[index] && multimedia[index].audio) {
			multimedia[index].audio.pause();
			multimedia[index].audio.currentTime = 0;
		}
	}
	isRandomTest = false;
};

function resolver (index) {
	if(index === 'all') {
		for(let i=0 ; i<resolves.length ; i++) {
			resolves[i].resolve('resolved');
		}
	}
	else {
		resolves[index].resolve('resolved');
	}
};

function calcDemoRes () {
	let stats = {
		date: new Date(),
		correctN: 0,
		correctPerc: 0,
		correctRTMean: 0,
		allRTMean: 0,
		achievements: []
	};
	let correct = 0, correctN = 0, correctRTs = 0, allRTs = 0, correctRTN = 0, allRTN = 0;
	for(let i=0 ; i<allTrials.length ; i++) {
		let trial = allTrials[i];
		if(trial.correct.match(/yes|no/g)) {
			correctN++;
			if(trial.correct === 'yes') {
				correct++;
				correctRTs += trial.rt;
				allRTs += trial.rt;
				correctRTN++;
				allRTN++;
			}
			else {
				if(!isNaN(Number(trial.rt))) {
					allRTs += trial.rt;
					allRTN++;
				}
			}
		}
	}
	if(correctN === 0) {
		correctN = 1;
	}
	if(correctRTN === 0) {
		correctRTN = 1;
	}
	if(allRTN === 0) {
		allRTN = 1;
	}
	stats.correct = correct;
	stats.correctPerc = Math.round(correct * 1000 / correctN) / 10;
	stats.correctRTMean = Math.round(correctRTs * 10 / correctRTN) / 10;
	stats.allRTMean = Math.round(allRTs * 10 / allRTN) / 10;
	stats.sessionN = 1;
	stats.verifyCode = 'Not Applicable';
	stats.debriefing = experimentDB.findOne().debriefing[Session.get('userLang')];
	Session.set('demoExpRes', stats);
};

function endExp () {
	keepExpRunning = false;
	if(Session.equals('expSession', 'training') || Session.equals('expSession', 'test')) {
		stopEms('all');
		resolver('all');
	}
};