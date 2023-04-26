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
		if(field === 'state') {
			let status = expData.get() && expData.get().status[field];
			return expErTexts.get() && expErTexts.get()[status];
		}
		return expData.get() && expData.get().status[field];
	},
	isOwner () {
		return Meteor.user() && expData.get() && expData.get().userAccount === Meteor.user().username;
	},
	isExperimenter () {
		return Meteor.user() && Meteor.user().emails[0].verified && Session.equals('userCat', 'experimenter') && expData.get() && expData.get().userAccount !== Meteor.user().username;
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
		return expErTexts.get() && expErTexts.get()[col];
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
		Meteor.call('funcEntryWindow', 'exp', 'downloadCompleteExpResults', {expId: Session.get('expId')}, (err, res)=>{
			if(err) {
				Styling.showWarning(err.error, 'experimenter');
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
	'touchend #goToBasicSettings, click #goToBasicSettings' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('browseSession', 'configExp');
			FlowRouter.go('configExp', {subpage: 'basicInfo', expid: Session.get('expId')});
		}
	},
	'click #updateCompleteExpInfo' () {
		let newExpInfo = $('#completeExpInfo').val().trim();
		Meteor.call('funcEntryWindow', 'exp', 'updateCompleteExpInfo', {expId: Session.get('expId'), newInfo: newExpInfo}, (err, res)=>{
			if(err) {
				Styling.showWarning(err.error, 'experimenter');
			}
			else {
				Styling_configExp.showWarning('updatecomplete');
			}
		});
	}
});