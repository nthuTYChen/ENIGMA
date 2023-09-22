import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Styling_configExp from '../styling/stylingFuncs_configExp.js';
import Tools from '../lib/commonTools.js';

import './menus.js';
import '../../template/experimenter/menus.html';
import '../../template/experimenter/configExp.html';

var expData = new ReactiveVar(null), lang = new ReactiveVar('en-us');
var updateCat = new ReactiveVar(null), currentEm = new ReactiveVar(null);
var testingList = new ReactiveVar(false), testingProgress = new ReactiveVar(0);

let expErTexts = new ReactiveVar(null), recordType = new ReactiveVar('unverified');

Tracker.autorun(()=>{
	let currentExpId = FlowRouter.getParam('expid');
	expData.set(experimentDB.findOne({_id: currentExpId}));
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
});

Template.configBasicInfo.onRendered(()=>{
	lang.set('en-us');
	$('#ShowLess').hide();
	$('section:not(:first)').hide();
});

Template.configBasicInfo.helpers({
	activated () {
		return expData.get() && (expData.get().status.state === 'active');
	},
	boxChecked (field, subfield) {
		if(subfield && expData.get() && expData.get().basicInfo[field][subfield]) {
			return 'checked';
		}
		else if(typeof subfield !== 'string' && expData.get() && expData.get().basicInfo[field]) {
			return 'checked';
		}
		return '';
	},
	columnYes (field) {
		if(expData.get() && expData.get().basicInfo[field]) {
			return expErTexts.get() && expErTexts.get()['yes'];
		}
		return expErTexts.get() && expErTexts.get()['no'];
	},
	coordinators () {
		return expData.get() && expData.get().coordinators;
	},
	defaultLang (lang) {
		if(lang === 'en-us') {
			return 'selected';
		}
		return;
	},
	excludedExps () {
		return expData.get() && expData.get().excludedExps;
	},
	expBasicInfo (field) {
		if(field !== 'hour' && field !== 'min') {
			return expData.get() && expData.get().basicInfo[field];
		}
		else {
			return expData.get() && expData.get().basicInfo.estTime[field];
		}
	},
	expGenInfo (field) {
		return expData.get() && expData.get()[field];
	},
	expResults () {
		if(recordType.get() === 'all') {
			return expResultsDB.find({});
		}
		else if(recordType.get() === 'verified') {
			return expResultsDB.find({verified: true});
		}
		else {
			return expResultsDB.find({verified: {$ne: true}});
		}
	},
	expStatusInfo (field) {
		if(field === 'state') {
			let status = expData.get() && expData.get().status[field];
			return expErTexts.get() && expErTexts.get()[status];
		}
		return expData.get() && expData.get().status[field];
	},
	expState (state) {
		return expData.get() && (expData.get().status.state === state);
	},
	languages () {
		let userLang = Session.get('userLang');
		return langList[userLang];
	},
	notCoordinator () {
		return expData.get() && expData.get().coordinators && expData.get().coordinators.indexOf(Meteor.user().username) < 0;
	},
	notWithdrawn (data) {
		if(data) {
			return false;
		}
		return true;
	},
	screeningExclude (field) {
		if(expData.get() && expData.get().basicInfo.screening[field]) {
			return expErTexts.get() && expErTexts.get()['excluded'];
		}
		return expErTexts.get() && expErTexts.get()['notexcluded'];
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	},
	validateRes (validated) {
		if(validated) {
			return expErTexts.get() && expErTexts.get()['yes'];
		}
		return expErTexts.get() && expErTexts.get()['no'];
	},
	validateResColor (validated) {
		if(validated) {
			return '#90be6d';
		}
		return '#cf1313';
	},
	validateResStage (stage) {
		return expErTexts.get() && expErTexts.get()[stage.toLowerCase()];
	}
});

Template.configBasicInfo.events({
	'touchend #configExpIns, click #configExpIns' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.getAndShowInstruction('configExp');
		}
	},
	'touchend #copyExpLinks, click #copyExpLinks' (event) {
		event.preventDefault();
		if(Tools.swipeCheck(event)) {
			if(!navigator.clipboard) {
				Styling.showWarning('nosupportcopy', 'experimenter');
			}
			else {
				let links = '', currentExpId = FlowRouter.getParam('expid');
				links += domainURL + urlRootPath + 'runExp/en-us/' + currentExpId + '\n';
				links += domainURL + urlRootPath + 'runExp/zh-tw/' + currentExpId;
				navigator.clipboard.writeText(links).then(function() {
					Styling.showWarning('linkscopied', 'experimenter');
				});
			}
		}
	},
	'touchend #closeInstruction, click #closeInstruction' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.closeInstruction();
		}
	},
	'touchend #ShowMore, click #ShowMore' (event) {
		if(Tools.swipeCheck(event)) {
			$('.details').css('display', 'table-row');
			$('#ShowMore').hide();
			$('#ShowLess').show();
		}
	},
	'touchend #ShowLess, click #ShowLess' (event) {
		if(Tools.swipeCheck(event)) {
			$('.details').hide();
			$('#ShowMore').show();
			$('#ShowLess').hide();
		}
	},
	'touchend #activate, click #activate' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('userhome', {subpage: 'checkExpSettings'});
		}
	},
	'click #download' (event) {
		Tools.stopPropDefault(event);
		Styling.showWarning('downloading', 'experimenter');
		Meteor.call('funcEntryWindow', 'exp', 'downloadExpResults', {expId: Session.get('expId')}, (err, res)=>{
			if(err) {
				Tools.callErrorHandler(err, 'server', 'experimenter');
			}
			else {
				let windowRef = window.open();
				let dir = 'Files/';
				if(urlRootPath === 'ENIGMA/') {
					dir = 'enigma' + dir;
				}
				else {
					dir = 'enigmaDemo' + dir;
				}
				windowRef.location = domainURL + dir + res.msg;
			}
		});
	},
	'touchend #preview, click #preview' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('expType', 'preview');
			if(expData.get().status.state === 'active') {
				Tools.runExp();
			}
			else {
				FlowRouter.go('userhome', {subpage: 'checkExpSettings'});
			}
		}
	},
	'touchend #delete, click #delete' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('deleteExp', {expid: expData.get()._id});
		}
	},
	'click #quitCoord' (event) {
		Tools.stopPropDefault(event);
		Meteor.call('funcEntryWindow', 'exp', 'endCoordination', 
				{expId: expData.get()._id}, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server');
				}
				else {
					FlowRouter.go('userhome', {subpage: 'manageExp'});
					Styling.showWarning('coordremoved', 'experimenter');
				}
		});
	},
	'click #editCoord' (event) {
		Tools.stopPropDefault(event);
		$('section').hide();
		$('section').eq(1).show();
	},
	'click #excludeExp' (event) {
		Tools.stopPropDefault(event);
		$('section').hide();
		$('section').eq(2).show();
	},
	'click #addCoord' (event) {
		Tools.stopPropDefault(event);
		let coordEmail = $('#coordEmail').val();
		if(!$('form')[1].checkValidity()) {
			Styling.showWarning('formvalide');
		}
		else {
			Meteor.call('funcEntryWindow', 'exp', 'addCoordinator', 
				{expId: expData.get()._id,  coordinator: coordEmail}, (err, result)=>{
				$('#coordEmail').val('');
				if(err) {
					Tools.callErrorHandler(err, 'server', 'experimenter');
				}
				else {
					Styling.showWarning('coordadded', 'experimenter');
				}
			});
		}
	},
	'click .removeCoord' (event) {
		Tools.stopPropDefault(event);
		let coordEmail = event.target.id;
		Meteor.call('funcEntryWindow', 'exp', 'removeCoordinator', 
				{expId: expData.get()._id,  coordinator: coordEmail}, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server');
				}
				else {
					Styling.showWarning('coordremoved', 'experimenter');
				}
		});
	},
	'click #validate' (event) {
		Tools.stopPropDefault(event);
		$('section').hide();
		$('section').eq(3).show();
	},
	'click #change' (event) {
		Tools.stopPropDefault(event);
		$('section').hide();
		$('section').eq(4).show();
	},
	'click #saveExpSettings' (event) {
		Tools.stopPropDefault(event);
		if(!$('form')[0].checkValidity()) {
			Styling.showWarning('formvalide');
		}
		else {
			let newExpBasics;
			newExpBasics = {
				expId: Session.get('expId'),
				title: $('#title').val(),
				keywords: $('#keywords').val(),
				researchers: $('#researcher').val(),
				affiliations: $('#affiliation').val(),
				email: $('#email').val(),
				website: $('#website').val(),
				ethics: $('#ethics').val(),
				subjNum: $('#subjNum').val(),
				age: $('#age').val(),
				screening: {
					fastCompletion: $('#fastCompletion').prop('checked'),
					frequentQuitter: $('#frequentQuitter').prop('checked'),
					daydreamer: $('#daydreamer').prop('checked'),
					hacking: true
				},
				estTime: {hour: $('#hour').val(), min: $('#min').val()},
				gapHour: $('#gapHour').val(),
				multiple: $('#multiple').prop('checked'),
				multipleN: $('#multipleN').val(),
				multipleTrain: $('#multipleTrain').prop('checked')
			};
			Meteor.call('funcEntryWindow', 'exp', 'updateExpBasics', newExpBasics, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server', 'experimenter');
				}
				else {
					Styling.showWarning('updateexpbasicok', 'experimenter');
					$('section').hide();
					$('section').eq(0).show();
				}
			});
		}
	},
	'click #cancelChange' (event) {
		Tools.stopPropDefault(event);
		$('#coordEmail').val('');
		$('section').hide();
		$('section').eq(0).show();
	},
	'click #verify' (event) {
		Tools.stopPropDefault(event);
		if(!$('form')[3].checkValidity()) {
			Styling.showWarning('formvalide');
		}
		else {
			Styling.showWarning('verifying', 'experimenter');
			let code = $('#verifyCode').val().trim();
			Meteor.call('funcEntryWindow', 'exp', 'verifyRes', 
					{expId: expData.get()._id,  code: code}, (err, result)=>{
					$('#coordEmail').val('');
					if(err) {
						Tools.callErrorHandler(err, 'server', 'experimenter');
					}
					else {
						Styling.showWarning('verifysuccessful', 'experimenter');
					}
			});
		}
	},
	'click #cancelVerify' (event) {
		Tools.stopPropDefault(event);
		$('#verifyCode').val('');
		$('section').hide();
		$('section').eq(0).show();
	},
	'click #showAll' (event) {
		Tools.stopPropDefault(event);
		recordType.set('all');
	},
	'click #showUnverified' (event) {
		Tools.stopPropDefault(event);
		recordType.set('unverified');
	},
	'click #showVerified' (event) {
		Tools.stopPropDefault(event);
		recordType.set('verified');
	},
	'click #exclude' (event) {
		Tools.stopPropDefault(event);
		if(!$('form')[2].checkValidity()) {
			Styling.showWarning('formvalide');
		}
		else {
			let expIds = $('#challengeCode').val().replace(/\s/g).trim().split(';');
			Meteor.call('funcEntryWindow', 'exp', 'addExcludedExps', 
					{expId: expData.get()._id,  excludedExps: expIds}, (err, result)=>{
					if(err) {
						Tools.callErrorHandler(err, 'server', 'experimenter');
					}
					else {
						Styling.showWarning('excludedexpadded', 'experimenter');
					}
			});
		}
	},
	'click #cancelExclude' (event) {
		Tools.stopPropDefault(event);
		$('#challengeCode').val('');
		$('section').hide();
		$('section').eq(0).show();
	},
	'click .removeExcludedExp' (event) {
		Tools.stopPropDefault(event);
		let removedId = event.target.id.replace('exc_', '');
		Meteor.call('funcEntryWindow', 'exp', 'removeExcludedExps', 
				{expId: expData.get()._id,  removedId: removedId}, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server');
				}
				else {
					Styling.showWarning('excludedexpremoved', 'experimenter');
				}
		});
	}
});

