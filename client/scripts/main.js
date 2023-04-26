import { fetch } from 'meteor/fetch';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { saveAs } from 'file-saver';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import Styling from './styling/stylingFuncs.js';
import Tools from './lib/commonTools.js';

import './lib/globalVar.js';
import './lib/globalSession.js';
import './routing.js';
import './styling/jquery.color-2.1.2.min.js';
import '../main.html';

let interfaceL = new ReactiveVar(null), expTexts = new ReactiveVar(null);
let currentMenu = '';

Tracker.autorun(()=>{
	Meteor.subscribe('allLangList', Session.get('userLang'), Session.get('browseSession'));
	Meteor.subscribe('userData', Meteor.userId());
	Meteor.subscribe('experimentDB', Session.get('browseSession'), Meteor.userId(), Session.get('expId'));
	Meteor.subscribe('expResultsDB', Session.get('browseSession'), Meteor.userId(), Session.get('expId'));
	Meteor.subscribe('expStatsDB', Session.get('browseSession'), Meteor.userId());
	Meteor.subscribe('wmStatsDB', Session.get('browseSession'), Meteor.userId());
	Meteor.subscribe('siteStatsDB');
	Meteor.subscribe('activityLogDB', Session.get('browseSession'), Meteor.userId(), Session.get('experimenterLogOnset'));
	Meteor.subscribe('translationDB', Session.get('browseSession'), Session.get('userLang'));
	Meteor.subscribe('languageFactsDB', Session.get('browseSession'), Session.get('userLang'));
	if(Meteor.user()) {
		Session.set('userLang', Meteor.user().profile.userLang);
		Session.set('userCat', Meteor.user().profile.userCat);
		Session.set('rememberMe', Meteor.user().profile.rememberMe);
		if(FlowRouter.getRouteName() === 'entrance') {
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
	}
	interfaceL.set(translationDB.findOne({docType: 'general'}));
	expTexts.set(translationDB.findOne({docType: 'experiment'}));
});

Template.loading.onDestroyed(()=>{
	Styling.animateBackground('body', 'black', 500);
});

Template.body.onRendered(()=>{
	Tools.initiateSwipeCheck();
	$('html').attr('lang', 'en-us');
	Styling.animateBackground('body', 'black', 500);
});

Template.expLayout.onRendered(()=>{
	Session.set('browseSession', 'runExp');
});

Template.expLayout.helpers({
	preview () {
		return Session.equals('expType', 'preview');
	},
	runWMExp () {
		return Session.equals('browseSession', 'runWMExp');
	},
	siteTitle () {
		return interfaceL.get() && interfaceL.get().siteTitle;
	},
	translation (col) {
		return expTexts.get() && expTexts.get()[col];
	}
});

Template.expLayout.events({
	'touchend #endPreview, click #endPreview' () {
		Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: Session.get('expId')});
		Session.set('browseSession', 'configExp');
		FlowRouter.go('configExp', {subpage: 'basicInfo', expid: Session.get('expId')});
	},
	'touchend #endTest, click #endTest' () {
		Session.set('browseSession', 'userhome');
		FlowRouter.go('userhome', {subpage: 'dashboard'});
	},
	'touchend #quitExp, click #quitExp' () {
		Session.set('browseSession', 'userhome');
		Session.set('userCat', '');
		Session.set('expType', '');
		Session.set('expSession', '');
		Session.set('demoExpRes', '');
		if(!Meteor.userId()) {
			FlowRouter.go('home');
		}
		else {
			Meteor.call('funcEntryWindow', 'exp', 'expRecordCleaner', {expId: Session.get('expId')});
			FlowRouter.go('userhome', {subpage: 'dashboard'});
		}
		Session.set('expId', '');
	},
	'touchend #closeInstruction, click #closeInstruction, touchend #acceptAgreement, click #acceptAgreement' (event) {
		if(Tools.swipeCheck(event, false, false)) {
			$('#instructionContainer').hide().html('');
		}
	}
});

