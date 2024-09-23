import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

import Styling from '../styling/stylingFuncs.js';
import Tools from '../lib/commonTools.js';

import './menus.js';
import '../../template/experimenter/menus.html';
import '../../template/experimenter/checkExpSettings.html';

let expErTexts = new ReactiveVar(null), interfaceL = new ReactiveVar(null), failList = new ReactiveVar([]);
let exp = new ReactiveVar(null), testing = new ReactiveVar(true), noTestErrors = new ReactiveVar(false);

Tracker.autorun(()=>{
	exp.set(experimentDB.findOne({_id: Session.get('expId')}));
});

Template.checkExpSettings.onRendered(()=>{
	expErTexts.set(translationDB.findOne({docType: 'experimenter'}));
	interfaceL.set(translationDB.findOne({docType: 'general'}));
	exp.set(experimentDB.findOne({_id: Session.get('expId')}));
	Meteor.callAsync('funcEntryWindow', 'exp', 'activateCheck', {expId: Session.get('expId'), testRun: true}).then().catch((err)=>{
		if(typeof err.error === 'string') {
			Styling.showWarning(err.error);
		}
	});
});

Template.checkExpSettings.helpers({
	expTitle () {
		return exp.get() && exp.get().basicInfo.title;
	},
	expTranslation (col) {
		return expErTexts.get() && expErTexts.get()[col];
	},
	genTranslation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	},
	noTestErrors () {
		let expData = exp.get();
		return expData && expData.activateCheck && expData.activateCheck.pass;
	},
	preview() {
		return Session.equals('expType', 'preview');
	},
	testing () {
		let expData = exp.get();
		return expData && expData.activateCheck && !expData.activateCheck.done;
	},
	failList () {
		let expData = exp.get();
		if(expData && expData.activateCheck && !expData.activateCheck.pass) {
			return expData.activateCheck.failList;
		}
		return [];
	}
});

Template.checkExpSettings.events({
	'touchend #backToConfig, click #backToConfig' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Session.set('expType', '');
			FlowRouter.go('configExp', {subpage: 'basicInfo', expid: Session.get('expId')});
		}
	},
	'touchend #confirmActivateExp, click #confirmActivateExp' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			Styling.showWarning('activating', 'experimenter');
			Meteor.callAsync('funcEntryWindow', 'exp', 'activateCheck', 
				{expId: Session.get('expId'), testRun: false}).then(()=>{
					Styling.showWarning('activated', 'experimenter');
					Session.set('expId', '');
					FlowRouter.go('userhome', {subpage: 'dashboard'});
				}).catch((err)=>{
					if(typeof err.error === 'string') {
						Styling.showWarning(err.error);
					}
				});
		}
	},
	'touchend #startPreview, click #startPreview' (event) {
		Tools.runExp();
	}
});

Template.checkExpSettings.onDestroyed(()=>{
	expErTexts.set(null);
	interfaceL.set(null);
	failList.set([]);
	exp.set(null);
	testing.set(true);
	noTestErrors.set(false);
});