Template.orientation.onRendered(()=>{
	lang.set('en-us');
});

Template.orientation.helpers({
	activated () {
		return expData.get() && (expData.get().status.state === 'active');
	},
	consentForm () {
		return expData.get() && expData.get().orientation.consentForms[lang.get()];
	},
	consentFormNum () {
		if(!expData.get() || !expData.get().orientation.consentForms[lang.get()]) {
			return 0;
		}
		return expData.get().orientation.consentForms[lang.get()].length;
	},
	compensation () {
		return expData.get() && expData.get().orientation.compensations[lang.get()];
	},
	compensationNum () {
		if(!expData.get() || !expData.get().orientation.compensations[lang.get()]) {
			return 0;
		}
		return expData.get().orientation.compensations[lang.get()].length;
	},
	descriptions () {
		return expData.get() && expData.get().orientation.descriptions[lang.get()];
	},
	descriptionNum () {
		if(!expData.get() || !expData.get().orientation.descriptions[lang.get()]) {
			return 0;
		}
		return expData.get().orientation.descriptions[lang.get()].length;
	},
	instructionNum (type) {
		if(!expData.get() || !expData.get().orientation[type][lang.get()]) {
			return 0;
		}
		return expData.get().orientation[type][lang.get()].length;
	},
	instructions (type) {
		return expData.get() && expData.get().orientation[type][lang.get()];
	},
	defaultLang (lang) {
		if(lang === 'en-us') {
			return 'selected';
		}
		return;
	},
	languages () {
		let userLang = Session.get('userLang');
		return langList[userLang];
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	}
});

Template.orientation.events({
	'click #orientationIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('orientation');
	},
	'click #closeInstruction' (event) {
		Tools.stopPropDefault(event);
		Tools.closeInstruction();
	},
	'change select[name=languages]' (event) {
		let newLang = event.target.value;
		lang.set(newLang);
	},
	'keyup #trainingInstructions, keyup #testInstructions, keyup #consentForms, keyup #compensations, keyup #descriptions' (event) {
		let currentTarget = event.currentTarget.id;
		let newTexts = $('#'+currentTarget).val();
		let newExpData = expData.get();
		newExpData.orientation[currentTarget][lang.get()] = newTexts;
		expData.set(newExpData);
	},
	'click #orientationSubmit' (event) {
		Tools.stopPropDefault(event);
		let orientationTexts = expData.get().orientation;
		for(let key in orientationTexts) {
			if(!orientationTexts[key]['en-us']) {
				orientationTexts[key]['en-us'] = '';
			}
		}
		Meteor.call('funcEntryWindow', 'exp', 'changeOrientationInfo', 
				{expId: expData.get()._id,  orientation: orientationTexts}, (err, result)=>{
				if(err) {
					if(err.error === 'too-many-requests') {
						Styling.showWarning('slowdown');
					}
					else {
						Styling.showWarning(err.error, 'experimenter');
					}
				}
				else {
					Styling.showWarning('saved', 'experimenter');
				}
		});
	}
});

Template.trainingConfig.onRendered(()=>{
	currentEm.set(null);
	testingList.set(false);
	$('.deleteEm').hide();
});