Template.expLayout.onDestroyed(()=>{
	Session.set('expSession', '');
});

Template.langChoose.events({
	'touchend a, click a' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('userLang', event.currentTarget.id);
			Styling.animateBackground('body', '#5c5c5c', 500);
			FlowRouter.go('home');
		}
	}
});

Template.header.helpers({
	translation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.header.events({
	'touchend span, click span' (event) {
		if(Tools.swipeCheck(event)) {
			if($('nav').width() > 0) {
				$('nav').animate({
					backgroundColor: '#FFFFFF',
					width: 0
				}, 300);
			}
			else if($(window).width() < 1200) {
				$('nav').animate({
					backgroundColor: '#003282',
					width: '50%'
				}, 500);
			}
			else {
				$('nav').animate({
					backgroundColor: '#003282',
					width: '15vw'
				}, 500);
			}
		}
	}
});

Template.footer.helpers({
	translation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.home.onRendered(()=>{
	currentMenu = '';
	Session.set('rememberMe', false);
	Session.set('browseSession', 'ENIGMAHome');
	Styling.animateBackground('body', 'black', 500);
});

Template.home.helpers({
	userLang () {
		return Session.get('userLang');
	},
	translation (col) {
		return interfaceL.get() && interfaceL.get()[col];
	}
});

Template.home.events({
	'touchend #challengerMenu, click #challengerMenu, touchend #experimenterMenu, click #experimenterMenu, touchend #langMenu, click #langMenu' (event) {
		if(Tools.swipeCheck(event)) {
			let target = event.currentTarget.id;
			$('div > p > a:first-of-type').siblings().animate({
				height: 0,
				marginTop: 0,
				marginBottom: 0
			}, 200);
			if(target !== currentMenu) {
				$('div > p > a#' + target).siblings().animate({
					height: $('#challengerMenu').height() + 10 + 'px',
					marginTop: '2px',
					marginBottom: '2px',
					lineHeight: $('#challengerMenu').height() + 14 + 'px'
				}, 400);
				currentMenu = target;
			}
		}
	},
	'touchend #challengerLogin, click #challengerLogin, touchend #experimenterLogin, click #experimenterLogin' (event) {
		if(Tools.swipeCheck(event)) {
			let userCat = event.currentTarget.id;
			userCat = userCat.replace('Login', '');
			Session.set('userCat', userCat);
			FlowRouter.go('login');
		}
	},
	'touchend #challengerSignUp, click #challengerSignUp, touchend #experimenterSignUp, click #experimenterSignUp' (event) {
		if(Tools.swipeCheck(event)) {
			let userCat = event.currentTarget.id;
			userCat = userCat.replace('SignUp', '');
			Session.set('userCat', userCat);
			FlowRouter.go('register');
		}
	},
	'touchend #challengerDemo, click #challengerDemo' (event) {
		if(Tools.swipeCheck(event)) {
			Session.set('expType', 'demo');
			let demoExp = experimentDB.findOne();
			Session.set('expId', demoExp._id);
			Session.set('expSession', 'loadingSettings');
			FlowRouter.go('runExp', {expid: demoExp._id});
		}
	},
	'touchend #aboutENIGMA, click #aboutENIGMA' (event) {
		if(Tools.swipeCheck(event)) {
			FlowRouter.go('about');
		}
	},
	'touchend [id^=selectLang], click [id^=selectLang]' (event) {
		if(Tools.swipeCheck(event)) {
			let targetLang = event.currentTarget.id.replace('selectLang_', '');
			Session.set('userLang', targetLang);
		}
	}
});

Template.contentLayout.events({
	'touchend #contentBody, click #contentBody' (event) {
		if(Tools.swipeCheck(event, true, false)) {
			$('nav').animate({
				backgroundColor: '#FFFFFF',
				width: 0
			}, 300);
		}
	}
});