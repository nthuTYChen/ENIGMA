import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Styling_configExp from '../styling/stylingFuncs_configExp.js';
import Tools from '../lib/commonTools.js';

import '../menus.js';
import '../../template/experimenter/completeExp.html';

var expData = new ReactiveVar(null), lang = new ReactiveVar('en-us');
let expErTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	let currentExpId = FlowRouter.getParam('expid');
	expData.set(experimentDB.findOne({_id: currentExpId}));
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
});

Template.completeExpInfo.helpers({
	completeExpInfoNum () {
		return expData.get() && expData.get().completeExpInfo.length;
	},
	expBasicInfo (field) {
		return expData.get() && expData.get().basicInfo[field];
	},
	expGenInfo (field) {
		return expData.get() && expData.get()[field];
	},
	expStatusInfo (field) {
		// Updated: 2024/7/25
		let exp = expData.get();
		if(field === 'state') {
			let status = exp && exp.status[field];
			return expErTexts.get() && expErTexts.get()[status];
		}
		return exp && exp.status[field];
	},
	isOwner () {
		let user = Meteor.user();
		return user && expData.get() && expData.get().userAccount === user.username;
	},
	isExperimenter () {
		let user = Meteor.user();
		return user && user.emails[0].verified && Session.equals('userCat', 'experimenter') && expData.get() && expData.get().userAccount !== user.username;
	},
	notOwnerReadonly () {
		if(!Meteor.userId() || (expData.get() && expData.get().userAccount !== Meteor.user().username)) {
			return 'readonly';
		}
		return;
	},
	resultLink () {
		return domainURL + urlRootPath + 'completeExpInfo/' + Session.get('expId');
	},
	translation (col) {
		let texts = expErTexts.get();
		return texts && texts[col];
	}
});

Template.completeExpInfo.events({
	'touchend #completeExpInfoIns, click #completeExpInfoIns' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.getAndShowInstruction('completeExpInfo');
		}
	},
	'touchend #closeInstruction, click #closeInstruction' (event) {
		if(Tools.swipeCheck(event)) {
			Tools.closeInstruction();
		}
	},
	'click #downloadExp' () {
		Styling_configExp.showWarning('downloading');
		Meteor.callAsync('funcEntryWindow', 'exp', 'downloadCompleteExpResults', {expId: Session.get('expId')}).then((res)=>{
			let windowRef = window.open();
			let dir = 'Files/';
			if(urlRootPath === 'enigmaDemo/') {
				dir = 'enigmaDemo' + dir;
			}
			else {
				dir = 'enigma' + dir;
			}
			windowRef.location = domainURL + dir + res.msg;
		}).catch((err)=>{
			Styling.showWarning(err.error, 'experimenter');
		});
	},
	'touchend #goToBasicSettings, click #goToBasicSettings' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('browseSession', 'configExp');
			FlowRouter.go('configExp', {subpage: 'basicInfo', expid: Session.get('expId')});
		}
	},
	'click #updateCompleteExpInfo' () {
		let newExpInfo = $('#completeExpInfo').val().trim();
		Meteor.callAsync('funcEntryWindow', 'exp', 'updateCompleteExpInfo', 
			{expId: Session.get('expId'), newInfo: newExpInfo}).then(()=>{
				Styling_configExp.showWarning('updatecomplete');
			}).catch((err)=>{
				Styling.showWarning(err.error, 'experimenter');
			});
	}
});