Template.trainingConfig.helpers({
	accuracyValue () {
		return expData.get() && expData.get().training.threshold.pass;
	},
	activated () {
		return expData.get() && (expData.get().status.state === 'active');
	},
	blocks () {
		return expData.get() && expData.get().training.blocks;
	},
	blockSelect (allIds, currentId) {
		if(allIds === currentId) {
			return 'selected';
		}
		return;
	},
	boxChecked (col, checked) {
		if(col === 'skipTraining') {
			if(expData.get() && expData.get().training.skip) {
				return 'checked';
			}
		}
		else if(col === 'randomBlocks') {
			if(expData.get() && expData.get().training.random) {
				return 'checked';
			}
		}
		else if(col === 'targetAccuracy') {
			if(expData.get() && expData.get().training.threshold.apply) {
				return 'checked';
			}
		}
		else if((col === 'randomStimuliOrder') && checked) {
			return 'checked';
		}
		else if(col === 'collectResp' && currentEm.get() && currentEm.get().resp.collect) {
			return 'checked';
		}
		else if(col === 'checkResp' && currentEm.get() && currentEm.get().resp.check) {
			return 'checked';
		}
		else if(col === 'showFeedback' && currentEm.get() && currentEm.get().resp.feedback.show) {
			return 'checked';
		}
		return;
	},
	boxDisabled (box) {
		if(currentEm.get() && currentEm.get().type === 'randomTest') {
			if(['emCheckResp', 'emCollectResp', 'emCorrResp', 'emRespType'].indexOf(box) > -1) {
				return 'disabled';
			}
		}
		return;
	},
	collectResp () {
		return currentEm.get() && currentEm.get().resp.collect;
	},
	emStyle (style, id, order) {
		if(expData.get()) {
			let allEms = expData.get().training.blocks[id].elements;
			return setEmStyle(allEms, order, style);
		}
	},
	emTypeSelect (type) {
		let em = currentEm.get();
		if(em) {
			if(em.type === type) {
				return 'selected';
			}
		}
		return null;
	},
	emValue (field, subfield) {
		if(typeof subfield === 'string') {
			return currentEm.get() && currentEm.get()[field] && currentEm.get()[field][subfield];
		}
		return currentEm.get() && currentEm.get()[field];
	},
	existTrainingStimuli () {
		return (expData.get() && expData.get().training.stimuli.nRows);
	},
	feedbackLen () {
		return (currentEm.get() && currentEm.get().resp.feedback.length);
	},
	feedbackTexts () {
		return (currentEm.get() && currentEm.get().resp.feedback.texts);
	},
	stimuliCols () {
		return (expData.get() && expData.get().training.stimuli.nCols);
	},
	stimuliRows () {
		return (expData.get() && expData.get().training.stimuli.nRows);
	},
	respTypeSelect (type) {
		let em = currentEm.get();
		if(em) {
			if(em.resp.type === type) {
				return 'selected';
			}
		}
		return null;
	},
	stimuliTypeSelect (type) {
		let em = currentEm.get();
		if(em) {
			if(em.stimuli.type === type) {
				return 'selected';
			}
		}
		return null;
	},
	testingList () {
		return testingList.get();
	},
	testingProgress () {
		return testingProgress.get() + '%';
	},
	thresholdApply () {
		return (expData.get() && expData.get().training.threshold.apply);
	},
	trainingBlocks () {
		return (expData.get() && expData.get().training.blocks.length);
	},
	trainingConds () {
		return (expData.get() && expData.get().training.conditions);
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	},
	updateCat () {
		return updateCat.get();
	}
});

Template.trainingConfig.events({
	'click #trainingConfigIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('trainingConfig');
	},
	'click #stimuliFileIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('stimuliFile');
	},
	'click #closeInstruction' (event) {
		Tools.stopPropDefault(event);
		Tools.closeInstruction();
	},
	'click #selectTrainingList' (event) {
		Tools.stopPropDefault(event);
		$('#hiddenSelector').click();
	},
	'click #skipTraining' (event) {
		let checked = $('#skipTraining').prop('checked');
		let newExpData = expData.get();
		newExpData.training.skip = checked;
		expData.set(newExpData);
	},
	'change #hiddenSelector' (event) {
		loadStimuliFile('training', event);
	},
	'click #downloadList' (event) {
		Tools.stopPropDefault(event);
		downloadStimuliList('training');
	},
	'click #testTrainingList' (event) {
		Tools.stopPropDefault(event);
		URLChecker(expData.get().training.stimuli);
	},
	'click #randomBlocks' () {
		let checked = $('#randomBlocks').prop('checked');
		let newExpData = expData.get();
		newExpData.training.random = checked;
		expData.set(newExpData);
	},
	'click [id$="_edit"]' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.target.id.replace('_edit', '');
		showEmOpts(blockId, 1, 4);
		hideEmOpts(blockId, false, 5, 21);
		updateCat.set('Block');
		$('fieldset#block_' + blockId + ' > div').hide();
	},
	'click [id$="_add"]' (event) {
		Tools.stopPropDefault(event);
		let id = event.target.id.replace('_add', '');
		let block = getBlocks(id, 'training');
		addEm(id, block, 'training');
	},
	'change .emType' (event) {
		let newType = event.currentTarget.value;
		let target = event.currentTarget.id;
		let blockId = Number(target.split('_')[1]);
		if(newType === 'randomTest') {
			if(!$('#emCollectResp_'+blockId).prop('checked')) {
				$('#emCollectResp_'+blockId).click();
			}
			if(!$('#emCheckResp_'+blockId).prop('checked')) {
				$('#emCheckResp_'+blockId).click();
			}
			$('.emRespType').val('binary');
			showEmOpts(blockId, 19, 21);
		}
		else {
			hideEmOpts(blockId, false, 19, 21);
		}
		setEm(newType, 'type');
	},
	'change .emStimuli' (event) {
		let newType = event.currentTarget.value;
		let target = event.currentTarget.id;
		let blockId = Number(target.split('_')[1]);
		setEm(newType, 'stimuli', 'type');
	},
	'click #targetAccuracy' (event) {
		event.stopPropagation();
		let checked = $('#targetAccuracy').prop('checked');
		let newExpData = expData.get();
		newExpData.training.threshold.apply = checked;
		expData.set(newExpData);
	},
	'keyup #accuracyValue' (event) {
		let newExpData = expData.get();
		newExpData.training.threshold.pass = Number($('#accuracyValue').val().trim());
		expData.set(newExpData);
	},
	'click .emCollectResp' (event) {
		Tools.stopPropDefault(event);
		changeEmCollectResp(event, 13, 16, 18);
	},
	'click .emCheckResp' (event) {
		event.stopPropagation();
		let target = event.currentTarget.id;
		let checked = $('#'+target).prop('checked');
		setEm(checked, 'resp', 'check');
	},
	'change .emRespType' (event) {
		changeEmRespType(event);
	},
	'click .emShowFeedback' (event) {
		Tools.stopPropDefault(event);
		changeEmShowFeedback(event, 17, 18);
	},
	'click .updateBlock' (event) {
		Tools.stopPropDefault(event);
		let id = event.currentTarget.id;
		updateBlock(id, 'training');
	},
	'click .updateEm' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.currentTarget.id;
		updateEm(blockId, 'training');
	},
	'click .hideUpdate' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.target.id;
		hideEmOpts(blockId, true);
		$('fieldset#block_' + blockId + ' .deleteEm').hide();
		$('fieldset#block_' + blockId + ' > div').show();
	},
	'click .deleteEm' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.currentTarget.id, emId = currentEm.get().id;
		deleteEm(blockId, emId, 'training');
		hideEmOpts(blockId, true);
		$('fieldset#block_' + blockId + ' .deleteEm').hide();
		$('fieldset#block_' + blockId + ' > div').show();
		Styling.showWarning('emupdated', 'experimenter');
	},
	'click [id$="_up"], click [id$="_down"]' (event) {
		Tools.stopPropDefault(event);
		let id = event.target.id;
		let newExpData = expData.get();
		let allBlocks = getBlocks('all', 'training');
		allBlocks = reorderBlocks(allBlocks, id);
		setBlock('all', 'training', allBlocks);
	},
	'click div.elementContainer > [id^="em_"]' (event) {
		Tools.stopPropDefault(event);
		let id = event.currentTarget.id.split('_');
		let blockId = Number(id[1]), emId = Number(id[2]);
		hideEmOpts(blockId, true);
		showEm(blockId, emId, 'training');
	},
	'click #trainingConfigSubmit' (event) {
		Tools.stopPropDefault(event);
		saveTrainingTest(expData.get(), 'training');
	}
});

