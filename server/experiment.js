import { fetch } from 'meteor/fetch';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { JSZip } from 'meteor/udondan:jszip'

var emailFormat = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var langList = ['en-us', 'zh-tw', 'ja', 'fr', 'de', 'es'];
//
//--------------Functions called from the entry 'window'----------------

export let createExp = (data, userCheck)=>{
	let errMsg = [];
	try {
		let userExpRecord = Meteor.users.findOne({_id: Meteor.userId()}).profile.exp;
		if(!userCheck.verified || !userCheck.userCat === 'experimenter') {
			recordAdminLog('warning', 'createExp', data.clientIP, '', 'user verification', Meteor.user() && Meteor.user().username);
			throw new Meteor.Error('');
		}

		if(userExpRecord.allExp === userExpRecord.allExpQuota) {
			errMsg.push('expquotafull');
			recordAdminLog('warning', 'createExp', data.clientIP, '', 'exp quota full', Meteor.user() && Meteor.user().username);
			throw new Meteor.Error('');
		}

		let processedData = processExpBasicSettings(data);

		if(processedData.type === 'error') {
			errMsg.push('vitale');
			recordAdminLog('warning', 'createExp', data.clientIP, '', 'processing basic info', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: errMsg};
		}
		data = processedData.newData;

		errMsg = checkExpBasicSettings(data, 'create');
		if(errMsg.length > 0) {
			recordAdminLog('warning', 'createExp', data.clientIP, '', 'check basic info', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: errMsg};
		}
		else {
			experimentDB.insert({
				user: Meteor.userId(),
				userAccount: Meteor.user().username,
				coordinators: [],
				excludedExps: [],
				status: {
					state: 'inactive',
					activated: false,
					currentSubj: 0,
				},
				basicInfo: data,
				orientation: {
					descriptions: {},
					consentForms: {},
					compensations: {},
					trainingInstructions: {},
					testInstructions: {},
					questionnaire: {use: false}
				},
				training: {
					skip: false,
					random: false,
					threshold: {
						apply: false,
						pass: 1
					},
					stimuli: {},
					blocks: [],
					conditions: []
				},
				test: {
					random: false,
					checkFastRT: true,
					stimuli: {},
					blocks: [],
					conditions: []
				},
				debriefing: {},
				availableLang: [],
				stats: {
					correctPerc: 'NA',
					allRTMean: 'NA',
					correctRTMean: 'NA'
				},
				createdAt: new Date(),
				completedAt: ''
			}, (err, result)=>{
				Meteor.users.update({_id: Meteor.userId()}, {$inc: {'profile.exp.allExp': 1}});
			});
			recordAdminLog('normal', 'createExp', data.clientIP, '', 'exp created', Meteor.user() && Meteor.user().username);
			return {type: 'ok'};
		}

	}
	catch(err) {
		recordAdminLog('warning', 'createExp', data.clientIP, '', 'try and catch error', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
		return {type: 'error', errMsg: errMsg};
	}
};

export let updateCompleteExpInfo = (data, userCheck)=>{
	let expId = data.expId;
	if(data.length > 2000 || (!userCheck.owner && !userCheck.coordinator)) {
		recordAdminLog('warning', 'updateCompleteExpInfo', data.clientIP, expId, 'verification issue', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		experimentDB.update({_id: expId}, {$set: {completeExpInfo: data.newInfo}});
		recordActivityLog(Meteor.userId(), experimentDB.findOne({_id: expId}), 'updatecomexpinfo');
		recordAdminLog('normal', 'updateCompleteExpInfo', data.clientIP, expId, 'complete exp info updated', Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
};

export let updateExpBasics = (data, userCheck)=>{
	let errMsg = [], expId = data.expId;
	if(userCheck.userCat !== 'experimenter' || (!userCheck.owner && !userCheck.coordinator)) {
		recordAdminLog('warning', 'updateExpBasics', data.clientIP, expId, 'verification issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
		return {type: 'error', errMsg: errMsg};
	}
	else if(experimentDB.findOne({_id: expId}) && experimentDB.findOne({_id: expId}).status.activated === true) {
		recordAdminLog('warning', 'updateExpBasics', data.clientIP, data.expId, 'exp already activated', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		let processedData = processExpBasicSettings(data);
		if(processedData.type === 'error') {
			recordAdminLog('warning', 'updateExpBasics', data.clientIP, expId, 'processing basic settings', Meteor.user() && Meteor.user().username);
			errMsg.push('vitale');
			return {type: 'error', errMsg: errMsg};
		}
		data = processedData.newData;
		if(errMsg.length > 0) {
			return {type: 'error', errMsg: errMsg};
		}
		else {
			errMsg = checkExpBasicSettings(data, 'update');
			if(errMsg.length > 0) {
				recordAdminLog('warning', 'updateExpBasics', data.clientIP, expId, 'check basic settings', Meteor.user() && Meteor.user().username);
				return {type: 'error', errMsg: errMsg};
			}
			experimentDB.update({_id: expId}, {$set: {basicInfo: data}});
			recordActivityLog(Meteor.userId(), experimentDB.findOne({_id: expId}), 'logupdateexpbasics');
			recordAdminLog('normal', 'updateExpBasics', data.clientIP, expId, 'basic settings updated', Meteor.user() && Meteor.user().username);
			return {type: 'ok'};
		}
	}
};

export let downloadExpResults = (data, userCheck)=>{
	if(userCheck.owner || userCheck.coordinator) {
		let zip = new JSZip();
		try {
			zip = assembleExpResults(data.expId, zip);
			let publicPath = '/home/shaferain/enigmaDemoFiles/';
			let now = new Date();
			let date = now.getFullYear() + '' + (now.getMonth() + 1) + '' + now.getDate() + '' + 
    	  		now.getHours() + '' + now.getMinutes() + '' + now.getSeconds();
    		zip.saveAs(publicPath + data.expId + '_' + date + '.zip');
    		recordAdminLog('normal', 'downloadExpResults', data.clientIP, data.expId, 'exp results downloaded', Meteor.user() && Meteor.user().username);
			return {type: 'ok', msg: data.expId + '_' + date + '.zip'};
		}
		catch(e) {
			recordAdminLog('normal', 'downloadExpResults', data.clientIP, data.expId, 'no exp results', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: ['noresultse']};
		}
	}
	recordAdminLog('warning', 'downloadExpResults', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
	return {type: 'error', errMsg: ['vitale']};
};

export let downloadCompleteExpResults = (data, userCheck)=>{
	let exp = experimentDB.findOne({_id: data.expId});
	if(!userCheck.verified || userCheck.userCat !== 'experimenter' || !exp || exp.status.state !== 'complete') {
		recordAdminLog('warning', 'downloadCompleteExpResults', data.clientIP, data.expId, 'hacking', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		let zip = new JSZip();
		let orientationInfo = exp.orientation;
		let description = orientationInfo.descriptions['en-us'];
		zip.file('description.txt', '\uFEFF' + description);
		let trainingIns = orientationInfo.trainingInstructions['en-us'];
		zip.file('trainingInstruction.txt', '\uFEFF' + trainingIns);
		let testIns = orientationInfo.testInstructions['en-us'];
		zip.file('testInstruction.txt', '\uFEFF' + testIns);
		let compensation = orientationInfo.compensations['en-us'];
		zip.file('compensation.txt', '\uFEFF' + compensation);
		if(orientationInfo.questionnaire.use) {
			let customQuestion = orientationInfo.questionnaire['en-us'];
			zip.file('customQuestion.txt', '\uFEFF' + customQuestion);
		}
		let debriefing = exp.debriefing['en-us'];
		zip.file('debriefing.txt', '\uFEFF' + debriefing);
		let trainingBlocks = '';
		trainingBlocks += 'Skip Training: ' + exp.training.skip + '\n';
		if(!exp.training.skip) {
			trainingBlocks += 'Randomize Training Blocks: ' + exp.training.random + '\n';
			trainingBlocks += 'Apply Response Accuracy Threshold: ' + exp.training.threshold.apply + '\n';
			if(exp.training.threshold.apply) {
				trainingBlocks += 'Response Accuracy Threshold: ' + exp.training.threshold.pass + ' %\n';
			}
		}
		trainingBlocks += '\n';
		for(let i=0 ; i<exp.training.blocks.length ; i++) {
			let block = exp.training.blocks[i];
			trainingBlocks += '========== Block: ' + block.title + ' ==========\n';
			trainingBlocks += 'ID: ' + i + '\n';
			trainingBlocks += 'Repetition: ' + block.rep + '\n';
			trainingBlocks += 'Random Trial: ' + block.random + '\n';
			for(let j=0 ; j<block.elements.length ; j++) {
				let em = block.elements[j];
				trainingBlocks += assembleEmSettings(em);
				if(em.type === 'randomTest') {
					trainingBlocks += 'Random Recall Interval: ' + em.randomTest.interval + ' (trials)\n';
					trainingBlocks += 'Pre-recall Prompt: ' + em.randomTest.prompt + '\n';
					trainingBlocks += 'Pre-recall Prompt Length: ' + em.randomTest.promptLength + ' (s)\n';
				}
			}
		}
		zip.file('trainingBlocksEms.txt', '\uFEFF' + trainingBlocks);
		let testBlocks = '';
		testBlocks += 'Randomize Test Blocks: ' + exp.test.random + '\n\n';
		for(let i=0 ; i<exp.test.blocks.length ; i++) {
			let block = exp.test.blocks[i];
			testBlocks += '========== Block: ' + block.title + ' ==========\n';
			testBlocks += 'ID: ' + i + '\n';
			testBlocks += 'Repetition: ' + block.rep + '\n';
			testBlocks += 'Random Trial: ' + block.random + '\n';
			for(let j=0 ; j<block.elements.length ; j++) {
				let em = block.elements[j];
				testBlocks += assembleEmSettings(em);
			}
		}
		zip.file('testBlocksEms.txt', '\uFEFF' + testBlocks);
		try {
			zip = assembleExpResults(data.expId, zip, false);
		}
		catch(e) {
			recordAdminLog('warning', 'downloadCompleteExpResults', data.clientIP, data.expId, 'hacking', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: ['vitale']};
		}
		// Need to change this according to the users' network setting and file structure
		let publicPath = '/URL/to/public/result/files/';
		let now = new Date();
		let date = now.getFullYear() + '' + (now.getMonth() + 1) + '' + now.getDate() + '' + 
    	  	now.getHours() + '' + now.getMinutes() + '' + now.getSeconds();
    	zip.saveAs(publicPath + data.expId + '_' + date + '.zip');
    	recordAdminLog('normal', 'downloadCompleteExpResults', data.clientIP, data.expId, 'complete exp results downloaded', Meteor.user() && Meteor.user().username);
    	recordActivityLog(Meteor.userId(), experimentDB.findOne({_id: data.expId}), 'downloadcompleteres');
    	return {type: 'ok', msg: data.expId + '_' + date + '.zip'};
	}
};

export let deleteExp = (data, userCheck)=>{
	let target = experimentDB.findOne({_id: data.expId});
	let errMsg = [];
	if(!target || !Meteor.userId() || !userCheck.owner) {
		recordAdminLog('warning', 'deleteExp', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
		return {type: 'error', errMsg: errMsg};
	}
	else {
		let owner = Meteor.userId(), exp = experimentDB.findOne({_id: data.expId});
		experimentDB.remove({_id: data.expId}, function(err, result) {
			if(!err) {
				expResultsDB.remove({expId: data.expId});
				if(target.status.state === 'active') {
					Meteor.users.update({_id: owner}, {$inc: {'profile.exp.allExp': -1, 'profile.exp.runningExp': -1}});
				}
				else {
					Meteor.users.update({_id: owner}, {$inc: {'profile.exp.allExp': -1}});
				}
				recordActivityLog(Meteor.userId(), target, 'logdeleteexp');
			}
		});
		Meteor.users.update({'runExpRecord.expId': data.expId}, {$unset: {runExpRecord: ''}}, {multi: true});
		recordAdminLog('normal', 'deleteExp', data.clientIP, data.expId, 'exp deleted', Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
};

export let getInstruction = (data, userCheck)=>{
	let errMsg = [];
	let instructionFilename = 'instruction_'+data.instruction+'_'+data.userLang+'.txt';
	try {
		let instruction = Assets.getText('instructions/'+instructionFilename);
		recordAdminLog('normal', 'getInstruction', data.clientIP, '', 'get instruction ' + instructionFilename, Meteor.user() && Meteor.user().username);
		return {type: 'ok', instruction: instruction};
	}
	catch(err) {
		recordAdminLog('warning', 'getInstruction', data.clientIP, '', 'failed to get instruction ' + instructionFilename, Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
};

export let addCoordinator = (data, userCheck)=>{
	let errMsg = [];
	let exp = experimentDB.findOne({_id: data.expId});
	if(exp && userCheck.verified && userCheck.owner) {
		if(!emailFormat.test(data.coordinator.trim())) {
			recordAdminLog('warning', 'addCoordinator', data.clientIP, data.expId, 'email format issue', Meteor.user() && Meteor.user().username);
			errMsg.push('emailformate');
		}
		else if(exp.coordinators.length+1 > 5) {
			recordAdminLog('warning', 'addCoordinator', data.clientIP, data.expId, 'coordinator quota issue', Meteor.user() && Meteor.user().username);
			errMsg.push('maxcoorde');
		}
		else {
			let coordinator = Meteor.users.findOne({username: data.coordinator, 'profile.userCat': 'experimenter'});
			if(coordinator) {
				if(coordinator.emails[0].verified) {
					experimentDB.update({_id: data.expId}, {$push: {coordinators: data.coordinator}});
				}
				else {
					recordAdminLog('warning', 'addCoordinator', data.clientIP, data.expId, 'coordinator unverified', Meteor.user() && Meteor.user().username);
					errMsg.push('coordunverifiede');
				}
			}
			else {
				recordAdminLog('warning', 'addCoordinator', data.clientIP, data.expId, 'no such user', Meteor.user() && Meteor.user().username);
				errMsg.push('nosuchusere');
			}
		}
	}
	else {
		recordAdminLog('warning', 'addCoordinator', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	recordActivityLog(Meteor.userId(), exp, 'logaddcoordinator');
	recordAdminLog('normal', 'addCoordinator', data.clientIP, data.expId, 'coordinator added ' + data.coordinator, Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let removeCoordinator = (data, userCheck)=>{
	let errMsg = [];
	if(!emailFormat.test(data.coordinator.trim())) {
		recordAdminLog('warning', 'removeCoordinator', data.clientIP, data.expId, 'email format', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	else {
		let exp = experimentDB.findOne({_id: data.expId, coordinators: data.coordinator});
		if(exp && userCheck.verified && userCheck.owner) {
			recordActivityLog(Meteor.userId(), exp, 'logremovecoordinator');
			experimentDB.update({_id: data.expId}, {$pull: {coordinators: data.coordinator}});
		}
		else {
			recordAdminLog('warning', 'removeCoordinator', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
			errMsg.push('vitale');
		}
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	recordAdminLog('normal', 'removeCoordinator', data.clientIP, data.expId, 'coordinator removed ' + data.coordinator, Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let endCoordination = (data, userCheck)=>{
	let errMsg = [];
	let username = Meteor.user() && Meteor.user().username;
	if(userCheck.verified && userCheck.coordinator) {
		let exp = experimentDB.findOne({_id: data.expId, coordinators: username});
		experimentDB.update({_id: data.expId}, {$pull: {coordinators: username}});
		recordActivityLog(Meteor.userId(), exp, 'logendcoordination');
	}
	else {
		recordAdminLog('warning', 'endCoordination', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	recordAdminLog('normal', 'endCoordinator', data.clientIP, data.expId, 'coordinator removed ' + username, username);
	return {type: 'ok'};
};

export let addExcludedExps = (data, userCheck)=>{
	let errMsg = [];
	let currentExp = experimentDB.findOne({_id: data.expId});
	if(!userCheck.verified || (!userCheck.coordinator && !userCheck.owner) || !currentExp || data.excludedExps.length === 0) {
		recordAdminLog('warning', 'addExcludedExps', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	else if(currentExp.excludedExps.length > 20) {
		recordAdminLog('normal', 'addExcludedExps', data.clientIP, data.expId, 'too many excluded exps '+data.expId, Meteor.user() && Meteor.user().username);
		errMsg.push('toomanyexcludedexpe');
	}
	else {
		let recordedIds = currentExp.excludedExps;
		let formulatedList = [];
		loop1:
		for(let i=0 ; i<data.excludedExps.length ; i++) {
			let excludedId = data.excludedExps[i];
			for(let j=0; j<recordedIds.length ; j++) {
				if(recordedIds[j].id === excludedId) {
					errMsg.push('alreadyexcludede');
					break loop1;
				}
			}
			if(typeof excludedId !== 'string' || excludedId.length > 100) {
				recordAdminLog('warning', 'addExcludedExps', data.clientIP, data.expId, 'critical issue', Meteor.user() && Meteor.user().username);
				errMsg.push('vitale');
				break;
			}
			else if(excludedId === data.expId) {
				errMsg.push('seflexcludee');
				break;
			}
			let excludedExp = experimentDB.findOne({_id: excludedId});
			if(!excludedExp) {
				recordAdminLog('warning', 'addExcludedExps', data.clientIP, data.expId, 'no exp' + excludedId, Meteor.user() && Meteor.user().username);
				errMsg.push('nosuchexp');
				break;
			}
			formulatedList.push({id: excludedId, title: excludedExp.basicInfo.title});
			if(i === data.excludedExps.length - 1) {
				experimentDB.update({_id: data.expId}, {$push: {excludedExps: {$each: formulatedList}}});
				recordActivityLog(Meteor.userId(), excludedExp, 'excludeexp');
			}
		}
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	recordAdminLog('normal', 'addExcludedExps', data.clientIP, data.expId, 'exp excluded ' + data.excludedExps[0], Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let removeExcludedExps = (data, userCheck)=>{
	let errMsg = [];
	if(!userCheck.verified || (!userCheck.coordinator && !userCheck.owner)) {
		recordAdminLog('warning', 'removeExcludedExps', data.clientIP, data.expId, 'verification issue', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	else {
		if(typeof data.expId !== 'string' || data.removedId.length > 30) {
			recordAdminLog('warning', 'removeExcludedExps', data.clientIP, data.expId, 'critical issue', Meteor.user() && Meteor.user().username);
			errMsg.push('vitale');
		}
		else {
			let targetExp = experimentDB.findOne({_id: data.expId}), excludedExp = experimentDB.findOne({_id: data.removedId});
			if(!targetExp || !excludedExp) {
				recordAdminLog('warning', 'removeExcludedExps', data.clientIP, data.expId, 'hacking', Meteor.user() && Meteor.user().username);
				errMsg.push('vitale');
			}
			else {
				experimentDB.update({_id: data.expId}, {$pull: {excludedExps: {id: data.removedId}}});
				recordActivityLog(Meteor.userId(), targetExp, 'removeexcludeexp');
			}
		}
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	recordAdminLog('normal', 'removeExcludedExps', data.clientIP, data.expId, 'excluded exp removed ' + data.removedId, Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let verifyRes = (data, userCheck)=>{
	let results = expResultsDB.find({expId: data.expId, verifyCode: data.code}).fetch();
	let exp = experimentDB.findOne({_id: data.expId});
	if(!exp || !userCheck.verified || (!userCheck.owner && !userCheck.coordinator)) {
		recordAdminLog('warning', 'verifyResults', data.clientIP, data.expId, 'critical error', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else if(results.length === 0) {
		recordAdminLog('warning', 'verifyResults', data.clientIP, data.expId, 'verification code not found', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['verifycodenotfounde']};
	}
	else {
		for(let i=0 ; i<results.length ; i++) {
			if(results[i].verified || results[i].withdrawDate) {
				recordAdminLog('warning', 'verifyResults', data.clientIP, data.expId, 'verification code used', Meteor.user() && Meteor.user().username);
				return {type: 'error', errMsg: ['verifycodeusede']};
			}
		}
	}
	expResultsDB.update({expId: data.expId, verifyCode: data.code}, {$set: {verified: true, verifiedDate: new Date()}}, {multi: true});
	recordAdminLog('normal', 'verifyResults', data.clientIP, data.expId, 'verification complete' + data.coordinator, Meteor.user() && Meteor.user().username);
	recordActivityLog(Meteor.userId(), exp, 'validateresults');
	return {type: 'ok'};
};

export let changeOrientationInfo = (data, userCheck)=>{
	let errMsg = [];
	let exp = experimentDB.findOne({_id: data.expId});
	if(!(exp && !exp.status.activated && userCheck.verified && (userCheck.owner || userCheck.coordinator))) {
		recordAdminLog('normal', 'changeOrientationInfo', data.clientIP, data.expId, 'orientation info changed', Meteor.user() && Meteor.user().username);
		errMsg.push('vitale');
	}
	else {
		let orientationTexts = data.orientation;
		errMsg = errMsg.concat(saveLongTextsInfo('orientation', orientationTexts, data.expId));
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	recordActivityLog(Meteor.userId(), exp, 'logchangeorientation');
	recordAdminLog('normal', 'changeOrientationInfo', data.clientIP, data.expId, 'orientation info changed', Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let changeTrainingConfig = (data, userCheck)=>{
	let errMsg = [];
	let exp = experimentDB.findOne({_id: data.expId});
	if(exp && !exp.status.activated && userCheck.verified && (userCheck.owner || userCheck.coordinator) &&
		typeof data.training.skip === 'boolean' && typeof data.training.random === 'boolean') {
		if(data.training.skip) {
			experimentDB.update({_id: data.expId}, 
				{$set: {'training.skip': data.training.skip,
					'training.random': false,
					'training.stimuli': {},
					'training.threshold': {
						apply: false,
						pass: 60
					},
					'training.blocks': [],
					'training.conditions': []
				}}, {$unset: {activateCheck: ''}});
			recordActivityLog(Meteor.userId(), exp, 'logchangetraining');
		}
		else if(checkTrainingSettings(data.training)) {
			let ckStimuliRes = checkStimuliList(data.training.stimuli, exp.test.conditions);
			let ckBlRes = checkBlocks(data.training.blocks, 'training', data.training.stimuli);
			let conditions = findStimuliListConds(data.training.stimuli.Condition);
			if(ckBlRes[0] && ckStimuliRes.checked) {
				data.training.blocks = ckBlRes[1];
				experimentDB.update({_id: data.expId}, 
				{$set: {'training.skip': data.training.skip,
					'training.random': data.training.random,
					'training.stimuli': data.training.stimuli,
					'training.threshold': data.training.threshold,
					'training.blocks': data.training.blocks,
					'training.conditions': ckStimuliRes.conds
				}}, {$unset: {activateCheck: ''}});
				recordActivityLog(Meteor.userId(), exp, 'logchangetraining');
			}
			else {
				errMsg.push('vitale');
			}
		}
		else {
			errMsg.push('vitale');
		}	
	}
	else {
		errMsg.push('vitale');
	}
	if(errMsg.length > 0) {
		recordAdminLog('warning', 'changeTrainingConfig', data.clientIP, data.expId, 'changing training config failed', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: errMsg};
	}
	recordAdminLog('normal', 'changeTrainingConfig', data.clientIP, data.expId, 'training config changed', Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let changeTestConfig = (data, userCheck)=>{
	let errMsg = [];
	let exp = experimentDB.findOne({_id: data.expId});
	if(exp && !exp.status.activated && userCheck.verified && ((userCheck.owner || userCheck.coordinator) && 
		typeof data.test.random === 'boolean' && typeof data.test.checkFastRT === 'boolean')) {
		let ckStimuliRes = checkStimuliList(data.test.stimuli, exp.training.conditions);
		let ckBlRes = checkBlocks(data.test.blocks, 'test', data.test.stimuli);
		let conditions = findStimuliListConds(data.test.stimuli.Condition);
		if(ckBlRes[0] && ckStimuliRes.checked) {
			data.test.blocks = ckBlRes[1];
			experimentDB.update({_id: data.expId}, 
			{$set: {
				'test.random': data.test.random,
				'test.checkFastRT': data.test.checkFastRT,
				'test.stimuli': data.test.stimuli,
				'test.blocks': data.test.blocks,
				'test.conditions': ckStimuliRes.conds
			}}, {$unset: {activateCheck: ''}});
		}
		else {
			errMsg.push('vitale');
		}
	}
	else {
		errMsg.push('vitale');
	}
	if(errMsg.length > 0) {
		recordAdminLog('warning', 'changeTestConfig', data.clientIP, data.expId, 'changing test config failed', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: errMsg};
	}
	recordActivityLog(Meteor.userId(), exp, 'logchangetest');
	recordAdminLog('normal', 'changeTestConfig', data.clientIP, data.expId, 'test config changed', Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let changeDebriefingInfo = (data, userCheck) => {
	let errMsg = [];
	let exp = experimentDB.findOne({_id: data.expId});
	if(exp && !exp.status.activated && userCheck.verified && (userCheck.owner || userCheck.coordinator)) {
		let debriefing = data.debriefing;
		errMsg = errMsg.concat(saveLongTextsInfo('debriefing', debriefing, data.expId));
		if(errMsg.length > 0) {
			recordAdminLog('warning', 'changeDebriefingInfo', data.clientIP, data.expId, 'changing debriefing failed', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: errMsg};
		}
		recordAdminLog('normal', 'changeDebriefingInfo', data.clientIP, data.expId, 'debriefing info changed', Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
	else {
		errMsg.push('vitale');
	}
	recordActivityLog(Meteor.userId(), exp, 'logchangedebriefing');
	recordAdminLog('warning', 'changeDebriefingInfo', data.clientIP, data.expId, 'changing debriefing info failed', Meteor.user() && Meteor.user().username);
	return {type: 'error', errMsg: errMsg};
};

export let activateCheck = (data, userCheck) => {
	let errMsg = [];
	let exp = experimentDB.findOne({_id: data.expId});
	if(exp && exp.status.state === 'inactive' && userCheck.verified && userCheck.owner) {
		experimentDB.update({_id: data.expId}, {$set: {activateCheck: {done: false, pass: false, failList: []}}});
		let failList = [];
		let checkCorrect = false;
		let stimuliList, blocks;
		let orient = exp.orientation;
		if(!orient.descriptions['en-us'] || !orient.consentForms['en-us'] ||
			!orient.trainingInstructions['en-us'] || !orient.testInstructions['en-us'] ||
			(orient.questionnaire.use && !orient.questionnaire['en-us']) || !exp.debriefing['en-us'] || 
			orient.descriptions['en-us'].trim().length === 0 ||
			orient.consentForms['en-us'].trim().length === 0 ||
			orient.trainingInstructions['en-us'].trim().length === 0 ||
			orient.testInstructions['en-us'].trim().length === 0 ||
			(orient.questionnaire.use && orient.questionnaire['en-us'].trim().length === 0) ||
			exp.debriefing['en-us'].trim().length === 0) {
			failList.push({type: 'noenusinfo', note: ''});
		}

		let SBC = {
			rep: exp.basicInfo.multiple,
			repN: exp.basicInfo.multipleN,
			trainingConds: exp.training.conditions,
			testConds: exp.test.conditions,
			trainingStimuli: exp.training.stimuli,
			testStimuli: exp.test.stimuli
		};

		try {
			failList = failList.concat(activateSBCCheck(SBC));
		}
		catch(e) {
			failList.push({type: 'vitale', note: ''});
		}

		stimuliList = exp.test.stimuli;
		blocks = exp.test.blocks;
		let checkTestConfigResults = activateConfigCheck(blocks, stimuliList, 'test');
		checkCorrect = checkTestConfigResults.checkCorrect;
		failList = failList.concat(checkTestConfigResults.msgs);
		if(!checkCorrect) {
			failList.push({type: 'testnocheckrespcorre', note: ''});
		}
		// Check link availability
		activateURLCheck(stimuliList).then((testURLTestRes)=>{
			function postURLTest () {
				if(failList.length > 0) {
					experimentDB.update({_id: data.expId}, {$set: {activateCheck: {done: true, pass: false, failList: failList}}});
				}
				else if(data.testRun) {
					experimentDB.update({_id: data.expId}, {$set: {activateCheck: {done: true, pass: true, failList: failList}}});
				}
				else {
					experimentDB.update({_id: data.expId}, {$unset: {activateCheck: ''}, $set: {'status.state': 'active', 'status.activated': true}}, function(err, res) {
						if(res) {
							Meteor.users.update({_id: Meteor.userId()}, {$inc: {'profile.exp.runningExp': 1}});
							recordActivityLog(Meteor.userId(), exp, 'logactivateexp');
						}
					});
				}
				recordAdminLog('normal', 'activateCheck', data.clientIP, data.expId, 'exp activated', Meteor.user() && Meteor.user().username);
			};
			failList = failList.concat(testURLTestRes);
			if(!exp.training.skip) {
				stimuliList = exp.training.stimuli;
				blocks = exp.training.blocks;
				checkCorrect = false;
				let checkTrainingConfigResults = activateConfigCheck(blocks, stimuliList, 'training');
				checkCorrect = checkTrainingConfigResults.checkCorrect;
				// Check if the elements check correct response and if the stimuli list has
				// a correct column
				if(exp.training.threshold.apply) {
					if(!checkCorrect) {
						failList.push({type: 'trainingnocheckrespcorre', note: ''});
					}
				}
				failList = failList.concat(checkTrainingConfigResults.msgs);
				// Check link availability
				activateURLCheck(stimuliList).then((trainingURLTestRes)=>{
					failList = failList.concat(trainingURLTestRes);
					postURLTest();
				});
			}
			else {
				postURLTest();
			}
		});
		return {type: 'ok'};
	}
	else {
		errMsg.push('vitale');
		recordAdminLog('warning', 'activateCheck', data.clientIP, data.expId, 'activate checking failed', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: errMsg};
	}
};

export let expInitializer = (data, userCheck) => {
	let runExpRecord = {
		expId: data.expId,
		expTitle: '',
		participantId: '',
		realUserId: '',
		realUsername: '',
		ipAddress: null,
		profile: {},
		running: false,
		challenging: false,
		sessionN: 1,
		stage: '',
		startTime: new Date(),
		endTime: null,
		condition: null,
		mediaSample: null,
		stimuliList: null,
		verifyCode: '',
		wmRecord: ''
	};
	let userData = Meteor.user();
	let exp = experimentDB.findOne({_id: data.expId});
	let userExpRecord = userData && userData.runExpRecord;
	let userProfile = userData && userData.profile;
	let userId = Meteor.userId();
	let userAge, timeGapPassed = true, expOwner = (userCheck.owner || userCheck.coordinator);
	if(!expOwner) {
		if(exp) {
			let challengingSubj = Meteor.users.find({'runExpRecord.expId': exp._id, 'runExpRecord.challenging': true}).fetch();
			if(exp.status.currentSubj + challengingSubj.length === exp.basicInfo.subjNum && exp.status.state === 'active') {
				return {type: 'error', errMsg: ['morerunning']};
			}
			if(!passExcludedExps(exp.excludedExps, userProfile.exp.participated)) {
				return {type: 'error', errMsg: ['participatedrelativee']};
			}
		}
		userAge = calcAge(userProfile.dob);
		if(userProfile.exp.lastParticipation) {
			timeGapPassed = timeGapCalc(userProfile.exp.lastParticipation, exp.basicInfo.gapHour);
		}
	}
	if(exp && userCheck.verified && 
		(expOwner || ((exp.status.state === 'active' || exp.status.state === 'complete') && 
		userAge >= exp.basicInfo.age && timeGapPassed && 
		passScreening(exp.basicInfo.screening, userProfile.exp.sideNotes))))
	{
		if(!userExpRecord || (userExpRecord.expId !== data.expId && !userExpRecord.stage.match(/repeat|training|test/g))) {
			let participated = null;
			if(!expOwner) {
				runExpRecord.profile.gender = userProfile.gender;
				runExpRecord.profile.handedness = userProfile.handedness;
				runExpRecord.profile.age = userAge;
				runExpRecord.profile.L1 = userProfile.L1;
				runExpRecord.profile.L2 = userProfile.L2;
				runExpRecord.profile.participatedExpNum = userProfile.gaming.session.nums;
				participated = userProfile.exp.participated.includes(exp._id);
				let lastWMRecord = wmStatsDB.findOne({userId: userId}, {sort: {endTime: -1}});
				if(lastWMRecord) {
					runExpRecord.wmRecord = lastWMRecord._id;
				}
			}
			runExpRecord.profile.screenX = data.screenX;
			runExpRecord.profile.screenY = data.screenY;
			runExpRecord.condition = assignCondition(exp.training.conditions, exp.test.conditions, exp.training.skip);
			runExpRecord.stimuliList = selectStimuli(exp.training.stimuli, exp.test.stimuli, runExpRecord.condition, exp.basicInfo.multiple, runExpRecord.sessionN);
			runExpRecord.mediaSample = selectMediaSample(runExpRecord.stimuliList);
			runExpRecord.expTitle = exp.basicInfo.title;
			runExpRecord.participantId = randomMasker(userId, 3);
			runExpRecord.realUserId = userId;
			runExpRecord.realUsername = userData.username;
			runExpRecord.ipAddress = randomMasker(data.clientIP, 3);
			if(participated) {
				let allPreviousRecords = expStatsDB.find({userId: userId, expId: exp._id}, {sort: {date: -1}}).fetch();
				if(allPreviousRecords.length > 0) {
					let lastRecord = allPreviousRecords[0];
					runExpRecord.sessionN = lastRecord.sessionN + 1;
				}
			}
			Meteor.users.update({_id: userId}, {$set: {runExpRecord: runExpRecord}});
		}
		else if(userExpRecord && userExpRecord.challenging && userExpRecord.stage === 'repeat') {
			Meteor.users.update({_id: userId}, 
				{$set: {'runExpRecord.startTime': new Date(),
					'runExpRecord.ipAddress': randomMasker(data.clientIP, 3),
					'runExpRecord.profile.age': userAge}});
		}
		recordAdminLog('normal', 'expInitializer', data.clientIP, data.expId, 'exp initialized', userData && userData.username);
		return {type: 'ok'};
	}
	recordAdminLog('warning', 'expInitializer', data.clientIP, data.expId, 'exp initialization failed', userData && userData.username);
	if(!(exp.status.state === 'active' || exp.status.state === 'complete')) {
		return {type: 'error', errMsg: ['expnotexist']};
	}
	return {type: 'error', errMsg: ['vitale']};
};

export let logQuestionnaireResp = (data, userCheck) => {
	let runExpRecord = Meteor.user() && Meteor.user().runExpRecord;
	if(userCheck.verified && runExpRecord && typeof data.resp === 'string') {
		if(runExpRecord.sessionN === 1) {
			let newResp = data.resp.substring(0, 100);
			Meteor.users.update({_id: Meteor.userId()}, {$set: {'runExpRecord.profile.questionnaire': newResp}});
		}
		return {type: 'ok'};
	}
	recordAdminLog('warning', 'logQuestionnnaireResp', data.clientIP, data.expId, 'log questionnaire response failed', userData && userData.username);
	return {type: 'error', errMsg: ['vitale']};
};

export let wmExpInitializer = (data, userCheck) => {
	let userData = Meteor.user(), userId = userData && userData._id;
	let previousWMRecords = wmStatsDB.find({userId: userId}, {sort: {endTime: -1}}).fetch();
	if(previousWMRecords.length > 0 && !(((new Date()).getTime() - previousWMRecords[0].endTime.getTime()) / (3600 * 24 * 1000) >= 1)) {
		return {type: 'error', errMsg: ['wmtimegape']};	
	}
	if(userId && !userData.runExpRecord && userCheck.verified) {
		let runExpRecord = {
			userId: userId,
			age: calcAge(userData.profile.dob),
			startTime: new Date(),
			endTime: null,
			stimuliList: null
		};

		let operators = ['+', '-', 'x'], groupItemN = 2, groupN = 3, stimuli = [], generatedAnswers = [];
		for(let i=0 ; i<7 ; i++) {
			for(let j=0 ; j<groupN ; j++) {
				for(let k=0 ; k<groupItemN ; k++) {
					let answer = 0, correct = '', formula = '';
					do {
						let num1 = Math.floor(Math.random() * 9);
						let num2 = Math.floor(Math.random() * 9);
						let opSel = Math.floor(Math.random() * operators.length);
						let dice = Math.floor(Math.random() * 2);
						if(dice) {
							num1 *= -1;
						}
						dice = Math.floor(Math.random() * 2);
						if(dice) {
							num2 *= -1;
						}
						formula = num1 + ' ' + operators[opSel] + ' ' + num2;
						switch(opSel) {
							case 0:
								answer = num1 + num2;
								break;
							case 1:
								answer = num1 - num2;
								break;
							case 2:
								answer = num1 * num2;
								break;
						}
						if(dice) {
							correct = 'yes';
						}
						else {
							correct = 'no';
							dice = Math.floor(Math.random() * 2);
							if(dice) {
								answer += Math.floor(Math.random() * 8) + 1;
							}
							else {
								answer -= Math.floor(Math.random() * 8) + 1;
							}
						}
					}
					while(generatedAnswers.includes(answer));
					stimuli.push({formula: formula, answer: answer, correct: correct});
					generatedAnswers.push(answer);
				}
				generatedAnswers = [];
			}
			groupItemN++;
		}
		runExpRecord.stimuliList = stimuli;
		Meteor.users.update({_id: userData._id}, {$set: {runWMRecord: runExpRecord}});
		recordAdminLog('normal', 'wmExpInitializer', data.clientIP, data.expId, 'wm exp initialized', Meteor.user() && Meteor.user().username);
		return {type: 'ok'};
	}
	else if(userData.runExpRecord) {
		recordAdminLog('normal', 'wmExpInitializer', data.clientIP, data.expId, 'other ongoing exp', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['expongoing']};
	}
	recordAdminLog('warning', 'wmExpInitializer', data.clientIP, data.expId, 'wm initialization failed', Meteor.user() && Meteor.user().username);
	return {type: 'error', errMsg: ['vitale']};
};

export let getWMInstruction = (data, userCheck) => {
	let userData = Meteor.user();
	let availableLang = ['en-us', 'zh-tw'], wmInstructions = {};
	if(data.session === 'runWMExp' && userData && !userData.runExpRecord && userData.runWMRecord && userCheck.verified) {
		for(let i=0 ; i<availableLang.length ; i++) {
			let wmInstruction = Assets.getText('instructions/instruction_wm_' + availableLang[i] + '.txt');
			wmInstructions[availableLang[i]] = wmInstruction;
		}
		recordAdminLog('normal', 'getWMInstruction', data.clientIP, data.expId, 'getting wm instruction', Meteor.user() && Meteor.user().username);
		return {type: 'ok', msg: wmInstructions};
	}
	recordAdminLog('warning', 'getWMInstruction', data.clientIP, data.expId, 'failed to get wm instruction', Meteor.user() && Meteor.user().username);
	return {type: 'error', errMsg: ['vitale']};
};

export let expTracker = (data, userCheck) => {
	let userData = Meteor.user(), exp = experimentDB.findOne({_id: data.expId});
	if(exp && userData && userData.runExpRecord && !userData.runExpRecord.stage.match(/end|lowAcc|noresp|fastresp/g)) {
		let runExpRecord = userData.runExpRecord;
		let runningExp = runExpRecord.running;

		if(data.key === 'stage') {
			let timeGapPassed = false;
			let currentTime = new Date(), lastParticipation = userData.profile.exp && userData.profile.exp.lastParticipation;
			if(!lastParticipation || (userCheck.owner || userCheck.coordinator) || timeGapCalc(lastParticipation, exp.basicInfo.gapHour)) {
				timeGapPassed = true;
			}
			if(!runningExp && (data.value === 'training' || data.value === 'test') && timeGapPassed) {
				Meteor.users.update({_id: userData._id}, 
					{$set: {'runExpRecord.stage': data.value, 
						'runExpRecord.running': true,
						'runExpRecord.challenging': true,
						'profile.exp.lastParticipation': new Date()}});
			}		
			recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'stage change recorded', Meteor.user() && Meteor.user().username);
			return {type: 'ok'};
		}
		else if(runningExp && data.key.includes('Results') && data.value.length && data.value.length <= 100000) {
			let verifyCode = runExpRecord.verifyCode;
			let validatedResults = expTrialValidator(data.value);
			let respsStats = calcRespStats(validatedResults, (userCheck.owner || userCheck.coordinator));
			respsStats.contact = exp.userAccount;
			respsStats.consent = runExpRecord.consent + '';
			respsStats.compensation = runExpRecord.compensation + '';
			let lowAcc = (data.key === 'trainingResults' && (exp.training.threshold.apply && respsStats.correctPerc < exp.training.threshold.pass));
			let participated = true;
			if(userData.profile.userCat === 'challenger') {
				participated = userData.profile.exp.participated.includes(data.expId);
			}
			else {
				participated = false;
			}
			let allRecordsNum = expStatsDB.find({userId: userData._id, expId: data.expId}).fetch().length;
			let tooManyRecords = allRecordsNum > 30;
			if(verifyCode === '' && !tooManyRecords && !participated) {
				verifyCode = generateVerifyCode();
			}

			respsStats.expId = runExpRecord.expId;
			respsStats.userId = runExpRecord.realUserId;
			respsStats.username = runExpRecord.realUsername;
			respsStats.expTitle = runExpRecord.expTitle;
			respsStats.sessionN = runExpRecord.sessionN;
			respsStats.verifyCode = verifyCode;
			respsStats.lowAcc = true;

			if(tooManyRecords || participated) {
				delete respsStats.compensation;
			}

			if(data.key === 'trainingResults') {
				if(lowAcc) {
					if(!tooManyRecords && !(userCheck.owner || userCheck.coordinator)) {
						respsStats.achievements = achievementsCheck(userData._id, 'failedtraining');
						expStatsDB.insert(respsStats);
						respsStats = cleanRespsFields(respsStats);
					}
					if(!participated) {
						Meteor.users.update({_id: userData._id}, 
							{$set: {'runExpRecord.stage': 'lowAcc', 
								'runExpRecord.verifyCode': verifyCode, 
								'runExpRecord.respsStats': respsStats,
								'runExpRecord.running': false,
								'runExpRecord.challenging': false,
							}});	
						if(!(userCheck.owner || userCheck.coordinator)) {
							let endTime = new Date();
							runExpRecord.stage = 'lowAcc';
							runExpRecord.endTime = endTime;
							runExpRecord.trainingResults = validatedResults;
							runExpRecord.verifyCode = verifyCode;
							if(runExpRecord.sessionN > 1) {
								if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
									experimentDB.update({_id: data.expId}, {$inc: {'status.currentSubj': 1}, $set: {'status.state': 'complete', 'completedAt': new Date(), 'completeExpInfo': ''}});
								}
								else {
									experimentDB.update({_id: data.expId}, {$inc: {'status.currentSubj': 1}});
								}
							}
							Meteor.users.update({_id: userData._id}, {$push: {'profile.exp.participated': data.expId}});
							expResultsDB.insert(runExpRecord);
						}
					}
					else {
						Meteor.users.update({_id: userData._id}, 
							{$set: {'runExpRecord.stage': 'lowAcc', 
								'runExpRecord.respsStats': respsStats,
								'runExpRecord.running': false,
								'runExpRecord.challenging': false}});
					}
				}
				else {
					respsStats.lowAcc = false;
					Meteor.users.update({_id: userData._id}, 
						{$set: {'runExpRecord.trainingResults': validatedResults, 
							'runExpRecord.stage': 'test',
							'runExpRecord.verifyCode': verifyCode,
							'runExpRecord.respsStats': respsStats}});
				}
				recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'training record updated', Meteor.user() && Meteor.user().username);
				if(lowAcc) {
					return {type: 'ok', msg: 'lowAcc'};
				}
				return {type: 'ok'};
			}
			else {
				delete respsStats.lowAcc;
				let repeatExp = exp.basicInfo.multiple, repeatN = Number(exp.basicInfo.multipleN);
				if(!(userCheck.owner || userCheck.coordinator)) {
					let achievementsCopy = [...respsStats.achievements];
					delete respsStats.achievements;
					let endTime = new Date(), insertedStatsId = '', criticalCond = '';
					if(!exp.test.checkFastRT) {
						let fastRTPos = achievementsCopy.indexOf('fastCompletion');
						if(fastRTPos > -1) {
							achievementsCopy.splice(fastRTPos, 1);
						}
					}
					if(achievementsCopy.includes('daydreamer')) {
						criticalCond = 'daydreamer';
					}
					else if(achievementsCopy.includes('fastCompletion')) {
						criticalCond = 'fastCompletion';
					}
					let recordTestCond = '';
					if(criticalCond !== '') {
						recordTestCond = 'recordCritical';
					}
					else if(!participated && (!repeatExp || (repeatExp && Number(runExpRecord.sessionN) === Number(repeatN)))) {
						recordTestCond = 'recordFinal';
					}
					else if(!participated && repeatExp && Number(runExpRecord.sessionN) < repeatN) {
						recordTestCond = 'recordNonFinal';
					}
					else if(participated) {
						recordTestCond = 'recordParticipated';
					}

					switch(recordTestCond) {
						case 'recordCritical':
							if(criticalCond === 'daydreamer') {
								respsStats.noResp = true;
								if(!userData.profile.exp.sideNotes.daydreamer.recorded) {
									Meteor.users.update({_id: userData._Id}, {$set: {'profile.exp.sideNotes.daydreamer.recorded': true, 
									'profile.exp.sideNotes.daydreamer.date': new Date()}});
								}
							}
							else {
								respsStats.fastComplete = true;
								if(!userData.profile.exp.sideNotes.fastCompletion.recorded) {
									Meteor.users.update({_id: userData._Id}, {$set: {'profile.exp.sideNotes.fastCompletion.recorded': true, 
									'profile.exp.sideNotes.fastCompletion.date': new Date()}});
								}
							}
							respsStats.verifyCode = '';
							delete respsStats.compensation;
							if(!tooManyRecords) {
								insertedStatsId = expStatsDB.insert(respsStats);
								Meteor.users.update({_id: userData._id}, {$set: {'runExpRecord.resultsId': insertedStatsId}});
							}
							respsStats = cleanRespsFields(respsStats);
							let criticalStage = criticalCond === 'daydreamer' ? 'noresp' : 'fastresp';
							if(!participated) {
								Meteor.users.update({_id: userData._id}, 
									{$set: {
										'runExpRecord.stage': criticalStage,
										'runExpRecord.endTime': endTime,
										'runExpRecord.verifyCode': '',
										'runExpRecord.respsStats': respsStats,
										'runExpRecord.running': false,
										'runExpRecord.challenging': false
									}, $push: {'profile.exp.participated': data.expId}});
								runExpRecord.stage = criticalStage;
								runExpRecord.endTime = endTime;
								runExpRecord.testResults = validatedResults;
								runExpRecord.verifyCode = '';
								expResultsDB.insert(runExpRecord);
							}
							else {
								Meteor.users.update({_id: userData._id}, {$set: {
									'runExpRecord.stage': '',
									'runExpRecord.endTime': endTime,
									'runExpRecord.verifyCode': '',
									'runExpRecord.respsStats': null,
									'runExpRecord.running': false,
									'runExpRecord.challenging': false
								}});
							}
							recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'test ' + criticalStage + ' recorded', Meteor.user() && Meteor.user().username);
							return {type: 'error', errMsg: [criticalStage]};
							break;
						case 'recordFinal':
							let increaseSessionN = 0;
							if(repeatExp) {
								increaseSessionN = 1;
							}

							if(!tooManyRecords) {
								respsStats.achievements = achievementsCopy;
								respsStats.achievements = achievementsCheck(userData._id, respsStats.achievements);
								insertedStatsId = expStatsDB.insert(respsStats);
								Meteor.users.update({_id: userData._id}, {$set: {'runExpRecord.resultsId': insertedStatsId}});
							}

							respsStats = cleanRespsFields(respsStats);

							Meteor.users.update({_id: userData._id}, 
								{$set: {
									'runExpRecord.stage': 'end',
									'runExpRecord.endTime': endTime,
									'runExpRecord.verifyCode': verifyCode,
									'runExpRecord.respsStats': respsStats,
									'runExpRecord.running': false,
									'runExpRecord.challenging': false
								},
								$inc: {'profile.gaming.correctRespN.nums': respsStats.correct, 'profile.gaming.session.nums': 1, 'profile.gaming.repeatedSession.nums': increaseSessionN},
								$push: {'profile.exp.participated': data.expId, 'profile.gaming.allCorrRTMean.records': respsStats.correctRTMean}});
							runExpRecord.endTime = endTime;
							runExpRecord.testResults = validatedResults;
							runExpRecord.verifyCode = verifyCode;
							expResultsDB.insert(runExpRecord);
							if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
								experimentDB.update({_id: data.expId}, {$inc: {'status.currentSubj': 1},
									$set: {'status.state': 'complete', 'completedAt': new Date(), 'completeExpInfo': ''}});
								Meteor.users.update({_id: exp.user}, {$inc: {'profile.exp.runningExp': -1}});
							}
							else {
								experimentDB.update({_id: data.expId}, {$inc: {'status.currentSubj': 1}});
							}
							recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'exp end recorded', Meteor.user() && Meteor.user().username);
							break;
						case 'recordNonFinal':
							if(!tooManyRecords) {
								respsStats.achievements = achievementsCopy;
								respsStats.achievements = achievementsCheck(userData._id, respsStats.achievements);
								insertedStatsId = expStatsDB.insert(respsStats);
								Meteor.users.update({_id: userData._id}, {$set: {'runExpRecord.resultsId': insertedStatsId}});
							}

							respsStats = cleanRespsFields(respsStats);

							Meteor.users.update({_id: userData._id}, 
								{$set: {
									'runExpRecord.stage': 'repeat',
									'runExpRecord.endTime': endTime,
									'runExpRecord.verifyCode': verifyCode,
									'runExpRecord.respsStats': respsStats,
									'runExpRecord.running': false
								},
								$inc: {'profile.gaming.correctRespN.nums': respsStats.correct, 
									'profile.gaming.session.nums': 1, 
									'profile.gaming.repeatedSession.nums': 1,
									'runExpRecord.sessionN': 1
								},
								$push: {'profile.gaming.allCorrRTMean.records': respsStats.correctRTMean}});
							runExpRecord.endTime = endTime;
							runExpRecord.testResults = validatedResults;
							runExpRecord.verifyCode = verifyCode;
							expResultsDB.insert(runExpRecord);
							recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'repeated exp recorded', Meteor.user() && Meteor.user().username);
							break;
						case 'recordParticipated':
							delete respsStats.compensation;
							if(!tooManyRecords) {
								respsStats.achievements = achievementsCopy;
								respsStats.achievements = achievementsCheck(userData._id, respsStats.achievements);
								insertedStatsId = expStatsDB.insert(respsStats);
								Meteor.users.update({_id: userData._id}, {$set: {'runExpRecord.resultsId': insertedStatsId}});
							}

							respsStats = cleanRespsFields(respsStats);

							Meteor.users.update({_id: userData._id}, 
							{$set: {
								'runExpRecord.stage': 'end',
								'runExpRecord.endTime': endTime,
								'runExpRecord.verifyCode': '',
								'runExpRecord.respsStats': respsStats,
								'runExpRecord.running': false,
								'runExpRecord.challenging': false
							},
								$inc: {'profile.gaming.correctRespN.nums': respsStats.correct, 'profile.gaming.session.nums': 1, 'profile.gaming.oldSession.nums': 1},
								$push: {'profile.gaming.allCorrRTMean.records': respsStats.correctRTMean}});
							recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'participated session recorded', Meteor.user() && Meteor.user().username);
							break;
					}
					return {type: 'ok', msg: insertedStatsId, sessionN: runExpRecord.sessionN};
				}
				else {
					delete respsStats.consent;
					delete respsStats.compensation;
					Meteor.users.update({_id: userData._id}, {$set: {'runExpRecord.respsStats': respsStats, 'runExpRecord.resultsId': 'testInsertedId'}});
					recordAdminLog('normal', 'expTracker', data.clientIP, data.expId, 'exp preview recorded', Meteor.user() && Meteor.user().username);
					if(respsStats.achievements.includes('daydreamer')) {
						return {type: 'error', errMsg: ['noresp']};
					}
					else if(respsStats.achievements.includes('fastCompletion')) {
						return {type: 'error', errMsg: ['fastresp']};
					}
					return {type: 'ok', msg: 'testInsertedId', sessionN: 1};	
				}
			}
		}
	}
	recordAdminLog('warning', 'expTracker', data.clientIP, data.expId, 'exp tracker failed', Meteor.user() && Meteor.user().username);
	return {type: 'error', errMsg: ['vitale']};
};

export let signConsent = (data, userCheck) => {
	if(!Meteor.user() || !userCheck.verified || typeof data.signature !== 'string' || data.signature.length > 100 || typeof data.expLang !== 'string') {
		recordAdminLog('warning', 'signConsent', data.clientIP, data.expId, 'sign consent form failed', Meteor.user() && Meteor.user().username);
		return {type: 'error', errMsg: ['vitale']};
	}
	else {
		let expId = Meteor.user().runExpRecord.expId;
		let exp = experimentDB.findOne({_id: expId});
		if(!exp) {
			recordAdminLog('warning', 'signConsent', data.clientIP, data.expId, 'sign consent form failed', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: ['vitale']};
		}
		let consentForm = exp.orientation.consentForms[data.expLang];
		let compensation = exp.orientation.compensations[data.expLang];
		Meteor.users.update({_id: Meteor.userId()}, {$set: {'runExpRecord.signature': data.signature,
			'runExpRecord.expLang': data.expLang, 'runExpRecord.consent': consentForm,
			'runExpRecord.compensation': compensation}});
		return {type: 'ok'};
	}
};

export let expRecordCleaner = (data, userCheck) => {
	let userData = Meteor.user();
	let runExpRecord = userData && userData.runExpRecord;
	let expId = runExpRecord && runExpRecord.expId;
	if(userCheck.owner || userCheck.coordinator) {
		Meteor.users.update({_id: userData._id}, {$unset: {runExpRecord: '', 'profile.exp.lastParticipation': ''}});
	}
	else if (userCheck.verified && runExpRecord && runExpRecord.stage !== 'repeat' && !runExpRecord.running) {
		Meteor.users.update({_id: userData._id}, {$unset: {runExpRecord: ''}});
	}
	else if(data.withdraw && runExpRecord) {
		if(expResultsDB.findOne({expId: expId, realUserId: runExpRecord.realUserId})) {
			let exp = experimentDB.findOne({_id: expId});
			if(exp.status.currentSubj + 1 === exp.basicInfo.subjNum) {
				experimentDB.update({_id: expId}, {$inc: {'status.currentSubj': 1}, $set: {'status.state': 'complete', 'completedAt': new Date(), 'completeExpInfo': ''}});
			}
			else {
				experimentDB.update({_id: expId}, {$inc: {'status.currentSubj': 1}});
			}
		}
		Meteor.users.update({_id: userData._id}, {$unset: {runExpRecord: ''}, $push: {'profile.exp.participated': runExpRecord.expId}});
	}
	recordAdminLog('normal', 'expRecordCleaner', data.clientIP, data.expId, 'exp record cleaner completed', Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let wmExpRecordCleaner = (data, userCheck) => {
	if(userCheck.verified) {
		Meteor.users.update({_id: Meteor.userId()}, {$unset: {runWMRecord: ''}});
	}
	recordAdminLog('normal', 'wmExpRecordCleaner', data.clientIP, data.expId, 'wm exp record cleaner completed.', Meteor.user() && Meteor.user().username);
	return {type: 'ok'};
};

export let getExpResults = (data, userCheck) => {
	if(userCheck.owner || userCheck.coordinator) {
		let exp = experimentDB.findOne({_id: data.expId});
		recordAdminLog('normal', 'getExpResults', data.clientIP, data.expId, 'getting exp session results in preview mode', Meteor.user() && Meteor.user().username);
		if(exp) {
			return {type: 'testRun', debriefing: exp.debriefing[data.userLang] || exp.debriefing['en-us']};
		}
		return {type: 'testRun'};
	}
	else {
		let retrievedResults = expStatsDB.findOne({_id: data.resultsId, sessionN: data.sessionN});
		if(retrievedResults) {
			if(Meteor.userId() !== retrievedResults.userId) {
				delete retrievedResults.verifyCode;
			}
			delete retrievedResults.userId;
			let exp = experimentDB.findOne({_id: retrievedResults.expId});
			if(exp) {
				retrievedResults.expCorrPerc = exp.stats.correctPerc;
				retrievedResults.expAllRTMean = exp.stats.allRTMean;
				retrievedResults.expCorrRTMean = exp.stats.correctRTMean;
				retrievedResults.repeat = exp.basicInfo.multiple;
				retrievedResults.targetN = exp.basicInfo.multipleN;
				let runExpRecord = Meteor.user() && Meteor.user().runExpRecord;
				if(runExpRecord && runExpRecord.stage === 'end' && exp) {
					let debriefing = exp.debriefing[data.userLang] || exp.debriefing['en-us'];
					if(debriefing.trim().length === 0) {
						debriefing = exp.debriefing['en-us'];
					}
					retrievedResults.debriefing = debriefing;
					retrievedResults.condition = runExpRecord.condition[0] === '' ? runExpRecord.condition[0] : runExpRecord.condition[1];
				}
			}
			recordAdminLog('normal', 'getExpResults', data.clientIP, data.expId, 'regular users getting exp session results', Meteor.user() && Meteor.user().username);
			return {type: 'ok', expResults: retrievedResults};
		}
		else {
			recordAdminLog('warning', 'getExpResults', data.clientIP, data.expId, 'failed to get exp session results', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: ['resultsnotfounde']};
		}
	}
};

export let completeWMTest = (data, userCheck)=>{
	let userData = Meteor.user();
	if(userCheck.verified && userData.runWMRecord) {
		try {
			let wmStimuli = userData.runWMRecord.stimuliList;
			let trials = data.trials, recalledNums = data.recall;
			let totalScore = 0, corrRTMean = 0, allCorrRTs = 0;
			let researchScores = {
				trials: trials.length,
				groups: 0,
				judgeCorr: 0,
				recallANL: 0,
				recallPNL: 0,
				recallANU: 0,
				recallPNU: 0,
			};
			for(let i=0 ; i<trials.length ; i++) {
				if(i >= wmStimuli.length) {
					break;
				}
				let trial = trials[i];
				if(trial.resp === wmStimuli[i].correct) {
					researchScores.judgeCorr++;
					allCorrRTs += trial.rt;
				}
			}
			corrRTMean = Math.round(allCorrRTs * 10/researchScores.judgeCorr) / 10;
			let itemN = 2, groupN = 3, stimulusCount = 0, recallTargets = [];
			let ANUs = [], PNUs = [], correctANU = 0, correctPNU = 0;
			loop1:
			for(let i=0 ; i<7 ; i++) {
				for(let j=0 ; j<groupN ; j++) {
					researchScores.groups++;
					for(let k=0 ; k<itemN ; k++) {
						recallTargets.push(wmStimuli[stimulusCount+k].answer);
					}
					for(let k=0 ; k<itemN ; k++) {
						if(stimulusCount >= recalledNums.length || stimulusCount >= wmStimuli.length) {
							break loop1;
						}
						if(recalledNums[stimulusCount] === wmStimuli[stimulusCount].answer) {
							researchScores.recallANL++;
							researchScores.recallPNL++;
							correctANU++;
							correctPNU++;
						}
						else if(recallTargets.includes(recalledNums[stimulusCount])) {
							researchScores.recallPNL++;
							correctPNU++;
						}
						stimulusCount++;
					}
					ANUs.push(correctANU / itemN);
					PNUs.push(correctPNU / itemN);
					correctANU = 0;
					correctPNU = 0;
					recallTargets = [];
				}
				itemN++;
			}
			function average(nums) {
				return nums.reduce((a, b) => a + b) / nums.length;
			}
			researchScores.recallANU = Math.round(average(ANUs) * 1000) / 1000;
			researchScores.recallPNU = Math.round(average(PNUs) *1000) / 1000;
			let userWMRecord = userData.runWMRecord;
			delete userWMRecord.stimuliList;
			userWMRecord.endTime = new Date();
			userWMRecord.duration = userWMRecord.endTime.getTime() - userWMRecord.startTime.getTime();
			userWMRecord.age = calcAge(userData.profile.dob);
			userWMRecord.totalScore = researchScores.judgeCorr + researchScores.recallPNL;
			userWMRecord.correctRTMean = corrRTMean;
			userWMRecord.researchScores = researchScores;
			wmStatsDB.insert(userWMRecord);
			let newWMScore = userData.profile.wm.record, wmAchievements = '', oldAchievements = userData.profile.gaming.achievements;
			let newWMAge = userData.profile.wm.age, newAchievementsN = 0;
			if(userWMRecord.totalScore > newWMScore) {
				newWMScore = userWMRecord.totalScore;
				if(newWMAge !== null) {
					wmAchievements = 'excel';
				}
				else {
					wmAchievements = 'brainanatomy';
				}
				newWMAge = userWMRecord.age;
			}
			else if(userWMRecord < newWMScore) {
				wmAchievements = 'betternexttime';
			}
			if(wmAchievements !== '') {
				let insertNewAchieve = false;
				for(let i=0 ; i<oldAchievements.length ; i++) {
					if(wmAchievements === oldAchievements[i].type) {
						break;
					}
					else if(i === oldAchievements.length-1) {
						insertNewAchieve = true;
						newAchievementsN++;
					}
				}
				if(insertNewAchieve) {
					oldAchievements.unshift({type: wmAchievements, date: new Date()});
				}
			}
			Meteor.users.update({_id: userData._id}, {$unset: {runWMRecord: ''}, $set: {'profile.wm': {record: newWMScore, age: newWMAge}, 'profile.gaming.achievements': oldAchievements}, $inc: {'profile.gaming.newAchieve': newAchievementsN}});
			recordAdminLog('normal', 'completeWMTest', data.clientIP, data.expId, 'wm exp completed', Meteor.user() && Meteor.user().username);
			return {type: 'ok'};
		}
		catch(e) {
			recordAdminLog('warning', 'completeWMTest', data.clientIP, data.expId, 'try and catch error', Meteor.user() && Meteor.user().username);
			return {type: 'error', errMsg: ['vitale']};
		}
	}
	recordAdminLog('warning', 'completeWMTest', data.clientIP, data.expId, 'verification/no wm running record', Meteor.user() && Meteor.user().username);
	return {type: 'error', errMsg: ['vitale']};
};

//--------------Functions used only here in this file ----------------

function processExpBasicSettings (data) {
	let newData = {};
	try {
		newData.title = data.title.trim().replace(/(\s|\t|\n|\r)+/g, ' ');
		newData.keywords = data.keywords.trim().replace(/(\s|\t|\n|\r)+/g, ' ');
		newData.researchers = data.researchers.trim().replace(/(\s|\t|\n|\r)+/g, ' ');
		newData.affiliations = data.affiliations.trim().replace(/(\s|\t|\n|\r)+/g, ' ');
		newData.email = data.email.trim();
		newData.website = data.website.trim().replace(/(\s|\t|\n|\r)+/g, '');
		newData.ethics = data.ethics.trim().replace(/(\s|\t|\n|\r)+/g, ' ');
		newData.subjNum = parseInt(data.subjNum.trim(), 10);
		newData.age = parseInt(data.age.trim(), 10);
		newData.screening = {};
		newData.screening.fastCompletion = data.screening.fastCompletion;
		newData.screening.frequentQuitter = data.screening.frequentQuitter;
		newData.screening.daydreamer = data.screening.daydreamer;
		newData.screening.hacking = data.screening.hacking;
		newData.estTime = {hour: 0, min: 0};
		newData.estTime.hour = parseInt(data.estTime.hour.trim(), 10);
		newData.estTime.min = parseInt(data.estTime.min.trim(), 10);
		newData.gapHour = Number(data.gapHour.trim());
		newData.multiple = data.multiple;
		newData.multipleN = parseInt(data.multipleN.trim(), 10);
		newData.multipleTrain = data.multipleTrain;
	}
	catch(e) {
		return {type: 'error', errMsg: ['vitale']};
	}
	return {type: 'ok', newData: newData};
};

function checkExpBasicSettings (data, type) {
	let errMsg = [];
	
	if(data.title.length === 0) {
		errMsg.push('titleemptye');
	}
	else if(experimentDB.findOne({'basicInfo.title': data.title}) && type === 'create') {
		errMsg.push('titleexiste');
	}
	else if(data.title.length > 50) {
		errMsg.push('titletoolonge');
	}

	if(data.keywords.length === 0) {
		errMsg.push('keywordsemptye');
	}
	else if(data.keywords.length > 100) {
		errMsg.push('keywordstoolonge');
	}
	
	if(data.researchers.length === 0) {
		errMsg.push('researchersemptye');
	}
	else if(data.researchers.length > 200) {
		errMsg.push('researcherstoolonge');
	}

	if(data.affiliations.length === 0) {
		errMsg.push('affiliationsemptye');
	}
	else if(data.affiliations.length > 200) {
		errMsg.push('affiliationstoolonge');
	}

	if(!emailFormat.test(data.email)) {
		errMsg.push('emailformate');
	}
	else if(data.email.length > 100) {
		errMsg.push('emailtoolonge');
	}
	
	if(data.website.length > 0 && !/^(http|https)/.test(data.website)) {
		errMsg.push('websiteformate');
	}
	else if(data.website.length > 100) {
		errMsg.push('websitetoolonge');
	}

	if(data.ethics.length === 0) {
		errMsg.push('ethicsemptye');
	}
	else if(data.ethics.length > 200) {
		errMsg.push('ethicstoolonge');
	}

	if(isNaN(data.gapHour)) {
		errMsg.push('numericale');
	}
	else if(data.gapHour > 336) {
		errMsg.push('toolonggaphoure');
	}

	if(isNaN(data.age)) {
		errMsg.push('numericale');
	}

	if(isNaN(data.subjNum)) {
		errMsg.push('numericale');
	}
	else if(data.subjNum === 0) {
		errMsg.push('nosubje');
	}
	else if(data.subjNum > 1000) {
		errMsg.push('toomanysubje');
	}

	if(typeof data.screening.fastCompletion !== 'boolean' || typeof data.screening.frequentQuitter !== 'boolean' || 
		typeof data.screening.daydreamer !== 'boolean' || typeof data.screening.hacking !== 'boolean') {
		errMsg.push('vitale');
	}

	if(isNaN(data.multipleN)) {
		errMsg.push('numericale');
	}
	else if(data.multipleN > 10) {
		errMsg.push('toomanyparticipatione');
	}

	if(isNaN(data.estTime.hour)) {
		errMsg.push('numericale');
	}
	else if(data.estTime.hour > 10 || data.estTime.hour < 0) {
		errMsg.push('vitale');
	}

	if(isNaN(data.estTime.min)) {
		errMsg.push('numericale');
	}
	else if(data.estTime.min > 59 || data.estTime.min < 0) {
		errMsg.push('vitale');
	}

	if(typeof(data.multiple) !== 'boolean' || typeof(data.multipleTrain) !== 'boolean') {
		errMsg.push('vitale');
	}
	return errMsg;
};

function saveLongTextsInfo (cat, texts, expId) {
	let errMsg = [], wordLimit = 0;
	if(cat === 'orientation') {
		for(let textType in texts) {
			if(errMsg.length === 0) {
				let text = texts[textType];
				if((textType === 'questionnaire' && text.use) || textType !== 'questionnaire') {
					for(let lang in text) {
						if(lang !== 'use' && !langList.includes(lang)) {
							errMsg.push('vitale');
							break;
						}
						else {
							switch(textType) {
								case 'descriptions':
									wordLimit = 1000;
									break;
								case 'consentForms':
									wordLimit = 15000;
									break;
								case 'compensations':
									wordLimit = 1000;
									break;
								case 'questionnaire':
									wordLimit = 500;
									break;
								default:
									wordLimit = 2000;
							}
							if(text[lang].length > wordLimit) {
								errMsg.push('vitale');
								break;
							}
						}
					}
				}
				else if(textType === 'questionnaire' && !text.use) {
					texts.questionnaire = {use: false};
				}
			}
			else {
				break;
			}
		}
	}
	else {
		for(let lang in texts) {
			if(!langList.includes(lang)) {
				errMsg.push('vitale');
				break;
			}
			else {
				if(texts[lang].length > 5000) {
					errMsg.push('vitale');
					break;
				}
			}
		}
	}
	if(errMsg.length > 0) {
		return {type: 'error', errMsg: errMsg};
	}
	else {
		if(cat === 'orientation') {
			experimentDB.update({_id: expId}, {$set: {orientation: texts}}, {$unset: {activateCheck: ''}});
		}
		else {
			experimentDB.update({_id: expId}, {$set: {debriefing: texts}}, {$unset: {activateCheck: ''}});
		}
	}
	let exp = experimentDB.findOne({_id: expId});
	let orient = exp.orientation;
	let longTexts = [orient.descriptions, 
		orient.consentForms, orient.compensations, orient.questionnaire, orient.trainingInstructions, orient.testInstructions, 
		exp.debriefing];
	let availableLang = [];
	for(let i=0 ; i<langList.length ; i++) {
		let lang = langList[i];
		for(let j=0 ; j<longTexts.length ; j++) {
			if((j === 3 && longTexts[3].use) || j !== 3) {
				if(!longTexts[j][lang] || longTexts[j][lang].length === 0) {
					break;
				}
				else if(j === longTexts.length - 1) {
					availableLang.push(lang);
				}
			}
		}
	}
	if(!availableLang.includes('en-us')) {
		availableLang.push('en-us');
	}
	experimentDB.update({_id: expId}, {$set: {availableLang: availableLang}});
	return errMsg;
};

function checkTrainingSettings (settings) {
	let confirmResult = false;
	try {
		if(typeof settings === 'object') {
			if(typeof settings.skip === 'boolean' && typeof settings.random === 'boolean') {
				if(settings.blocks.length <= 10 && typeof settings.stimuli === 'object') {
					if(typeof settings.threshold.apply === 'boolean' && typeof settings.threshold.pass === 'number' &&
						settings.threshold.pass > 0 && settings.threshold.pass <= 100) {
						confirmResult = true;
					}
				}
			}
		}
	}
	catch(e) {}
	return confirmResult;
};

function checkStimuliList (list, conds) {
	let checked = false, goodHeaders = true;
	let allConditions = [];
	try {
		if(list.Block.length > 0 && typeof list.nRows === 'number' &&
			typeof list.nCols === 'number') {
			let headers = [];
			for(let key in list) {
				if(key.match(/StimuliID|Block|Correct|Condition|Session|[A-Za-z]*TextStimuli[A-Za-z]*|[A-Za-z]*AudioURL[A-Za-z]*|[A-Za-z]*VideoURL[A-Za-z]*|[A-Za-z]*ImageURL[A-Za-z]*|Length|PosX|PosY|Delay/g)) {
					headers.push(key);
				}
				else if(!key.match(/nCols|nRows/g)) {
					goodHeaders = false;
					break;
				}
			}
			if(headers.length <= 30 && goodHeaders) {
				let cellOK = true;
				loop1:
				for(let i=0 ; i<headers.length ; i++) {
					let header = headers[i];
					let values = list[header];
					if(values.length < 1 || values.length > 1000) {
						break;
					}
					else {
						for(let j=0 ; j<values.length ; j++) {
							let value = values[j]
							if(typeof value !== 'string' || value.length > 100) {
								cellOK = false;
							}
							if(cellOK) {
								if(header.match(/.*AudioURL.*|.*VideoURL.*|.*ImageURL.*/g) && 
									!value.trim().match(/^https{0,1}:\/\//i)) {
									cellOK = false;
								}
								if(header === 'Length' && 
									(isNaN(value.trim()) || Number(value.trim()) < -1 || Number(value.trim()) > 3600)) {
									cellOK = false;
								}
								if(header === 'Delay' && 
									(isNaN(value.trim()) || Number(value.trim()) < 0 || Number(value.trim()) > 3600)) {
									cellOK = false;
								}
								if(header.match(/PosX|PosY/g) && 
									(isNaN(value.trim()) || Number(value.trim()) < -10000 || Number(value.trim()) > 10000)) {
									cellOK = false;
								}
								if(header === 'Correct') {
									let corrKeys = value.trim().split(',');
									for(let k=0 ; k<corrKeys.length ;k++) {
										if(!corrKeys[k].match(/^space$|^[0-9]$|^[a-z]$|^\[\[.+\]\]$/g)) {
											cellOK = false;
											break;
										}
									}
								}
								if(header === 'Session') {
									value = value.trim().replace(/\s/g, '');
									let sessions = value.split(';');
									for(let k=0 ; k<sessions.length ;k++) {
										if(isNaN(Number(sessions[k]))) {
											cellOK = false;
											break;
										}
									}
								}
								if(header === 'Condition') {
									value = value.trim().replace(/\s/g, '');
									let conds = value.split(';');
									for(let k=0 ; k<conds.length ; k++) {
										if(!allConditions.includes(conds[k])) {
											allConditions.push(conds[k]);
										}
									}
								}
							}
							if(!cellOK) {
								break loop1;
							}
						}
					}
					if(i === headers.length-1) {
						checked = true;
					}
				}
			}
		}
	}
	catch(e) {}
	return {checked: checked, conds: allConditions};
};

function findStimuliListConds (conds) {
	if(conds) {
		let uniqueConds = [];
		for(let i=0 ; i<conds.length ; i++) {
			if(!uniqueConds.includes(conds[i])) {
				uniqueConds.push(conds[i]);
			}
		}
		return uniqueConds;
	}
	return [];
};

function checkBlocks (blocks, type, stimuli) {
	let newBlocks = [], checked = false;
	for(let i=0 ; i<blocks.length ; i++) {
		let block = {
			id: blocks[i].id,
			elements: blocks[i].elements,
			title: blocks[i].title,
			label: blocks[i].label,
			rep: blocks[i].rep,
			random: blocks[i].random
		}
		try {
			if(isNaN(Number(block.id)) || block.elements.length > 10 ||
				typeof block.title !== 'string' || block.title.length > 20 ||
				isNaN(Number(block.rep)) || typeof block.random !== 'boolean') {
				break;
			}
			let ckRes = [true, []];
			if(block.elements.length > 0) {
				ckRes = checkElements(block.elements, type, stimuli, block.id);
			}
			if(ckRes[0]) {
				block.elements = ckRes[1];
			}
			else {
				break;
			}
			newBlocks.push(block);
			if(i === blocks.length-1) {
				checked = true;
			}
		}
		catch(e) {
			break;
		}
	}
	return [checked, newBlocks];
};

function checkElements (ems, type, stimuli, blockId) {
	let checked = false, currentOrder = 0, collectRespNum = 0, randomTestNum = 0;
	let currentOrderTitles = [];
	for(let i = 0; i<ems.length; i++) {
		let em = ems[i], newEm = {};
		try {
			if(!((em.type === 'presentation' || em.type === 'randomTest') && 
				Number(em.id) <= 10 && Number(em.order) <= 10)) {
				break;
			}
			newEm.type = em.type;
			if(em.type === 'randomTest' && (!em.resp.collect || !em.resp.check || em.resp.type !== 'binary')) {
				break;
			}
			else if(newEm.type === 'randomTest') {
				randomTestNum++;
			}
			if(randomTestNum > 1) {
				break;
			}
			newEm.id = em.id;
			newEm.order = em.order;
			newEm.title = em.title.trim().replace(/^[0-9]+|\s|\W/g, '').substring(0, 20);
			if(newEm.title.length <= 0) {
				break;
			}
			if(em.order > currentOrder) {
				currentOrder++;
				currentOrderTitles = [];
				collectRespNum = 0;
			}
			if(currentOrderTitles.includes(newEm.title)) {
				break;
			}
			currentOrderTitles.push(newEm.title);
			if((isNaN(Number(em.pos.x)) && em.pos.x !== '[[PosX]]') ||
				(isNaN(Number(em.pos.y)) && em.pos.y !== '[[PosY]]') ||
				Number(em.pos.x) > 10000 || Number(em.pos.x) < -10000 || 
				Number(em.pos.y) > 10000 || Number(em.pos.y) < -10000) {
				break;
			}
			newEm.pos = {};
			newEm.pos.x = em.pos.x;
			newEm.pos.y = em.pos.y;
			if(!(['text', 'audio', 'video', 'image'].includes(em.stimuli.type))) {
				break;
			}
			newEm.stimuli = {};
			newEm.stimuli.type = em.stimuli.type;
			newEm.stimuli.content = em.stimuli.content.trim().substring(0, 200);
			if(newEm.stimuli.content.includes('[[')) {
				let variable = newEm.stimuli.content.replace(/\[\[/g, '').replace(/\]\]/g, '');
				if(!stimuli[variable]) {
					break;
				}
			}
			if((typeof em.start !== 'string' && typeof Number(em.start) !== 'number') ||
				(isNaN(Number(em.start)) && !em.start.match(/\[\[Delay\]\]|.*AudioURL\]\]|.*VideoURL\]\]/g)) ||
				Number(em.start) < 0 || Number(em.start) > 3600) {
				break;
			}
			if((isNaN(Number(em.length)) && !em.length.match(/AudioURL.*\]\]|VideoURL.*\]\]/g)) || 
					Number(em.length) < -1 || Number(em.length) > 3600) {
				break;
			}
			newEm.start = em.start;
			newEm.length = em.length;
			newEm.resp = {};
			if(em.resp.collect === false) {
				newEm.resp = {
					check: false,
					collect: false,
					correctResp: '',
					feedback: {
						show: false,
						texts: "✓,✗",
						length: 0.5
					},
					keyTexts: 'yes,no',
					keys: 'a,l',
					terminate: true,
					type: 'binary'
				};
			}
			else {
				newEm.resp.collect = true;
				collectRespNum++;
				if(collectRespNum > 1) {
					break;
				}
				let resp = em.resp.type;
				if(!(resp === 'unary' || resp === 'binary' || resp === 'likert')) {
					break;
				}
				newEm.resp.type = resp;
				if(!typeof em.resp.check === 'boolean' || !typeof em.resp.terminate === 'boolean') {
					break;
				}
				newEm.resp.check = em.resp.check;
				newEm.resp.terminate = em.resp.terminate;
				let keyTexts = em.resp.keyTexts.trim().split(','), keys = em.resp.keys.trim().toLowerCase().split(',');
				let keyChecked = true;
				let corrKeys = em.resp.correctResp.split(',');
				for(let j=0 ; j<keys.length ; j++) {
					if(!keys[j].match(/^space$|^[0-9]$|^[a-z]$|^\[\[.+\]\]$/ig)) {
						keyChecked = false;
						break;
					}
				}
				if(em.resp.check && em.type !== 'randomTest') {
					if(corrKeys.length > 1 || corrKeys[0] !== '[[Correct]]') {
						for(let j=0 ; j<corrKeys.length ; j++) {
							if(keys.indexOf(corrKeys[j]) < 0) {
								keyChecked = false;
								break;
							}
						}
					}
					else if(corrKeys[0] === '[[Correct]]') {
						let stimuliCorrCol = stimuli['Correct'];
						let blockIds = stimuli['Block'];
						checkCorrCol:
						for(let j=0 ; j<stimuliCorrCol.length ; j++) {
							if(blockIds[j] === blockId) {
								let corrCell = stimuliCorrCol[j].split(',');
								for(let k=0; k<corrCell.length ; k++) {
									if(keys.indexOf(corrCell[k]) < 0) {
										keyChecked = false;
										break checkCorrCol;
									}
								}
							}
						}
					}
				}
				if(!keyChecked) {
					break;
				}
				else if(resp === 'unary' && !(keyTexts.length === 1 && keys.length === 1)) {
					break;
				}
				else if(resp === 'binary' && !(keyTexts.length === 2 && keys.length === 2)) {
					break;
				}
				else if(resp === 'likert' && !(keyTexts.length >= 3 && keyTexts.length <= 7 && keyTexts.length === keys.length)) {
					break;
				}
				newEm.resp.keyTexts = em.resp.keyTexts.replace(/\s/g, '').trim().substring(0, 50);
				newEm.resp.keys = em.resp.keys.replace(/\s/g, '').trim().toLowerCase().substring(0, 50);
				newEm.resp.correctResp = em.resp.correctResp.replace(/\s/g, '').trim().substring(0, 50);
				newEm.resp.feedback = {};
				if(!typeof em.resp.feedback.show === 'boolean') {
					break;
				}
				newEm.resp.feedback.show = em.resp.feedback.show;
				if(em.resp.feedback.show) {
					let fbtexts = em.resp.feedback.texts.replace(/\s/g, '').trim().substring(0, 50);
					if(fbtexts.split(',').length !== 2) {
						break;
					}
					newEm.resp.feedback.texts = fbtexts;
					if(isNaN(Number(em.resp.feedback.length)) || Number(em.resp.feedback.length) < 0 ||
						Number(em.resp.feedback.length > 1000000)) {
						break;
					}
					newEm.resp.feedback.length = em.resp.feedback.length;
					newEm.resp.terminate = true;
				}
				if(newEm.type === 'randomTest' && type === 'training') {
					newEm.randomTest = {};
					let int = em.randomTest.interval.trim().replace(/\s/g, '').substring(0, 20).split('-');
					if(isNaN(parseInt(int[0]), 10) === 'number' || isNaN(parseInt(int[1]), 10) || parseInt(int[1], 10) <= parseInt(int[0], 10) || parseInt(int[0], 10) < 2) {
						break;
					}
					newEm.randomTest.interval = em.randomTest.interval;
					newEm.randomTest.prompt = em.randomTest.prompt.trim().substring(0, 50);
					if(isNaN(Number(em.randomTest.promptLength)) || Number(em.randomTest.promptLength) <=0) {
						break;
					}
					newEm.randomTest.promptLength = em.randomTest.promptLength;
				}
				else if(type === 'training') {
					newEm.randomTest = {
						interval: '4-7',
						prompt: '',
						promptLength: -1
					};
				}
			}
		}
		catch(e) {
			break;
		}
		ems[i] = newEm;
		if(i === ems.length-1) {
			checked = true;
		}
	}
	return [checked, ems];
};

function timeGapCalc (last, gap) {
	return last.getTime() + Number(gap) * 3600 * 1000 < (new Date()).getTime();
};

function passExcludedExps (excludedExps, participated) {
	for(let i=0 ; i<participated.length ; i++) {
		if(excludedExps.includes(participated[i])) {
			return false;
		}
	}
	return true;
};

function passScreening (criteria, userSideNotes) {
	return (!userSideNotes.fastCompletion.recorded || 
			(userSideNotes.fastCompletion.recorded && !criteria.fastCompletion)) &&
		(!userSideNotes.frequentQuitter.recorded || 
			(userSideNotes.frequentQuitter.recorded && !criteria.frequentQuitter)) &&
		(!userSideNotes.daydreamer.recorded || 
			(userSideNotes.daydreamer.recorded && !criteria.daydreamer));
};

function randomItemSelector (list, unique) {
	let uniqueList = [];
	if(unique) {
		for(let i=0 ; i<list.length ; i++) {
			if(uniqueList.indexOf(list[i]) < 0) {
				uniqueList.push(list[i]);
			}
		}
	}
	else {
		uniqueList = list;
	}
	let rand = Math.random(), randSelect = Math.floor(rand*uniqueList.length);
	return uniqueList[randSelect];
};

function assignCondition (trainingConds, testConds, skipTraining) {
	let trainGroup = '', testGroup = '';
	if(!skipTraining && trainingConds && trainingConds.length > 0) {
		trainGroup = randomItemSelector(trainingConds, true);			
	}
	if(trainGroup !== '' && testConds && testConds.length > 0) {
		testGroup = trainGroup;
	}
	else if(trainGroup === '' && testConds && testConds.length > 0) {
		testGroup = randomItemSelector(testConds, true);
	}
	return [trainGroup, testGroup];
};

function selectStimuli (trainingStimuli, testStimuli, condition, multiple, sessionN) {
	let selectedTrainingStimuli = {}, selectedTestStimuli = {};
	let curSession = multiple && trainingStimuli.Session ? sessionN : 0;
	selectedTrainingStimuli = selectGroupStimuli(condition[0], curSession, trainingStimuli);
	curSession = multiple && testStimuli.Session ? sessionN : 0;
	selectedTestStimuli = selectGroupStimuli(condition[1], curSession, testStimuli);
	return [selectedTrainingStimuli, selectedTestStimuli];
};

function selectGroupStimuli (group, curSession, stimuli) {
	let groupStimuli = {}, blocks = stimuli.Block, conds = stimuli.Condition, sessions = stimuli.Session, excludedCols = ['nCols', 'nRows'];
	let matchGroup = true, matchSession = true;
	for(let key in stimuli) {
		if(excludedCols.indexOf(key) < 0) {
			groupStimuli[key] = [];
		}
	}
	for(let key in stimuli) {
		if(excludedCols.indexOf(key) < 0) {
			let col = stimuli[key];
			for(let i=0 ; i <blocks.length ; i++) {
				if(conds && group !== '') {
					let cellConds = conds[i].replace(/\s/g, '').split(';');
					if(!cellConds.includes(group)) {
						matchGroup = false;
					}
				}
				if(sessions && curSession) {
					let cellSessions = sessions[i].replace(/\s/g, '').split(';');
					if(!cellSessions.includes(String(curSession))) {
						matchSession = false;
					}
				}
				if(matchGroup && matchSession) {
					groupStimuli[key].push(col[i]);
				}
				matchGroup = true;
				matchSession = true;
			}
		}
	}
	return groupStimuli;
};

function selectMediaSample (stimuliList) {
	for(let i=0 ; i<stimuliList.length ; i++) {
		let list = stimuliList[i];
		for(let key in list) {
			if(key.indexOf('AudioURL') > -1 || key.indexOf('VideoURL') > -1) {
				return randomItemSelector(list[key], true);
			}
		}
	}
	return null;
};

function randomMasker (str, num) {
	do {
		let onset = Math.floor(Math.random() * str.length);
		let replacedChar = str.substring(onset, onset + 1);
		if(replacedChar !== '.' && replacedChar !== '*') {
			str = str.substring(0, onset) + '*' + str.substring(onset + 1);
			num--;
		}
	} while(num > 0);
	return str;
};

function expTrialValidator (trials) {
	let checked = false;
	for(let i=0 ; i<trials.length ; i++) {
		let trial = trials[i];
		for(let key in trial) {
			if(!key.match(/stimuliID|trialOrder|trialLength|block|em|emOrder|emType|pressedKey|correctKey|rt|correct/g)) {
				delete trial[key];
			}
			else {
				if(typeof trial.trialOrder !== 'number' ||
					typeof trial.trialLength !== 'number') {
					break;
				}
				if((typeof trial.blockTitle !== 'number' && trial.blockTitle !== 'string') ||
					(typeof trial.emOrder !== 'number' && trial.emOrder !== 'string') ||
					(typeof trial.rt !== 'number' && trial.rt !== 'string')) {
					break;
				}
				if(trial.emType !== 'string' || trial.pressedKey !== 'string' ||
					trial.correctKey !== 'string' || trial.correct !== 'string') {
					break;
				}
				trials[i] = trials;
			}
		}
		if(i === trials.length - 1)
		{
			checked = true;
		}
	}
	if(checked) {
		return trials;
	}
	return null;
};

function calcRespStats (trials, ownerOrCoord) {
	let stats = {
		date: new Date(),
		correctN: 0,
		correctPerc: 0,
		correctRTMean: 0,
		allRTMean: 0,
		respRate: 0,
		achievements: []
	};
	let correct = 0, correctN = 0, correctRTs = 0, allRTs = 0, correctRTN = 0, allRTN = 0, noResp = 0;
	let correctInRow = 0;
	for(let i=0 ; i<trials.length ; i++) {
		let trial = trials[i];
		if(trial.correct.match(/yes|no/g)) {
			correctN++;
			if(trial.correct === 'yes') {
				correct++;
				correctRTs += trial.rt;
				allRTs += trial.rt;
				correctRTN++;
				allRTN++;
				correctInRow++;
			}
			else {
				if(!isNaN(Number(trial.rt))) {
					allRTs += trial.rt;
					allRTN++;
				}
				else {
					noResp++;
				}
				correctInRow = 0;
			}
		}
		if(!ownerOrCoord) {
			if(!isNaN(Number(trial.rt)) && trial.rt <= 50 && !stats.achievements.includes('sleightofhand')) {
				stats.achievements.push('sleightofhand');
			}
			if(correctInRow === 5 && !stats.achievements.includes('chainoffive')) {
				stats.achievements.push('chainoffive');
			}
			else if(correctInRow === 9 && !stats.achievements.includes('cloudnine')) {
				stats.achievements.push('cloudnine');
			}
			else if(correctInRow === 20 && !stats.achievements.includes('miracle')) {
				stats.achievements.push('miracle');
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
	stats.respRate = Math.round((correctN - noResp) * 1000 / correctN) / 10;
	let enoughCorrResp = stats.correct >= 10 && stats.correctPerc >= 50;
	if(stats.respRate <= 50) {
		stats.achievements.push('daydreamer');
	}
	if(stats.allRTMean <= 350 && stats.respRate > 50) {
		stats.achievements.push('fastCompletion');
	}
	if(!ownerOrCoord) {
		if(stats.correctPerc === 50 && enoughCorrResp) {
			stats.achievements.push('yinyang');
		}
		if(stats.correctRTMean < 800 && enoughCorrResp) {
			stats.achievements.push('lightning');
		}
		if(stats.correctRTMean < 1200 && enoughCorrResp) {
			stats.achievements.push('sprinter');
		}
		if(stats.correctRTMean < 1500 && enoughCorrResp) {
			stats.achievements.push('swift');
		}
	}
	return stats;
};

function generateVerifyCode () {
	let verifyCode = '';
	for(let i=0 ; i<10 ; i++) {
		let randomNum = Math.floor(Math.random() * 10);
		verifyCode += randomNum;
	}
	return verifyCode;
};

function activateSBCCheck (curSBC) {
	let trainingConds = curSBC.trainingConds, testConds = curSBC.testConds;
	let trainCondNum = curSBC.trainingConds.length, testCondNum = curSBC.testConds.length;
	let trainingStimuli = curSBC.trainingStimuli, testStimuli = curSBC.testStimuli;
	let errMsg = [];
	let checkSBC = function(list, conds, type) {
		let allBlocks = [];
		for(let i=0 ; i<list.Block.length ; i++) {
			let block = list.Block[i];
			if(!allBlocks.includes(block)) {
				allBlocks.push(block);
			}
		}
		let repN = curSBC.rep ? curSBC.repN : 1, foundSessions = [];
		let repWithSession = curSBC.rep && list.Session;
		loop1:
		for(let i=1 ; i<=repN ; i++) {
			let foundBlocks = [], foundConds = {};
			for(let j=0 ; j<list.Block.length ; j++) {
				let checkBC = true;
				if(repWithSession) {
					let sessions = list.Session[j].split(';');
					if(sessions.includes(String(i)) && !foundSessions.includes(i)) {
						foundSessions.push(i);
					}
					else if(!sessions.includes(String(i))) {
						checkBC = false;
					}
				}
				if(checkBC) {
					let block = list.Block[j];
					if(allBlocks.includes(block) && !foundBlocks.includes(block)) {
						foundBlocks.push(block);
						foundConds[block] = [];
					}
					if(conds.length > 0) {
						let listConds = list.Condition[j].split(';');
						for(let k=0 ; k<listConds.length ; k++) {
							if(!foundConds[block].includes(listConds[k])) {
								foundConds[block].push(listConds[k]);
							}
						}
					}
				}
			}

			if(foundBlocks.length !== allBlocks.length) {
				if(errMsg.length === 0) {
					errMsg.push({type: type + 'sessionnoblocke', note: ''});
				}
				for(let j=0 ; j<errMsg.length ; j++) {
					if(errMsg[j].type === type + 'sessionnoblocke') {
						break;
					}
					else if(j === errMsg.length - 1) {
						errMsg.push({type: type + 'sessionnoblocke', note: ''});
					}
				}
			}
			for(let key in foundConds) {
				if(foundConds[key].length !== conds.length) {
					if(errMsg.length === 0) {
						errMsg.push({type: type + 'blocknoconde', note: ''});
					}
					for(let j=0 ; j<errMsg.length ; j++) {
						if(errMsg[j].type === type + 'blocknoconde') {
							break;
						}
						else if(j === errMsg.length - 1) {
							errMsg.push({type: type + 'blocknoconde', note: ''});
						}
					}
					break;
				}
			}
		}

		if(curSBC.rep && list.Session && foundSessions.length !== repN) {
			errMsg.push({type: type + 'sessionmismatche', note: ''});
		}
		return;
	};

	if(trainCondNum !== testCondNum && trainCondNum > 0 && testCondNum > 0) {
		errMsg.push({type: 'condmistmatche', note: ''});
	}
	else if(trainCondNum > 0 && testCondNum > 0) {
		let foundConds = [];
		for(let i=0 ; i<trainCondNum ; i++) {
			if(!testConds.includes(trainingConds[i])) {
				errMsg.push({type: 'condmistmatche', note: ''});
				break;
			}
			else {
				foundConds.push(trainingConds[i]);
			}
		}
		if(foundConds.length !== trainCondNum) {
			errMsg.push({type: 'condmistmatche', note: ''});
		}
	}

	let syncEnd;
	if(trainCondNum > 0) {
		syncEnd = checkSBC(trainingStimuli, trainingConds, 'training');
	}

	syncEnd = checkSBC(testStimuli, testConds, 'test');

	return errMsg;
};

function activateSessionCheck (repWithTraining, repN, lists, conds) {
	let start = repWithTraining ? 0 : 1, foundSessions = [], foundConds = [], errMsg = [];
	for(let i=start ; i<lists.length ; i++) {
		let listSessions = lists[i].Session;
		if(listSessions) {
			let listConds = list[i].Condition;
			let savedConds = conds[i];
			for(let j=1 ; j<=repN ; j++) {
				for(let k=0 ; k<listSessions.length ; k++) {
					if(Number(listSessions[k]) > repN) {
						if(start === 0) {
							errMsg.push('trainingunusedsessione');
						}
						else {
							errMsg.push('testunusedsessione');
						}
					}
					if(!foundSessions.includes(listSessions[k])) {
						foundSessions.push(listSessions[k])
					}
				}
				foundSessions = [];
				foundConds = [];
			}
		}
	}
	return errMsg;
};

async function activateURLCheck (list) {
	let results = [], allKeys = Object.keys(list), allTestURLs = [];
	for(let i=0 ; i<allKeys.length ; i++) {
		let key = allKeys[i];
		if(key.match(/AudioURL|VideoURL|ImageURL/g)) {
			let urls = list[key];
			for(let j=0 ; j<urls.length ; j++) {
				let url = urls[j];
				if(url.match(/^https{0,1}\:\/\//i)) {
					allTestURLs.push(url);
				}
			}
		}
	}
	async function testURL(target) {
		return fetch(target, {method: 'HEAD', mode: 'no-cors'}).then((resp)=>{
			return resp;
		});
	};
	for(let i=0 ; i<allTestURLs.length ; i++) {
		let url = allTestURLs[i];
		let testResp = await testURL(url);
		if(!testResp.ok && testResp.type !== 'opaque') {
			results.push({type: 'badurls', note: url});
		}
	}
	return results;
};

function activateConfigCheck (blocks, stimuliList, type) {
	let checkCorrect = false, msgs = [];
	// Check if block settings are OK.
	if(blocks.length === 0) {
		msgs.push({type: 'no' + type + 'blockacte', note: ''});
	}
	// Check if ems settings are OK
	for(let i=0 ; i<blocks.length ; i++) {
		let block = blocks[i];
		let ems = block.elements;
		if(ems.length === 0) {
			msgs.push({type: 'noelementacte', note: type + '/' + block.title});
		}
		let collectResp = false, emOrder = 0, infiniteDur = false;
		for(let j=0 ; j<ems.length ; j++) {
			let em = ems[j];
			if(em.order > emOrder) {
				emOrder = em.order;
				// If the order is to be update, but there's an infinite length with no response collection...
				if(infiniteDur && !collectResp) {
					msgs.push({type: 'infinitelene', note: type + '/' + block.title + '/' + em.order});
				}
				infiniteDur = false;
				collectResp = false;
			}
			if(!collectResp) {
				collectResp = em.resp.collect;
			}
			for(let key in em) {
				// Check if a column that is being referred to is included inside stimuli list
				if(typeof key === 'string' && key.match(/\[\[.+\]\]/)) {
					let colName = key.replace(/\[\[/g).replace(/\]\]/g);
					if(!stimuliList[colName]) {
						msgs.push({type: 'nosuchvariableacte', note: type + '/' + colName + '/' + em.title});
					}
				}
				// Check if responses are collected n the same element order when length is set to -1
				else if(key === 'length' && em.length === -1 && em.stimuli.type === 'text' && !infiniteDur) {
					infiniteDur = true;
				}
			}
			if(em.resp.check) {
				checkCorrect = true;
			}
		}
	}
	return {checkCorrect: checkCorrect, msgs: msgs};
};

function achievementsCheck (userId, specific) {
	let newAchievements = [];
	let userData = Meteor.users.findOne({_id: userId});
	if(userData) {
		let gameData = userData.profile.gaming, oldAchievements = [];
		for(let i=0 ; i<gameData.achievements.length ; i++) {
			let achievement = gameData.achievements[i];
			oldAchievements.push(achievement.type);
		}
		if(gameData.session.nums === 1 && !oldAchievements.includes('firsttry')) {
			newAchievements.push({type: 'firsttry', date: new Date()});
		}
		if(gameData.session.nums === 10 && !oldAchievements.includes('warmingup')) {
			newAchievements.push({type: 'warmingup', date: new Date()});
		}
		if(gameData.session.nums === 50 && !oldAchievements.includes('keepitup')) {
			newAchievements.push({type: 'keepitup', date: new Date()});
		}
		if(gameData.repeatedSession.nums > 1 && !oldAchievements.includes('dejavu')) {
			newAchievements.push({type: 'dejavu', date: new Date()});
		}
		if(gameData.repeatedSession.nums === 20 && !oldAchievements.includes('infiniteloop')) {
			newAchievements.push({type: 'infiniteloop', date: new Date()});
		}
		if(gameData.oldSession.nums === 1 && !oldAchievements.includes('homecoming')) {
			newAchievements.push({type: 'homecoming', date: new Date()});
		}
		if(gameData.oldSession.nums === 10 && !oldAchievements.includes('explorer')) {
			newAchievements.push({type: 'explorer', date: new Date()});
		}
		if(gameData.oldSession.nums === 20 && !oldAchievements.includes('homesick')) {
			newAchievements.push({type: 'homesick', date: new Date()});
		}
		if(gameData.oldSession.nums === 50 && !oldAchievements.includes('deeplyrooted')) {
			newAchievements.push({type: 'deeplyrooted', date: new Date()});
		}
		if(gameData.session.nums === 100 && !oldAchievements.includes('veteran')) {
			newAchievements.push({type: 'veteran', date: new Date()});
		}
		if(gameData.correctRespN.nums >= 100 && !oldAchievements.includes('toddler')) {
			newAchievements.push({type: 'toddler', date: new Date()});
		}
		if(gameData.correctRespN.nums >= 500 && !oldAchievements.includes('monument')) {
			newAchievements.push({type: 'monument', date: new Date()});
		}
		if(gameData.correctRespN.nums >= 2000 && !oldAchievements.includes('tothemoon')) {
			newAchievements.push({type: 'tothemoon', date: new Date()});
		}
		if(gameData.correctRespN.nums >= 10000 && !oldAchievements.includes('beyondus')) {
			newAchievements.push({type: 'beyondus', date: new Date()});
		}
		if(typeof specific === 'string' && !oldAchievements.includes(specific)) {
			newAchievements.push({type: specific, date: new Date()});
		}
		else if(typeof specific === 'object') {
			for(let i=0 ; i<specific.length ; i++) {
				if(!oldAchievements.includes(specific[i])) {
					newAchievements.push({type: specific[i], date: new Date()});
				}
			}
		}
		let lastTenStats = expStatsDB.find({userId: userData._id}, {sort: {date: -1}, limit: 10}).fetch();
		if(lastTenStats.length >= 2) {
			let dateOne = lastTenStats[0].date, dateTwo = lastTenStats[1].date;
			let interval = dateOne.getTime() - dateTwo.getTime();
			if(interval >= 7 * 24 * 3600 * 1000 && !oldAchievements.includes('lostandfound')) {
				newAchievements.push({type: 'lostandfound', date: new Date()});
			}
		}
		if(lastTenStats.length === 10) {
			let allIntervals = 0;
			for(let i=0 ; i<lastTenStats.length-1 ; i++) {
				let dateOne = lastTenStats[i].date, dateTwo = lastTenStats[i+1].date;
				allIntervals += dateOne.getTime() - dateTwo.getTime();
			}
			if(allIntervals / 10 / (3600 * 1000) <= 24 && !oldAchievements.includes('habitue')) {
				newAchievements.push({type: 'habitue', date: new Date()});
			}
		}
		let newNum = newAchievements.length + 0;
		Meteor.users.update({_id: userId}, {$set: {'profile.gaming.achievements': newAchievements.concat(gameData.achievements), 'profile.gaming.newAchieve': newNum}});
		return newAchievements;
	}
	return [];
};

function recordActivityLog (userId, exp, type) {
	let coordinators = exp.coordinators, audienceId = [];
	Meteor.users.find({username: {$in: coordinators}}).forEach((coordinator)=>{
		if(coordinator._id !== userId) {
			audienceId.push(coordinator._id);
		}
	});
	if(userId !== exp.user) {
		audienceId.push(exp.user);
	}
	activityLogDB.insert(
		{
			audience: audienceId,
			type: type,
			expTitle: exp.basicInfo.title,
			user: Meteor.user().username,
			date: new Date()
		}
	);
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

function calcAge (dob) {
	let dobTime = new Date(dob), currentTime = new Date();
	if(dobTime.getMonth() < currentTime.getMonth() ||
		(dobTime.getMonth() === currentTime.getMonth() &&
		dobTime.getDate() <= currentTime.getDate())
		) {
		return currentTime.getFullYear() - dobTime.getFullYear();
	}
	return currentTime.getFullYear() - dobTime.getFullYear() - 1;
};

function assembleExpResults (expId, zipTemp, getSign = true) {
	let allData = expResultsDB.find({expId: expId}).fetch();
	if(allData.length > 0) {
		let subjectProfile = 'UserId\tSessionN\tExpLang\tGender\tHandedness\tAge\tL1\tL2\tExpParticipateN\tScreenX(px)\tScreenY(px)\tCondition\tExpTitle\tIPAddress\tStartTime\tEndTime\ttotalTime(ms)\tCustomQuestion\tWMTrialN\tWMTrialGroupN\tWMJudgeCorr\tWMRecallANL\tWMRecallPNL\tWMRecallANU\tWMRecallPNU\tWMAge\tWithdrawDate\n';
		let informedConsents = 'Signature\tDate\n', signatures = [], signDates = [];
		for(let i=0 ; i<allData.length ; i++) {
			let eachData = allData[i];
			if(eachData.withdrawDate) {
				subjectProfile += eachData.participantId + '\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\tna\t' + eachData.withdrawDate + '\n';
			}
			else {
				let user = Meteor.users.findOne({_id: eachData.realUserId});
				let sDate = eachData.startTime;
				signatures.push(eachData.signature);
				signDates.push(sDate.getFullYear() + '-' + (sDate.getMonth() + 1) + '-' + sDate.getDate());
				subjectProfile += eachData.participantId + '\t';
				subjectProfile += eachData.sessionN + '\t';
				subjectProfile += eachData.expLang + '\t';
				subjectProfile += eachData.profile.gender + '\t';
				subjectProfile += eachData.profile.handedness + '\t';
				subjectProfile += eachData.profile.age + '\t';
				subjectProfile += eachData.profile.L1 + '\t';
				subjectProfile += eachData.profile.L2 + '\t';
				subjectProfile += eachData.profile.participatedExpNum + '\t';
				subjectProfile += eachData.profile.screenX + '\t';
				subjectProfile += eachData.profile.screenY + '\t';
				subjectProfile += eachData.condition + '\t';
				subjectProfile += eachData.expTitle + '\t';
				subjectProfile += eachData.ipAddress + '\t';
				subjectProfile += sDate + '\t';
				subjectProfile += eachData.endTime + '\t';
				subjectProfile += eachData.endTime - eachData.startTime + '\t';
				subjectProfile += eachData.profile.questionnaire + '\t';
				let wmData = wmStatsDB.findOne({userId: eachData.realUserId}, {sort: {endTime: -1}});
				if(wmData && wmData.researchScores) {
					let researchScores = wmData.researchScores;
					subjectProfile += researchScores.trials + '\t';
					subjectProfile += researchScores.groups + '\t';
					subjectProfile += researchScores.judgeCorr + '\t';
					subjectProfile += researchScores.recallANL + '\t';
					subjectProfile += researchScores.recallPNL + '\t'; 
					subjectProfile += researchScores.recallANU + '\t';
					subjectProfile += researchScores.recallPNU + '\t';
					subjectProfile += wmData.age + '\tna\n';
				}
				else {
					subjectProfile += 'na\tna\tna\tna\tna\tna\tna\tna\tna\n';
				}
				let resultHeaders = 'UserId\tStage\tSessionN\tStimuliID\tTrialOrder\tComponentLength\tBlock\tElement\tElementOrder\tElementType\tPressedKey\tCorrectKey\tRT\tCorrect\n';
				let training = eachData.trainingResults;
				if(training) {
					let trainingData = '';
					for(let j=0 ; j<training.length ; j++) {
						let trial = training[j];
						trainingData += eachData.participantId + '\t';
						trainingData += 'training\t';
						trainingData += eachData.sessionN + '\t';
						trainingData += trial.stimuliID + '\t';
						trainingData += trial.trialOrder + '\t';
						trainingData += trial.trialLength + '\t';
						trainingData += trial.block + '\t';
						trainingData += trial.em + '\t';
						trainingData += trial.emOrder + '\t';
						trainingData += trial.emType + '\t';
						trainingData += trial.pressedKey + '\t';
						trainingData += trial.correctKey + '\t';
						trainingData += trial.rt + '\t';
						trainingData += trial.correct + '\n';
					}
					zipTemp.file(i + '_training.csv', '\uFEFF' + resultHeaders + trainingData);
				}
				let test = eachData.testResults;
				if(test) {
					let testData = '';
					for(let j=0 ; j<test.length ; j++) {
						let trial = test[j];
						testData += eachData.participantId + '\t';
						testData += 'test\t';
						testData += eachData.sessionN + '\t';
						testData += trial.stimuliID + '\t';
						testData += trial.trialOrder + '\t';
						testData += trial.trialLength + '\t';
						testData += trial.block + '\t';
						testData += trial.em + '\t';
						testData += trial.emOrder + '\t';
						testData += trial.emType + '\t';
						testData += trial.pressedKey + '\t';
						testData += trial.correctKey + '\t';
						testData += trial.rt + '\t';
						testData += trial.correct + '\n';
					}
					zipTemp.file(i + '_test.csv', '\uFEFF' + resultHeaders + testData);
				}
			}
		}
		zipTemp.file('participantInfo.csv', '\uFEFF' + subjectProfile);
		if(getSign) {
			do {
				let index = Math.floor(Math.random() * signatures.length);
				informedConsents += signatures[index] + '\t' + signDates[index] + '\n';
				signatures.splice(index, 1);
				signDates.splice(index, 1);
			}
			while(signatures.length > 0);
			zipTemp.file('informedConsents.csv', '\uFEFF' + informedConsents);
		}
		return zipTemp;
	}
	throw new Meteor.Error('noResults');
};

function assembleEmSettings (em) {
	let emSettings = '';
	emSettings += '****** Element: ' + em.title + ' ******\n';
	emSettings += 'Order: ' + em.order + '\n';
	emSettings += 'Type: ' + em.type + '\n';
	emSettings += 'Start: ' + em.start + ' (s)\n';
	emSettings += 'Length: ' + em.length + ' (s)\n';
	emSettings += 'Stimuli Type: ' + em.stimuli.type + '\n';
	emSettings += 'Stimuli: ' + em.stimuli.content + '\n';
	emSettings += 'PosX: ' + em.pos.x + '\n';
	emSettings += 'PosY: ' + em.pos.y + '\n';
	emSettings += 'Collect Response: ' + em.resp.collect + '\n';
	if(em.resp.collect) {
		emSettings += 'Response Type: ' + em.resp.type + '\n';
		emSettings += 'Check Response Accuracy: ' + em.resp.check + '\n';
		if(em.resp.check) {
			emSettings += 'Response Key Prompt: ' + em.resp.keyTexts + '\n';
			emSettings += 'Response Keys: ' + em.resp.keys + '\n';
			emSettings += 'Correct Response: ' + em.resp.correctResp + '\n';
			emSettings += 'Show Response Feedback: ' + em.resp.feedback.show + '\n';
			if(em.resp.feedback.show) {
				emSettings += 'Feedback Texts: ' + em.resp.feedback.texts + ' (Correct, Incorrect)\n';
				emSettings += 'Feedback Length: ' + em.resp.feedback.length + ' (s)\n';
			}
		}
	}
	return emSettings;
};

function cleanRespsFields (respsStats) {
	delete respsStats.achievements;
	delete respsStats.expId;
	delete respsStats.userId;
	delete respsStats.realUsername;
	delete respsStats.expTitle;
	delete respsStats.sessionN;
	delete respsStats.verifyCode;
	delete respsStats.consent;
	delete respsStats.compensation;
	delete respsStats.contact;
	return respsStats;
};