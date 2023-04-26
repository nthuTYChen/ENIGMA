import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import './menus.js';
import '../../template/experimenter/menus.html';
import '../../template/experimenter/manageExp.html';

let expErTexts = new ReactiveVar(null);

Tracker.autorun(()=>{
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
});

Template.manageExp.onCreated(()=>{
	Session.set('browseSession', 'manageExp');
	Session.set('expId', '');
});

Template.manageExp.helpers({
	allExp () {
		return Meteor.user() && Meteor.user().profile.exp.allExp;
	},
	allExpQuota () {
		return Meteor.user() && Meteor.user().profile.exp.allExpQuota;
	},
	allRunningExp () {
		return experimentDB.find({'status.state': 'active', coordinators: {$nin: [Meteor.user().username]}});
	},
	allInactiveExp () {
		return experimentDB.find({'status.state': 'inactive', coordinators: {$nin: [Meteor.user().username]}});
	},
	allCompletedExp () {
		return experimentDB.find({'status.state': 'complete', coordinators: {$nin: [Meteor.user().username]}});
	},
	allCoordinateExp () {
		return experimentDB.find({coordinators: Meteor.user().username});
	},
	runningExpQuota () {
		return Meteor.user() && Meteor.user().profile.exp.runningExpQuota;
	},
	runningExps () {
		return Meteor.user() && Meteor.user().profile.exp.runningExp;
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	}
});

Template.manageExp.events({
	'click #createExp' (event) {
		Tools.stopPropDefault(event);
		if(Meteor.user().profile.exp.allExp < 30) {
			FlowRouter.go('userhome', {subpage: 'createExp'});
		}
		else {
			Styling.showWarning('expquotafull', 'experimenter');
		}
	},
	'touchend a, click a' (event) {
		if(Tools.swipeCheck(event)) {
			let target = event.target.id;
			$('.' + target.replace(/hide|show/, '')).slideToggle(500);
			$('#'+target).hide();
			if(target.includes('hide')) {
				target = target.replace('hide', 'show');
			}
			else {
				target = target.replace('show', 'hide');
			}
			$('#'+target).show();
		}
	},
	'touchend .expGrid, click .expGrid' (event) {
		if(Tools.swipeCheck(event)) {
			let target = event.target.id, targetClass = event.target.className;
			if(target !== 'createExp') {
				if(targetClass.indexOf('Completed') > -1) {
					FlowRouter.go('completeExpInfo', {expid: target});
				}
				else {
					Session.set('browseSession', 'configExp');
					Session.set('expId', target);
					FlowRouter.go('configExp', {subpage: 'basicInfo', expid: target});
				}
			}
		}
	}
});

Template.createExp.helpers({
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	}
});

Template.createExp.events({
	'click #createExpIns' (event) {
		Tools.stopPropDefault(event);
		Tools.getAndShowInstruction('createExp');
	},
	'click #closeInstruction' (event) {
		Tools.stopPropDefault(event);
		Tools.closeInstruction();
	},
	'click #createExpSubmit' (event) {
		Tools.stopPropDefault(event);
		if(!$('form')[0].checkValidity()) {
			Styling.showWarning('formvalide');
		}
		else {
			let newExp;
			newExp = {
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
			Meteor.call('funcEntryWindow', 'exp', 'createExp', newExp, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server', 'experimenter');
				}
				else {
					Styling.showWarning('createnewexpok', 'experimenter');
					FlowRouter.go('userhome', {subpage: 'manageExp'});
				}
			});
		}
	},
	'click #cancelCreateExp' (event) {
		Tools.stopPropDefault(event);
		FlowRouter.go('userhome', {subpage: 'manageExp'});
	}
});

var expData = null;

Template.deleteExp.onCreated(()=>{
	let currentExpId = FlowRouter.getParam('expid');
	expData = experimentDB.findOne({_id: currentExpId});
});

Template.deleteExp.helpers({
	expTitle () {
		return expData && expData.basicInfo.title;
	},
	translation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	}
});

Template.deleteExp.events({
	'touchend #proceedDelete, click #proceedDelete' (event) {
		if(Tools.swipeCheck(event)) {
			Styling.showWarning('deleting', 'experimenter');
			Meteor.call('funcEntryWindow', 'exp', 'deleteExp', {expId: expData._id}, (err, result)=>{
				if(err) {
					Tools.callErrorHandler(err, 'server');
				}
				else {
					Styling.showWarning('expdeleted', 'experimenter');
					FlowRouter.go('userhome', {subpage: 'manageExp'});
				}
			});
		}
	},
	'touchend #cancelDelete, click #cancelDelete' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('configExp', {subpage: 'basicInfo', expid: expData._id});
		}
	}
});