Template.testConfig.onRendered(()=>{
	testingList.set(false);
	testingProgress.set(0);
	currentEm.set(null);
	$('.deleteEm').hide();
});

Template.testConfig.helpers({
	activated () {
		return expData.get() && (expData.get().status.state === 'active');
	},
	blocks () {
		return expData.get().test.blocks;
	},
	boxChecked (col, checked) {
		if(col === 'randomBlocks') {
			if(expData.get() && expData.get().test.random) {
				return 'checked';
			}
		}
		else if(col === 'checkFastRT') {
			if(expData.get() && expData.get().test.checkFastRT) {
				return 'checked';
			}
		}
		else if((col === 'randomStimuliOrder') && checked) {
			return 'checked';
		}
		else if(col === 'collectResp' && currentEm.get() && currentEm.get().resp.collect) {
			return 'checked';
		}
		else if(col === 'checkResp' && currentEm.get() && currentEm.get().resp.check) {
			return 'checked';
		}
		else if(col === 'showFeedback' && currentEm.get() && currentEm.get().resp.feedback.show) {
			return 'checked';
		}
		return;
	},
	emStyle (style, id, order) {
		let allEms = expData.get().test.blocks[id].elements;
		return setEmStyle(allEms, order, style);
	},
	emValue (field, subfield) {
		if(typeof subfield === 'string') {
			return currentEm.get() && currentEm.get()[field][subfield];
		}
		return currentEm.get() && currentEm.get()[field];
	},
	existTestStimuli () {
		return (expData.get() && expData.get().test.stimuli.nRows);
	},
	feedbackLen () {
		return (currentEm.get() && currentEm.get().resp.feedback.length);
	},
	feedbackTexts () {
		return (currentEm.get() && currentEm.get().resp.feedback.texts);
	},
	respTypeSelect (type) {
		let em = currentEm.get();
		if(em) {
			if(em.resp.type === type) {
				return 'selected';
			}
		}
		return null;
	},
	stimuliCols () {
		return (expData.get() && expData.get().test.stimuli.nCols);
	},
	stimuliRows () {
		return (expData.get() && expData.get().test.stimuli.nRows);
	},
	stimuliTypeSelect (type) {
		let em = currentEm.get();
		if(em) {
			if(em.stimuli.type === type) {
				return 'selected';
			}
		}
		return null;
	},
	testBlocks () {
		return (expData.get() && expData.get().test.blocks.length);
	},
	testConds () {
		return (expData.get() && expData.get().test.conditions);
	},
	testingList () {
		return testingList.get();
	},
	testingProgress() {
		return testingProgress.get() + '%';
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	},
	updateCat () {
		return updateCat.get();
	}
});

Template.testConfig.events({
	'click #testConfigIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('testConfig');
	},
	'click #stimuliFileIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('stimuliFile');
	},
	'click #closeInstruction' (event) {
		Tools.stopPropDefault(event);
		Tools.closeInstruction();
	},
	'click #selectTestList' (event) {
		Tools.stopPropDefault(event);
		$('#hiddenSelector').click();
	},
	'change #hiddenSelector' (event) {
		loadStimuliFile('test', event);
	},
	'click #downloadList' (event) {
		Tools.stopPropDefault(event);
		downloadStimuliList('test');
	},
	'click #testTestList' (event) {
		Tools.stopPropDefault(event);
		URLChecker(expData.get().test.stimuli);
	},
	'click #randomBlocks' () {
		let checked = $('#randomBlocks').prop('checked');
		let newExpData = expData.get();
		newExpData.test.random = checked;
		expData.set(newExpData);
	},
	'click #checkFastRT' () {
		let checked = $('#checkFastRT').prop('checked');
		let newExpData = expData.get();
		newExpData.test.checkFastRT = checked;
		expData.set(newExpData);
	},
	'click [id$="_edit"]' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.target.id.replace('_edit', '');
		showEmOpts(blockId, 1, 4);
		hideEmOpts(blockId, false, 5, 17);
		updateCat.set('Block');
		$('fieldset#block_' + blockId + ' > div').hide();
	},
	'click [id$="_up"], click [id$="_down"]' (event) {
		Tools.stopPropDefault(event);
		let id = event.target.id;
		let newExpData = expData.get();
		let allBlocks = getBlocks('all', 'test');
		allBlocks = reorderBlocks(allBlocks, id);
		setBlock('all', 'test', allBlocks);
	},
	'click [id$="_add"]' (event) {
		Tools.stopPropDefault(event);
		let id = event.target.id.replace('_add', '');
		let block = getBlocks(id, 'test');
		addEm(id, block, 'test');
	},
	'click div.elementContainer > [id^="em_"]' (event) {
		Tools.stopPropDefault(event);
		let id = event.currentTarget.id.split('_');
		let blockId = Number(id[1]), emId = Number(id[2]);
		hideEmOpts(blockId, true);
		showEm(blockId, emId, 'test');
	},
	'change .emRespType' (event) {
		changeEmRespType(event);
	},
	'change .emStimuli' (event) {
		let newType = event.currentTarget.value;
		let target = event.currentTarget.id;
		let blockId = Number(target.split('_')[1]);
		setEm(newType, 'stimuli', 'type');
	},
	'click .emCollectResp' (event) {
		Tools.stopPropDefault(event);
		changeEmCollectResp(event, 12, 15, 17);
	},
	'click .emCheckResp' (event) {
		event.stopPropagation();
		let target = event.currentTarget.id;
		let checked = $('#'+target).prop('checked');
		setEm(checked, 'resp', 'check');
	},
	'click .emShowFeedback' (event) {
		Tools.stopPropDefault(event);
		changeEmShowFeedback(event, 16, 17);
	},
	'click .updateBlock' (event) {
		Tools.stopPropDefault(event);
		let id = event.currentTarget.id;
		updateBlock(id, 'test');
	},
	'click .updateEm' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.currentTarget.id;
		updateEm(blockId, 'test');
	},
	'click .hideUpdate' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.target.id;
		hideEmOpts(blockId, true);
		$('fieldset#block_' + blockId + ' .deleteEm').hide();
		$('fieldset#block_' + blockId + ' > div').show();
	},
	'click .deleteEm' (event) {
		Tools.stopPropDefault(event);
		let blockId = event.currentTarget.id, emId = currentEm.get().id;
		deleteEm(blockId, emId, 'test');
		hideEmOpts(blockId, true);
		$('fieldset#block_' + blockId + ' .deleteEm').hide();
		$('fieldset#block_' + blockId + ' > div').show();
		Styling.showWarning('emupdated', 'experimenter');
	},
	'click #testConfigSubmit' (event) {
		Tools.stopPropDefault(event);
		saveTrainingTest(expData.get(), 'test');
	}
});

Template.debriefing.onRendered(()=>{
	lang.set('en-us');
});

Template.debriefing.helpers({
	activated () {
		return expData.get() && (expData.get().status.state === 'active');
	},
	debriefingContent () {
		return expData.get() && expData.get().debriefing[lang.get()];
	},
	debriefingNum () {
		if(!expData.get() || !expData.get().debriefing[lang.get()]) {
			return 0;
		}
		return expData.get().debriefing[lang.get()].length;
	},
	defaultLang (lang) {
		if(lang === 'en-us') {
			return 'selected';
		}
		return;
	},
	languages () {
		let userLang = Session.get('userLang');
		return langList[userLang];
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	}
});

Template.debriefing.events({
	'click #debriefingIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('debriefing');
	},
	'click #closeInstruction' (event) {
		Tools.stopPropDefault(event);
		Tools.closeInstruction();
	},
	'click #closeInstruction' (event) {
		Tools.stopPropDefault(event);
		Tools.closeInstruction();
	},
	'change select[name=languages]' (event) {
		let newLang = event.target.value;
		lang.set(newLang);
	},
	'keyup #debriefingContent' () {
		let newDebriefing = $('#debriefingContent').val();
		let newExpData = expData.get();
		newExpData.debriefing[lang.get()] = newDebriefing;
		expData.set(newExpData);
	},
	'click #debriefingSubmit' (event) {
		Tools.stopPropDefault(event);
		Meteor.call('funcEntryWindow', 'exp', 'changeDebriefingInfo', 
				{expId: expData.get()._id,  debriefing: expData.get().debriefing}, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server', 'experimenter');
				}
				else {
					Styling.showWarning('saved', 'experimenter');
				}
		});
	}
});

function copyObj (obj) {
	let newObj = JSON.parse(JSON.stringify(obj));
	return newObj;
};

function downloadStimuliList (type) {
	let list = expData.get()[type].stimuli, mergedString = '';
	let nRows = list.nRows;
	for(let i=0 ; i <nRows ; i++) {
		for(let key in list) {
			if(['nRows', 'nCols'].indexOf(key) < 0) {
				mergedString = mergedString + list[key][i]+'\t';
			}
		}
		mergedString = mergedString.trim() + '\n';
	}
	let headers = '';
	for(let key in list) {
		if(['nRows', 'nCols'].indexOf(key) < 0) {
			headers = headers + key + '\t';
		}
	}
	headers = headers.trim() + '\n';
	mergedString = headers +mergedString;
	var FileSaver = require('file-saver');
	let blob = new Blob([mergedString], {type: 'text/plain;charset=utf-8'});
	let filename = type+'CurrentStimuliList.txt';
	FileSaver.saveAs(blob, filename);
};

async function URLChecker (list) {
	testingList.set(true);
	let url = '', badURLHTML = '';
	let allURLs = [], troubleURLs = [], testedURLs = 0;
	for(let key in list) {
		if(key.indexOf('URL') > -1) {
			allURLs = allURLs.concat(allURLs, list[key]);
		}
	}
	try {
		let allURLN = allURLs.length;
		if(allURLN > 0)
		{
			async function testURL(target) {
				return fetch(target, {method: 'HEAD', mode: 'no-cors'}).then((resp)=>{
					return resp;
				});
			};
			for(let i=0 ; i<allURLN ; i++) {
				testedURLs++;
				testingProgress.set(Math.round(testedURLs*100/allURLN));
				url = allURLs[i];
				if(url.match(/^http|^https/ig)) {
					let testResp = await testURL(url);
					if(!testResp.ok && testResp.type !== 'opaque') {
						troubleURLs.push(url);
					}
				}
			}
			Meteor.setInterval(()=>{
				testingList.set(false);
				testingProgress.set(0);
			}, 3000);
			if(troubleURLs.length === 0) {
				Styling.showWarning('urlok', 'experimenter');
			}
			else {
				let translations = translationDB.findOne({docType: 'experimenter'});
				if(translations) {
					badURLHTML += '<section><article>' + translations['badurls'] + '</article></section>';
					badURLHTML += '<section><article><ul>';
					for(let i=0 ; i<troubleURLs.length ; i++) {
						let badURL = troubleURLs[i];
						badURLHTML += '<li><a href="'+badURL+'" target="blank">'+badURL+'</a></li>';
					}
					badURLHTML += '</ul></article></section>';
					badURLHTML += '<section><p><input type="button" id="closeInstruction" value="X" /></p></section>';
					$('#instructionContainer').html(badURLHTML).show().animate({
						height: '80vh',
						opacity: 0.98
					}, 500);
				}
			}
		}
		else {
			testingList.set(false);
			Styling.showWarning('nourl', 'experimenter');
		}
	}
	catch(e) {}
};

function loadStimuliFile(type, loadEvent) {
	// Check for the various File API support.
	if (window.File && window.FileReader && window.FileList && window.Blob) {
  		let selectedFile = loadEvent.currentTarget.files[0];
  		let reader = new FileReader();
  		reader.onload = function(read) {
  			let stimuliList = read.target.result;
  			let checkResult = checkListFormat(stimuliList, type);
  			if(checkResult.errMsg.length > 0) {
  				Styling_configExp.showWarning(checkResult.errMsg[0]);
  			}
  			else {
  				let newExpData = expData.get();
  				newExpData[type].stimuli = checkResult.list;
  				newExpData[type].conditions = checkResult.conditions;
  				let allBlocks = getBlocks('all', type), newBlocks = [];
  				let uniqueBlocks = checkResult.blocks;
  				for(let i=0 ; i<uniqueBlocks.length ; i++) {
  					let newBlock = {
  						id: i,
  						title: ('Block '+uniqueBlocks[i]).substring(0,20),
  						label: uniqueBlocks[i],
  						rep: 1,
  						random: true,
  						elements: []
  					};
  					if(allBlocks.length === 0) {
  						newBlocks.push(newBlock);
  					}
  					else {
  						for(let j=0 ; j<allBlocks.length ; j++) {
  							let oldBlock = allBlocks[j];
  							if(uniqueBlocks[i] === oldBlock.label) {
  								oldBlock.id = i;
  								newBlocks.push(oldBlock);
  								break;
  							}
  							else if(j === allBlocks.length-1) {
  								newBlocks.push(newBlock);
  							}
  						}
  					}
  				}
  				setBlock('all', type, newBlocks);
  			}
  			$('#hiddenSelector').val('');
  		};
  		reader.readAsText(selectedFile);
	}
	else {
  		Styling.showWarning('fileapie', 'experimenter');
	}
};

function reorderBlocks(blocks, direction) {
	if(direction.indexOf('_up') > -1) {
		let target = Number(direction.replace('_up', ''));
		if(target > 0) {
			let moveUpBlock = blocks[target];
			moveUpBlock.id = target-1;
			let moveDownBlock = blocks[target-1];
			moveDownBlock.id = target;
			blocks[target-1] = moveUpBlock;
			blocks[target] = moveDownBlock;
		}
	}
	else if(direction.indexOf('_down') > -1) {
		let target = Number(direction.replace('_down', ''));
		if(target < blocks.length - 1) {
			let moveDownBlock = blocks[target];
			moveDownBlock.id = target+1;
			let moveUpBlock = blocks[target+1];
			moveUpBlock.id = target;
			blocks[target+1] = moveDownBlock;
			blocks[target] = moveUpBlock;
		}
	}
	return blocks;
};

function checkListFormat(list, type) {
	list = list.trim();
  	list = list.replace(/\t+/g, '\t');
	let errMsg = [], nRows = 0, nCols = 0, formattedList = {}, includedCols = [];
	let allConditions = [];
	let listRows = list.split(/\n|\r\n/);
	nRows = listRows.length;
	if(nRows <= 1001) {
		let header = listRows[0].split('\t');
		nCols = header.length;
		if(nCols <= 30) {
			if((type === 'training' || (type === 'test' && header.indexOf('Correct') > -1)) && 
			header.indexOf('Block') > -1) {
				let goodCell = true;
				for(let i=0 ; i<nCols ; i++) {
					if(header[i].length <= 100) {
						if(header[i].match(/StimuliID|Block|Correct|Condition|Session|[A-Za-z]*TextStimuli[A-Za-z]*|[A-Za-z]*AudioURL[A-Za-z]*|[A-Za-z]*VideoURL[A-Za-z]*|[A-Za-z]*ImageURL[A-Za-z]*|Length|PosX|PosY|Delay/g)) {
							formattedList[header[i].trim()] = [];
							includedCols.push(i);
						}
					}
					else {
						errMsg.push({line: 0, cell: i, type: 'cellheaderlene'});
						goodCell = false;
						break;
					}
				}
				if(goodCell) {
					for(let i=1 ; i<nRows ; i++) {
						let cells = listRows[i].split('\t');
						if(cells.length === nCols && goodCell) {
							for(let j=0 ; j<nCols ; j++) {
								let cell = cells[j], errType = '';
								if(includedCols.indexOf(j) > -1) {
									if(typeof cell !== 'string' || cell.trim().length > 100) {
										goodCell = false;
										errType = 'cellstrformate';
									}
									if(goodCell) {
										if(header[j].match(/.*AudioURL.*|.*VideoURL.*|.*ImageURL.*/g) && 
											!cell.trim().match(/^https{0,1}:\/\//i)) {
											goodCell = false;
											errType = 'cellurlformate';
										}
										if(header[j] === 'Length' && 
											(isNaN(cell.trim()) || Number(cell.trim()) < -1 || Number(cell.trim()) > 3600)) {
											goodCell = false;
											errType = 'celllenformate';
										}
										if(header[j] === 'Delay' && 
											(isNaN(cell.trim()) || Number(cell.trim()) < 0 || Number(cell.trim()) > 3600)) {
											goodCell = false;
											errType = 'celldelayformate';
										}
										if(header[j].match(/PosX|PosY/g) && 
											(isNaN(cell.trim()) || Number(cell.trim()) < -10000 || Number(cell.trim()) > 10000)) {
											goodCell = false;
											errType = 'cellposformate';
										}
										if(header[j] === 'Correct') {
											let corrKeys = cell.trim().split(',');
											for(let k=0 ; k<corrKeys.length ;k++) {
												if(!corrKeys[k].match(/^space$|^[0-9]$|^[a-z]$|^\[\[.+\]\]$/ig)) {
													goodCell = false;
													errType = 'cellbadrespkeye';
													break;
												}
											}
										}
										if(header[j] === 'Session') {
											cell = cell.trim().replace(/\s/g, '');
											let sessions = cell.split(';');
											for(let k=0 ; k<sessions.length ; k++) {
												if(isNaN(Number(sessions[k]))) {
													goodCell = false;
													errType = 'cellbadsessione';
													break;
												}
											}
										}
										if(header[j] === 'Condition') {
											cell = cell.trim().replace(/\s/g, '');
											let conds = cell.split(';');
											for(let k=0 ; k<conds.length ; k++) {
												if(allConditions.indexOf(conds[k]) < 0) {
													allConditions.push(conds[k]);
												}
											}
										}
									}	
									if(goodCell) {
										if(header[j] === 'Correct') {
											formattedList[header[j]].push(cell.trim().toLowerCase());
										}
										else {
											formattedList[header[j]].push(cell.trim());
										}
									}
									else {
										errMsg.push({line: i, cell: j, type: errType});
										break;
									}
								}
							}
						}
						else {
							break;
						}
					}
				}				
			}
			else {
				if(header.indexOf('Block') === -1) {
					errMsg.push('noblocke');
				}
				else if(header.indexOf('Correct') === -1 && type === 'test') {
					errMsg.push('nocorrecte');
				}
			}
		}
		else {
			errMsg.push('toomanycolse');
		}
	}
	else {
		errMsg.push('toomanyrowse');
	}
	let uniqueBlocks = [], allBlocks = formattedList['Block'];
	if(allBlocks) {
		for(let i=0 ; i<allBlocks.length ; i++) {
			if(uniqueBlocks.indexOf(allBlocks[i]) < 0) {
				uniqueBlocks.push(allBlocks[i]);
			}
			if(uniqueBlocks.length > 10) {
				errMsg.push('toomanyblocks');
				break;
			}
		}
	}
	formattedList['nRows'] = nRows-1;
	formattedList['nCols'] = includedCols.length;
	return {errMsg: errMsg, list: formattedList, conditions: allConditions, blocks: uniqueBlocks};
};

function getBlocks(id, type) {
	let oldExpData = expData.get(), typeIsTraing = (type === 'training');
	if(id === 'all') {
		if(typeIsTraing) {
			return oldExpData.training.blocks;
		}
		return oldExpData.test.blocks;
	}
	else {
		if(typeIsTraing) {
			return oldExpData.training.blocks[id];
		}
		return oldExpData.test.blocks[id];
	}
};

function setBlock(id, type, newBlock) {
	let newExpData = expData.get(), typeIsTraing = (type === 'training');
	if(id === 'all') {
		if(typeIsTraing) {
			newExpData.training.blocks = newBlock;
		}
		else {
			newExpData.test.blocks = newBlock;
		}
	}
	else if(id === 'new') {
		if(typeIsTraing) {
			newExpData.training.blocks.push(newBlock);
		}
		else {
			newExpData.test.blocks.push(newBlock);
		}
	}
	else {
		if(typeIsTraing) {
			newExpData.training.blocks[id] = newBlock;
		}
		else {
			newExpData.test.blocks[id] = newBlock;
		}
	}
	expData.set(newExpData);
};

function updateBlock(blockId, type) {
	let newBlock = getBlocks(blockId, type);
	newBlock.title = $('fieldset#block_' + blockId + ' #blockTitle').val();
	newBlock.rep = Number($('fieldset#block_' + blockId + ' #nRepetition').val());
	newBlock.random = $('fieldset#block_' + blockId + ' #randomStimuliOrder').prop('checked');
	setBlock(blockId, type, newBlock);
	Styling.showWarning('blockupdated', 'experimenter');
};

function showEmOpts(blockId, start, end) {
	$('fieldset#block_' + blockId + ' > legend ~ p:nth-of-type(n+' + start + 
		'):nth-of-type(-n+' + end + ')').css('display', 'table-row');
	$('fieldset#block_' + blockId + ' > legend ~ p:last-of-type').css('display', 'inline-block');
};

function hideEmOpts(blockId, all, start, end) {
	if(all) {
		currentEm.set(null);
		$('fieldset > fieldset > legend ~ p').hide();
		$('fieldset > div').show();
	}
	else {
		$('fieldset#block_' + blockId + ' > legend ~ p:nth-of-type(n+' + start + 
			'):nth-of-type(-n+' + end + ')').hide();
	}
};

function setEmStyle (ems, order, style) {
	let maxOrder = 0;
	for(let i=0 ; i<ems.length ; i++) {
		if(ems[i].order > maxOrder) {
			maxOrder = ems[i].order;
		}
	}
	if(style === 'width') {
		return Math.round(1000/maxOrder)/10 + '%';
	}
	else if(style === 'left') {
		return Math.round(1000/maxOrder)/10 * (order-1) + '%';
	}
};

function changeEmRespType (event) {
	let newType = event.currentTarget.value;
	let keys = '', keyTexts = '';
	if(newType === 'unary') {
		keys = 'space';
		keyTexts = 'continue';
	}
	else if(newType === 'binary') {
		keys = 'a,l';
		keyTexts = 'yes,no';
	}
	else {
		keys = '1,2,3,4,5,6,7';
		keyTexts = '1(=bad),2,3,4,5,6,7(=good)';
	}
	setEm(newType, 'resp', 'type');
	setEm(keys, 'resp', 'keys');
	setEm(keyTexts, 'resp', 'keyTexts');
};

function changeEmCollectResp (event, onset, midpoint, offset) {
	let target = event.currentTarget.id;
	let checked = $('#'+target).prop('checked');
	let blockId = Number(target.split('_')[1]);
	setEm(checked, 'resp', 'collect');
	if(checked && currentEm.get() && currentEm.get().resp.feedback.show) {
		showEmOpts(blockId, onset, offset);
	}
	else if(checked) {
		showEmOpts(blockId, onset, midpoint);
	}
	else {
		if($('#emCheckResp_'+blockId).prop('checked')) {
			$('#emCheckResp_'+blockId).click();
		}
		hideEmOpts(blockId, false, onset, offset);
	}
};

function changeEmShowFeedback (event, onset, offset) {
	let target = event.currentTarget.id;
	let checked = $('#'+target).prop('checked');
	let blockId = Number(target.split('_')[1]);
	let newFeedback = currentEm.get().resp.feedback;
	newFeedback.show = checked;
	setEm(newFeedback, 'resp', 'feedback');
	if(checked) {
		showEmOpts(blockId, onset, offset);
	}
	else {
		hideEmOpts(blockId, false, onset, offset);
	}
};

function addEm (id, block, type) {
	let allEms = block.elements;
	let emNum = allEms.length;
	if(emNum <= 10) {
		let orders = [];
		for(let i=0 ; i < emNum ; i++) {
				if(orders.indexOf(allEms[i].order) < 0) {
					orders.push(allEms[i].order);
			}
		}
		let newOrder = orders.length + 1, newId = allEms.length;
		let newEm = {
			type: 'presentation',
			id: newId,
			order: newOrder,
			title: 'Element' + (allEms.length + 1),
			pos: {x: 0, y: 0},
			stimuli: {type: 'text', content: ''},
			start: 0,
			length: -1,
			resp: {collect: false,
				type: 'binary', 
				check: false, 
				keyTexts: 'yes,no',
				keys: 'a,l', 
				correctResp: '',
				feedback: {show: false, texts: '✓,✗', length: 0.5}
			},
		};
		if(type === 'training') {
			newEm.randomTest = {interval: '4-7', prompt: '', promptLength: -1};
		}
		allEms.push(newEm);
		block.elements = allEms;
		setBlock(id, type, block);
		hideEmOpts(id, true);
		$('fieldset#block_' + id + ' > div').show();
	}
	else {
		Styling.showWarning('toomanyems', 'experimenter');
	}
};

function deleteEm (blockId, emId, type) {
	let newExpData = expData.get(), newArray = [], targetOrder = 0;
	newArray = newExpData[type].blocks[blockId].elements;
	targetOrder = newArray[emId].order;
	newArray.splice(emId, 1);
	let reordered = false;
	for(let i=emId ; i<newArray.length ; i++) {
		let newCell = newArray[i];
		newCell.id = newCell.id-1;
		if(!reordered && newCell.order !== targetOrder) {
			newCell.order = newCell.order-1;
		}
		else {
			reordered = true;
		}
		newArray[i] = newCell;
	}
	newExpData[type].blocks[blockId].elements = newArray;
	expData.set(newExpData);
};

function setEm(data, field, subfield) {
	let newEm = currentEm.get();
	if(subfield) {
		newEm[field][subfield] = data;
	}
	else {
		newEm[field] = data;
	}
	currentEm.set(newEm);
};

function showEm (blockId, emId, type) {
	let currentBlock = expData.get()[type].blocks[blockId];
	let em = copyObj(currentBlock.elements[emId]);
	currentEm.set(em);
	updateCat.set('Em');
	if(type === 'training') {
		if(em.type === 'randomTest') {
			showEmOpts(blockId, 19, 21);
		}
		if(em.resp.collect && em.resp.feedback.show) {
			showEmOpts(blockId, 5, 18);
		}
		else if(em.resp.collect) {
			showEmOpts(blockId, 5, 16);
		}
		else {
			showEmOpts(blockId, 5, 12);
		}
	}
	else {
		if(em.resp.collect && em.resp.feedback.show) {
			showEmOpts(blockId, 5, 17);
		}
		else if(em.resp.collect) {
			showEmOpts(blockId, 5, 15);
		}
		else {
			showEmOpts(blockId, 5, 11);
		}
	}
	$('fieldset#block_' + blockId + ' .deleteEm').show();
	$('fieldset#block_' + blockId + ' > div').hide();
};

function checkElement (em, type, stimuli, blockId) {
	let checked = true, err = [];
	try {
		if(em.title.length <= 0) {
			err.push('notitle');
		}
		else if(em.title.match(/\W|^\d/g)) {
			err.push('emtitlespecchare');
		}
		if(!((em.type === 'presentation' || em.type === 'randomTest') && 
			Number(em.id) <= 10 && Number(em.order) <= 10)) {
			err.push('vitale');
		}
		else if((typeof em.pos.x !== 'string' && typeof Number(em.pos.x) !== 'number') || (typeof em.pos.y !== 'string' && typeof Number(em.pos.y) !== 'number')) {
			err.push('vitale');
		}
		else if(typeof Number(em.pos.x) !== 'number' && em.pos.x !== '[[PosX]]') {
			err.push('posxcole');
		}
		else if(typeof Number(em.pos.y) !== 'number' && em.pos.y !== '[[PosY]]') {
			err.push('posycole');
		}
		else if(Number(em.pos.x) > 10000 || Number(em.pos.x) < -10000 || 
			Number(em.pos.y) > 10000 || Number(em.pos.y) < -10000) {
			err.push('posrangee');
		}
		else if(['text', 'audio', 'video', 'image'].indexOf(em.stimuli.type) < 0) {
			err.push('vitale');
		}
		else if(typeof em.start !== 'string' && typeof Number(em.start) !== 'number') {
			err.push('vitale');
		}
		else if(typeof Number(em.start) !== 'number' && !em.start.match(/\[\[Delay\]\]|.*AudioURL.*\]\]|.*VideoURL.*\]\]/g)) {
			err.push('emstartcole');
		}
		else if(Number(em.start) < 0 || Number(em.start) > 3600) {
			err.push('emstartrangee');
		}
		else if(Number(em.length) > 3600 || Number(em.length) < -1) {
			err.push('emlengthrangee');
		}
		else if(isNaN(Number(em.length)) && !em.length.match(/.*AudioURL.*\]\]|.*VideoURL.*\]\]/g)) {
			err.push('emlengthformate');
		}
		else if(em.resp.collect !== false) {
			let resp = em.resp.type;
			let keyTexts = em.resp.keyTexts.trim().split(','), keys = em.resp.keys.trim().split(',');
			let corrKeys = em.resp.correctResp.split(',');
			for(let i=0 ; i<keys.length ; i++) {
				if(!keys[i].match(/^space$|^[0-9]$|^[a-z]$|^\[\[.+\]\]$/ig)) {
					err.push('badrespkeye');
					break;
				}
			}
			if(em.resp.check && em.type !== 'randomTest') {
				if(corrKeys.length > 1 || corrKeys[0] !== '[[Correct]]') {
					for(let i=0 ; i<corrKeys.length ; i++) {
						if(keys.indexOf(corrKeys[i]) < 0) {
							err.push('misscorrrespe');
							break;
						}
					}
				}
				else if(corrKeys[0] === '[[Correct]]' && stimuli['Correct']) {
					let stimuliCorrCol = stimuli['Correct'];
					let blockIds = stimuli['Block'];
					checkCorrCol:
					for(let i=0 ; i<stimuliCorrCol.length ; i++) {
						if(blockIds[i] === blockId) {
							let corrCell = stimuliCorrCol[i].split(',');
							for(let j=0; j<corrCell.length ; j++) {
								if(keys.indexOf(corrCell[j]) < 0) {
									err.push('misscorrrespe');
									break checkCorrCol;
								}
							}
						}
					}
				}
			}
			if(!(resp === 'unary' || resp === 'binary' || resp === 'likert')) {
				err.push('vitale');
			}
			else if(!typeof em.resp.check === 'boolean') {
				err.push('vitale');
			}
			else if(resp === 'unary' && !(keyTexts.length === 1 && keys.length === 1)) {
				err.push('keylengthe');
			}
			else if(resp === 'binary' && !(keyTexts.length === 2 && keys.length === 2)) {
				err.push('keylengthe');
			}
			else if(resp === 'likert' && !(keyTexts.length >= 3 && keyTexts.length <= 7 && keyTexts.length === keys.length)) {
				err.push('keylengthe');
			}
			else if(!typeof em.resp.feedback.show === 'boolean') {
				err.push('vitale');
			}
			else if(em.resp.feedback.show) {
				let fbtexts = em.resp.feedback.texts.replace(/\s/g, '').trim().substring(0, 50);
				if(fbtexts.split(',').length !== 2) {
					err.push('fbtextlengthe');
				}
				else if(isNaN(Number(em.resp.feedback.length))) {
					err.push('fblengthnotnume');
				}
				else if(Number(em.resp.feedback.length) < 0 || Number(em.resp.feedback.length > 1000000)) {
					err.push('vitale');
				}
			}
			else if(em.type === 'randomTest') {
				let int = em.randomTest.interval.trim().replace(/\s/g, '').substring(0, 20).split('-');
				if(isNaN(parseInt(int[0], 10)) || isNaN(parseInt(int[1], 10))) {
					err.push('intervalnonnume');
				}
				else if(parseInt(int[0], 10) < 2) {
					err.push('intervallowe');
				}
				if(isNaN(Number(em.randomTest.promptLength))) {
					err.push('promlennotnume');
				}
				else if(em.randomTest.promptLength <= 0) {
					err.push('promlene');
				}
			}
		}
		else if(em.type === 'randomTest' && (!em.resp.collect || !em.resp.check || em.resp.type !== 'binary')) {
			err.push('vitale');
		}
		else if(em.stimuli.content.indexOf('[[') > -1) {
			let variable = em.stimuli.content.replace(/\[\[/g, '').replace(/\]\]/g, '');
			if(!stimuli[variable]) {
				err.push('nosuchvariablee');
			}
		}
	}
	catch(e) {
		err.push('vitale');
	}
	if(err.length > 0) {
		checked = false;
	}
	return [checked, err];
};

function updateEm (blockId, type) {
	let tempEm = currentEm.get(), allChecked = true;
	let blockIndex = 'fieldset#block_' + blockId;
	let newEm = {
		type: 'presentation',
		id: tempEm.id,
		order: Number($(blockIndex+' #emOrder').val().trim()),
		title: $(blockIndex+' #emTitle').val().trim().replace(/^[0-9]+|\s|\#/g, '').substring(0, 20),
		pos: {x: $(blockIndex+' #emPosX').val().trim(), y: $(blockIndex+' #emPosY').val().trim()},
		stimuli: {type: tempEm.stimuli.type, content: $(blockIndex+' #emStimuliContent').val().trim()},
		start: $(blockIndex+' #emPresentOnset').val().trim(),
		length: isNaN(Number($(blockIndex+' #emLength').val().trim())) ? $(blockIndex+' #emLength').val().trim() : Number($(blockIndex+' #emLength').val().trim()),
		resp: {
			collect: $('#emCollectResp_'+blockId).prop('checked'),
			type: tempEm.resp.type, 
			check: $('#emCheckResp_'+blockId).prop('checked'), 
			keyTexts: $(blockIndex+' #emRespKeysTexts').val().replace(/\s/g, '').trim(),
			keys: $(blockIndex+' #emRespKeys').val().replace(/\s/g, '').trim(), 
			correctResp: $(blockIndex+' #emCorrResp').val().trim(),
			feedback: {
				show: $('#emShowFeedback_'+blockId).prop('checked'), 
				texts: $(blockIndex+' #emFeedbackTexts').val().replace(/\s/g, '').trim(),
				length: Number($(blockIndex+' #emFeedbackLength').val().trim())
			}
		}
	};
	if(type === 'training') {
		newEm.type = tempEm.type;
		newEm.randomTest = {
			interval: $(blockIndex+' #emRandomTestInt').val().replace(/\s/g, '').trim(),
			prompt: $(blockIndex+' #emRandomTestProm').val().trim(),
			promptLength: Number($(blockIndex+' #emRandomTestPromLen').val().trim())
		};
	}
	let newBlock = getBlocks(blockId, type);
	let allEms = newBlock.elements;
	let chRes = checkElement(newEm, type, expData.get()[type].stimuli, blockId);
	if(chRes[0]) {
		allEms[tempEm.id] = newEm;
		let currentOrder = 1, newEms = [], origLen = allEms.length;
		let inserted = false;
		for(let i=0 ; i<origLen ; i++) {
			if(i !== tempEm.id) {
				if(newEm.order <= allEms[i].order && !inserted && 
					(isNaN(newEm.length) || (newEm.length > -1 && allEms[i].length === -1) || 
						(newEm.length === -1 && allEms[i].length === -1 && newEm.start < allEms[i].start) ||
						(newEm.start+newEm.length <= allEms[i].start+allEms[i].length))) 
				{
					newEms.push(newEm);
					inserted = true;
				}
				newEms.push(allEms[i]);
			}
		}
		if(newEms.length !== origLen) {
			newEms.push(newEm);
		}
		let currentOldOrder = 0, newOrder = 0, currentOrderTitles = [];
		let collectRespNum = 0, randomTestNum = 0;
		for(let i=0 ; i<newEms.length ; i++) {
			let tempEm = newEms[i];
			if(currentOldOrder < tempEm.order) {
				currentOldOrder = tempEm.order;
				newOrder++;
				currentOrderTitles = [];
				collectRespNum = 0;
			}
			if(tempEm.type === 'randomTest') {
				randomTestNum++;
			}
			if(tempEm.resp.collect) {
				collectRespNum++;
			}
			if(randomTestNum > 1) {
				Styling.showWarning('toomanyrt', 'experimenter');
				allChecked = false;
				break;
			}
			else if(collectRespNum > 1) {
				Styling.showWarning('onerespperordere', 'experimenter');
				allChecked = false;
				break;
			}
			else if(currentOrderTitles.includes(tempEm.title)) {
				Styling.showWarning('repeatemtitlee', 'experimenter');
				allChecked = false;
				break;
			}
			tempEm.id = i;
			tempEm.order = newOrder;
			newEms[i] = tempEm;
			currentOrderTitles.push(tempEm.title);
		}
		if(allChecked) {
			hideEmOpts(blockId, true);
			newBlock.elements = newEms;
			setBlock(blockId, type, newBlock);
			$('fieldset#block_' + blockId + ' .deleteEm').hide();
			$('fieldset#block_' + blockId + ' > div').show();
			Styling.showWarning('emupdated', 'experimenter');
		}
	}
	else {
		Styling.showWarning(chRes[1][0], 'experimenter');
	}
};

function saveTrainingTest (data, type) {
	let allData = {expId: data._id};
	allData[type] = data[type];
	type = type.charAt(0).toUpperCase() + type.slice(1);
	Meteor.call('funcEntryWindow', 'exp', 'change'+type+'Config', allData, (err, result)=>{
				if(err) {
					if(err.error === 'too-many-requests') {
						Styling.showWarning('slowdown');
					}
					else {
						Styling.showWarning(err.error, 'experimenter');
					}
				}
				else {
					if(expDesignTest()) {
						Styling.showWarning('saved', 'experimenter');
					}
				}
		});
};

function expDesignTest () {
	let savedExpData = expData.get(), allChecked = true;
	let training = savedExpData.training, test = savedExpData.test;
	if(!checkEmsCollect(training.blocks, 'training')) {
		Styling.showWarning('notrainingcollecte', 'experimenter');
		allChecked = false;
	}
	else if(!checkEmsCollect(test.blocks, 'test')) {
		Styling.showWarning('notestcollecte', 'experimenter');
		allChecked = false;
	}
	return allChecked;
};

function checkEmsCollect (blocks, type) {
	let collectChecked = true;
	if(type === 'test' || (type === 'training' && expData.get().training.threshold.apply)) {
		for(let i=0 ; i<blocks.length ; i++) {
		let ems = blocks[i].elements, emChecked = false;
			for(let j=0 ; j < ems.length ; j++) {
				if(ems[j].resp.collect && ems[j].resp.check) {
					emChecked = true;
					break;
				}
			}
			if(i === (blocks.length - 1) && !emChecked) {
				collectChecked = false;
			}
			else if(emChecked) {
				break;
			}
		}
	}
	return collectChecked;
};

/*
emTitle		5	5
emType		6	-
emLength	7	6
emStimuli	8	7
emPos		9	8
emPresentOnset	10	9
emOrder		11	10
emCollectResp	12	11
emRespTypeKeys	13	12
emCorrResp	14	13
emCheckResp	15	14
emShowFeedback	16	15
emFeedbackTexts	17	16
emFeedbackLength 18	17
emRandomTestInt	19	
emRandomTestProm 20
emRandomTestPromLen 21
*/